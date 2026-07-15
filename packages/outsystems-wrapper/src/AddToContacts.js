// JS node for the AddToContacts client action.
// Inputs: FirstName, LastName, Phone, Email (Text)
// Outputs: Success (Boolean), ErrorMessage (Text)
function onSuccess(contact) {
  $parameters.Success = true;
  $parameters.ErrorMessage = '';
  $resolve();
}

function onError(contactError) {
  $parameters.Success = false;
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
} else {
  cordova.plugins.Contacts.save(options, onSuccess, onError);
}
