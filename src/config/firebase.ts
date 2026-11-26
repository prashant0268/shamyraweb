import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, setConsent, type Analytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import { isProdEnv } from '../lib/env';
import { consentModeSettings } from '../lib/consent';
import { isPrerender } from '../lib/prerender';

// Web app config comes from Vite env files: .env.production (shamyra-web), .env.test (test project), and the
// git-ignored .env for `npm run dev`. All of it is public (it ships in the bundle). See docs/ENVIRONMENTS.md.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  ...(env.VITE_FIREBASE_MEASUREMENT_ID ? { measurementId: env.VITE_FIREBASE_MEASUREMENT_ID } : {}),
};
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  throw new Error('Firebase web config is missing. Copy .env.example to .env and fill in VITE_FIREBASE_* (see docs/ENVIRONMENTS.md).');
}

const app = initializeApp(firebaseConfig);

// App Check: attests that callable requests come from this site. No-op until VITE_APPCHECK_SITE_KEY is set, so
// builds without a key behave exactly as before. Must run before any callable/Firestore use. See docs/APP_CHECK.md.
// VITE_APPCHECK_PROVIDER: "enterprise" (default, reCAPTCHA Enterprise key) or "v3" (classic reCAPTCHA v3 key).
const appCheckKey = String(env.VITE_APPCHECK_SITE_KEY || '').trim();
if (appCheckKey) {
  if (env.DEV && env.VITE_APPCHECK_DEBUG_TOKEN) {
    // Local dev: register this token under App Check → Apps → Manage debug tokens.
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN === 'true' ? true : env.VITE_APPCHECK_DEBUG_TOKEN;
  }
  try {
    initializeAppCheck(app, {
      provider: env.VITE_APPCHECK_PROVIDER === 'v3' ? new ReCaptchaV3Provider(appCheckKey) : new ReCaptchaEnterpriseProvider(appCheckKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) { console.warn('App Check init failed', e); }
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') connectFunctionsEmulator(functions, 'localhost', 5001);

// Google Analytics only for the real store: test builds, the dev server and the build-time prerender never report.
// Consent Mode defaults (everything optional denied until the visitor chooses; see lib/consent.ts) are set
// before gtag loads, so GA4 starts cookieless.
export let analytics: Analytics | null = null;
if (isProdEnv() && firebaseConfig.measurementId && !isPrerender()) {
  try { setConsent(consentModeSettings()); } catch { /* ignore */ }
  isSupported().then((ok) => { if (ok) analytics = getAnalytics(app); }).catch(() => {});
}

export default app;
