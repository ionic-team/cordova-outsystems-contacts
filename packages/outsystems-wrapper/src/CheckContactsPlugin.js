// JS node for the plugin-availability check.
// Output: IsAvailable (Boolean)
// Available when any of the three runtimes provides the plugin: Capacitor,
// the new Cordova plugin, or the legacy navigator.contacts plugin (checked
// via its `find` method, which the browser's own Contact Picker API lacks).
$parameters.IsAvailable =
  (typeof window !== 'undefined' &&
    ((window.CapacitorPlugins && typeof window.CapacitorPlugins.Contacts !== 'undefined') ||
      (window.Capacitor && window.Capacitor.Plugins && typeof window.Capacitor.Plugins.Contacts !== 'undefined'))) ||
  (typeof cordova !== 'undefined' && cordova.plugins && typeof cordova.plugins.Contacts !== 'undefined') ||
  (typeof navigator !== 'undefined' && navigator.contacts && typeof navigator.contacts.find === 'function');
