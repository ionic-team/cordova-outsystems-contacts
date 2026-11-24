package com.outsystems.plugins.contacts

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.util.Log
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.PermissionHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Cordova bridge for the OutSystems Contacts plugin.
 *
 * Permission model is **implicit** (the same model as the Capacitor
 * plugin): there are no checkPermissions /
 * requestPermissions actions. Each action ensures the permission it needs
 * before touching the provider — READ_CONTACTS for `find`/`pickContact`,
 * READ+WRITE for `save`/`remove`. `pickContactField` is the exception and
 * needs no permission: it runs `ACTION_PICK` on a single data-kind URI
 * (phone, email or address) instead of the generic `Contacts.CONTENT_URI`,
 * which makes the device's contacts app delegate temporary read permission
 * on just the selected row. On Android 17+ the system routes the same intent
 * to the new Contacts Picker, so no API-level branching is needed. The
 * tradeoff is that only one data kind can be picked per call.
 * Provider work runs on the Cordova thread pool; the picker runs via
 * startActivityForResult.
 */
class OSContactsPlugin : CordovaPlugin() {

    private val implementation by lazy { Contacts(cordova.activity.applicationContext) }

    /** Calls parked while a runtime-permission request is showing. */
    private val pendingPermission = ArrayDeque<PendingCall>()

    /** Call awaiting the contact-picker activity result. */
    @Volatile
    private var pickCallback: CallbackContext? = null

    /** Data kind of the in-flight `pickContactField` call; null for `pickContact`. */
    @Volatile
    private var pickField: ContactPickableField? = null

    private class PendingCall(
        val action: String,
        val args: JSONArray,
        val callbackContext: CallbackContext
    )

    companion object {
        private const val LOG_TAG = "OSContactsPlugin"
        private const val PERMISSION_REQ_CODE = 100
        private const val PICK_CONTACT_REQ_CODE = 200
        private val READ = arrayOf(Manifest.permission.READ_CONTACTS)
        private val READ_WRITE = arrayOf(
            Manifest.permission.READ_CONTACTS,
            Manifest.permission.WRITE_CONTACTS
        )
    }

    override fun execute(
        action: String,
        args: JSONArray,
        callbackContext: CallbackContext
    ): Boolean {
        return when (action) {
            "find", "save", "remove", "pickContact" -> {
                if (validate(action, args, callbackContext)) {
                    ensurePermission(action, args, callbackContext)
                }
                true
            }
            "pickContactField" -> {
                if (validate(action, args, callbackContext)) {
                    dispatch(action, args, callbackContext)
                }
                true
            }
            else -> false
        }
    }

    /** Rejects invalid arguments before any permission prompt is shown. */
    private fun validate(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val options = args.optJSONObject(0) ?: JSONObject()
        val valid = when (action) {
            "find" -> toStringList(options.optJSONArray("fields")).isNotEmpty()
            "save" -> options.optJSONObject("contact") != null
            "remove" -> !options.isNull("id") && options.optString("id", "").isNotEmpty()
            "pickContactField" -> ContactPickableField.fromKey(options.optString("field", null)) != null
            else -> true
        }
        if (!valid) error(callbackContext, ContactsError.INVALID_ARGUMENT)
        return valid
    }

    // ------------------------------------------------------------------
    // Implicit permission handling
    // ------------------------------------------------------------------

    /** The permissions each action needs. */
    private fun permissionsFor(action: String): Array<String> = when (action) {
        "save", "remove" -> READ_WRITE
        else -> READ
    }

    @Synchronized
    private fun ensurePermission(action: String, args: JSONArray, callbackContext: CallbackContext) {
        val needed = permissionsFor(action)
        if (!getManifestPermissions().containsAll(needed.toList())) {
            error(callbackContext, ContactsError.PERMISSION_NOT_DECLARED)
            return
        }
        if (needed.all { PermissionHelper.hasPermission(this, it) }) {
            dispatch(action, args, callbackContext)
        } else {
            pendingPermission.addLast(PendingCall(action, args, callbackContext))
            if (pendingPermission.size == 1) {
                PermissionHelper.requestPermissions(this, PERMISSION_REQ_CODE, needed)
            }
        }
    }

    /**
     * Returns the set of permissions declared in the app's manifest.
     */
    private fun getManifestPermissions(): Set<String> {
        return try {
            val packageInfo = cordova.activity.packageManager.getPackageInfo(
                cordova.activity.packageName, PackageManager.GET_PERMISSIONS
            )
            (packageInfo.requestedPermissions ?: emptyArray()).toHashSet()
        } catch (e: Exception) {
            Log.d(LOG_TAG, e.message.toString())
            emptySet()
        }
    }

    override fun onRequestPermissionResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        if (requestCode != PERMISSION_REQ_CODE) return
        val parked = synchronized(this) {
            val copy = pendingPermission.toList()
            pendingPermission.clear()
            copy
        }
        // A parked call may need permissions that were not part of this
        // request (e.g. a save arriving while find's read-only prompt was
        // showing): re-request for those instead of denying them unasked.
        val asked = permissions.toSet()
        val retry = ArrayList<PendingCall>()
        for (pending in parked) {
            val needed = permissionsFor(pending.action)
            when {
                needed.all { PermissionHelper.hasPermission(this, it) } ->
                    dispatch(pending.action, pending.args, pending.callbackContext)
                needed.any { it !in asked } -> retry.add(pending)
                else -> error(pending.callbackContext, ContactsError.PERMISSION_DENIED)
            }
        }
        if (retry.isNotEmpty()) {
            synchronized(this) { pendingPermission.addAll(retry) }
            val union = retry.flatMap { permissionsFor(it.action).toList() }.distinct().toTypedArray()
            PermissionHelper.requestPermissions(this, PERMISSION_REQ_CODE, union)
        }
    }

    private fun dispatch(action: String, args: JSONArray, callbackContext: CallbackContext) {
        when (action) {
            "find" -> find(args, callbackContext)
            "save" -> save(args, callbackContext)
            "remove" -> remove(args, callbackContext)
            "pickContact" -> pickContact(callbackContext)
            "pickContactField" -> {
                val field = ContactPickableField.fromKey(args.optJSONObject(0)?.optString("field", null)) ?: return
                pickContactField(field, callbackContext)
            }
        }
    }

    // ------------------------------------------------------------------
    // Actions
    // ------------------------------------------------------------------

    private fun find(args: JSONArray, callbackContext: CallbackContext) {
        val options = args.optJSONObject(0) ?: JSONObject()
        cordova.threadPool.execute {
            try {
                val fields = toStringList(options.optJSONArray("fields"))
                val filter = if (options.isNull("filter")) "" else options.optString("filter", "")
                val multiple = options.optBoolean("multiple", false)
                val desired = toStringList(options.optJSONArray("desiredFields"))
                val hasPhoneNumber = options.optBoolean("hasPhoneNumber", false)

                val contacts = implementation.search(fields, filter, multiple, desired, hasPhoneNumber)
                val result = JSONObject().put("contacts", contacts)
                callbackContext.success(result)
            } catch (e: ContactsException) {
                error(callbackContext, e.error)
            } catch (e: Exception) {
                error(callbackContext, ContactsError.UNKNOWN)
            }
        }
    }

    private fun save(args: JSONArray, callbackContext: CallbackContext) {
        val contact = args.optJSONObject(0)?.optJSONObject("contact") ?: return
        cordova.threadPool.execute {
            try {
                val rawId = implementation.save(contact)
                val saved = implementation.getContactByRawId(rawId)
                if (saved != null) callbackContext.success(saved) else error(callbackContext, ContactsError.UNKNOWN)
            } catch (e: ContactsException) {
                error(callbackContext, e.error)
            } catch (e: Exception) {
                error(callbackContext, ContactsError.UNKNOWN)
            }
        }
    }

    private fun remove(args: JSONArray, callbackContext: CallbackContext) {
        val id = args.optJSONObject(0)?.optString("id", "") ?: return
        cordova.threadPool.execute {
            try {
                if (implementation.remove(id)) {
                    callbackContext.success()
                } else {
                    // No accessible contact has this id.
                    error(callbackContext, ContactsError.INVALID_ARGUMENT)
                }
            } catch (e: Exception) {
                error(callbackContext, ContactsError.UNKNOWN)
            }
        }
    }

    private fun pickContact(callbackContext: CallbackContext) {
        startPicker(
            Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI),
            null,
            callbackContext
        )
    }

    private fun pickContactField(field: ContactPickableField, callbackContext: CallbackContext) {
        startPicker(Intent(Intent.ACTION_PICK, field.contentUri), field, callbackContext)
    }

    /**
     * Launches [intent] and parks [callbackContext] until the picker returns.
     * Fails with `PENDING_OPERATION` if another picker is open and with
     * `NOT_SUPPORTED` if no activity can handle [intent].
     *
     * @param intent the `ACTION_PICK` intent to launch.
     * @param field the kind to read from the result, or null to read a whole
     * contact (`pickContact`).
     * @param callbackContext receives the result or error.
     */
    private fun startPicker(intent: Intent, field: ContactPickableField?, callbackContext: CallbackContext) {
        if (pickCallback != null) {
            error(callbackContext, ContactsError.PENDING_OPERATION)
            return
        }
        pickCallback = callbackContext
        pickField = field
        try {
            cordova.startActivityForResult(this, intent, PICK_CONTACT_REQ_CODE)
        } catch (e: Exception) {
            // No contacts app / picker activity on this device.
            pickCallback = null
            pickField = null
            error(callbackContext, ContactsError.NOT_SUPPORTED)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, intent: Intent?) {
        if (requestCode != PICK_CONTACT_REQ_CODE) return
        val callback = pickCallback ?: return
        val field = pickField
        pickCallback = null
        pickField = null
        when (resultCode) {
            Activity.RESULT_OK -> {
                val resultUri = intent?.data
                if (resultUri == null) {
                    error(callback, ContactsError.UNKNOWN)
                    return
                }
                cordova.threadPool.execute {
                    try {
                        val contact = if (field != null) {
                            implementation.readPickedField(field, resultUri)
                        } else {
                            resultUri.lastPathSegment?.let { implementation.getContactById(it) }
                        }
                        if (contact != null) callback.success(contact) else error(callback, ContactsError.UNKNOWN)
                    } catch (e: SecurityException) {
                        error(callback, ContactsError.PERMISSION_DENIED)
                    } catch (e: Exception) {
                        error(callback, ContactsError.UNKNOWN)
                    }
                }
            }
            Activity.RESULT_CANCELED -> error(callback, ContactsError.OPERATION_CANCELLED)
            else -> error(callback, ContactsError.UNKNOWN)
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private fun toStringList(array: JSONArray?): List<String> {
        if (array == null) return emptyList()
        val out = ArrayList<String>(array.length())
        for (i in 0 until array.length()) {
            val value = array.optString(i, null) ?: continue
            out.add(value)
        }
        return out
    }

    private fun error(callbackContext: CallbackContext, error: ContactsError) {
        callbackContext.error(error.toErrorJson())
    }
}
