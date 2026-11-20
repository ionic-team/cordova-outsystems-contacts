import Contacts
import ContactsUI
import Foundation

/// Cordova bridge for the OutSystems Contacts plugin.
///
/// Permission model is **implicit** (the same model as the Capacitor
/// plugin): `find`, `save` and `remove` request
/// Contacts access before touching the store. On iOS 18+ Limited Access
/// counts as granted. `pickContact` and `pickContactField` present the system
/// picker, which requires no permission at all. Business logic lives in
/// `Contacts` (no Cordova imports).
@objc(OSContactsPlugin)
class OSContactsPlugin: CDVPlugin {

    private let implementation = Contacts()

    /// Callback id awaiting the result of the contact picker UI.
    private var pickCallbackId: String?

    /// Delegate of the in-flight `pickContactField` picker. Held here because
    /// `CNContactPickerViewController.delegate` is a weak reference.
    private var fieldPickerDelegate: FieldPickerDelegate?

    // MARK: - find

    @objc(find:)
    func find(_ command: CDVInvokedUrlCommand) {
        let options = command.argument(at: 0) as? [String: Any] ?? [:]
        guard let fields = options["fields"] as? [String], !fields.isEmpty else {
            sendError(.invalidArgument, command.callbackId)
            return
        }
        let filter = options["filter"] as? String ?? ""
        let multiple = options["multiple"] as? Bool ?? false
        let desired = options["desiredFields"] as? [String] ?? []
        let hasPhoneNumber = options["hasPhoneNumber"] as? Bool ?? false

        withAccess(command.callbackId) { callbackId in
            do {
                let contacts = try self.implementation.search(
                    fields: fields,
                    filter: filter,
                    multiple: multiple,
                    desiredFields: desired,
                    hasPhoneNumber: hasPhoneNumber
                )
                self.sendOk(["contacts": contacts], callbackId)
            } catch {
                self.sendError(error as? ContactsError ?? .unknown, callbackId)
            }
        }
    }

    // MARK: - save

    @objc(save:)
    func save(_ command: CDVInvokedUrlCommand) {
        let options = command.argument(at: 0) as? [String: Any] ?? [:]
        guard let contact = options["contact"] as? [String: Any] else {
            sendError(.invalidArgument, command.callbackId)
            return
        }
        withAccess(command.callbackId) { callbackId in
            do {
                let saved = try self.implementation.save(contact: contact)
                self.sendOk(saved, callbackId)
            } catch {
                self.sendError(error as? ContactsError ?? .unknown, callbackId)
            }
        }
    }

    // MARK: - remove

    @objc(remove:)
    func remove(_ command: CDVInvokedUrlCommand) {
        let options = command.argument(at: 0) as? [String: Any] ?? [:]
        guard let id = options["id"] as? String, !id.isEmpty else {
            sendError(.invalidArgument, command.callbackId)
            return
        }
        withAccess(command.callbackId) { callbackId in
            do {
                try self.implementation.remove(id: id)
                self.sendOkVoid(callbackId)
            } catch {
                self.sendError(error as? ContactsError ?? .unknown, callbackId)
            }
        }
    }

    // MARK: - pickContact

    /// Presents `CNContactPickerViewController`, which runs out of process and
    /// needs no Contacts permission — the recommended flow under iOS 18+
    /// Limited Access (the full contact list is shown and only the picked
    /// contact's data is returned to the app).
    @objc(pickContact:)
    func pickContact(_ command: CDVInvokedUrlCommand) {
        DispatchQueue.main.async {
            guard self.pickCallbackId == nil else {
                self.sendError(.pendingOperation, command.callbackId)
                return
            }
            guard let viewController = self.viewController else {
                self.sendError(.unknown, command.callbackId)
                return
            }
            self.pickCallbackId = command.callbackId
            let picker = CNContactPickerViewController()
            picker.delegate = self
            self.present(picker, from: viewController)
        }
    }

    // MARK: - pickContactField

    /// Presents the system picker restricted to one kind of property (phone,
    /// email or address), so the user taps a single value and only that value
    /// plus the contact's name is returned. Needs no Contacts permission.
    ///
    /// - Parameter command: carries the `field` option. Fails with
    ///   `OS-PLUG-CONT-0001` when it is missing or unknown.
    @objc(pickContactField:)
    func pickContactField(_ command: CDVInvokedUrlCommand) {
        let options = command.argument(at: 0) as? [String: Any] ?? [:]
        guard let field = options["field"] as? String,
              let key = implementation.pickerPropertyKey(forField: field) else {
            sendError(.invalidArgument, command.callbackId)
            return
        }
        DispatchQueue.main.async {
            guard self.pickCallbackId == nil else {
                self.sendError(.pendingOperation, command.callbackId)
                return
            }
            guard let viewController = self.viewController else {
                self.sendError(.unknown, command.callbackId)
                return
            }
            self.pickCallbackId = command.callbackId
            let delegate = FieldPickerDelegate(
                onSelect: { [weak self] property in
                    guard let self = self else { return }
                    let callbackId = self.finishPick()
                    if let contact = self.implementation.pickedPropertyToDictionary(
                        contact: property.contact,
                        key: property.key,
                        label: property.label,
                        value: property.value as Any
                    ) {
                        self.sendOk(contact, callbackId)
                    } else {
                        self.sendError(.unknown, callbackId)
                    }
                },
                onCancel: { [weak self] in
                    guard let self = self else { return }
                    self.sendError(.operationCancelled, self.finishPick())
                }
            )
            self.fieldPickerDelegate = delegate
            let picker = CNContactPickerViewController()
            picker.displayedPropertyKeys = [key]
            picker.predicateForSelectionOfProperty = NSPredicate(format: "key == %@", key)
            picker.delegate = delegate
            self.present(picker, from: viewController)
        }
    }

    /// Clears the in-flight pick state.
    ///
    /// - Returns: the callback id the pick was holding.
    private func finishPick() -> String? {
        let callbackId = pickCallbackId
        pickCallbackId = nil
        fieldPickerDelegate = nil
        return callbackId
    }

    /// Presents from the top-most controller so an already-presented modal
    /// doesn't make present() fail silently (stuck pick state).
    ///
    /// - Parameters:
    ///   - picker: the picker to show.
    ///   - viewController: the controller to start looking for a presenter from.
    private func present(_ picker: CNContactPickerViewController, from viewController: UIViewController) {
        var presenter = viewController
        while let presented = presenter.presentedViewController {
            presenter = presented
        }
        presenter.present(picker, animated: true)
    }

    // MARK: - Implicit permission handling

    /// Ensures Contacts access (full, or limited on iOS 18+), then runs
    /// `work` off the main thread. Sends `OS-PLUG-CONT-0020` when access is
    /// refused.
    private func withAccess(_ callbackId: String?, work: @escaping (String?) -> Void) {
        if implementation.isAuthorized() {
            DispatchQueue.global(qos: .userInitiated).async { work(callbackId) }
            return
        }
        implementation.requestAccess { granted in
            if granted {
                DispatchQueue.global(qos: .userInitiated).async { work(callbackId) }
            } else {
                self.sendError(.permissionDenied, callbackId)
            }
        }
    }

    // MARK: - Result helpers

    private func sendOk(_ payload: [String: Any], _ callbackId: String?) {
        guard let callbackId = callbackId else { return }
        let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: payload)
        commandDelegate.send(result, callbackId: callbackId)
    }

    private func sendOkVoid(_ callbackId: String?) {
        guard let callbackId = callbackId else { return }
        let result = CDVPluginResult(status: CDVCommandStatus_OK)
        commandDelegate.send(result, callbackId: callbackId)
    }

    private func sendError(_ error: ContactsError, _ callbackId: String?) {
        guard let callbackId = callbackId else { return }
        let result = CDVPluginResult(
            status: CDVCommandStatus_ERROR,
            messageAs: ["code": error.code, "message": error.message]
        )
        commandDelegate.send(result, callbackId: callbackId)
    }
}

// MARK: - CNContactPickerDelegate

extension OSContactsPlugin: CNContactPickerDelegate {
    func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
        let callbackId = pickCallbackId
        pickCallbackId = nil
        // When the store is readable, re-fetch by identifier for the full key
        // set. Without access (picker needs none), map the picker's contact
        // directly — the mapper guards every key with `isKeyAvailable`.
        if implementation.isAuthorized(), let full = implementation.getContact(byId: contact.identifier) {
            sendOk(full, callbackId)
        } else {
            sendOk(implementation.contactToDictionary(contact, desiredFields: []), callbackId)
        }
    }

    func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
        let callbackId = pickCallbackId
        pickCallbackId = nil
        sendError(.operationCancelled, callbackId)
    }
}

/// Delegate for `pickContactField`. Implements only the property-selection
/// callback: also implementing `didSelect contact:` would make the picker
/// select whole contacts and never report a property.
private final class FieldPickerDelegate: NSObject, CNContactPickerDelegate {
    private let onSelect: (CNContactProperty) -> Void
    private let onCancel: () -> Void

    /// - Parameters:
    ///   - onSelect: called with the property the user tapped.
    ///   - onCancel: called when the user dismisses the picker.
    init(onSelect: @escaping (CNContactProperty) -> Void, onCancel: @escaping () -> Void) {
        self.onSelect = onSelect
        self.onCancel = onCancel
    }

    func contactPicker(_ picker: CNContactPickerViewController, didSelect contactProperty: CNContactProperty) {
        onSelect(contactProperty)
    }

    func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
        onCancel()
    }
}
