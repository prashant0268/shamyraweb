import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { loadProducts, activeOnly, listed } from '../lib/catalog';
import type { Product, StoreSettings } from '../types';

export const DEFAULT_SETTINGS: StoreSettings = {
  brandName: 'Kind Flames', legalName: 'Shamyra Naturals LLC', contactEmail: 'hello@kindflames.com', contactPhone: '(732) 666-8013',
  freeShippingThreshold: 60, flatShipping: 6.95, expressShipping: 14.5, giftWrapFee: 5, bundleDiscountPercent: 15,
  taxRates: { NJ: 0.06625 }, cardPaymentsEnabled: false, paypalEnabled: true,
  announcement: { text: 'Free US shipping on orders over $60', visible: true },
  homepage: { showChristmas: true, showCorporate: true, showNewsletter: true },
};

interface CatalogContextType {
  products: Product[]; allProducts: Product[]; settings: StoreSettings; loading: boolean; source: 'firestore' | 'local';
  bySlug: (slug: string) => Product | undefined; byId: (id: string) => Product | undefined; refresh: () => Promise<void>;
}
const CatalogContext = createContext<CatalogContextType | undefined>(undefined);
export const useCatalog = () => { const c = useContext(CatalogContext); if (!c) throw new Error('useCatalog outside provider'); return c; };

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [allProducts, setAll] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'firestore' | 'local'>('local');

  const refresh = useCallback(async () => {
    const [{ products, source }, s] = await Promise.all([
      loadProducts(),
      getDoc(doc(db, 'settings', 'store')).then((d): Partial<StoreSettings> => (d.exists() ? (d.data() as Partial<StoreSettings>) : {})).catch((): Partial<StoreSettings> => ({})),
    ]);
    setAll(products); setSource(source);
    setSettings({ ...DEFAULT_SETTINGS, ...s, announcement: { ...DEFAULT_SETTINGS.announcement, ...(s.announcement || {}) }, homepage: { ...DEFAULT_SETTINGS.homepage, ...(s.homepage || {}) } });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const products = useMemo(() => listed(allProducts), [allProducts]);
  const active = useMemo(() => activeOnly(allProducts), [allProducts]);
  const value = useMemo<CatalogContextType>(() => ({
    products, allProducts, settings, loading, source, refresh,
    bySlug: (slug) => active.find((p) => p.slug === slug || p.id === slug),
    byId: (id) => allProducts.find((p) => p.id === id),
  }), [products, active, allProducts, settings, loading, source, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};
