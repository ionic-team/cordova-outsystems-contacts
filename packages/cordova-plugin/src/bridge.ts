import { require } from 'cordova';

import type {
  Contact,
  ContactFindOptions,
  ContactFindResult,
  ContactRemoveOptions,
  ContactSaveOptions,
  PickContactFieldOptions,
  PickedContactField,
  PluginError,
} from './definitions';

const exec = require('cordova/exec');

function find(
  options: ContactFindOptions,
  success: (result: ContactFindResult) => void,
  error: (error: PluginError) => void,
): void {
  exec(success, error, 'OSContactsPlugin', 'find', [options]);
}

function save(
  options: ContactSaveOptions,
  success: (contact: Contact) => void,
  error: (error: PluginError) => void,
): void {
  exec(success, error, 'OSContactsPlugin', 'save', [options]);
}

function remove(options: ContactRemoveOptions, success: () => void, error: (error: PluginError) => void): void {
  exec(success, error, 'OSContactsPlugin', 'remove', [options]);
}

function pickContact(success: (contact: Contact) => void, error: (error: PluginError) => void): void {
  exec(success, error, 'OSContactsPlugin', 'pickContact', []);
}

function pickContactField(
  options: PickContactFieldOptions,
  success: (picked: PickedContactField) => void,
  error: (error: PluginError) => void,
): void {
  exec(success, error, 'OSContactsPlugin', 'pickContactField', [options]);
}

module.exports = {
  find,
  save,
  remove,
  pickContact,
  pickContactField,
};
