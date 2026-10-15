import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';
import { useWishlist } from '../lib/wishlist';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { Badge, ProductImage, Qty, Stars, Field } from '../components/ui/Bits';
import NotFound from './NotFound';
import { BODY_CATEGORIES, CATEGORY_LABELS, type Review, type Variant } from '../types';

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const { bySlug, products, loading, byId } = useCatalog();
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

  useSeo({ title: product?.name, description: product ? `${product.tagline || ''} ${product.description}`.trim() : undefined, image: product?.images[0], path: `/product/${slug}` });
  useEffect(() => { if (product) { setVariantId(product.variants.find((v) => typeof v.stock !== 'number' || v.stock > 0)?.id || product.variants[0]!.id); setQty(1); track('view_item', { items: [{ item_id: product.id, item_name: product.name }] }); } }, [product]);
  useEffect(() => {
    if (!product) return;
    getDocs(query(collection(db, 'reviews'), where('productId', '==', product.id), where('approved', '==', true), orderBy('createdAt', 'desc'), limit(20)))
      .then((s) => setReviews(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) })))).catch(() => setReviews([]));
  }, [product]);

  const pairs = useMemo(() => product ? products.filter((p) => p.id !== product.id && (p.family === product.family || (product.category === 'candle' ? BODY_CATEGORIES.includes(p.category) && p.family === product.family : p.category === 'candle' && p.family === product.family))).slice(0, 4) : [], [product, products]);

  if (loading && !product) return <div className="wrap py-24 text-center text-muted">Loading…</div>;
  if (!product) return <NotFound />;
  const variant = (product.variants.find((v) => v.id === variantId) || product.variants[0]) as Variant;
  const soldOut = typeof variant.stock === 'number' && variant.stock <= 0;
  const low = typeof variant.stock === 'number' && variant.stock > 0 && variant.stock < 10;
  const isBody = BODY_CATEGORIES.includes(product.category);
  const bundle = product.bundleItems?.map((id) => byId(id)).filter(Boolean);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isAnonymous) { toast('Sign in to leave a review'); return; }
    try {
      await addDoc(collection(db, 'reviews'), { productId: product.id, userId: user.uid, name: rv.name || 'Customer', rating: rv.rating, title: rv.title, body: rv.body, approved: false, createdAt: serverTimestamp() });
      toast('Thanks! Your review will appear once approved.'); setShowForm(false); setRv({ rating: 5, title: '', body: '', name: rv.name });
    } catch { toast('Could not submit review'); }
  };

  return (
    <div className="wrap py-6">
      <nav className="mb-4 text-sm text-muted"><Link to="/shop" className="hover:underline">Shop</Link> / <Link to={`/shop/${product.category}`} className="hover:underline">{CATEGORY_LABELS[product.category]}</Link> / {product.name}</nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="self-start overflow-hidden rounded-2xl bg-surface-2"><ProductImage product={product} size={800} eager className="aspect-square w-full" /></div>
        <div className="flex flex-col gap-4">
          <div className="eyebrow">{CATEGORY_LABELS[product.category]} · {product.family} family</div>
          <h1 className="text-3xl sm:text-4xl">{product.name}</h1>
          <div className="flex items-center gap-2"><Stars rating={product.rating} /><span className="text-sm text-muted">{product.reviewCount ? `${product.reviewCount} review${product.reviewCount === 1 ? '' : 's'}` : 'No reviews yet'}</span>{product.badge && <Badge tone={product.badge === 'New' ? 'accent' : product.badge.startsWith('Save') ? 'good' : 'neutral'}>{product.badge}</Badge>}</div>
          {product.tagline && <p className="text-lg">{product.tagline}</p>}
          <p className="text-muted">{product.description}</p>
          {product.notes && product.notes.top !== '—' && (
            <div className="grid grid-cols-3 gap-2">{(['top', 'heart', 'base'] as const).map((k) => <div key={k} className="card p-3"><div className="eyebrow">{product.category === 'set' ? (['Candle', 'Soak / Scrub', 'Lotion / Extra'][['top', 'heart', 'base'].indexOf(k)] || '') : k}</div><div className="text-sm font-semibold">{product.notes![k]}</div></div>)}</div>
          )}
          {product.category === 'candle' && (
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[['Burn time', product.burnTime], ['Wax', product.wax], ['Wick', product.wick], ['Vessel', 'Reusable glass']].map(([k, v]) => v ? <div key={k}><dt className="eyebrow">{k}</dt><dd className="font-semibold">{v}</dd></div> : null)}</dl>
          )}
          {bundle && bundle.length > 0 && <div className="text-sm"><span className="font-bold">Includes:</span> {bundle.map((b) => <Link key={b!.id} to={`/product/${b!.slug}`} className="ml-1 text-pine underline">{b!.name}</Link>)}</div>}
          <div>
            <div className="label">{product.category === 'set' ? 'Option' : 'Size'}</div>
            <div className="flex flex-wrap gap-2">{product.variants.map((v) => { const out = typeof v.stock === 'number' && v.stock <= 0; return <button key={v.id} type="button" disabled={out} onClick={() => setVariantId(v.id)} className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${v.id === variantId ? 'border-pine bg-pine text-pine-ink' : 'border-line bg-surface hover:bg-surface-2'}`}>{v.label} · {money(v.price)}{out ? ' · sold out' : ''}</button>; })}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="num text-2xl font-bold">{money(variant.price * qty)}{variant.compareAt && <s className="ml-2 text-base font-normal text-muted">{money(variant.compareAt * qty)}</s>}</span>
            <Qty value={qty} onChange={(n) => setQty(Math.max(1, Math.min(20, n)))} />
            {soldOut ? <Button variant="ghost" onClick={() => toast("We'll restock soon")}>Sold out</Button> : <Button variant="accent" size="lg" onClick={() => add(product.id, variant.id, qty)}>Add to bag</Button>}
            <button type="button" aria-pressed={has(product.id)} onClick={() => { toggle(product.id); toast(has(product.id) ? 'Removed from wishlist' : 'Saved to wishlist'); }} className={`rounded-full border border-line px-3 py-2 text-sm font-semibold ${has(product.id) ? 'text-bad' : ''}`}>{has(product.id) ? '♥ Saved' : '♡ Save'}</button>
          </div>
          <p className="text-sm text-muted">{low && <Badge tone="warn" className="mr-2">Only {variant.stock} left</Badge>}Ships in 1–2 business days · Free shipping over $60 · 30-day swap</p>
          <details open className="card"><summary className="cursor-pointer px-4 py-3 font-bold">{isBody ? 'Ingredients (INCI)' : product.category === 'set' ? "What's in the box" : 'Candle care & safety'}</summary><div className="px-4 pb-4 text-sm text-muted">{isBody ? <>{product.ingredients}<br /><br />*Fragrance is phthalate-free. Patch test before first use. External use only. Discontinue if irritation occurs.</> : product.category === 'set' ? product.description : <>Trim the wick to ¼″ before every burn. Let the first burn reach the edge of the jar (2–3 hours) to prevent tunnelling. Never leave a burning candle unattended; keep away from drafts, children and pets. Stop use with ½″ of wax left.</>}</div></details>
          <details className="card"><summary className="cursor-pointer px-4 py-3 font-bold">Shipping &amp; returns</summary><div className="px-4 pb-4 text-sm text-muted">USPS Ground Advantage (2–5 days) or UPS 2nd Day. Liquids ship in leak-proof mailers; candles are heat-protected June–September. 30-day returns on unopened items. <Link to="/shipping-returns" className="underline">Full policy</Link>.</div></details>
        </div>
      </div>

      {pairs.length > 0 && (
        <section className="py-12"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">Pairs with</div><h2 className="text-2xl">Finish the {product.family.toLowerCase()} set</h2></div><Button variant="ghost" size="sm" to="/build-a-set">Bundle &amp; save 15%</Button></div><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{pairs.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>
      )}

      <section className="py-8" id="reviews">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">Reviews</div><h2 className="text-2xl">{product.reviewCount ? `${product.reviewCount} reviews · ${product.rating} average` : 'Be the first to review'}</h2></div><Button variant="ghost" size="sm" onClick={() => setShowForm((s) => !s)}>Write a review</Button></div>
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
    </div>
  );
}
