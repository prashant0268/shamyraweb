import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Heart } from 'lucide-react';
import { db } from '../config/firebase';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { money } from '../lib/format';
import { useSeo, useJsonLd } from '../lib/seo';
import { productJsonLd } from '../lib/productJsonLd';
import { track } from '../lib/analytics';
import { useWishlist } from '../lib/wishlist';
import { FAMILY_IMAGES } from '../data/imagery';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { Badge, Qty, Stars, Field, Rail, ValueStrip, useProductImages } from '../components/ui/Bits';
import NotFound from './NotFound';
import { BODY_CATEGORIES, CATEGORY_LABELS, type Product, type Review, type Variant } from '../types';

const oz = (label: string) => { const m = label.match(/(\d+(?:\.\d+)?)\s*oz/i); return m ? Number(m[1]) : null; };

function Gallery({ product }: { product: Product }) {
  const imgs = useProductImages(product);
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [product.id]);
  const src = imgs[i] ?? imgs[0];
  return (
    <div className="self-start lg:sticky lg:top-24">
      <div className="aspect-[4/5] overflow-hidden rounded-img bg-surface-2">{src ? <img key={src} src={src} alt={product.name} className="fade-in h-full w-full object-cover" loading="eager" fetchPriority="high" /> : <div className="flex h-full items-center justify-center text-muted">No photo</div>}</div>
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2">{imgs.map((s, k) => <button key={s} type="button" onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={`h-16 w-16 overflow-hidden rounded-img border-2 ${k === i ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}><img src={s} alt="" className="h-full w-full object-cover" loading="lazy" /></button>)}</div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const { bySlug, products, loading, byId, settings } = useCatalog();
  const { add } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const { has, toggle } = useWishlist();
  const product = bySlug(slug);
  const [variantId, setVariantId] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rv, setRv] = useState({ rating: 5, title: '', body: '', name: user?.displayName || '' });
  const [stickyOn, setStickyOn] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  useSeo({ title: product?.name, description: product ? `${product.tagline || ''} ${product.description}`.trim() : undefined, image: product?.images[0], path: `/product/${slug}` });
  useEffect(() => { if (product) { setVariantId(product.variants.find((v) => typeof v.stock !== 'number' || v.stock > 0)?.id || product.variants[0]!.id); setQty(1); track('view_item', { items: [{ item_id: product.id, item_name: product.name }] }); } }, [product]);
  useEffect(() => {
    if (!product) return;
    getDocs(query(collection(db, 'reviews'), where('productId', '==', product.id), where('approved', '==', true), orderBy('createdAt', 'desc'), limit(20)))
      .then((s) => setReviews(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) })))).catch(() => setReviews([]));
  }, [product]);
  useEffect(() => {
    const el = ctaRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setStickyOn(!e!.isIntersecting && e!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el); return () => io.disconnect();
  }, [product]);

  const jsonLd = useMemo(() => (product ? productJsonLd(product, reviews) : null), [product, reviews]);
  useJsonLd('product-jsonld', jsonLd);

  const pairs = useMemo(() => product ? products.filter((p) => p.id !== product.id && (p.family === product.family || (product.category === 'candle' ? BODY_CATEGORIES.includes(p.category) && p.family === product.family : p.category === 'candle' && p.family === product.family))).slice(0, 4) : [], [product, products]);
  const more = useMemo(() => product ? products.filter((p) => p.id !== product.id && !pairs.some((x) => x.id === p.id) && (p.category === product.category || p.featured)).slice(0, 8) : [], [product, products, pairs]);

  if (loading && !product) return <div className="wrap py-24 text-center text-muted">Loading…</div>;
  if (!product) return <NotFound />;
  const variant = (product.variants.find((v) => v.id === variantId) || product.variants[0]) as Variant;
  const soldOut = typeof variant.stock === 'number' && variant.stock <= 0;
  const low = typeof variant.stock === 'number' && variant.stock > 0 && variant.stock < 10;
  const isBody = BODY_CATEGORIES.includes(product.category);
  const bundle = product.bundleItems?.map((id) => byId(id)).filter(Boolean);
  const perOz = product.variants.map((v) => { const o = oz(v.label); return o ? v.price / o : null; });
  const bestIdx = perOz.some((x) => x) ? perOz.indexOf(Math.min(...perOz.filter((x): x is number => x !== null))) : -1;
  const hasNotes = product.notes && product.notes.top !== '—';
  const addToBag = () => { add(product.id, variant.id, qty); toast(`${product.name} added to your bag`); };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isAnonymous) { toast('Sign in to leave a review'); return; }
    try {
      await addDoc(collection(db, 'reviews'), { productId: product.id, userId: user.uid, name: rv.name || 'Customer', rating: rv.rating, title: rv.title, body: rv.body, approved: false, createdAt: serverTimestamp() });
      toast('Thanks! Your review will appear once approved.'); setShowForm(false); setRv({ rating: 5, title: '', body: '', name: rv.name });
    } catch { toast('Could not submit review'); }
  };

  return (
    <div className="wrap py-6 sm:py-8">
      <nav className="nav-link mb-5 text-xs !font-medium text-muted"><Link to="/shop" className="hover:underline">Shop</Link> / <Link to={`/shop/${product.category}`} className="hover:underline">{CATEGORY_LABELS[product.category]}</Link> / <span className="text-ink">{product.name}</span></nav>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
        <Gallery product={product} />
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2"><span className="eyebrow">{CATEGORY_LABELS[product.category]} · {product.family}</span>{product.badge && <Badge tone={product.badge === 'New' ? 'accent' : product.badge.startsWith('Save') ? 'good' : 'neutral'}>{product.badge}</Badge>}</div>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl">{product.name}</h1>
            {product.tagline && <p className="mt-2 font-display text-lg italic text-muted sm:text-xl">{product.tagline}</p>}
            <a href="#reviews" className="mt-2 flex items-center gap-2 text-sm"><Stars rating={product.rating} size="md" /><span className="text-muted underline-offset-4 hover:underline">{product.reviewCount ? `${product.reviewCount} review${product.reviewCount === 1 ? '' : 's'}` : 'Be the first to review'}</span></a>
          </div>

          {hasNotes && (
            <div className="grid grid-cols-3 gap-2">{(['top', 'heart', 'base'] as const).map((k) => <div key={k} className="rounded-card border border-line bg-surface p-3"><div className="eyebrow">{product.category === 'set' ? (['Candle', 'Soak / Scrub', 'Lotion / Extra'][['top', 'heart', 'base'].indexOf(k)] || '') : k}</div><div className="mt-0.5 text-sm font-semibold">{product.notes![k]}</div></div>)}</div>
          )}
          <p className="text-muted">{product.description}</p>
          {bundle && bundle.length > 0 && <div className="text-sm"><span className="font-bold">Includes:</span> {bundle.map((b) => <Link key={b!.id} to={`/product/${b!.slug}`} className="ml-1 text-pine underline">{b!.name}</Link>)}</div>}

          <div>
            <div className="mb-2 flex items-baseline justify-between"><span className="label !mb-0">{product.category === 'set' ? 'Option' : 'Size'}</span><span className="text-sm text-muted">{variant.label}</span></div>
            <div className={`grid gap-2 ${product.variants.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {product.variants.map((v, k) => { const out = typeof v.stock === 'number' && v.stock <= 0; const sel = v.id === variantId; return (
                <button key={v.id} type="button" disabled={out} onClick={() => setVariantId(v.id)} className={`relative rounded-card border p-3 text-left transition disabled:opacity-40 ${sel ? 'border-ink bg-surface ring-1 ring-ink' : 'border-line bg-surface hover:border-ink/50'}`}>
                  <span className="block font-semibold">{v.label}</span>
                  <span className="num block text-sm text-muted">{money(v.price)}{perOz[k] ? <span className="ml-1 text-xs">· {money(perOz[k]!)}/oz</span> : null}</span>
                  {out ? <span className="mt-1 block text-xs text-bad">Sold out</span> : k === bestIdx && product.variants.length > 1 ? <Badge tone="good" className="mt-1.5">Best value</Badge> : null}
                </button>
              ); })}
            </div>
          </div>

          <div ref={ctaRef} className="flex flex-wrap items-center gap-3">
            <Qty value={qty} onChange={(n) => setQty(Math.max(1, Math.min(20, n)))} />
            {soldOut ? <Button variant="ghost" size="lg" className="flex-1" onClick={() => toast("We'll restock soon")}>Sold out · notify me</Button> : <Button variant="accent" size="lg" className="flex-1" onClick={addToBag}>Add to bag · {money(variant.price * qty)}{variant.compareAt && <s className="ml-1 text-sm font-normal opacity-70">{money(variant.compareAt * qty)}</s>}</Button>}
            <button type="button" aria-label={has(product.id) ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={has(product.id)} onClick={() => { toggle(product.id); toast(has(product.id) ? 'Removed from wishlist' : 'Saved to wishlist'); }} className={`flex h-12 w-12 items-center justify-center rounded-btn border border-line ${has(product.id) ? 'text-bad' : 'text-muted hover:text-ink'}`}><Heart size={18} fill={has(product.id) ? 'currentColor' : 'none'} /></button>
          </div>
          <p className="text-sm text-muted">{low && <Badge tone="warn" className="mr-2">Only {variant.stock} left</Badge>}Ships in 1–2 business days · Free shipping over ${settings.freeShippingThreshold} · 30-day scent swap</p>

          {product.category === 'candle' && (
            <ValueStrip compact items={[{ icon: 'flame', title: product.burnTime || '45–60 hr burn' }, { icon: 'leaf', title: product.wax || 'Coconut-soy' }, { icon: 'sparkles', title: `${product.wick || 'Cotton'} wick` }, { icon: 'refresh', title: 'Reusable glass' }, { icon: 'shield', title: 'Phthalate-free' }, { icon: 'package', title: 'Hand-poured in NJ' }]} />
          )}
          {isBody && <ValueStrip compact items={[{ icon: 'leaf', title: 'Full INCI list' }, { icon: 'shield', title: 'Paraben-free' }, { icon: 'sparkles', title: 'Phthalate-free scent' }, { icon: 'refresh', title: 'Recyclable jar' }, { icon: 'package', title: 'Leak-proof mailer' }, { icon: 'flame', title: 'Matches a candle' }]} />}

          <div className="divide-y divide-line rounded-card border border-line bg-surface">
            <details open className="group"><summary className="nav-link flex cursor-pointer items-center justify-between px-4 py-3 text-sm"><span>{isBody ? 'Ingredients (INCI)' : product.category === 'set' ? "What's in the box" : 'Candle care & safety'}</span><span className="text-muted transition group-open:rotate-45">+</span></summary><div className="px-4 pb-4 text-sm text-muted">{isBody ? <>{product.ingredients}<br /><br />*Fragrance is phthalate-free. Patch test before first use. External use only. Discontinue if irritation occurs.</> : product.category === 'set' ? product.description : <>Trim the wick to ¼″ before every burn. Let the first burn reach the edge of the jar (2–3 hours) to prevent tunnelling. Never leave a burning candle unattended; keep away from drafts, children and pets. Stop use with ½″ of wax left.</>}</div></details>
            {product.category === 'candle' && <details className="group"><summary className="nav-link flex cursor-pointer items-center justify-between px-4 py-3 text-sm"><span>Details</span><span className="text-muted transition group-open:rotate-45">+</span></summary><dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">{[['Burn time', product.burnTime], ['Wax', product.wax], ['Wick', product.wick], ['Vessel', 'Reusable glass jar'], ['Scent family', product.family], ['Made in', 'New Jersey, USA']].map(([k, v]) => v ? <div key={k}><dt className="eyebrow">{k}</dt><dd className="font-semibold">{v}</dd></div> : null)}</dl></details>}
            <details className="group"><summary className="nav-link flex cursor-pointer items-center justify-between px-4 py-3 text-sm"><span>Shipping &amp; returns</span><span className="text-muted transition group-open:rotate-45">+</span></summary><div className="px-4 pb-4 text-sm text-muted">USPS Ground Advantage (2–5 days) or UPS 2nd Day. Liquids ship in leak-proof mailers; candles are heat-protected June–September. 30-day returns on unopened items, and one free scent swap on opened candles. <Link to="/shipping-returns" className="underline">Full policy</Link>.</div></details>
            <details className="group"><summary className="nav-link flex cursor-pointer items-center justify-between px-4 py-3 text-sm"><span>Gifting</span><span className="text-muted transition group-open:rotate-45">+</span></summary><div className="px-4 pb-4 text-sm text-muted">Choose “This is a gift” at checkout for a kraft box, tissue, ribbon and a handwritten card ({money(settings.giftWrapFee)}). Prices never appear on the packing slip.</div></details>
          </div>
        </div>
      </div>

      {FAMILY_IMAGES[product.family] && product.category !== 'set' && (
        <section className="mt-14 grid items-center gap-6 overflow-hidden rounded-img border border-line bg-surface lg:grid-cols-2">
          <img src={FAMILY_IMAGES[product.family]} alt="" className="h-64 w-full object-cover lg:h-full" loading="lazy" />
          <div className="p-6 sm:p-10"><div className="eyebrow">The {product.family.toLowerCase()} family</div><h2 className="mt-2 text-2xl sm:text-3xl">Smells like: {product.tagline?.toLowerCase() || product.family.toLowerCase()}.</h2>{hasNotes && <p className="mt-3 text-muted">Opens with {product.notes!.top.toLowerCase()}, settles into {product.notes!.heart.toLowerCase()}, and finishes on {product.notes!.base.toLowerCase()}.</p>}<p className="mt-3 text-muted">{product.category === 'candle' ? 'Pair it with a scrub, lotion or soak from the same family and the whole evening matches.' : 'Light the matching candle and the whole evening matches.'}</p><div className="mt-5"><Button variant="ghost" to={`/shop?family=${encodeURIComponent(product.family)}`}>Everything {product.family.toLowerCase()}</Button></div></div>
        </section>
      )}

      {pairs.length > 0 && (
        <section className="py-14"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">Pairs well with</div><h2 className="text-2xl sm:text-3xl">Finish the {product.family.toLowerCase()} set</h2></div><Button variant="ghost" size="sm" to="/build-a-set">Bundle &amp; save {settings.bundleDiscountPercent}%</Button></div><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{pairs.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>
      )}

      <section className="py-8" id="reviews">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">Reviews</div><h2 className="text-2xl sm:text-3xl">{product.reviewCount ? `${product.reviewCount} reviews · ${product.rating} average` : 'Be the first to review'}</h2></div><Button variant="ghost" size="sm" onClick={() => setShowForm((s) => !s)}>Write a review</Button></div>
        {showForm && (
          <form onSubmit={submitReview} className="card mb-6 grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Rating"><select className="input" value={rv.rating} onChange={(e) => setRv({ ...rv, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></Field>
            <Field label="Your name"><input className="input" value={rv.name} onChange={(e) => setRv({ ...rv, name: e.target.value })} required /></Field>
            <Field label="Title" className="sm:col-span-2"><input className="input" value={rv.title} onChange={(e) => setRv({ ...rv, title: e.target.value })} /></Field>
            <Field label="Review" className="sm:col-span-2"><textarea className="input" rows={3} required value={rv.body} onChange={(e) => setRv({ ...rv, body: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Button type="submit">Submit review</Button>{(!user || user.isAnonymous) && <span className="ml-3 text-sm text-muted">You'll need to <Link to="/login" className="underline">sign in</Link>.</span>}</div>
          </form>
        )}
        <div className="divide-y divide-line">{reviews.map((r) => <div key={r.id} className="py-4"><Stars rating={r.rating} /><div className="font-bold">{r.title || r.name} <Badge tone="good" className="ml-1">Verified</Badge></div><p className="text-sm">{r.body}</p><div className="text-xs text-muted">— {r.name}</div></div>)}</div>
      </section>

      {more.length > 0 && (
        <section className="py-8"><div className="mb-5"><div className="eyebrow">You may also like</div><h2 className="text-2xl sm:text-3xl">More to light</h2></div><Rail label="You may also like" itemClass="w-[min(70vw,260px)] lg:w-[calc((100%-3rem)/4)]">{more.map((p) => <ProductCard key={p.id} product={p} />)}</Rail></section>
      )}

      {/* Sticky add-to-bag */}
      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur transition-transform ${stickyOn ? 'translate-y-0' : 'translate-y-full'}`} aria-hidden={!stickyOn}>
        <div className="wrap flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1"><div className="truncate font-display font-semibold">{product.name}</div><div className="num text-xs text-muted">{variant.label} · {money(variant.price)}</div></div>
          {soldOut ? <Button variant="ghost" onClick={() => toast("We'll restock soon")}>Sold out</Button> : <Button variant="accent" onClick={addToBag}>Add to bag</Button>}
        </div>
      </div>
    </div>
  );
}
