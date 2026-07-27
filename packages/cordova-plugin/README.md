# com.outsystems.plugins.contacts

OutSystems Cordova plugin for accessing, searching, picking, creating,
updating and removing device contacts. Exposes the exact same API as the
Capacitor plugin (`@capacitor/contacts`) — same method names, option keys,
return shapes and error codes.

Built on the modern platform contact APIs: **Contacts framework
(`CNContactStore`)** on iOS — never the deprecated AddressBook — with full
iOS 18+ **Limited Access** support, and **`ContactsContract`** on Android.

## Install

```bash
cordova plugin add https://github.com/ionic-team/cordova-outsystems-contacts
```

The iOS `NSContactsUsageDescription` string is injected at install time; set
it via the plugin variable:

```bash
cordova plugin add https://github.com/ionic-team/cordova-outsystems-contacts \
  --variable CONTACTS_USAGE_DESCRIPTION="We need access to contacts to search, save and remove them."
```

## Usage

The plugin is exposed as `cordova.plugins.Contacts`. All methods use
callbacks; failures receive `{ code, message }` with `OS-PLUG-CONT-NNNN`
codes.

```javascript
var Contacts = cordova.plugins.Contacts;

// Search every field for "ada" and return all matches with a phone number
Contacts.find(
  { fields: ['*'], filter: 'ada', multiple: true, hasPhoneNumber: true },
  function (result) { console.log(result.contacts); },
  function (error) { console.error(error.code, error.message); }
);

// Create a contact (no id -> insert); succeeds with the saved contact
Contacts.save(
  { contact: { name: { givenName: 'Ada', familyName: 'Lovelace' },
               phoneNumbers: [{ type: 'mobile', value: '+351910000000' }] } },
  function (saved) { console.log(saved.id); },
  function (error) { console.error(error); }
);

// Update (id present), pick, and remove by id
Contacts.save({ contact: { id: someId, nickname: 'Countess' } }, ok, fail);
Contacts.pickContact(function (picked) { console.log(picked); }, fail);
Contacts.remove({ id: someId }, ok, fail);
```

## Permission model

Permissions are requested **implicitly** by each method (no
checkPermissions/requestPermissions actions): read for `find`/`pickContact`,
read + write for `save`/`remove` on Android; Contacts access on iOS (where
`pickContact` uses the permissionless system picker). Denials fail with
`OS-PLUG-CONT-0020`.

## Errors

| Code | Meaning |
| --- | --- |
| `OS-PLUG-CONT-0000` | Unknown error |
| `OS-PLUG-CONT-0001` | Invalid argument (e.g. unknown id) |
| `OS-PLUG-CONT-0002` | Timeout (reserved, currently unused) |
| `OS-PLUG-CONT-0003` | Pending operation (e.g. picker already open) |
| `OS-PLUG-CONT-0004` | I/O error |
| `OS-PLUG-CONT-0005` | Not supported |
| `OS-PLUG-CONT-0006` | Operation cancelled (picker closed) |
| `OS-PLUG-CONT-0020` | Permission denied |

## iOS notes

- iOS 18+ **Limited Access** is fully supported: `find`, `save` and `remove`
  operate on the subset the user shared with the app; `pickContact` presents
  the system picker (no permission needed, full list always visible).
- The `note` field requires Apple's restricted
  `com.apple.developer.contacts.notes` entitlement and is omitted on read /
  ignored on save.
- Contact `id`s are opaque `CNContact` identifiers; numeric ids persisted by
  the legacy AddressBook-based plugin do not resolve after migration.

## Shared sources

This plugin is one half of a unified pair with
[`capacitor-contacts`](https://github.com/ionic-team/capacitor-contacts).
The iOS implementation files (`Contacts.swift`, `ContactsMapping.swift`,
`ContactsError.swift`) are byte-identical across both repos, and the Android
`Contacts.kt` differs only by package name and `JSObject`/`JSArray` →
`org.json` types. Apply fixes to both repos together.

## API

<docgen-index>

* [`find(...)`](#find)
* [`save(...)`](#save)
* [`remove(...)`](#remove)
* [`pickContact(...)`](#pickcontact)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### find(...)

```typescript
find(options: ContactFindOptions, success: (result: ContactFindResult) => void, error: (error: PluginError) => void) => void
```

Queries the device contacts database and calls `success` with the
matching contacts.

Requests the READ_CONTACTS (Android) / Contacts (iOS) permission
internally the first time it runs; there is no separate permission method.

**iOS 18+:** under Limited Access the search runs against (and returns
only) the subset of contacts the user shared with the app.

| Param         | Type                                                                                 |
| ------------- | ------------------------------------------------------------------------------------ |
| **`options`** | <code><a href="#contactfindoptions">ContactFindOptions</a></code>                    |
| **`success`** | <code>(result: <a href="#contactfindresult">ContactFindResult</a>) =&gt; void</code> |
| **`error`**   | <code>(error: <a href="#pluginerror">PluginError</a>) =&gt; void</code>              |

**Since:** 1.0.0

--------------------


### save(...)

```typescript
save(options: ContactSaveOptions, success: (contact: Contact) => void, error: (error: PluginError) => void) => void
```

Persists a new contact or updates an existing one (matched by
`contact.id`). Calls `success` with the full saved contact.

Requests the READ/WRITE_CONTACTS (Android) / Contacts (iOS) permission
internally.

**iOS 18+:** works under Limited Access — new contacts are added to the
app's accessible set; updating requires the target contact to be in that
set (otherwise the call fails with `OS-PLUG-CONT-0001`).

| Param         | Type                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| **`options`** | <code><a href="#contactsaveoptions">ContactSaveOptions</a></code>       |
| **`success`** | <code>(contact: <a href="#contact">Contact</a>) =&gt; void</code>       |
| **`error`**   | <code>(error: <a href="#pluginerror">PluginError</a>) =&gt; void</code> |

**Since:** 1.0.0

--------------------


### remove(...)

```typescript
remove(options: ContactRemoveOptions, success: () => void, error: (error: PluginError) => void) => void
```

Removes the contact with the given `id` from the device contacts
database. Fails with `OS-PLUG-CONT-0001` when no contact has that id (on
iOS 18+ Limited Access, also when the contact is outside the accessible
set).

Requests the READ/WRITE_CONTACTS (Android) / Contacts (iOS) permission
internally.

| Param         | Type                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| **`options`** | <code><a href="#contactremoveoptions">ContactRemoveOptions</a></code>   |
| **`success`** | <code>() =&gt; void</code>                                              |
| **`error`**   | <code>(error: <a href="#pluginerror">PluginError</a>) =&gt; void</code> |

**Since:** 1.0.0

--------------------


### pickContact(...)

```typescript
pickContact(success: (contact: Contact) => void, error: (error: PluginError) => void) => void
```

Launches the native contact picker UI and calls `success` with the
contact the user selects. Fails with `OS-PLUG-CONT-0006` if the user
cancels.

On iOS the system picker requires no permission and always shows the full
contact list — even under iOS 18+ Limited Access (the picked contact is
returned without joining the app's accessible set). On Android the
READ_CONTACTS permission is requested internally to read the picked
contact's details.

| Param         | Type                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| **`success`** | <code>(contact: <a href="#contact">Contact</a>) =&gt; void</code>       |
| **`error`**   | <code>(error: <a href="#pluginerror">PluginError</a>) =&gt; void</code> |

**Since:** 1.0.0

--------------------


### Interfaces


#### ContactFindOptions

Search options accepted by {@link IContacts.find}.

| Prop                 | Type                            | Description                                                                                                                                                                                                                                                              | Since |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| **`fields`**         | <code>ContactFieldType[]</code> | Fields to search against. Pass `['*']` to match every field. An empty array is invalid and fails with `OS-PLUG-CONT-0001`. The `id` field matches by exact identifier; all other fields match case-insensitive substrings. `photos` and `categories` are not searchable. | 1.0.0 |
| **`filter`**         | <code>string</code>             | Search string matched (case-insensitively) against the selected `fields`. An empty/omitted filter returns every contact.                                                                                                                                                 | 1.0.0 |
| **`multiple`**       | <code>boolean</code>            | When `true`, returns every match; when `false` (default), returns at most one contact.                                                                                                                                                                                   | 1.0.0 |
| **`desiredFields`**  | <code>ContactFieldType[]</code> | If set, each returned {@link <a href="#contact">Contact</a>} only includes these fields (plus the always-present `id`).                                                                                                                                                  | 1.0.0 |
| **`hasPhoneNumber`** | <code>boolean</code>            | OutSystems extension: when `true`, only contacts that have at least one phone number are returned. Defaults to `false`.                                                                                                                                                  | 1.0.0 |


#### ContactFindResult

Result of a {@link IContacts.find} call.

| Prop           | Type                   | Description                                | Since |
| -------------- | ---------------------- | ------------------------------------------ | ----- |
| **`contacts`** | <code>Contact[]</code> | The contacts matching the search criteria. | 1.0.0 |


#### Contact

A single device contact.

| Prop                | Type                                                | Description                                                                                                                                                                                                                                                                                                                                                                                                          | Since |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **`id`**            | <code>string</code>                                 | Globally unique, platform-assigned identifier. Absent for contacts not yet saved to the device.                                                                                                                                                                                                                                                                                                                      | 1.0.0 |
| **`rawId`**         | <code>string</code>                                 | Android raw-contact id backing this aggregated contact. iOS leaves this unset.                                                                                                                                                                                                                                                                                                                                       | 1.0.0 |
| **`displayName`**   | <code>string</code>                                 | Name suitable for display to end users.                                                                                                                                                                                                                                                                                                                                                                              | 1.0.0 |
| **`name`**          | <code><a href="#contactname">ContactName</a></code> | The structured name components.                                                                                                                                                                                                                                                                                                                                                                                      | 1.0.0 |
| **`nickname`**      | <code>string</code>                                 | A casual name by which to address the contact.                                                                                                                                                                                                                                                                                                                                                                       | 1.0.0 |
| **`phoneNumbers`**  | <code>ContactField[]</code>                         | The contact's phone numbers.                                                                                                                                                                                                                                                                                                                                                                                         | 1.0.0 |
| **`emails`**        | <code>ContactField[]</code>                         | The contact's email addresses.                                                                                                                                                                                                                                                                                                                                                                                       | 1.0.0 |
| **`addresses`**     | <code>ContactAddress[]</code>                       | The contact's postal addresses.                                                                                                                                                                                                                                                                                                                                                                                      | 1.0.0 |
| **`ims`**           | <code>ContactField[]</code>                         | The contact's instant-messaging handles.                                                                                                                                                                                                                                                                                                                                                                             | 1.0.0 |
| **`organizations`** | <code>ContactOrganization[]</code>                  | The contact's organizations.                                                                                                                                                                                                                                                                                                                                                                                         | 1.0.0 |
| **`birthday`**      | <code>number</code>                                 | The contact's birthday as epoch milliseconds.                                                                                                                                                                                                                                                                                                                                                                        | 1.0.0 |
| **`note`**          | <code>string</code>                                 | A free-form note about the contact. **iOS:** not supported by default — reading/writing a contact's note requires Apple's restricted `com.apple.developer.contacts.notes` entitlement. Without it the field is omitted on read and ignored on save. Android has no such restriction.                                                                                                                                 | 1.0.0 |
| **`photos`**        | <code>ContactField[]</code>                         | The contact's photos. Reads return `type: 'url'` with the `value` holding a reference to the image, never image bytes: on Android the contact's `content://` photo URI, on iOS the path of a copy written to the app's temporary directory (cleared by the system). On save, the first entry is applied: pass `type: 'base64'` with base64 data, or `type: 'url'` with a local `file://`/`content://` URI to import. | 1.0.0 |
| **`categories`**    | <code>ContactField[]</code>                         | User-defined categories associated with the contact. Read-only: populated from the contact's group memberships on Android, never returned on iOS (the Contacts framework has no equivalent), and ignored on save.                                                                                                                                                                                                    | 1.0.0 |
| **`urls`**          | <code>ContactField[]</code>                         | Web pages associated with the contact.                                                                                                                                                                                                                                                                                                                                                                               | 1.0.0 |


#### ContactName

Structured name of a {@link <a href="#contact">Contact</a>}.

| Prop                  | Type                | Description                           | Since |
| --------------------- | ------------------- | ------------------------------------- | ----- |
| **`formatted`**       | <code>string</code> | The complete formatted name.          | 1.0.0 |
| **`familyName`**      | <code>string</code> | Family (last) name.                   | 1.0.0 |
| **`givenName`**       | <code>string</code> | Given (first) name.                   | 1.0.0 |
| **`middleName`**      | <code>string</code> | Middle name.                          | 1.0.0 |
| **`honorificPrefix`** | <code>string</code> | Honorific prefix (e.g. `Mr.`, `Dr.`). | 1.0.0 |
| **`honorificSuffix`** | <code>string</code> | Honorific suffix (e.g. `Esq.`).       | 1.0.0 |


#### ContactField

A generic, repeatable contact field (phone number, email, IM, photo, URL,
category).

| Prop        | Type                 | Description                                                                      | Since |
| ----------- | -------------------- | -------------------------------------------------------------------------------- | ----- |
| **`type`**  | <code>string</code>  | The kind of field, e.g. `home`, `work`, `mobile`. For photos, `url` or `base64`. | 1.0.0 |
| **`value`** | <code>string</code>  | The field value (phone number, email address, URI, etc.).                        | 1.0.0 |
| **`pref`**  | <code>boolean</code> | `true` if this is the contact's preferred value for the field.                   | 1.0.0 |
| **`id`**    | <code>string</code>  | Platform-assigned id of this individual field entry.                             | 1.0.0 |


#### ContactAddress

A postal address of a {@link <a href="#contact">Contact</a>}.

| Prop                | Type                 | Description                                        | Since |
| ------------------- | -------------------- | -------------------------------------------------- | ----- |
| **`id`**            | <code>string</code>  | Platform-assigned id of this address entry.        | 1.0.0 |
| **`pref`**          | <code>boolean</code> | `true` if this is the contact's preferred address. | 1.0.0 |
| **`type`**          | <code>string</code>  | The kind of address, e.g. `home`, `work`.          | 1.0.0 |
| **`formatted`**     | <code>string</code>  | The full address formatted for display.            | 1.0.0 |
| **`streetAddress`** | <code>string</code>  | The street address.                                | 1.0.0 |
| **`locality`**      | <code>string</code>  | The city or locality.                              | 1.0.0 |
| **`region`**        | <code>string</code>  | The state or region.                               | 1.0.0 |
| **`postalCode`**    | <code>string</code>  | The ZIP or postal code.                            | 1.0.0 |
| **`country`**       | <code>string</code>  | The country name.                                  | 1.0.0 |


#### ContactOrganization

An organization a {@link <a href="#contact">Contact</a>} belongs to.

| Prop             | Type                 | Description                                                                                                                           | Since |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **`id`**         | <code>string</code>  | Platform-assigned id of this organization entry. Android only — iOS models the organization as flat contact properties without an id. | 1.0.0 |
| **`pref`**       | <code>boolean</code> | `true` if this is the contact's preferred organization.                                                                               | 1.0.0 |
| **`type`**       | <code>string</code>  | The kind of organization, e.g. `work`.                                                                                                | 1.0.0 |
| **`name`**       | <code>string</code>  | The organization name.                                                                                                                | 1.0.0 |
| **`department`** | <code>string</code>  | The department within the organization.                                                                                               | 1.0.0 |
| **`title`**      | <code>string</code>  | The contact's title at the organization.                                                                                              | 1.0.0 |


#### PluginError

Error delivered to every failure callback.

| Prop          | Type                | Description                                                                                                   | Since |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- | ----- |
| **`code`**    | <code>string</code> | Unified error code in the `OS-PLUG-CONT-NNNN` format, identical across this plugin and `@capacitor/contacts`. | 1.0.0 |
| **`message`** | <code>string</code> | Human-readable description of the failure.                                                                    | 1.0.0 |


#### ContactSaveOptions

Options accepted by {@link IContacts.save}.

| Prop          | Type                                        | Description                                                                                                                                                                                                                                                                        | Since |
| ------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **`contact`** | <code><a href="#contact">Contact</a></code> | The contact to create (no `id`) or update (existing `id`). Update semantics: every field present on the contact replaces the stored value entirely (e.g. `name` replaces the whole structured name, `phoneNumbers` replaces all phone numbers); omitted fields are left unchanged. | 1.0.0 |


#### ContactRemoveOptions

Options accepted by {@link IContacts.remove}.

| Prop     | Type                | Description                             | Since |
| -------- | ------------------- | --------------------------------------- | ----- |
| **`id`** | <code>string</code> | The native id of the contact to remove. | 1.0.0 |


### Type Aliases


#### ContactFieldType

The set of contact fields a {@link IContacts.find} call can search
against or request back. Mirrors the legacy Cordova `ContactFieldType`
string values exactly.

<code>'addresses' | 'birthday' | 'categories' | 'country' | 'department' | 'displayName' | 'emails' | 'familyName' | 'formatted' | 'givenName' | 'honorificPrefix' | 'honorificSuffix' | 'id' | 'ims' | 'locality' | 'middleName' | 'name' | 'nickname' | 'note' | 'organizations' | 'phoneNumbers' | 'photos' | 'postalCode' | 'region' | 'streetAddress' | 'title' | 'urls'</code>

</docgen-api>
