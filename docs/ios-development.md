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
- Google sign-in uses Google's native iOS SDK and an external authentication
  session. `GIDClientID`, reversed-client URL scheme and `GIDServerClientID` are
  set in Info.plist; AppDelegate routes the callback to GIDSignIn before Capacitor.
  These IDs are public configuration, not client secrets. Railway must configure
  GOOGLE_IOS_CLIENT_IDS with the registered native presenter. The backend verifies
  signature/issuer/expiry/server audience, signed azp and verified email; roles,
  memberships, demo rollout, device limits and linking remain server-owned.
- iOS bridge console logging is disabled to avoid printing credentials. Only the
  ID token crosses the native bridge; Google access/refresh tokens stay in its SDK.
- Store review obligations, Sign in with Apple policy, privacy manifests and
  distribution signing must be reviewed before publishing. This development
  package is for device testing.

## Validation

Run `npm test`, `npm run lint`, and `npm run build`. Native-specific JS tests cover
IOS device identity, secure-store persistence/hydration, unchanged browser
storage and native iOS routing without an embedded browser Google widget. Actual Keychain access,
process relaunch, camera, sharing, printing and phone/tablet layouts must also be
checked on iOS; JS mocks and archive success do not prove those integrations.


## Physical-device QA

The shared `KiranaPhone` Xcode scheme contains `KiranaFlowUITests`. Run on an
unlocked, trusted USB-connected iPhone with Developer Mode enabled:

```sh
xcodebuild -workspace ios/App/App.xcworkspace -scheme KiranaPhone \
  -destination 'platform=iOS,id=YOUR_DEVICE_UDID' \
  DEVELOPMENT_TEAM=YOUR_TEAM -allowProvisioningUpdates test
```

Keep OAuth/MFA and any legal acceptance under the account owner's control.
Mutating billing/khata/payment journeys must first verify a disposable demo
shop; do not use another tenant's live books. Keep local screenshots/XCResults
private and commit only sanitized scenario results. A simulator or successful
archive is not a completed physical-device business-flow pass.

The button's Google G artwork comes from the official GoogleSignIn 9.0.0 SDK
(`GoogleSignIn/Sources/Resources/google@2x.png`); use it only with Google's sign-in
branding. SDK sources are installed through CocoaPods, pinned in Podfile.lock.
