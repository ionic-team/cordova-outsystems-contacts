import { require as require$1 } from "cordova";
const exec = require$1("cordova/exec");
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
function pickContactField(options, success, error) {
  exec(success, error, "OSContactsPlugin", "pickContactField", [options]);
}
module.exports = {
  find,
  save,
  remove,
  pickContact,
  pickContactField
};
