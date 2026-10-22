import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { byCategory, minPrice } from '../lib/catalog';
import { useSeo } from '../lib/seo';
import { IMG, FAMILY_IMAGES, FAMILY_BLURBS } from '../data/imagery';
import ProductCard from '../components/ui/ProductCard';
import { CATEGORY_LABELS, type Category } from '../types';

const CATS: { key: Category | 'all' | 'body'; label: string }[] = [{ key: 'all', label: 'All' }, { key: 'candle', label: 'Candles' }, { key: 'body', label: 'Bath & Body' }, { key: 'scrub', label: 'Scrubs' }, { key: 'lotion', label: 'Lotions' }, { key: 'salt', label: 'Bath Salts' }, { key: 'set', label: 'Gift Sets' }];
const TITLES: Record<string, string> = { all: 'Everything', body: 'Bath & Body', ...CATEGORY_LABELS };
const BANNERS: Record<string, string> = { all: IMG.sceneCluster, candle: IMG.catCandles, body: IMG.bath, scrub: IMG.catScrubs, lotion: IMG.catLotions, salt: IMG.catSalts, set: IMG.catSets };
const BLURBS: Record<string, string> = { all: 'Candles, scrubs, lotions, soaks and sets. Every scent family runs across the whole line.', candle: 'Hand-poured coconut-soy in 4, 8 and 12 oz. Cotton or wood wicks, 45–60 hours.', body: 'Scrubs, lotions and soaks that share a scent family with a candle.', scrub: 'Fine sugar or coffee grounds in almond and jojoba oil.', lotion: 'Fast-absorbing, fragrance-light, full INCI on the label.', salt: 'Magnesium-rich epsom and pink salt soaks.', set: 'Boxed and ready, matched by scent.' };

export default function Shop() {
  const { category = 'all' } = useParams();
  const [params, setParams] = useSearchParams();
  const { products, loading } = useCatalog();
  const q = (params.get('q') || '').toLowerCase();
  const family = params.get('family') || '';
  const sort = params.get('sort') || 'featured';
  const max = Number(params.get('max') || 0);
  const cat = (CATS.some((c) => c.key === category) ? category : 'all') as Category | 'all' | 'body';
  const title = family ? `${family} scents` : q ? `Results for “${q}”` : max ? `${TITLES[cat]} under $${max}` : TITLES[cat];
  useSeo({ title: `${TITLES[cat]}${q ? ` · “${q}”` : ''}${family ? ` · ${family}` : ''}`, description: `Shop ${(TITLES[cat] || '').toLowerCase()} from Kind Flames — hand-poured candles and small-batch bath & body.`, path: `/shop${cat === 'all' ? '' : '/' + cat}` });

  const families = useMemo(() => [...new Set(byCategory(products, cat).map((p) => p.family))].filter((f) => f !== 'Mixed').sort(), [products, cat]);
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
  const pill = (on: boolean) => `nav-link whitespace-nowrap rounded-pill border px-4 py-1.5 text-sm ${on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface hover:bg-surface-2'}`;
  const banner = family && FAMILY_IMAGES[family] ? FAMILY_IMAGES[family] : BANNERS[cat];

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-pine text-white">
        <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10" />
        <div className="wrap relative py-12 sm:py-16">
          <div className="eyebrow !text-white/75">{family ? 'Scent family' : 'Shop'}</div>
          <h1 className="mt-1 text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-[52ch] text-white/85">{family ? FAMILY_BLURBS[family] : BLURBS[cat]}</p>
        </div>
      </section>

      <div className="wrap py-6">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {CATS.map((c) => <Link key={c.key} to={`${c.key === 'all' ? '/shop' : `/shop/${c.key}`}${family ? `?family=${encodeURIComponent(family)}` : ''}`} className={pill(cat === c.key)}>{c.label}</Link>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Scent</span>
          <button type="button" className={pill(!family)} onClick={() => set('family', '')}>Any</button>
          {families.map((f) => <button key={f} type="button" className={pill(family === f)} onClick={() => set('family', family === f ? '' : f)}>{f}</button>)}
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-sm text-muted"><span className="nav-link text-xs">Up to</span><select value={max || ''} onChange={(e) => set('max', e.target.value)} className="input w-auto py-1.5 text-sm" aria-label="Max price"><option value="">Any price</option>{[25, 50, 75].map((n) => <option key={n} value={n}>${n}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm text-muted"><span className="nav-link text-xs">Sort</span><select value={sort} onChange={(e) => set('sort', e.target.value === 'featured' ? '' : e.target.value)} className="input w-auto py-1.5 text-sm" aria-label="Sort"><option value="featured">Featured</option><option value="new">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
        </div>
        <div className="mt-6 flex items-center justify-between text-sm text-muted"><span>{loading ? 'Loading…' : `${list.length} product${list.length === 1 ? '' : 's'}`}</span>{(family || max || q || sort !== 'featured') && <Link to={cat === 'all' ? '/shop' : `/shop/${cat}`} className="underline">Clear filters</Link>}</div>
        {!loading && list.length === 0 ? (
          <div className="py-16 text-center text-muted">Nothing matches. <Link to="/shop" className="text-pine underline">Clear filters</Link></div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </div>
    </div>
  );
}
