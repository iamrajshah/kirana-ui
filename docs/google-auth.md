# Google identity configuration

The browser uses Google Identity Services with `VITE_GOOGLE_WEB_CLIENT_ID`. Android uses the native `KiranaNativeAuth` Capacitor plugin and Android Credential Manager, then passes the returned Google ID token to `POST /auth/google/exchange` with `source: "android"`. The value exposed as `VITE_GOOGLE_WEB_CLIENT_ID` is the OAuth web/server client ID used as the ID-token audience; allow-list the same value in the server configuration. Configure the Google Cloud Android client separately for `com.iamrajshah.kiranapos` and each debug/release signing SHA fingerprint.

Do not put client secrets in the app. Password and Google authentication both send a stable installation descriptor. Android access and refresh tokens are stored as one encrypted bundle backed by Android Keystore; they must never be copied to browser `localStorage` in the native app.

The normal product limit is two active installations per identity. When the limit is reached, the user must explicitly replace an existing device after re-authentication. This is an operational installation limit, not tamper-proof licensing: a custom client can spoof a caller-supplied installation identifier. Cryptographic proof-of-possession is required before treating device count as a hard anti-sharing control.

## Web release check

Google remains deliberately fail-closed. `VITE_GOOGLE_ENTRY_ENABLED=true`
shows the shared Google sign-in surface for known identities and paid onboarding
invitations; it does not open generic demo admission. Configure the exact public
web client ID in both `VITE_GOOGLE_WEB_CLIENT_ID` and the server
`GOOGLE_WEB_CLIENT_IDS`, allow the production web origin in Google Cloud, and
run `npm run release:google:check` before building. The check requires server
`googleKnownIdentity` readiness and an exact SHA-256 match in the server's web
audience fingerprints. Android fingerprints are evaluated separately and
cannot satisfy the web check. Enabled production builds run the same probe
automatically; disabled password-only builds remain offline-capable. Checks
report blocker codes without printing the client ID or any credential.

## Verified production state — 30 October 2026

Cloudflare Pages release `7dc81aa` enables the Google entry surface at
`https://kirana-pos.pages.dev`. The matching Railway readiness contract enables
known identities while generic new-user entry, shared demo provisioning, and
automatic commercial activation remain disabled.

The first live invitation was verified end to end against Jayesh Trading: the
approved Google email linked to the existing active OWNER, the invitation was
consumed once, the password hash remained present, and no duplicate identity,
user, membership, or tenant was created. The web release also verifies that
public password/Google failures stay outside protected-session refresh and
logout handling, cold loading does not report a false Google cancellation, and
the rendered Google button follows phone/tablet width changes.

This web proof is not a Play Store release. Before publishing Android, register
the Play App Signing SHA fingerprint as an Android OAuth client, produce a
signed AAB, and repeat Google sign-in, relaunch, device replacement, logout, and
network recovery on physical phone and tablet hardware.
