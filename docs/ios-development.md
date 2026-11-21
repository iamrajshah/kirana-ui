# iOS development build

Main POS bundle: `com.iamrajshah.kiranapos`. Native source is checked in; Pods,
web assets, provisioning profiles, archives and signed packages are generated.
Use Xcode and CocoaPods on macOS. Keep Capacitor core/android/ios at compatible
5.7.8 versions until a separate coordinated upgrade is reviewed.

```sh
npm ci
npm run ios:sync
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Debug -destination 'generic/platform=iOS' \
  -archivePath /absolute/output/Kirana-POS.xcarchive \
  DEVELOPMENT_TEAM=YOUR_TEAM -allowProvisioningUpdates archive
```

Export with Xcode Organizer or `xcodebuild -exportArchive`, using a development
export options plist (`method: debugging` on current Xcode). An IPA signed for
registered development devices is not a universal installer or App Store build.
Install the exported `.app` with Xcode Devices or `xcrun devicectl device install
app --device DEVICE_ID /absolute/path/App.app`, then launch the bundle.

`npm run build` probes the production API’s Google readiness; network access is
required. Verify `dist/release.json` revision and API URL before `cap sync` and
archive. Do not use local-QA origins in a device package for a shop owner.

## Authentication

- Password login, refresh, membership and device-replacement use an `IOS`
  descriptor. The backend must include iOS admission and allow the fixed
  `capacitor://localhost` origin. Device caps are unchanged.
- `KiranaBridgeViewController` registers the secure auth plugin. It stores only
  allowed session keys in app-scoped Keychain, device-only and accessible while
  unlocked. No plaintext token fallback is permitted.
- Google Identity’s browser widget is deliberately excluded from WKWebView.
  Native iOS Google client/SDK setup is pending; web/Android sign-in is unchanged.
  Store review obligations, privacy manifests and distribution signing must be
  reviewed before publishing. This development package is for device testing.

## Validation

Run `npm test`, `npm run lint`, and `npm run build`. Native-specific JS tests cover
IOS device identity, secure-store persistence/hydration, unchanged browser
storage and absence of embedded browser Google sign-in. Actual Keychain access,
process relaunch, camera, sharing, printing and phone/tablet layouts must also be
checked on iOS; JS mocks and archive success do not prove those integrations.
