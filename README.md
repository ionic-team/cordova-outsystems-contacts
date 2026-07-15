# cordova-outsystems-contacts

OutSystems' Cordova plugin for device contacts: access, search, pick, create,
update and remove. One half of a unified pair with the
[Capacitor plugin](https://github.com/ionic-team/capacitor-contacts) —
both expose the exact same API (method names, options, result shapes and
`OS-PLUG-CONT-NNNN` error codes).

This project has two packages:

1. the Cordova plugin, [`com.outsystems.plugins.contacts`](packages/cordova-plugin)
2. the JS node scripts consumed by the OutSystems low-code module, [`outsystems-wrapper`](packages/outsystems-wrapper)

Built on the modern platform contact APIs: **Contacts framework
(`CNContactStore`)** on iOS — never the deprecated AddressBook — with full
iOS 18+ **Limited Access** support, and **`ContactsContract`** on Android.

See [NOTICE](NOTICE) for attribution to the Apache Cordova contacts plugin
this project supersedes.
# cordova-outsystems-contacts
