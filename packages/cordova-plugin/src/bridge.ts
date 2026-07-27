import { require } from 'cordova';

import type {
  Contact,
  ContactFindOptions,
  ContactFindResult,
  ContactRemoveOptions,
  ContactSaveOptions,
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

module.exports = {
  find,
  save,
  remove,
  pickContact,
};
