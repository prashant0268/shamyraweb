/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** production | test | development — see src/lib/env.ts and docs/ENVIRONMENTS.md */
  readonly VITE_ENV?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  readonly VITE_PAYPAL_CLIENT_ID_LIVE?: string;
  readonly VITE_USE_EMULATOR?: string;
  readonly VITE_META_PIXEL_ID?: string;
  /** reCAPTCHA Enterprise (or v3) site key for Firebase App Check; unset = App Check off. docs/APP_CHECK.md */
  readonly VITE_APPCHECK_SITE_KEY?: string;
  /** "enterprise" (default) | "v3" */
  readonly VITE_APPCHECK_PROVIDER?: string;
  /** Dev only: App Check debug token ("true" to have the SDK generate one and log it). */
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
}
