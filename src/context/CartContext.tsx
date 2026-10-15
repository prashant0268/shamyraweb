import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { track } from '../lib/analytics';
import type { CartContextType, CartItem, HydratedCartItem } from '../types';

const KEY = 'kf_cart_v2';
const CartContext = createContext<CartContextType | undefined>(undefined);
export const useCart = () => { const c = useContext(CartContext); if (!c) throw new Error('useCart outside provider'); return c; };

const readLocal = (): CartItem[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const same = (a: CartItem, b: CartItem) => a.productId === b.productId && a.variantId === b.variantId && (a.bundle || null) === (b.bundle || null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { byId } = useCatalog();
  const [items, setItems] = useState<CartItem[]>(readLocal);
  const [isOpen, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const syncedUid = useRef<string | null>(null);

  // Merge a signed-in (non-guest) user's saved cart once per session.
  useEffect(() => {
    if (!user || user.isAnonymous || syncedUid.current === user.uid) { setReady(true); return; }
    syncedUid.current = user.uid;
    getDoc(doc(db, 'carts', user.uid)).then((snap) => {
      const remote: CartItem[] = snap.exists() ? snap.data().items || [] : [];
      setItems((local) => {
        const merged = [...local];
        for (const r of remote) { const i = merged.findIndex((l) => same(l, r)); const m = merged[i]; if (m) merged[i] = { ...m, quantity: Math.max(m.quantity, r.quantity) }; else merged.push(r); }
        return merged;
      });
    }).catch(() => {}).finally(() => setReady(true));
  }, [user]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode */ }
    if (ready && user && !user.isAnonymous) setDoc(doc(db, 'carts', user.uid), { items, updatedAt: serverTimestamp() }).catch(() => {});
  }, [items, user, ready]);

  const add = useCallback<CartContextType['add']>((productId, variantId, quantity = 1, bundle = null) => {
    setItems((prev) => {
      const next = [...prev];
      const i = next.findIndex((l) => same(l, { productId, variantId, quantity, bundle }));
      const cur = next[i]; if (cur) next[i] = { ...cur, quantity: Math.min(20, cur.quantity + quantity) };
      else next.push({ productId, variantId, quantity, bundle });
      return next;
    });
    const p = byId(productId);
    track('add_to_cart', { items: [{ item_id: productId, item_name: p?.name, item_variant: variantId, quantity }] });
    setOpen(true);
  }, [byId]);

  const remove = useCallback<CartContextType['remove']>((productId, variantId) => setItems((prev) => prev.filter((l) => !(l.productId === productId && l.variantId === variantId))), []);
  const setQuantity = useCallback<CartContextType['setQuantity']>((productId, variantId, quantity) => {
    if (quantity <= 0) return remove(productId, variantId);
    setItems((prev) => prev.map((l) => (l.productId === productId && l.variantId === variantId ? { ...l, quantity: Math.min(20, quantity) } : l)));
  }, [remove]);
  const clear = useCallback(() => setItems([]), []);

  const hydrated = useMemo<HydratedCartItem[]>(() => items.flatMap((l) => {
    const product = byId(l.productId); const variant = product?.variants.find((v) => v.id === l.variantId);
    return product && variant ? [{ ...l, product, variant }] : [];
  }), [items, byId]);

  const value = useMemo<CartContextType>(() => ({
    items, hydrated, isOpen, ready,
    count: hydrated.reduce((n, l) => n + l.quantity, 0),
    subtotal: hydrated.reduce((n, l) => n + l.variant.price * l.quantity, 0),
    add, remove, setQuantity, clear, open: () => setOpen(true), close: () => setOpen(false),
  }), [items, hydrated, isOpen, ready, add, remove, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
