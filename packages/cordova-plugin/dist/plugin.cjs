"use strict";
const cordova = require("cordova");
const exec = cordova.require("cordova/exec");
function find(options, success, error) {
  exec(success, error, "OSContactsPlugin", "find", [options]);
}
function save(options, success, error) {
  exec(success, error, "OSContactsPlugin", "save", [options]);
}
function remove(options, success, error) {
  exec(success, error, "OSContactsPlugin", "remove", [options]);
}
function pickContact(success, error) {
  exec(success, error, "OSContactsPlugin", "pickContact", []);
}
module.exports = {
  find,
  save,
  remove,
  pickContact
};
