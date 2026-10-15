import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyCLoDz-OwPfYexTIQ-9qGenygouZUmaTdA',
  authDomain: 'shamyra-web.firebaseapp.com',
  projectId: 'shamyra-web',
  storageBucket: 'shamyra-web.firebasestorage.app',
  messagingSenderId: '909680715029',
  appId: '1:909680715029:web:c93a39abb2e917b1a9f51c',
  measurementId: 'G-WRPNS5PCPK',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') connectFunctionsEmulator(functions, 'localhost', 5001);

export let analytics: Analytics | null = null;
if (import.meta.env.PROD) isSupported().then((ok) => { if (ok) analytics = getAnalytics(app); }).catch(() => {});

export default app;
