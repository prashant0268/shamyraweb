import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { LOCAL_CATALOG } from '../lib/catalog';
import type { Discount, Product, Quote, Review, StoreSettings } from '../types';

export async function saveProduct(p: Product) {
  const { id, ...data } = p;
  await setDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
export const deleteProduct = (id: string) => deleteDoc(doc(db, 'products', id));
export async function importDefaultCatalog(overwrite = false) {
  const batch = writeBatch(db);
  const existing = overwrite ? new Set<string>() : new Set((await getDocs(collection(db, 'products'))).docs.map((d) => d.id));
  let n = 0;
  for (const p of LOCAL_CATALOG) { if (existing.has(p.id)) continue; const { id, ...data } = p; batch.set(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() }); n++; }
  await batch.commit();
  return n;
}
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const r = ref(storage, `products/${productId}/${Date.now()}-${safe}`);
  await uploadBytes(r, file, { contentType: file.type, cacheControl: 'public,max-age=31536000' });
  return getDownloadURL(r);
}
export const saveSettings = (s: Partial<StoreSettings>) => setDoc(doc(db, 'settings', 'store'), { ...s, updatedAt: serverTimestamp() }, { merge: true });

export async function listDiscounts(): Promise<Discount[]> { const s = await getDocs(collection(db, 'discounts')); return s.docs.map((d) => ({ ...(d.data() as Discount), code: d.id })); }
export const saveDiscount = (d: Discount) => { const { code, ...data } = d; return setDoc(doc(db, 'discounts', code.toUpperCase()), { ...data, code: code.toUpperCase(), updatedAt: serverTimestamp() }, { merge: true }); };
export const deleteDiscount = (code: string) => deleteDoc(doc(db, 'discounts', code));

export async function listQuotes(): Promise<Quote[]> { const s = await getDocs(query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(200))); return s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Quote, 'id'>) })); }
export const updateQuote = (id: string, data: Partial<Quote>) => setDoc(doc(db, 'quotes', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
export const deleteQuote = (id: string) => deleteDoc(doc(db, 'quotes', id));

export async function listReviews(): Promise<Review[]> { const s = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(200))); return s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) })); }
export const setReviewApproved = (id: string, approved: boolean) => setDoc(doc(db, 'reviews', id), { approved }, { merge: true });
export const deleteReview = (id: string) => deleteDoc(doc(db, 'reviews', id));

export async function listNewsletter(): Promise<{ email: string; createdAt?: { seconds: number } }[]> { const s = await getDocs(collection(db, 'newsletter')); return s.docs.map((d) => ({ email: d.id, ...(d.data() as { createdAt?: { seconds: number } }) })); }
export interface MarketingContact { email: string; firstName?: string; source: 'newsletter' | 'order'; welcomeStage: number; unsubscribed: boolean; resend?: { contactId: string | null; syncedAt?: { seconds: number } } | null; lastOrderAt?: { seconds: number } | null; createdAt?: { seconds: number } | null }
export async function listMarketing(): Promise<MarketingContact[]> { const s = await getDocs(query(collection(db, 'marketing'), orderBy('createdAt', 'desc'), limit(500))); return s.docs.map((d) => ({ email: d.id, ...(d.data() as Omit<MarketingContact, 'email'>) })); }

