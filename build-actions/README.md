# Contacts Plugin Build Actions

[The capacitor plugin](https://github.com/ionic-team/capacitor-contacts/blob/main/android/src/main/AndroidManifest.xml d) declares `READ_CONTACTS` and `WRITE_CONTACTS` in its Android manifest. Apps that only use `pickContactField` don't need them, and declaring them can trigger Google Play's Contacts Permission policy. The build action lets the consuming app choose which of the two permissions end up in the merged manifest.

## What this configures

### Android

| Action | Purpose |
|--------|---------|
| `manifest` attrs | Declares the `tools` namespace on the manifest root, only when a permission is being removed |
| `manifest` merge | Declares `READ_CONTACTS` explicitly unless `CONTACTS_PERMISSION_TYPE` is `None` |
| `manifest` merge | Declares `WRITE_CONTACTS` explicitly when `CONTACTS_PERMISSION_TYPE` is `ReadWrite` |
| `manifest` merge | Marks `READ_CONTACTS` with `tools:node="remove"` when `CONTACTS_PERMISSION_TYPE` is `None` |
| `manifest` merge | Marks `WRITE_CONTACTS` with `tools:node="remove"` when `CONTACTS_PERMISSION_TYPE` is `Read` or `None` |

The permissions are added to the app's manifest even though the Capacitor plugin already declares them in its own manifest, so the app declares what it uses explicitly. `tools:node="remove"` is what removes a permission that comes from the plugin's manifest: deleting the entry from the app's manifest alone would not.

| `CONTACTS_PERMISSION_TYPE` | `READ_CONTACTS` | `WRITE_CONTACTS` |
|----------------------------|-----------------|------------------|
| `ReadWrite` (default) | declared | declared |
| `Read` | declared | removed |
| `None` | removed | removed |

With `None`, only `pickContactField` works. The other methods reject with `OS-PLUG-CONT-0021`. With `Read`, only `save` and `remove` reject with `OS-PLUG-CONT-0021`.

## Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `CONTACTS_PERMISSION_TYPE` | string | no | `ReadWrite` | Which contacts permissions are declared in the manifest: `ReadWrite`, `Read` or `None`. Values are case-sensitive. An unset or unrecognised value leaves the manifest as the plugin declares it, which is the same as `ReadWrite`. |

## ODC Setup

1. In ODC Studio, add `buildAction.json` as a resource and set **Deploy Action**
   to **Deploy to Target Directory**.
2. Configure extensibility to reference the file and resolve its variables.
   The path depends on the target:
   - **ODC app:** App > Edit app properties > Extensibility
   - **ODC Mobile Library (plugin):** Library > Edit library properties > Extensibility

   ```json
   {
       "buildConfigurations": {
           "buildAction": {
               "config": "$resources.buildAction.json",
               "parameters": {
                   "CONTACTS_PERMISSION_TYPE": "ReadWrite"
               }
           }
       }
   }
   ```

   Values in `parameters` can be hardcoded literals or extensibility setting references
   (`$extensibilitySettings.SettingName`). Use an extensibility setting if consuming apps
   should choose which permissions to declare. The plugin developer creates the setting
   in ODC Studio: right-click **Extensibility Settings** in the context pane →
   **Add Extensibility Setting**. The consuming app then sets the value in ODC Portal →
   app → **Mobile distribution** → **Extensibility settings**.

3. Build in the ODC Portal using MABS 12 or greater:
   - **ODC app:** build the app directly.
   - **ODC Mobile Library (plugin):** consume the library in an ODC app, then
     build that app.
