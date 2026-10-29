# Web and Android release runbook

The same Ionic UI serves web and Android, but publishing them requires separate
evidence. Google entry is hidden unless `VITE_GOOGLE_ENTRY_ENABLED=true`; a
configured client ID alone must never expose the launch surface.

## Web release

1. Keep `VITE_GOOGLE_ENTRY_ENABLED=false` while deploying the SaaS-capable
   bundle until the Google OAuth client exists and the server verifier is ready.
2. Set `VITE_API_BASE_URL` to the verified production `/api/v1` URL and run
   `npm run build`. The bundle verifier must pass.
3. Verify `/privacy`, `/terms`, `/support`, and `/account-deletion` are public,
   readable, HTTPS routes and match the URLs configured on the server and in
   Google Play Console.
4. Test password OWNER, MANAGER, and CASHIER sessions before enabling Google.
5. For paid invited owners, enable `VITE_GOOGLE_ENTRY_ENABLED=true` only after
   `googleKnownIdentity.enabled` is true in server `/readiness`. Generic new
   identities and private demos have separate server gates and may remain off.
6. Before producing the release bundle, set `VITE_API_BASE_URL`,
   `VITE_GOOGLE_WEB_CLIENT_ID`, and `VITE_GOOGLE_ENTRY_ENABLED=true` in the
   deployment environment, then run:

   ```bash
   npm run release:google:check
   npm run build
   ```

   The first command explicitly checks a planned Google release. Every normal
   production build also probes the configured API automatically when the UI
   flag is true; a password-only build with the flag false performs no network
   request. Enabled builds fail if the public web client ID is absent,
   malformed, not ready on the server, or not an exact allow-list match.

The Google Cloud OAuth web client must allow the exact production UI origin,
currently `https://kirana-pos.pages.dev`, and later the custom domain.
Add the same client ID to server `GOOGLE_WEB_CLIENT_IDS`; never add a client
secret to the UI. A paid invited owner requires server `GOOGLE_AUTH_ENABLED`
and `COMMERCIAL_ACTIVATION_ENABLED`, but does not require generic
`GOOGLE_NEW_ENTRY_ENABLED` or `DEMO_PROVISIONING_ENABLED`.
The server returns only SHA-256 audience fingerprints, separated into web and
Android lists. The release check compares the UI web client fingerprint only;
an Android audience cannot accidentally make a web release pass.

The production web site is `https://kirana-pos.pages.dev` on Cloudflare Pages.
A merged PR does not mean the stable site is live: publish the intended `dev`
revision and verify its release manifest before announcing a release.

## Android project

The committed Capacitor project uses application ID
`com.iamrajshah.kiranapos` and app name `Kirana POS`.

```bash
npm run build
npx cap sync android
npm run android:verify
```

Before a signed candidate:

- replace generated placeholder launcher/splash art with approved production
  assets;
- configure Android Credential Manager and the Google Cloud Android client for
  the exact package plus debug/release SHA-1 and SHA-256 fingerprints;
- keep `google-services.json`, signing keys, and `key.properties` out of git;
- verify Google sign-in on a physical device, then app resume, rotating-token
  refresh, two-device replacement, current/all-device logout, membership
  selection, deletion navigation, slow network, dropped network, and reconnect;
- create and verify a signed AAB using the protected release keystore.

Generating the Android project is release preparation, not proof that
Credential Manager or signing is complete. Those remain hard release gates until
device/build evidence is attached.

### Android evidence — 30 October 2026

The production web bundle and Capacitor Android sync completed for revision
`43d69a2`. Gradle verification, emulator workflow evidence, approved store
artwork, and a signed AAB are not recorded as complete in this document. Update
this section only from captured command/device evidence; a successful web release
must never be reused as Android proof.

## iOS status

Do not generate or submit an iOS release candidate yet. The provider-neutral
identity model is ready, but the product still needs Sign in with Apple or a
documented valid exception plus Apple account-deletion compliance.
