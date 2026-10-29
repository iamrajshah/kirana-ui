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
`googleKnownIdentity` readiness and reports blocker codes without printing the
client ID or any credential.
