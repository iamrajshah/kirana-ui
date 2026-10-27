# Google identity configuration

The browser uses Google Identity Services with `VITE_GOOGLE_WEB_CLIENT_ID`. The Android build must use Android Credential Manager and pass its returned Google ID token to the same `POST /auth/google/exchange` contract with `source: "android"`. Configure its audience with `VITE_GOOGLE_ANDROID_CLIENT_ID` and the matching server-side `GOOGLE_ANDROID_CLIENT_IDS` allow-list.

Do not put client secrets in the app. Android platform folders and Credential Manager wiring are intentionally deferred to the native packaging unit; this repository only defines the provider-neutral credential contract.
