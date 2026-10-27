# Web and Android release runbook

The same Ionic UI serves web and Android, but publishing them requires separate
evidence. Google entry is hidden unless `VITE_GOOGLE_ENTRY_ENABLED=true`; a
configured client ID alone must never expose the launch surface.

## Web release

1. Keep `VITE_GOOGLE_ENTRY_ENABLED=false` while deploying the SaaS-capable
   bundle manually to Netlify.
2. Set `VITE_API_BASE_URL` to the verified production `/api/v1` URL and run
   `npm run build`. The bundle verifier must pass.
3. Verify `/privacy`, `/terms`, `/support`, and `/account-deletion` are public,
   readable, HTTPS routes and match the URLs configured on the server and in
   Google Play Console.
4. Test password OWNER, MANAGER, and CASHIER sessions before enabling Google.
5. Enable the UI flag only after server `/readiness` reports Google new entry
   and demo provisioning ready.

Netlify auto-publish stays disabled to conserve the allowance. A merged PR does
not mean the UI is live.

## Android project

The committed Capacitor project uses application ID
`com.iamrajshah.kiranapos` and app name `Kirana POS`.

```bash
npm run build
npx cap sync android
cd android
./gradlew test lint assembleDebug
```

Before a signed candidate:

- replace generated placeholder launcher/splash art with approved production
  assets;
- configure Android Credential Manager and the Google Cloud Android client for
  the exact package plus debug/release SHA-1 and SHA-256 fingerprints;
- keep `google-services.json`, signing keys, and `key.properties` out of git;
- verify Google sign-in on a physical device, then app resume, rotating-token
  refresh, membership selection, deletion navigation, slow network, dropped
  network, and reconnect;
- create and verify a signed AAB using the protected release keystore.

Generating the Android project is release preparation, not proof that
Credential Manager or signing is complete. Those remain hard release gates until
device/build evidence is attached.

## iOS status

Do not generate or submit an iOS release candidate yet. The provider-neutral
identity model is ready, but the product still needs Sign in with Apple or a
documented valid exception plus Apple account-deletion compliance.
