import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, signInAnonymously,
  sendPasswordResetEmail, updateProfile, GoogleAuthProvider, linkWithCredential, EmailAuthProvider, type User,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { ensureAdmin } from '../services/api';
import type { AuthContextType, UserProfile } from '../types';

const googleProvider = new GoogleAuthProvider();
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

async function toProfile(u: User): Promise<UserProfile> {
  let isAdmin = false;
  try {
    const token = await u.getIdTokenResult();
    isAdmin = token.claims.admin === true;
    if (!isAdmin && !u.isAnonymous && u.email) {
      const r = await ensureAdmin({});
      if (r.refreshed) { await u.getIdToken(true); isAdmin = (await u.getIdTokenResult()).claims.admin === true; }
    }
  } catch { /* admin check is best-effort */ }
  return { uid: u.uid, email: u.email, displayName: u.displayName, isAnonymous: u.isAnonymous, isAdmin, creationTime: u.metadata.creationTime };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (u) => { setUser(u ? await toProfile(u) : null); setLoading(false); }), []);

  const value: AuthContextType = {
    user, loading,
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signup: async (email, password, name) => {
      // If the visitor checked out as a guest, upgrade that anonymous account so their orders stay attached.
      if (auth.currentUser?.isAnonymous) {
        const cred = await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password));
        if (name) await updateProfile(cred.user, { displayName: name });
        setUser(await toProfile(cred.user));
        return cred;
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      return cred;
    },
    loginWithGoogle: () => signInWithPopup(auth, googleProvider),
    loginAsGuest: async () => {
      if (auth.currentUser) return user ?? (await toProfile(auth.currentUser));
      const cred = await signInAnonymously(auth);
      const p = await toProfile(cred.user);
      setUser(p);
      return p;
    },
    logout: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/login`, handleCodeInApp: false }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
