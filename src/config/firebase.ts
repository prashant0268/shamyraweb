import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { isProdEnv } from '../lib/env';

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') connectFunctionsEmulator(functions, 'localhost', 5001);

// Google Analytics only for the real store: test builds and the dev server never report.
export let analytics: Analytics | null = null;
if (isProdEnv() && firebaseConfig.measurementId) isSupported().then((ok) => { if (ok) analytics = getAnalytics(app); }).catch(() => {});

export default app;
