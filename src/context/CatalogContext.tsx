import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { loadProducts, activeOnly, listed, LOCAL_CATALOG } from '../lib/catalog';
import { isPrerender } from '../lib/prerender';
import { isThemeId } from '../themes';
import type { Product, StoreSettings } from '../types';

export const DEFAULT_SETTINGS: StoreSettings = {
  brandName: 'Kind Flames', legalName: 'Shamyra Naturals LLC', contactEmail: 'hello@kindflames.com', contactPhone: '(732) 666-8013',
  freeShippingThreshold: 60, flatShipping: 6.95, expressShipping: 14.5, giftWrapFee: 5, bundleDiscountPercent: 15,
  taxRates: { NJ: 0.06625 }, cardPaymentsEnabled: false, paypalEnabled: true,
  announcement: { text: 'Free US shipping on orders over $60', visible: true, messages: ['Free US shipping on orders over $60', 'New here? Take 10% off your first order with WELCOME10', '30-day happiness guarantee · wrong scent? We swap it'] },
  homepage: { showChristmas: true, showCorporate: true, showNewsletter: true },
  theme: 'hearth', placeholderImages: true,
  popup: { enabled: true, headline: 'Take 10% off your first order', body: 'Join the list for new scents, restocks and the occasional candle-care tip. One email a week at most.', code: 'WELCOME10', delaySeconds: 6 },
  social: { instagram: 'https://instagram.com/kindflames', facebook: '', tiktok: '', pinterest: '' },
};

interface CatalogContextType {
  products: Product[]; allProducts: Product[]; settings: StoreSettings; loading: boolean; source: 'firestore' | 'local';
  bySlug: (slug: string) => Product | undefined; byId: (id: string) => Product | undefined; refresh: () => Promise<void>;
}
const CatalogContext = createContext<CatalogContextType | undefined>(undefined);
export const useCatalog = () => { const c = useContext(CatalogContext); if (!c) throw new Error('useCatalog outside provider'); return c; };

/** Bundled catalog, sorted: what the first render (and the prerendered HTML) shows before Firestore answers. */
const INITIAL_PRODUCTS: Product[] = [...LOCAL_CATALOG].sort((a, b) => a.sortOrder - b.sortOrder);
/** Start from the theme the last visit saw (index.html applies it before paint) so the page does not flip back to
 *  the default theme while settings load. */
const initialSettings = (): StoreSettings => {
  if (isPrerender()) return DEFAULT_SETTINGS;
  try { const t = localStorage.getItem('kf_theme'); if (isThemeId(t)) return { ...DEFAULT_SETTINGS, theme: t }; } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
};

/**
 * Renders from the bundled catalog immediately (no "Loading…" flash, no layout shift) and swaps in Firestore
 * products/settings in the background. `loading` stays true until Firestore answers, so pages can tell
 * "not in the bundled catalog yet" from "does not exist".
 */
export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [allProducts, setAll] = useState<Product[]>(INITIAL_PRODUCTS);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [loading, setLoading] = useState(!isPrerender());
  const [source, setSource] = useState<'firestore' | 'local'>('local');

  const refresh = useCallback(async () => {
    const [{ products, source }, s] = await Promise.all([
      loadProducts(),
      getDoc(doc(db, 'settings', 'store')).then((d): Partial<StoreSettings> => (d.exists() ? (d.data() as Partial<StoreSettings>) : {})).catch((): Partial<StoreSettings> => ({})),
    ]);
    setAll(products); setSource(source);
    setSettings({ ...DEFAULT_SETTINGS, ...s, announcement: { ...DEFAULT_SETTINGS.announcement, ...(s.announcement || {}) }, homepage: { ...DEFAULT_SETTINGS.homepage, ...(s.homepage || {}) }, popup: { ...DEFAULT_SETTINGS.popup!, ...(s.popup || {}) }, social: { ...DEFAULT_SETTINGS.social, ...(s.social || {}) } });
    setLoading(false);
  }, []);

  // The build-time prerender renders the bundled catalog only, so its HTML is deterministic and matches first paint.
  useEffect(() => { if (!isPrerender()) refresh(); }, [refresh]);

  const products = useMemo(() => listed(allProducts), [allProducts]);
  const active = useMemo(() => activeOnly(allProducts), [allProducts]);
  const value = useMemo<CatalogContextType>(() => ({
    products, allProducts, settings, loading, source, refresh,
    bySlug: (slug) => active.find((p) => p.slug === slug || p.id === slug),
    byId: (id) => allProducts.find((p) => p.id === id),
  }), [products, active, allProducts, settings, loading, source, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};
