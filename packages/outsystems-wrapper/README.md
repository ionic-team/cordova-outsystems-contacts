# OutSystems wrapper scripts

Reference source for the JS nodes of the OutSystems Contacts plugin (the
Mobile Library wrapping the unified plugin pair). Each script runtime-detects
the shell, in order: the Capacitor plugin (`CapacitorPlugins.Contacts`,
promise API) on ODC / MABS 12+, the new Cordova plugin
(`cordova.plugins.Contacts`, callback API) on MABS 11 builds, and finally the
legacy `navigator.contacts` plugin. The legacy branch exists for over-the-air
updates: an installed app that receives this script without a new native
build still carries the legacy plugin, and keeps working through the old API
until it is rebuilt. The two new plugins expose the exact same API — method
names, options, result shapes and `OS-PLUG-CONT-*` error codes. When these
scripts change, copy them into the corresponding JS node in ODC Studio.

| File (`src/`) | JS node (client action) | Notes |
| --- | --- | --- |
| `FindContact.js` | `FindContactJS` (FindContact) | `ContactsJSON` is byte-compatible with the previous release (birthday serialized as an ISO string); the deserialize/ForEach flow needs no changes. |
| `AddToContacts.js` | `AddToContactsJS` (AddToContacts) | Same FirstName/LastName/Phone/Email arguments; the flow's email-validation step is untouched. |
| `RemoveFromContacts.js` | `RemoveFromContactsJS` (RemoveFromContacts) | New action signature takes `ContactId` (Text). Keep the old signature as `DEPRECATED_RemoveFromContacts` (input: the Contact record) whose flow only calls the new action with `Contact.Id` — no JS node of its own. In the new action's flow, delete the `JSONSerialize1` node and point the JS node's argument at `ContactId`. |
| `PickContact.js` | `PickContact` (PickContact) | No arguments; same `ContactJSON` output on both branches. |
| `CheckContactsPlugin.js` | `IsPluginAvailableJS` (CheckContactsPlugin) | **Must be updated**: the current node checks only `cordova`/`navigator`, so Capacitor builds would report the plugin unavailable and every action would short-circuit at the "Is Contacts Plugin available?" gate. The new check requires the actual plugin object on both shells. |

The four action nodes output `ErrorCode` (Text, "Returns the plugin error
code, if any."), populated from the rejection's `code`: `OS-PLUG-CONT-NNNN`
from the new plugins, or the old plugin's numeric W3C code as text on the
legacy branch. Add the output parameter to each node, and in each action's
"Set error" Assign map `Error.ErrorCode` from it instead of a constant. The
two flow-level failure branches keep literals, but from the unified table:
`"OS-PLUG-CONT-0005"` when the plugin is unavailable, `"OS-PLUG-CONT-0001"`
for the AddToContacts email-validation failure.

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
