/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
  readonly VITE_GOOGLE_ANDROID_CLIENT_ID?: string;
  readonly VITE_GOOGLE_ENTRY_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
