// JS node for the AddToContacts client action.
// Inputs: FirstName, LastName, Phone, Email (Text)
// Outputs: Success (Boolean), ErrorCode (Text), ErrorMessage (Text)
// Three runtimes, checked in order: the Capacitor plugin (ODC / MABS 12+),
// the new Cordova plugin (MABS 11 builds), and the legacy navigator.contacts
// plugin (older native builds receiving this script over the air).

function onSuccess(contact) {
  $parameters.Success = true;
  $parameters.ErrorMessage = '';
  $resolve();
}

function onError(contactError) {
  $parameters.Success = false;
  $parameters.ErrorCode = contactError && contactError.code != null ? String(contactError.code) : '';
  $parameters.ErrorMessage = 'Could not save contact';
  $resolve();
}

var options = {
  contact: {
    name: { givenName: $parameters.FirstName, familyName: $parameters.LastName },
    phoneNumbers: [{ type: 'mobile', value: $parameters.Phone, pref: true }],
    emails: [{ type: 'work', value: $parameters.Email, pref: true }],
  },
};

const CapacitorContacts =
  (window.CapacitorPlugins && window.CapacitorPlugins.Contacts) ||
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts);

if (CapacitorContacts) {
  CapacitorContacts.save(options).then(onSuccess, onError);
} else if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.Contacts) {
  cordova.plugins.Contacts.save(options, onSuccess, onError);
} else {
  let name = new ContactName();
  name.givenName = $parameters.FirstName;
  name.familyName = $parameters.LastName;

  let phoneNumbers = [];
  phoneNumbers[0] = new ContactField('mobile', $parameters.Phone, true);

  let emails = [];
  emails[0] = new ContactField('work', $parameters.Email, true);

  let contact = navigator.contacts.create();
  contact.name = name;
  contact.phoneNumbers = phoneNumbers;
  contact.emails = emails;

  // save to device
  contact.save(onSuccess, onError);
}
