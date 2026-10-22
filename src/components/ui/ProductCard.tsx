import { Link } from 'react-router-dom';
import { Heart, Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useWishlist } from '../../lib/wishlist';
import { money } from '../../lib/format';
import { inStock, minPrice } from '../../lib/catalog';
import type { Product, Variant } from '../../types';
import { Badge, ProductImage, Stars } from './Bits';

/** Catalog card: photo with hover swap, quick-add, wishlist, scent line, price. */
export default function ProductCard({ product, compact }: { product: Product; compact?: boolean }) {
  const { add } = useCart();
  const toast = useToast();
  const { has, toggle } = useWishlist();
  const available = inStock(product);
  const first = (product.variants.find((v) => typeof v.stock !== 'number' || v.stock > 0) || product.variants[0]) as Variant;
  const compare = first?.compareAt;
  const badgeTone = product.badge === 'Sold out' ? 'bad' : product.badge?.startsWith('Save') ? 'good' : product.badge === 'New' ? 'accent' : 'neutral';
  const notes = product.notes && product.notes.top !== '—' ? [product.notes.top, product.notes.heart, product.notes.base].filter(Boolean).join(' · ') : product.tagline;
  const quickAdd = () => { add(product.id, first.id); toast(`${product.name} added to your bag`); };
  return (
    <div className="group relative flex min-w-0 flex-col">
      <Link to={`/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-img bg-surface-2">
        <ProductImage product={product} size={400} hover className="h-full w-full transition duration-500 group-hover:scale-[1.03]" />
        {!available ? <Badge tone="bad" className="absolute left-3 top-3">Sold out</Badge> : product.badge ? <Badge tone={badgeTone} className="absolute left-3 top-3">{product.badge}</Badge> : null}
        {available && (
          <span className="absolute inset-x-3 bottom-3 hidden translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
            <button type="button" onClick={(e) => { e.preventDefault(); quickAdd(); }} className="nav-link flex w-full items-center justify-center gap-2 rounded-btn bg-surface/95 py-2.5 text-sm text-ink shadow-card backdrop-blur hover:bg-pine hover:text-pine-ink"><Plus size={16} /> Quick add · {money(first.price)}</button>
          </span>
        )}
      </Link>
      <button type="button" aria-label={has(product.id) ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={has(product.id)} onClick={() => toggle(product.id)} className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-btn bg-surface/90 shadow ${has(product.id) ? 'text-bad' : 'text-muted hover:text-ink'}`}><Heart size={15} fill={has(product.id) ? 'currentColor' : 'none'} /></button>
      <div className={`flex flex-1 flex-col gap-1 ${compact ? 'pt-2' : 'pt-3'}`}>
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${product.slug}`} className="font-display text-base font-semibold leading-tight hover:underline sm:text-lg">{product.name}</Link>
          <span className="num shrink-0 text-sm font-semibold sm:text-base">{product.variants.length > 1 ? <span className="text-muted">from </span> : null}{money(minPrice(product))}{compare ? <s className="ml-1 font-normal text-muted">{money(compare)}</s> : null}</span>
        </div>
        {notes && <p className="line-clamp-1 text-sm text-muted">{notes}</p>}
        <div className="flex items-center justify-between">
          <Stars rating={product.rating} count={product.reviewCount} />
          {available && <button type="button" onClick={quickAdd} className="nav-link text-xs text-muted underline-offset-4 hover:text-ink hover:underline lg:hidden">Add</button>}
        </div>
      </div>
    </div>
  );
}
