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
  unlocked. The explicit Keychain entitlement is scoped to this app identifier.
  Sign simulator builds as well; unsigned builds can fail secure-store reads.
  No plaintext token fallback is permitted. A failed vault read shows an
  unlock/retry screen. Native login waits for the durable session bundle before
  authenticating/navigating; writes are serialized and pending login cannot
  authenticate after logout.
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

The mutating tests require `KIRANA_QA_EMAIL`, `KIRANA_QA_PASSWORD`,
`KIRANA_QA_SHOP`, `KIRANA_QA_PRODUCT` and `KIRANA_QA_CUSTOMER` in the test runner's
environment. Put them in a private generated `.xctestrun` EnvironmentVariables
map or a local Xcode test plan; never commit credentials. Missing configuration
skips the journeys and must not be reported as a business-flow pass. The expected
shop name is checked before writing bills. Cross-check database invoices,
payment allocations, signed ledger amounts and stock after every run. Wait for
visible Dashboard content after payment, not merely its navigation tab.

Do not nest `IonPage` inside inline `IonModal` content. It inherits the router
context and can replace the active route-page registration, leaving navigation
labels updated while old content stays visible. Use the modal delegate or a
plain `div.ion-page` for layout. The SDK registration regression and source
contract guard this across payment, category, inventory and user modals.

The button's Google G artwork comes from the official GoogleSignIn 9.0.0 SDK
(`GoogleSignIn/Sources/Resources/google@2x.png`); use it only with Google's sign-in
branding. SDK sources are installed through CocoaPods, pinned in Podfile.lock.


For a real Google check, explicitly set `KIRANA_QA_REAL_GOOGLE=1` in the private
runner environment and select `test04RealGoogleSignInOnPhone`. The phone owner
accepts Privacy/Terms and handles account selection/MFA. Never put Google account
passwords in the runner. `test05InspectInstalledAuthenticatedApp` requires this
flag, `KIRANA_QA_AUTH_INSPECTION=1`, or an explicit QA shop fixture; an unconfigured
inspection skips rather than treating a missing login as a product failure.

Keep the iPhone unlocked and awake during the run. Auto-lock can cause debugger
launch/PID errors or `kAXErrorServerNotFound`; retry after unlocking before
classifying these as app defects. Use an explicit `arch=arm64` destination when
Xcode reports multiple arm64/arm64e matches.

To verify a signed release app, copy the generated `.xctestrun` beside the original
so `__TESTROOT__` still resolves, then set `UITargetAppPath` to the absolute
archive's `Products/Applications/App.app` and update its dependent app path.
Keep the signed test-runner paths intact. This prevents a test run from silently
replacing the release app with the Debug build. The release-path run, Google
sign-in and cold session restoration passed on the connected iPhone; see the
handbook's physical-iPhone record for exact evidence.
