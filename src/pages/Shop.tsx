import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { byCategory, minPrice } from '../lib/catalog';
import { useSeo } from '../lib/seo';
import ProductCard from '../components/ui/ProductCard';
import { CATEGORY_LABELS, type Category } from '../types';

const CATS: { key: Category | 'all' | 'body'; label: string }[] = [{ key: 'all', label: 'All' }, { key: 'candle', label: 'Candles' }, { key: 'body', label: 'Bath & Body' }, { key: 'scrub', label: 'Scrubs' }, { key: 'lotion', label: 'Lotions' }, { key: 'salt', label: 'Bath Salts' }, { key: 'set', label: 'Gift Sets' }];
const TITLES: Record<string, string> = { all: 'Everything', body: 'Bath & Body', ...CATEGORY_LABELS };

export default function Shop() {
  const { category = 'all' } = useParams();
  const [params, setParams] = useSearchParams();
  const { products, loading } = useCatalog();
  const q = (params.get('q') || '').toLowerCase();
  const family = params.get('family') || '';
  const sort = params.get('sort') || 'featured';
  const max = Number(params.get('max') || 0);
  const cat = (CATS.some((c) => c.key === category) ? category : 'all') as Category | 'all' | 'body';
  useSeo({ title: `${TITLES[cat]}${q ? ` · “${q}”` : ''}`, description: `Shop ${(TITLES[cat] || '').toLowerCase()} from Kind Flames — hand-poured candles and small-batch bath & body.`, path: `/shop${cat === 'all' ? '' : '/' + cat}` });

  const families = useMemo(() => [...new Set(byCategory(products, cat).map((p) => p.family))].sort(), [products, cat]);
  const list = useMemo(() => {
    let l = byCategory(products, cat);
    if (family) l = l.filter((p) => p.family === family);
    if (max) l = l.filter((p) => minPrice(p) <= max);
    if (q) l = l.filter((p) => [p.name, p.family, p.tagline, p.description, p.notes?.top, p.notes?.heart, p.notes?.base, CATEGORY_LABELS[p.category]].join(' ').toLowerCase().includes(q));
    if (sort === 'price-asc') l = [...l].sort((a, b) => minPrice(a) - minPrice(b));
    if (sort === 'price-desc') l = [...l].sort((a, b) => minPrice(b) - minPrice(a));
    if (sort === 'new') l = [...l].sort((a, b) => Number(b.isNewArrival) - Number(a.isNewArrival));
    return l;
  }, [products, cat, family, q, sort, max]);

  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };

  return (
    <div className="wrap py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow">Shop</div><h1 className="text-3xl sm:text-4xl">{TITLES[cat]}{q && <span className="text-muted"> · “{q}”</span>}</h1></div>
        <span className="text-sm text-muted">{loading ? 'Loading…' : `${list.length} product${list.length === 1 ? '' : 's'}`}</span>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map((c) => <Link key={c.key} to={c.key === 'all' ? '/shop' : `/shop/${c.key}`} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${cat === c.key ? 'border-pine bg-pine text-pine-ink' : 'border-line bg-surface hover:bg-surface-2'}`}>{c.label}</Link>)}
      </div>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="flex gap-6 overflow-x-auto pb-2 text-sm md:flex-col md:overflow-visible">
          <div className="min-w-44">
            <div className="mb-2 font-bold">Scent family</div>
            <label className="flex items-center gap-2 py-0.5"><input type="radio" name="family" checked={!family} onChange={() => set('family', '')} /> Any</label>
            {families.map((f) => <label key={f} className="flex items-center gap-2 py-0.5"><input type="radio" name="family" checked={family === f} onChange={() => set('family', f)} /> {f}</label>)}
          </div>
          <div className="min-w-44">
            <div className="mb-2 font-bold">Max price</div>
            <input type="range" min={10} max={70} step={5} value={max || 70} onChange={(e) => set('max', Number(e.target.value) >= 70 ? '' : e.target.value)} className="w-full" aria-label="Maximum price" />
            <div className="text-xs text-muted">{max ? `Up to $${max}` : 'Any price'}</div>
          </div>
          <div className="min-w-44">
            <div className="mb-2 font-bold">Sort</div>
            <select value={sort} onChange={(e) => set('sort', e.target.value === 'featured' ? '' : e.target.value)} className="input text-sm" aria-label="Sort"><option value="featured">Featured</option><option value="new">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select>
          </div>
        </aside>
        <div>
          {!loading && list.length === 0 ? (
            <div className="py-16 text-center text-muted">Nothing matches. <Link to="/shop" className="text-pine underline">Clear filters</Link></div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
