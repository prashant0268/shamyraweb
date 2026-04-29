import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCLoDz-OwPfYexTIQ-9qGenygouZUmaTdA",
  authDomain: "shamyra-web.firebaseapp.com",
  projectId: "shamyra-web",
  storageBucket: "shamyra-web.firebasestorage.app",
  messagingSenderId: "909680715029",
  appId: "1:909680715029:web:c93a39abb2e917b1a9f51c",
  measurementId: "G-WRPNS5PCPK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
