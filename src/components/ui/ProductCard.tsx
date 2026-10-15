import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../lib/wishlist';
import { money } from '../../lib/format';
import { inStock, minPrice } from '../../lib/catalog';
import { CATEGORY_LABELS, type Product, type Variant } from '../../types';
import { Badge, ProductImage, Stars } from './Bits';
import Button from './Button';

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const available = inStock(product);
  const first = (product.variants.find((v) => typeof v.stock !== 'number' || v.stock > 0) || product.variants[0]) as Variant;
  const compare = first?.compareAt;
  const badgeTone = product.badge === 'Sold out' ? 'bad' : product.badge?.startsWith('Save') ? 'good' : product.badge === 'New' ? 'accent' : 'neutral';
  return (
    <div className="card relative flex min-w-0 flex-col overflow-hidden transition hover:shadow-lg">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-surface-2">
        <ProductImage product={product} size={400} className="h-full w-full transition duration-300 hover:scale-105" />
        {!available ? <Badge tone="bad" className="absolute left-2 top-2">Sold out</Badge> : product.badge ? <Badge tone={badgeTone} className="absolute left-2 top-2">{product.badge}</Badge> : null}
      </Link>
      <button type="button" aria-label={has(product.id) ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={has(product.id)} onClick={() => toggle(product.id)} className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-base shadow ${has(product.id) ? 'text-bad' : 'text-muted hover:text-ink'}`}>{has(product.id) ? '♥' : '♡'}</button>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <div className="eyebrow">{CATEGORY_LABELS[product.category]} · {product.family}</div>
        <Link to={`/product/${product.slug}`} className="font-display text-lg font-semibold leading-tight hover:underline">{product.name}</Link>
        {product.tagline && <p className="text-sm text-muted">{product.tagline}</p>}
        <Stars rating={product.rating} count={product.reviewCount} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="num font-bold">{product.variants.length > 1 ? 'From ' : ''}{money(minPrice(product))}{compare ? <s className="ml-1 font-normal text-muted">{money(compare)}</s> : null}</span>
          {available ? <Button size="sm" onClick={() => add(product.id, first.id)}>Add</Button> : <Button size="sm" variant="ghost" to={`/product/${product.slug}`}>Details</Button>}
        </div>
      </div>
    </div>
  );
}
