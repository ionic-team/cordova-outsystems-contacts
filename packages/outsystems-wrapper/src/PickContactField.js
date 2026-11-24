// JS node for the PickContactField client action.
// Input: FieldToSelect (Text: phone, email or address)
// Outputs: Success (Boolean), ErrorCode (Text), ErrorMessage (Text), PickedContactFieldJSON (Text)
// Three runtimes, checked in order: the Capacitor plugin (ODC / MABS 12+),
// the new Cordova plugin (MABS 11 builds), and the legacy navigator.contacts
// plugin (older native builds receiving this script over the air).
// When the installed native plugin has no pickContactField (an older build
// receiving this script over the air), it falls back to pickContact and maps
// the picked contact to the same result shape (see pickedFromContact).

const FIELD = $parameters.FieldToSelect;

// Contact property holding the entries of each kind of field.
const LISTS = { phone: 'phoneNumbers', email: 'emails', address: 'addresses' };

const ADDRESS_PARTS = ['streetAddress', 'locality', 'region', 'postalCode', 'country'];

function fail(code, message) {
  $parameters.Success = false;
  $parameters.ErrorCode = code;
  $parameters.ErrorMessage = message;
  $resolve();
}

function onError(error) {
  fail(
    error && error.code != null ? String(error.code) : '',
    error && error.message ? error.message : 'Could not pick contact field',
  );
}

// Single place that builds the result, so every runtime (and the fallback)
// returns the same attributes: field, displayName? and either contactField
// (phone and email) or address (addresses). contactField has the attributes of
// the ContactField structure (type, value) and address those of the Address
// structure (type, formatted and the address parts). id and pref are not
// returned for either.
function buildPicked(value, type, displayName, address) {
  const picked = { field: FIELD };
  if (displayName) picked.displayName = displayName;
  const label = type || 'other';
  if (FIELD === 'address') {
    picked.address = { type: label, formatted: value };
    ADDRESS_PARTS.forEach(function (part) {
      if (address && typeof address[part] === 'string' && address[part] !== '') picked.address[part] = address[part];
    });
  } else {
    picked.contactField = { type: label, value: value };
  }
  return picked;
}

function finish(picked) {
  $parameters.PickedContactFieldJSON = JSON.stringify(picked);
  $parameters.Success = true;
  $parameters.ErrorCode = '';
  $parameters.ErrorMessage = '';
  $resolve();
}

// Result of pickContactField: already the right shape, rebuilt so it has
// exactly the same attributes as the fallback result.
function onSuccess(picked) {
  finish(buildPicked(picked.value, picked.type, picked.displayName, picked.address));
}

function entryValue(entry) {
  if (!entry) return '';
  if (FIELD !== 'address') return typeof entry.value === 'string' ? entry.value : '';
  if (typeof entry.formatted === 'string' && entry.formatted !== '') return entry.formatted;
  return ADDRESS_PARTS.map(function (part) {
    return typeof entry[part] === 'string' ? entry[part] : '';
  })
    .filter(Boolean)
    .join(', ');
}

// Fallback: maps a whole contact (the pickContact result, same shape on the
// new plugins and the legacy one) to the result of pickContactField. The user
// picks a contact, not a value, so this takes the preferred entry of the
// requested kind, or else the first one that has a value. Returns null if the
// contact has none.
function pickedFromContact(contact) {
  const entries = (contact && contact[LISTS[FIELD]]) || [];
  let entry = null;
  for (let i = 0; i < entries.length && !entry; i++) {
    if (entries[i] && entries[i].pref === true && entryValue(entries[i]) !== '') entry = entries[i];
  }
  for (let i = 0; i < entries.length && !entry; i++) {
    if (entryValue(entries[i]) !== '') entry = entries[i];
  }
  if (!entry) return null;
  const displayName = contact.displayName || (contact.name && contact.name.formatted) || '';
  return buildPicked(entryValue(entry), entry.type, displayName, entry);
}

function onContact(contact) {
  const picked = pickedFromContact(contact);
  if (picked) {
    finish(picked);
  } else {
    // Only the fallback can get here: the native plugin lets the user pick a
    // value, so there is always one. Wrapper-only code, never returned by the
    // native plugins.
    fail('OS-PLUG-CONT-0022', 'The picked contact has no ' + FIELD);
  }
}

const CapacitorContacts =
  (window.CapacitorPlugins && window.CapacitorPlugins.Contacts) ||
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts);

function pickContact() {
  if (CapacitorContacts) {
    CapacitorContacts.pickContact().then(onContact, onError);
  } else if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.Contacts) {
    cordova.plugins.Contacts.pickContact(onContact, onError);
  } else {
    // Legacy plugin.
    navigator.contacts.pickContact(onContact, onError);
  }
}

if (!Object.prototype.hasOwnProperty.call(LISTS, FIELD)) {
  fail('OS-PLUG-CONT-0001', 'Invalid field: ' + FIELD);
} else if (CapacitorContacts) {
  // Capacitor exposes every method name on the plugin object; a method the
  // installed native plugin doesn't have rejects with UNIMPLEMENTED.
  CapacitorContacts.pickContactField({ field: FIELD }).then(onSuccess, function (error) {
    if (error && error.code === 'UNIMPLEMENTED') {
      pickContact();
    } else {
      onError(error);
    }
  });
} else if (
  typeof cordova !== 'undefined' &&
  cordova.plugins &&
  cordova.plugins.Contacts &&
  typeof cordova.plugins.Contacts.pickContactField === 'function'
) {
  cordova.plugins.Contacts.pickContactField({ field: FIELD }, onSuccess, onError);
} else {
  pickContact();
}
