import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { minPrice } from '../lib/catalog';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { ProductImage, SectionHead } from '../components/ui/Bits';
import type { Product } from '../types';

// ---- Easy-to-edit holiday copy -------------------------------------------
/** Last order date for standard shipping to arrive before Christmas. */
export const ORDER_BY_STANDARD = 'Tuesday, December 16';
/** Last order date for express shipping to arrive before Christmas. */
export const ORDER_BY_EXPRESS = 'Saturday, December 20';
/** Shown under the order-by dates. */
const ORDER_BY_NOTE = 'US addresses. Orders placed after these dates still ship within 1–2 business days, but we can’t promise they land by the 24th.';

/** Budget rails. Products are filtered client-side from the live catalog. */
const RAIL_MAX_BUDGET = 25;   // "Under $25"
const RAIL_MID_BUDGET = 50;   // "Under $50"
const RAIL_SIZE = 8;          // max cards per rail

type Rail = { key: string; eyebrow: string; title: string; blurb: string; to: string; cta: string };
const RAILS: Rail[] = [
  { key: 'under25', eyebrow: 'Stocking stuffers', title: `Under $${RAIL_MAX_BUDGET}`, blurb: 'Teachers, neighbors, the gift exchange at work. Small formats that still smell like the real thing.', to: `/shop?max=${RAIL_MAX_BUDGET}`, cta: `All under $${RAIL_MAX_BUDGET}` },
  { key: 'under50', eyebrow: 'A proper present', title: `Under $${RAIL_MID_BUDGET}`, blurb: 'The big candle, the full-size scrub, the soak that lasts all winter.', to: `/shop?max=${RAIL_MID_BUDGET}`, cta: `All under $${RAIL_MID_BUDGET}` },
  { key: 'sets', eyebrow: 'The whole evening', title: 'Spa night sets', blurb: 'Candle, soak and lotion in one box, matched by scent, ready to hand over.', to: '/shop/set', cta: 'All gift sets' },
];

/** Recipient tiles. `productId` picks the background photo from the catalog (falls back to a solid color). */
const RECIPIENTS: { to: string; label: string; sub: string; productId: string; bg: string }[] = [
  { to: '/shop/candle', label: 'For the host', sub: 'A 12 oz candle they’ll light the same night.', productId: 'pine-forest', bg: '#214238' },
  { to: `/shop?max=${RAIL_MAX_BUDGET}`, label: 'For the coworker', sub: 'Under $25, no awkwardness.', productId: 'oat-honey-hand-lotion', bg: '#7A6A42' },
  { to: '/build-a-set', label: 'For the one who needs a night off', sub: 'Candle + soak + scrub, 15% off as a set.', productId: 'spa-night-set', bg: '#2E5A4B' },
  { to: '/corporate', label: 'For the office', sub: 'Logo labels, 25 units and up, one invoice.', productId: 'cozy-evening-trio', bg: '#8A4B2E' },
];
// ---------------------------------------------------------------------------

const maxPrice = (p: Product) => Math.max(...p.variants.map((v) => v.price));

export default function Gifts() {
  useSeo({ title: 'Holiday Gift Guide', description: `Holiday gifts from Kind Flames: hand-poured candles, scrubs and spa sets by budget and by recipient. Gift wrap and a handwritten note at checkout. Order by ${ORDER_BY_STANDARD} for standard delivery.`, path: '/gifts' });
  const { products, settings, loading } = useCatalog();
  const pct = settings.bundleDiscountPercent;

  const rails = useMemo(() => {
    const sets = products.filter((p) => p.category === 'set' || minPrice(p) >= RAIL_MID_BUDGET).slice(0, RAIL_SIZE);
    const under25 = products.filter((p) => p.category !== 'set' && minPrice(p) < RAIL_MAX_BUDGET).sort((a, b) => minPrice(a) - minPrice(b)).slice(0, RAIL_SIZE);
    const shown = new Set(under25.map((p) => p.id));
    const under50 = products.filter((p) => p.category !== 'set' && !shown.has(p.id) && minPrice(p) < RAIL_MID_BUDGET).sort((a, b) => maxPrice(b) - maxPrice(a)).slice(0, RAIL_SIZE);
    return { under25, under50, sets } as Record<string, Product[]>;
  }, [products]);
  const byId = (id: string) => products.find((p) => p.id === id);

  return (
    <>
      {/* Hero */}
      <section className="bg-pine text-pine-ink">
        <div className="wrap grid items-center gap-8 py-12 md:grid-cols-[1.1fr_.9fr] md:py-16">
          <div className="flex flex-col gap-5">
            <div className="eyebrow !text-pine-ink/70">Holiday gift guide · Ships in 1–2 business days</div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl">Gifts that feel like a warm room.</h1>
            <p className="max-w-[36ch] text-lg opacity-85">Hand-poured candles, small-batch scrubs and soaks, boxed and ready. Pick by budget, pick by person, or build a set and save {pct}%.</p>
            <div className="flex flex-wrap gap-3"><Button variant="accent" size="lg" to="/build-a-set">Build a spa set</Button><Button variant="ghost" size="lg" to="/shop/set" className="!border-pine-ink/40 !text-pine-ink hover:!bg-pine-dark">Shop gift sets</Button></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['spa-night-set', 'cinnamon-spice', 'eucalyptus-recovery-soak'].map((id, i) => { const p = byId(id); return p ? (
              <Link key={id} to={`/product/${p.slug}`} className={`block aspect-[3/4] overflow-hidden rounded-2xl bg-pine-dark ${i === 1 ? 'mt-6' : ''}`}><ProductImage product={p} size={400} eager={i === 0} className="h-full w-full transition duration-300 hover:scale-105" /></Link>
            ) : <div key={id} className={`aspect-[3/4] rounded-2xl bg-pine-dark ${i === 1 ? 'mt-6' : ''}`} />; })}
          </div>
        </div>
      </section>

      {/* Shop by budget */}
      <section className="wrap py-10">
        <SectionHead eyebrow="Shop by budget" title="Pick a number, we’ll do the rest" />
        <div className="space-y-10">
          {RAILS.map((r) => { const list = rails[r.key] ?? []; return (
            <div key={r.key}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><div className="eyebrow mb-1">{r.eyebrow}</div><h3 className="text-2xl">{r.title}</h3><p className="mt-1 max-w-[52ch] text-sm text-muted">{r.blurb}</p></div>
                <Link to={r.to} className="text-sm text-muted hover:text-ink">{r.cta} →</Link>
              </div>
              {loading && list.length === 0 ? <div className="py-8 text-center text-muted">Loading…</div> : list.length === 0 ? (
                <div className="card bg-surface-2 p-6 text-center text-muted">Nothing in this range right now. <Link to="/shop" className="text-pine underline">See everything</Link></div>
              ) : (
                <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:thin]" aria-label={`${r.title} gifts`}>
                  {list.map((p) => <div key={p.id} className="w-[min(68vw,260px)] flex-none snap-start"><ProductCard product={p} /></div>)}
                </div>
              )}
            </div>
          ); })}
        </div>
      </section>

      {/* Shop by recipient */}
      <section className="wrap py-10">
        <SectionHead eyebrow="Shop by recipient" title="Who’s it for?" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RECIPIENTS.map((t) => { const p = byId(t.productId); return (
            <Link key={t.to + t.label} to={t.to} className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl p-5 text-pine-ink transition hover:brightness-110" style={{ background: t.bg }}>
              {p && <ProductImage product={p} size={400} className="absolute inset-0 h-full w-full opacity-60 transition duration-300 group-hover:scale-105" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden="true" />
              <span className="relative font-display text-xl font-semibold leading-tight">{t.label}</span>
              <span className="relative mt-1 text-sm opacity-90">{t.sub}</span>
            </Link>
          ); })}
        </div>
      </section>

      {/* Build your own band */}
      <section className="bg-honey text-honey-ink">
        <div className="wrap grid items-center gap-6 py-12 md:grid-cols-[1fr_auto]">
          <div><div className="eyebrow !text-honey-ink/70">Build your own set</div><h2 className="mt-1 text-3xl">One candle, two bath items, {pct}% off.</h2><p className="mt-2 max-w-[52ch] opacity-85">Pick the scents they actually like. The discount applies at checkout and a gift note goes in the box.</p></div>
          <Button size="lg" to="/build-a-set">Open the builder</Button>
        </div>
      </section>

      {/* Gift wrap, shipping, order-by dates */}
      <section className="wrap py-10">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-6"><div className="text-2xl" aria-hidden="true">🎁</div><h3 className="mt-2 text-xl">Gift wrap &amp; a handwritten note</h3><p className="mt-1 text-sm text-muted">Add gift wrap and a message at checkout for {money(settings.giftWrapFee)}. We write the card by hand and leave the prices out of the box.</p></div>
          <div className="card p-6"><div className="text-2xl" aria-hidden="true">📦</div><h3 className="mt-2 text-xl">Free shipping over ${settings.freeShippingThreshold}</h3><p className="mt-1 text-sm text-muted">US orders over ${settings.freeShippingThreshold} ship free. Under that, flat {money(settings.flatShipping)} standard or {money(settings.expressShipping)} express. Leak-proof packing either way.</p></div>
          <div className="card bg-surface-2 p-6"><div className="text-2xl" aria-hidden="true">🗓</div><h3 className="mt-2 text-xl">Order by</h3>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Standard shipping</dt><dd className="font-bold">{ORDER_BY_STANDARD}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Express shipping</dt><dd className="font-bold">{ORDER_BY_EXPRESS}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">{ORDER_BY_NOTE}</p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">Still deciding? <Link to="/shop" className="text-pine underline">Browse everything</Link> or <Link to="/contact" className="text-pine underline">ask us</Link>, we answer within a day.</p>
      </section>
    </>
  );
}
