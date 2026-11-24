const fs = require('fs');
const path = require('path');
const { ConfigParser } = require('cordova-common');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const READ_WRITE = 'ReadWrite';
const READ = 'Read';
const NONE = 'None';
const READ_CONTACTS = 'android.permission.READ_CONTACTS';
const WRITE_CONTACTS = 'android.permission.WRITE_CONTACTS';

module.exports = function (context) {
  const projectRoot = context.opts.cordova.project ? context.opts.cordova.project.root : context.opts.projectRoot;
  const configXML = path.join(projectRoot, 'config.xml');
  const configParser = new ConfigParser(configXML);

  let contactsPermissionType = configParser.getPlatformPreference('CONTACTS_PERMISSION_TYPE', 'android');

  if (contactsPermissionType !== READ_WRITE && contactsPermissionType !== READ && contactsPermissionType !== NONE) {
    contactsPermissionType = READ_WRITE;
  }

  if (contactsPermissionType === NONE) {
    // Returning without writing to the manifest is sufficient: this plugin doesn't declare
    // permissions statically, so nothing needs to be removed.
    return;
  }

  const manifestFilePath = path.join(projectRoot, 'platforms/android/app/src/main/AndroidManifest.xml');
  const manifestXmlString = fs.readFileSync(manifestFilePath, 'utf-8');

  const parser = new DOMParser();
  const manifestXmlDoc = parser.parseFromString(manifestXmlString, 'text/xml');

  addPermissionToManifest(manifestXmlDoc, READ_CONTACTS);
  if (contactsPermissionType === READ_WRITE) {
    addPermissionToManifest(manifestXmlDoc, WRITE_CONTACTS);
  }

  const serializer = new XMLSerializer();
  const updatedManifestXmlString = serializer.serializeToString(manifestXmlDoc);
  fs.writeFileSync(manifestFilePath, updatedManifestXmlString, 'utf-8');
};

function addPermissionToManifest(manifestXmlDoc, permission) {
  const existingPermissions = Array.from(manifestXmlDoc.getElementsByTagName('uses-permission'));
  const alreadyExists = existingPermissions.some((el) => el.getAttribute('android:name') === permission);

  if (!alreadyExists) {
    const newPermission = manifestXmlDoc.createElement('uses-permission');
    newPermission.setAttribute('android:name', permission);
    manifestXmlDoc.documentElement.appendChild(newPermission);
  }
}
