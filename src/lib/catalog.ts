import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Product, Category } from '../types';
import localCatalog from '../data/catalog.json';

export const LOCAL_CATALOG = localCatalog as Product[];

/** Firestore products if seeded; otherwise the bundled catalog so the store always renders. */
export async function loadProducts(): Promise<{ products: Product[]; source: 'firestore' | 'local' }> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (!snap.empty) {
      const products = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) })).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return { products, source: 'firestore' };
    }
  } catch (e) { console.warn('catalog: falling back to local', e); }
  return { products: [...LOCAL_CATALOG].sort((a, b) => a.sortOrder - b.sortOrder), source: 'local' };
}

export const activeOnly = (ps: Product[]) => ps.filter((p) => p.active !== false);
export const byCategory = (ps: Product[], c: Category | 'all' | 'body') => c === 'all' ? ps : c === 'body' ? ps.filter((p) => ['scrub', 'lotion', 'salt'].includes(p.category)) : ps.filter((p) => p.category === c);
export const inStock = (p: Product) => p.variants.some((v) => typeof v.stock !== 'number' || v.stock > 0);
export const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price));
