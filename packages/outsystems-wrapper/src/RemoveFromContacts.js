// JS node for the RemoveFromContacts client action.
// Input: ContactId (Text)
// Outputs: Success (Boolean), ErrorMessage (Text)
function onSuccess() {
  $parameters.Success = true;
  $parameters.ErrorMessage = '';
  $resolve();
}

function onError(contactError) {
  $parameters.Success = false;
  $parameters.ErrorMessage = 'Error deleting contact';
  $resolve();
}

const CapacitorContacts =
  (window.CapacitorPlugins && window.CapacitorPlugins.Contacts) ||
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts);

if (CapacitorContacts) {
  CapacitorContacts.remove({ id: $parameters.ContactId }).then(onSuccess, onError);
} else {
  cordova.plugins.Contacts.remove({ id: $parameters.ContactId }, onSuccess, onError);
}
