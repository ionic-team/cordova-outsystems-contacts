// JS node for the FindContact client action.
// Inputs: SearchParameter (Text), MultipleContacts (Boolean)
// Outputs: Success (Boolean), ErrorCode (Text), ErrorMessage (Text), ContactsJSON (Text)
// Three runtimes, checked in order: the Capacitor plugin (ODC / MABS 12+),
// the new Cordova plugin (MABS 11 builds), and the legacy navigator.contacts
// plugin (older native builds receiving this script over the air).

function finish(contacts) {
  $parameters.Success = true;
  $parameters.ErrorCode = '';
  $parameters.ErrorMessage = '';
  $parameters.ContactsJSON = JSON.stringify(contacts);
  $resolve();
}

function onSuccess(result) {
  // The previous plugin returned birthday as a JS Date, which JSON.stringify
  // turns into an ISO string. Keep that, so flows that parse it with
  // TextToDateTime keep working.
  finish(
    result.contacts.map(function (c) {
      if (c.birthday != null) c.birthday = new Date(c.birthday);
      return c;
    }),
  );
}

function onError(error) {
  $parameters.Success = false;
  $parameters.ErrorCode = error && error.code != null ? String(error.code) : '';
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
} else if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.Contacts) {
  cordova.plugins.Contacts.find(options, onSuccess, onError);
} else {
  // Legacy plugin: returns a plain array, birthdays already JS Dates.
  let legacyOptions = new ContactFindOptions();
  legacyOptions.filter = $parameters.SearchParameter;
  legacyOptions.multiple = $parameters.MultipleContacts;
  navigator.contacts.find(['*'], finish, onError, legacyOptions);
}
