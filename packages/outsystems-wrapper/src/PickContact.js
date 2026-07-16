// JS node for the PickContact client action.
// Outputs: Success (Boolean), ErrorCode (Text), ErrorMessage (Text), ContactJSON (Text)
// Three runtimes, checked in order: the Capacitor plugin (ODC / MABS 12+),
// the new Cordova plugin (MABS 11 builds), and the legacy navigator.contacts
// plugin (older native builds receiving this script over the air).

function finish(picked) {
  $parameters.ContactJSON = JSON.stringify(picked);
  $parameters.Success = true;
  $parameters.ErrorMessage = '';
  $resolve();
}

function onSuccess(picked) {
  // Keep birthday an ISO string in the JSON, as the previous plugin did.
  if (picked.birthday != null) picked.birthday = new Date(picked.birthday);
  finish(picked);
}

function onError(err) {
  $parameters.Success = false;
  $parameters.ErrorCode = err && err.code != null ? String(err.code) : '';
  $parameters.ErrorMessage = 'Could not pick contact';
  $resolve();
}

const CapacitorContacts =
  (window.CapacitorPlugins && window.CapacitorPlugins.Contacts) ||
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts);

if (CapacitorContacts) {
  CapacitorContacts.pickContact().then(onSuccess, onError);
} else if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.Contacts) {
  cordova.plugins.Contacts.pickContact(onSuccess, onError);
} else if (navigator.contacts && navigator.contacts.pickContact) {
  // Legacy plugin: birthdays already JS Dates.
  navigator.contacts.pickContact(finish, onError);
} else {
  onError('');
}
