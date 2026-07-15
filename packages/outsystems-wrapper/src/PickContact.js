// JS node for the PickContact client action.
// Outputs: Success (Boolean), ErrorMessage (Text), ContactJSON (Text)
function onSuccess(picked) {
  // Legacy wire shape: birthday serialized as an ISO string.
  if (picked.birthday != null) picked.birthday = new Date(picked.birthday);
  $parameters.ContactJSON = JSON.stringify(picked);
  $parameters.Success = true;
  $parameters.ErrorMessage = '';
  $resolve();
}

function onError(err) {
  $parameters.Success = false;
  $parameters.ErrorMessage = 'Could not pick contact';
  $resolve();
}

const CapacitorContacts =
  (window.CapacitorPlugins && window.CapacitorPlugins.Contacts) ||
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts);

if (CapacitorContacts) {
  CapacitorContacts.pickContact().then(onSuccess, onError);
} else {
  cordova.plugins.Contacts.pickContact(onSuccess, onError);
}
