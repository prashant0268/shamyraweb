import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { track } from './analytics';

const KEY = 'kf_wishlist';
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const listeners = new Set<() => void>();
let ids = read();
const write = (next: string[], uid?: string | null) => { ids = next; try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } if (uid) setDoc(doc(db, 'users', uid), { wishlist: next }, { merge: true }).catch(() => {}); listeners.forEach((l) => l()); };

/** Wishlist in localStorage, mirrored to users/{uid}.wishlist when signed in. */
export function useWishlist() {
  const { user } = useAuth();
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    getDoc(doc(db, 'users', user.uid)).then((s) => { const remote: string[] = s.exists() ? s.data().wishlist || [] : []; const merged = [...new Set([...ids, ...remote])]; if (merged.length !== ids.length) write(merged, user.uid); }).catch(() => {});
  }, [user]);
  const uid = user && !user.isAnonymous ? user.uid : null;
  const has = useCallback((id: string) => ids.includes(id), []);
  const toggle = useCallback((id: string) => { const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]; if (!ids.includes(id)) track('add_to_wishlist', { items: [{ item_id: id }] }); write(next, uid); }, [uid]);
  return { ids, has, toggle };
}
