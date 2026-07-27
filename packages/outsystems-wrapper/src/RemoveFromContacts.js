// JS node for the RemoveFromContacts client action.
// Input: ContactId (Text)
// Outputs: Success (Boolean), ErrorCode (Text), ErrorMessage (Text)
// Three runtimes, checked in order: the Capacitor plugin (ODC / MABS 12+),
// the new Cordova plugin (MABS 11 builds), and the legacy navigator.contacts
// plugin (older native builds receiving this script over the air).

function onSuccess() {
  $parameters.Success = true;
  $parameters.ErrorCode = '';
  $parameters.ErrorMessage = '';
  $resolve();
}

function onError(contactError) {
  $parameters.Success = false;
  $parameters.ErrorCode = contactError && contactError.code != null ? String(contactError.code) : '';
  $parameters.ErrorMessage = 'Error deleting contact';
  $resolve();
}

const CapacitorContacts =
  (window.CapacitorPlugins && window.CapacitorPlugins.Contacts) ||
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts);

if (CapacitorContacts) {
  CapacitorContacts.remove({ id: $parameters.ContactId }).then(onSuccess, onError);
} else if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.Contacts) {
  cordova.plugins.Contacts.remove({ id: $parameters.ContactId }, onSuccess, onError);
} else {
  var contact = navigator.contacts.create();
  contact.id = $parameters.ContactId;

  contact.remove(onSuccess, onError);
}
