// JS node for the FindContact client action.
// Inputs: SearchParameter (Text), MultipleContacts (Boolean)
// Outputs: Success (Boolean), ErrorMessage (Text), ContactsJSON (Text)
// The Capacitor shell (ODC / MABS 12+) uses @capacitor/contacts; the Cordova
// shell (O11 / MABS 11) uses cordova-outsystems-contacts. Both expose the
// same API; only the invocation style (promise vs. callback) differs.

function onSuccess(result) {
  // Legacy wire shape: birthday serialized as an ISO string (a JS Date),
  // so downstream TextToDateTime logic keeps working unchanged.
  var contacts = result.contacts.map(function (c) {
    if (c.birthday != null) c.birthday = new Date(c.birthday);
    return c;
  });
  $parameters.Success = true;
  $parameters.ErrorMessage = '';
  $parameters.ContactsJSON = JSON.stringify(contacts);
  $resolve();
}

function onError(error) {
  $parameters.Success = false;
  $parameters.ErrorMessage = error && error.message ? error.message : 'Could not find contact';
  $resolve();
}

var options = {
  fields: ['*'],
  filter: $parameters.SearchParameter,
  multiple: $parameters.MultipleContacts,
};

const CapacitorContacts =
  (window.CapacitorPlugins && window.CapacitorPlugins.Contacts) ||
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts);

if (CapacitorContacts) {
  CapacitorContacts.find(options).then(onSuccess, onError);
} else {
  cordova.plugins.Contacts.find(options, onSuccess, onError);
}
