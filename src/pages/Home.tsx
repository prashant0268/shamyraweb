import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCatalog } from '../context/CatalogContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';
import { themeMeta } from '../themes';
import { IMG, FAMILY_IMAGES, FAMILY_BLURBS } from '../data/imagery';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { Rail, SectionHead, Stars, ValueStrip } from '../components/ui/Bits';
import type { Review } from '../types';

const TILES: { to: string; label: string; sub: string; img: string }[] = [
  { to: '/shop/candle', label: 'Candles', sub: 'Coconut-soy · 4, 8, 12 oz', img: IMG.catCandles },
  { to: '/shop/scrub', label: 'Body Scrubs', sub: 'Sugar & coffee', img: IMG.catScrubs },
  { to: '/shop/lotion', label: 'Lotions', sub: 'Hand & body', img: IMG.catLotions },
  { to: '/shop/salt', label: 'Bath Salts', sub: 'Epsom & pink salt', img: IMG.catSalts },
  { to: '/shop/set', label: 'Gift Sets', sub: 'Boxed & ready', img: IMG.catSets },
];
const SCENES = [
  { img: IMG.sceneBedside, title: 'Bedside', sub: 'Lavender Dreams, lights low', to: '/shop?family=Floral' },
  { img: IMG.sceneTable, title: 'Dinner table', sub: 'Vanilla Bliss, unscented between courses', to: '/shop?family=Gourmand' },
  { img: IMG.bath, title: 'The bath', sub: 'Eucalyptus soak, Ocean Breeze lit', to: '/shop?family=Fresh' },
  { img: IMG.sceneWindow, title: 'Sunday morning', sub: 'Oat & honey lotion, Beeswax Classic', to: '/shop?family=Honey' },
  { img: IMG.holiday, title: 'The holidays', sub: 'Cinnamon Spice, Pine Forest', to: '/shop?family=Spiced' },
];

export default function Home() {
  useSeo({ path: '/' });
  const { products, settings } = useCatalog();
  const { theme } = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const featured = products.filter((p) => p.featured).slice(0, 10);
  const fresh = products.filter((p) => p.isNewArrival).slice(0, 4);
  const christmas = products.filter((p) => p.collections?.includes('christmas')).slice(0, 4);
  const families = useMemo(() => [...new Set(products.map((p) => p.family))].filter((f) => FAMILY_IMAGES[f]), [products]);
  const hero = IMG[themeMeta(theme).heroImage];

  useEffect(() => {
    getDocs(query(collection(db, 'reviews'), where('approved', '==', true), limit(12)))
      .then((s) => setReviews(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) })).filter((r) => r.rating >= 4 && r.body).slice(0, 6)))
      .catch(() => setReviews([]));
  }, []);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) return;
    try { await setDoc(doc(db, 'newsletter', em), { email: em, source: 'home', createdAt: serverTimestamp() }); track('sign_up', { method: 'newsletter' }); try { localStorage.setItem('kf_subscribed', '1'); } catch { /* ignore */ } toast(`Welcome — use ${settings.popup?.code || 'WELCOME10'} at checkout`); setEmail(''); }
    catch { toast('Could not subscribe right now'); }
  };

  return (
    <>
      {/* Hero */}
      <section className="relative isolate min-h-[70vh] overflow-hidden bg-pine text-white sm:min-h-[76vh]">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="wrap relative flex min-h-[70vh] flex-col justify-end gap-5 py-14 sm:min-h-[76vh] sm:justify-center">
          <div className="eyebrow !text-white/80">Hand-poured in New Jersey · Coconut-soy · Phthalate-free</div>
          <h1 className="max-w-[14ch] text-4xl sm:text-6xl lg:text-7xl">Light the room. Then run the bath.</h1>
          <p className="max-w-[38ch] text-lg text-white/85 sm:text-xl">Small-batch candles and the bath &amp; body to go with them. Scents built to pair, so a candle, a soak and a lotion feel like one evening.</p>
          <div className="flex flex-wrap gap-3"><Button variant="accent" size="lg" to="/shop/candle">Shop candles</Button><Button variant="inverse" size="lg" to="/build-a-set">Build a spa set</Button></div>
          <div className="nav-link text-xs !font-medium text-white/75">Free US shipping over ${settings.freeShippingThreshold} · Ships in 1–2 business days · 30-day scent swap</div>
        </div>
      </section>

      {/* Categories */}
      <section className="wrap py-12 sm:py-16">
        <SectionHead eyebrow="Shop by category" title="Five ways in" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {TILES.map((t) => (
            <Link key={t.to} to={t.to} className="group relative block aspect-[4/5] overflow-hidden rounded-img bg-surface-2">
              <img src={t.img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              <span className="hero-overlay absolute inset-0" />
              <span className="absolute inset-x-0 bottom-0 p-4 text-white"><span className="block font-display text-xl leading-tight sm:text-2xl">{t.label}</span><span className="block text-xs opacity-90">{t.sub}</span></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      <section className="wrap py-8 sm:py-10">
        <SectionHead eyebrow="Best sellers" title="What people reorder" action={<Link to="/shop" className="nav-link text-muted hover:text-ink">View all →</Link>} />
        <Rail label="Best sellers" itemClass="w-[min(70vw,260px)] lg:w-[calc((100%-3rem)/4)]">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</Rail>
      </section>

      {/* Shop by scent */}
      <section className="border-y border-line bg-surface">
        <div className="wrap py-12 sm:py-16">
          <SectionHead eyebrow="Shop by scent" title="Start with how you want the room to feel" sub="Every bath & body product shares a scent family with a candle, so an evening can match from the flame to the tub." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 lg:gap-4">
            {families.map((f) => (
              <Link key={f} to={`/shop?family=${encodeURIComponent(f)}`} className="group text-center">
                <span className="block aspect-square overflow-hidden rounded-img bg-surface-2 lg:rounded-full"><img src={FAMILY_IMAGES[f]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /></span>
                <span className="mt-3 block font-display text-lg group-hover:underline">{f}</span>
                <span className="block text-xs text-muted">{FAMILY_BLURBS[f]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="wrap grid items-center gap-8 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14">
        <div className="grid grid-cols-2 gap-3"><img src={IMG.pour} alt="Pouring wax by hand" className="aspect-[3/4] w-full rounded-img object-cover" loading="lazy" /><img src={IMG.wick} alt="Setting a wick" className="mt-8 aspect-[3/4] w-full rounded-img object-cover" loading="lazy" /></div>
        <div>
          <div className="eyebrow">Why Kind Flames</div>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl">Made by hand, in batches of 24 to 48, in New Jersey.</h2>
          <p className="mt-4 max-w-[58ch] text-lg text-muted">Every candle is poured in a coconut-soy blend with phthalate-free fragrance and cotton or wood wicks. Nothing sits on a shelf for months. The bath &amp; body line uses the same scent families, with full ingredient lists on every label.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[['Coconut-soy wax', 'Clean, even burn; 45–60 hours'], ['Phthalate-free fragrance', 'Paraben-free, cruelty-free'], ['Cotton or wood wicks', 'Lead-free, ASTM-tested'], ['Reusable glass', 'Clean it out, keep the jar']].map(([t, s]) => <li key={t} className="rounded-card border border-line bg-surface p-4"><div className="font-bold">{t}</div><div className="text-sm text-muted">{s}</div></li>)}
          </ul>
          <div className="mt-6 flex gap-3"><Button to="/about">Our story</Button><Button variant="ghost" to="/candle-care">Candle care</Button></div>
        </div>
      </section>

      {/* Spa set band */}
      <section className="relative isolate overflow-hidden bg-pine text-white">
        <img src={IMG.tray} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
        <div className="wrap relative grid items-center gap-6 py-16 sm:py-24 lg:grid-cols-[1fr_auto]">
          <div><div className="eyebrow !text-white/75">Build a spa set</div><h2 className="mt-2 max-w-[20ch] text-3xl sm:text-4xl lg:text-5xl">One candle, two bath items, {settings.bundleDiscountPercent}% off.</h2><p className="mt-3 max-w-[50ch] text-white/85">Pick the scents you actually like. The discount applies at checkout and a handwritten note goes in the box.</p></div>
          <Button variant="accent" size="lg" to="/build-a-set">Open the builder</Button>
        </div>
      </section>

      {/* New arrivals */}
      {fresh.length > 0 && (
        <section className="wrap py-12 sm:py-16">
          <SectionHead eyebrow="New arrivals" title="Fresh from the pour room" action={<Link to="/shop?sort=new" className="nav-link text-muted hover:text-ink">See all new →</Link>} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{fresh.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {/* Reviews (only real, approved ones) */}
      {reviews.length > 0 && (
        <section className="border-y border-line bg-surface">
          <div className="wrap py-12 sm:py-16">
            <SectionHead center eyebrow="From customers" title="In their words" />
            <div className="grid gap-4 md:grid-cols-3">{reviews.slice(0, 6).map((r) => <figure key={r.id} className="rounded-card border border-line bg-bg p-5"><Stars rating={r.rating} /><blockquote className="mt-2 font-display text-lg leading-snug">“{r.body}”</blockquote><figcaption className="mt-3 text-sm text-muted">{r.name} · verified buyer</figcaption></figure>)}</div>
          </div>
        </section>
      )}

      {/* Holiday */}
      {settings.homepage?.showChristmas !== false && christmas.length > 0 && (
        <section className="wrap py-12 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <Link to="/gifts" className="group relative block min-h-72 overflow-hidden rounded-img bg-surface-2"><img src={IMG.holiday} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /><span className="hero-overlay absolute inset-0" /><span className="absolute inset-x-0 bottom-0 p-6 text-white"><span className="eyebrow block !text-white/75">Seasonal</span><span className="mt-1 block font-display text-3xl">The holiday collection</span><span className="nav-link mt-2 block text-sm underline underline-offset-4">Gift guide →</span></span></Link>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">{christmas.map((p) => <ProductCard key={p.id} product={p} compact />)}</div>
          </div>
        </section>
      )}

      {/* Scenes */}
      <section className="wrap py-10 sm:py-12">
        <SectionHead eyebrow="Candlelight, five ways" title="Where it goes" sub="A scent for the bedside, the table, the tub. Tap a scene to shop its family." />
        <Rail label="Scenes" itemClass="w-[min(72vw,300px)]">
          {SCENES.map((s) => <Link key={s.title} to={s.to} className="group block"><span className="block aspect-[4/5] overflow-hidden rounded-img bg-surface-2"><img src={s.img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /></span><span className="mt-3 block font-display text-lg group-hover:underline">{s.title}</span><span className="block text-sm text-muted">{s.sub}</span></Link>)}
        </Rail>
      </section>

      {/* Subscription + corporate */}
      <section className="wrap grid gap-4 py-8 lg:grid-cols-2">
        <div className="relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-img bg-pine p-6 text-white sm:p-8">
          <img src={IMG.evening} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" loading="lazy" /><div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 to-black/10" />
          <div className="eyebrow !text-white/75">Subscription</div><h2 className="mt-1 text-3xl">Candle of the Month</h2><p className="mt-2 max-w-[44ch] text-white/85">A new hand-poured scent on your doorstep every month for $24, shipping included. Pause or cancel any time.</p><div className="mt-4"><Button variant="accent" to="/subscribe">See the plans</Button></div>
        </div>
        {settings.homepage?.showCorporate !== false && (
          <div className="relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-img bg-surface-2 p-6 sm:p-8">
            <img src={IMG.giftDark} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80" loading="lazy" /><div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 to-black/10" />
            <div className="text-white"><div className="eyebrow !text-white/75">Corporate gifting</div><h2 className="mt-1 text-3xl">Client gifts, employee thank-yous, event favors.</h2><p className="mt-2 max-w-[44ch] text-white/85">Custom labels from 25 units, tiered pricing, ship to one address or two hundred.</p><div className="mt-4"><Button variant="inverse" to="/corporate">Request a quote</Button></div></div>
          </div>
        )}
      </section>

      {/* Values */}
      <section className="border-y border-line bg-surface">
        <div className="wrap py-10">
          <ValueStrip items={[
            { icon: 'flame', title: 'Coconut-soy, cotton or wood wick', sub: '45–60 hr burn, ASTM-tested' },
            { icon: 'leaf', title: 'Full ingredient lists', sub: 'Every bath & body product is INCI-labeled' },
            { icon: 'package', title: 'Ships in 1–2 business days', sub: `Free over $${settings.freeShippingThreshold} · leak-proof packing` },
            { icon: 'shield', title: '30-day happiness guarantee', sub: "Wrong scent? We'll swap it." },
          ]} />
        </div>
      </section>

      {/* Newsletter */}
      {settings.homepage?.showNewsletter !== false && (
        <section className="wrap py-14 sm:py-20">
          <div className="grid overflow-hidden rounded-img border border-line bg-surface lg:grid-cols-2">
            <img src={IMG.popup} alt="" className="h-56 w-full object-cover lg:h-full" loading="lazy" />
            <div className="p-8 sm:p-12"><div className="eyebrow">Newsletter</div><h2 className="mt-2 text-3xl sm:text-4xl">10% off your first order</h2><p className="mt-2 max-w-[46ch] text-muted">New scents, restocks and the occasional candle-care tip. One email a week at most, unsubscribe in one click.</p>
              <form onSubmit={join} className="mt-5 flex max-w-md gap-2"><input id="newsletter-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" className="input" /><Button variant="accent" type="submit">Join</Button></form></div>
          </div>
        </section>
      )}
    </>
  );
}
