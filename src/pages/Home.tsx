import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCatalog } from '../context/CatalogContext';
import { useToast } from '../context/ToastContext';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { SectionHead } from '../components/ui/Bits';

const TILES: { to: string; label: string; sub: string; bg: string }[] = [
  { to: '/shop/candle', label: 'Candles', sub: 'Coconut-soy · 4, 8, 12 oz', bg: '#214238' },
  { to: '/shop/scrub', label: 'Body Scrubs', sub: 'Sugar & coffee', bg: '#6B4A3A' },
  { to: '/shop/lotion', label: 'Lotions', sub: 'Hand & body', bg: '#7A6A42' },
  { to: '/shop/salt', label: 'Bath Salts', sub: 'Epsom & pink salt', bg: '#2E5A4B' },
  { to: '/shop/set', label: 'Gift Sets', sub: 'Boxed & ready', bg: '#8A4B2E' },
];

export default function Home() {
  useSeo({ path: '/' });
  const { products, settings } = useCatalog();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const fresh = products.filter((p) => p.isNewArrival).slice(0, 4);
  const christmas = products.filter((p) => p.collections?.includes('christmas')).slice(0, 4);
  const sets = products.filter((p) => p.category === 'set');
  const hero = products.find((p) => p.id === 'lavender-dreams') || products[0];

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) return;
    try { await setDoc(doc(db, 'newsletter', em), { email: em, source: 'home', createdAt: serverTimestamp() }); track('sign_up', { method: 'newsletter' }); toast('Welcome — use WELCOME10 at checkout'); setEmail(''); }
    catch { toast('Could not subscribe right now'); }
  };

  return (
    <>
      <section className="wrap grid items-center gap-8 py-10 md:grid-cols-[1.1fr_.9fr] md:py-16">
        <div className="flex flex-col gap-5">
          <div className="eyebrow">Hand-poured in New Jersey · Coconut-soy wax · Phthalate-free</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl">Light the room. Then run the bath.</h1>
          <p className="max-w-[34ch] text-lg text-muted">Small-batch candles and the bath &amp; body to go with them. Scents built to pair, so a candle, a soak and a lotion feel like one evening.</p>
          <div className="flex flex-wrap gap-3"><Button variant="accent" size="lg" to="/shop/candle">Shop candles</Button><Button variant="ghost" size="lg" to="/build-a-set">Build a spa set</Button></div>
        </div>
        {hero && (
          <Link to={`/product/${hero.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-pine">
            <img src={hero.images[0]} alt={hero.name} className="h-full w-full object-cover" loading="eager" fetchPriority="high" />
            <span className="absolute bottom-4 left-4 rounded-full bg-surface/90 px-3 py-1 text-sm font-bold">{hero.name} →</span>
          </Link>
        )}
      </section>

      <section className="wrap py-8">
        <SectionHead eyebrow="Shop by category" title="Five ways in" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TILES.map((t) => (
            <Link key={t.to} to={t.to} className="flex min-h-28 flex-col justify-end rounded-xl p-4 text-pine-ink transition hover:brightness-110" style={{ background: t.bg }}>
              <span className="font-display text-lg font-semibold">{t.label}</span><span className="text-xs opacity-80">{t.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap py-10">
        <SectionHead eyebrow="Best sellers" title="What people reorder" action={<Link to="/shop" className="text-muted hover:text-ink">View all →</Link>} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      </section>

      {fresh.length > 0 && (
        <section className="wrap py-10">
          <SectionHead eyebrow="New arrivals" title="Fresh from the pour room" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{fresh.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {settings.homepage?.showCorporate !== false && (
        <section className="bg-pine text-pine-ink">
          <div className="wrap grid items-center gap-6 py-12 md:grid-cols-[1fr_auto]">
            <div><div className="eyebrow !text-pine-ink/70">Corporate gifting</div><h2 className="mt-1 text-3xl">Client gifts, employee thank-yous, event favors.</h2><p className="mt-2 max-w-[52ch] opacity-85">Custom labels from 25 units, tiered pricing, ship to one address or two hundred. Most orders ship within 10 business days.</p></div>
            <Button variant="accent" size="lg" to="/corporate">Request a quote</Button>
          </div>
        </section>
      )}

      <section className="wrap py-10">
        <SectionHead eyebrow="Pairs well" title="Build a spa night in three picks" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((p) => <ProductCard key={p.id} product={p} />)}
          <div className="card flex flex-col items-center justify-center gap-3 bg-surface-2 p-6 text-center"><h3 className="text-xl">Or build your own</h3><p className="text-sm text-muted">Pick a candle + two bath items, save {settings.bundleDiscountPercent}%, add a gift note.</p><Button to="/build-a-set">Open the builder</Button></div>
        </div>
      </section>

      {settings.homepage?.showChristmas !== false && christmas.length > 0 && (
        <section className="wrap py-10">
          <SectionHead eyebrow="Seasonal" title="The holiday collection" action={<Link to="/shop/candle" className="text-muted hover:text-ink">All candles →</Link>} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{christmas.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      <section className="border-y border-line bg-surface">
        <div className="wrap grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {[['🕯', 'Coconut-soy, cotton or wood wick', '45–60 hr burn, ASTM-tested'], ['🧴', 'Full ingredient lists', 'Every bath & body product is INCI-labeled'], ['📦', 'Ships in 1–2 business days', `Free over $${settings.freeShippingThreshold} · leak-proof packing`], ['↩', '30-day happiness guarantee', "Wrong scent? We'll swap it."]].map(([i, t, s]) => (
            <div key={t} className="flex gap-3"><span className="text-2xl">{i}</span><div><div className="font-bold">{t}</div><div className="text-sm text-muted">{s}</div></div></div>
          ))}
        </div>
      </section>

      <section className="wrap grid gap-8 py-12 md:grid-cols-2">
        <div><div className="eyebrow">Why Kind Flames</div><h2 className="mt-1 text-3xl">Made by hand in small batches, in New Jersey.</h2><p className="mt-3 max-w-[60ch] text-muted">Every candle is poured by hand in a coconut-soy blend with phthalate-free fragrance and cotton or wood wicks. The bath &amp; body line uses the same scent families, so you can build an evening that matches.</p><Link to="/about" className="mt-3 inline-block text-pine underline">Our story →</Link></div>
        {settings.homepage?.showNewsletter !== false && (
          <div className="card p-6"><div className="eyebrow">Newsletter</div><h3 className="mt-1 text-2xl">10% off your first order</h3><p className="mt-1 text-sm text-muted">New scents, restocks and the occasional candle-care tip. One email a week at most.</p>
            <form onSubmit={join} className="mt-4 flex gap-2"><input id="newsletter-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" className="input" /><Button variant="accent" type="submit">Join</Button></form></div>
        )}
      </section>
    </>
  );
}
