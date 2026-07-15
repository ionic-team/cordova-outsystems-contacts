# OutSystems wrapper scripts

Reference source for the JS nodes of the OutSystems Contacts plugin (the
Mobile Library wrapping the unified plugin pair). Each script runtime-detects
the shell: the Capacitor plugin (`CapacitorPlugins.Contacts`, promise API) on
ODC / MABS 12+, or the Cordova plugin (`cordova.plugins.Contacts`, callback
API) on O11 / MABS 11. Both plugins expose the exact same API — method names,
options, result shapes and `OS-PLUG-CONT-*` error codes — so each node shares
one set of handlers and differs only in how the call is dispatched. When
these scripts change, copy them into the corresponding JS node in ODC Studio.

| File (`src/`) | JS node (client action) | Notes |
| --- | --- | --- |
| `FindContact.js` | `FindContactJS` (FindContact) | `ContactsJSON` is byte-compatible with the previous release (birthday serialized as an ISO string); the deserialize/ForEach flow needs no changes. |
| `AddToContacts.js` | `AddToContactsJS` (AddToContacts) | Same FirstName/LastName/Phone/Email arguments; the flow's email-validation step is untouched. |
| `RemoveFromContacts.js` | `RemoveFromContactsJS` (RemoveFromContacts) | Flow edits required: change the client action input from the Contact record to `ContactId` (Text), delete the `JSONSerialize1` node, and point the JS node's argument at `ContactId`. |
| `PickContact.js` | `PickContact` (PickContact) | No arguments; same `ContactJSON` output on both branches. |
| `CheckContactsPlugin.js` | `IsPluginAvailableJS` (CheckContactsPlugin) | **Must be updated**: the current node checks only `cordova`/`navigator`, so Capacitor builds would report the plugin unavailable and every action would short-circuit at the "Is Contacts Plugin available?" gate. The new check requires the actual plugin object on both shells. |

`extensibility-configuration.json` carries **both** build sources: MABS picks
`cordova` (cordova-outsystems-contacts) or `capacitor` (capacitor-contacts)
per shell — pin both npm sources to released tags before shipping.
`GET_ACCOUNTS` is no longer requested: the legacy `cordova-plugin-contacts`
needed it for its `AccountManager` save path, but neither of the new plugins
touches accounts. Create the `ContactsUsageDescription` extensibility setting
in ODC Studio.

Migration note: contact `id`s are the platform-native identifiers
(`CNContact` identifiers on iOS, `ContactsContract` ids on Android). Numeric
iOS ids persisted by apps under the legacy AddressBook-based plugin do not
resolve after a build switches to the new pair.
