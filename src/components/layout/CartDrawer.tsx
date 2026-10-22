import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';
import { money } from '../../lib/format';
import { inStock } from '../../lib/catalog';
import { ProductImage, Qty } from '../ui/Bits';
import Button from '../ui/Button';
import type { Product, Variant } from '../../types';

const firstVariant = (p: Product) => (p.variants.find((v) => typeof v.stock !== 'number' || v.stock > 0) || p.variants[0]) as Variant;

export default function CartDrawer() {
  const { hydrated, isOpen, close, subtotal, setQuantity, remove, add } = useCart();
  const { settings, products } = useCatalog();
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && close(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [close]);
  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);

  // "Complete the set": same scent family as something in the bag, not already in it. Falls back to best sellers.
  const upsells = useMemo(() => {
    const inBag = new Set(hydrated.map((l) => l.productId));
    const fams = new Set(hydrated.map((l) => l.product.family));
    const pool = products.filter((p) => !inBag.has(p.id) && inStock(p) && p.category !== 'set');
    const matched = pool.filter((p) => fams.has(p.family));
    return (matched.length ? matched : pool.filter((p) => p.featured)).slice(0, 3);
  }, [hydrated, products]);

  if (!isOpen) return null;
  const left = Math.max(0, settings.freeShippingThreshold - subtotal);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <button className="flex-1 bg-black/40" aria-label="Close bag" onClick={close} />
      <div className="flex h-full w-[min(440px,100vw)] flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><span className="font-display text-xl font-bold">Your bag {hydrated.length > 0 && <span className="text-sm font-normal text-muted">({hydrated.reduce((n, l) => n + l.quantity, 0)})</span>}</span><button onClick={close} aria-label="Close" className="rounded-btn p-2 hover:bg-surface-2"><X size={20} /></button></div>
        {hydrated.length > 0 && (
          <div className="border-b border-line px-5 py-3">
            <div className="text-xs">{left > 0 ? <>You're <b>{money(left)}</b> from free shipping</> : <b className="text-good">You've unlocked free shipping</b>}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-2"><div className="h-full bg-good transition-all" style={{ width: `${Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)}%` }} /></div>
          </div>
        )}
        <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
          {hydrated.length === 0 ? (
            <div className="py-6 text-center"><p className="font-display text-xl">Your bag is empty.</p><p className="mt-1 text-sm text-muted">Start with a candle, or let us build the set.</p><div className="mt-4 flex justify-center gap-2"><Button size="sm" to="/shop/candle" onClick={close}>Shop candles</Button><Button size="sm" variant="ghost" to="/build-a-set" onClick={close}>Build a set</Button></div></div>
          ) : hydrated.map((l) => (
            <div key={l.productId + l.variantId} className="flex items-center gap-3">
              <Link to={`/product/${l.product.slug}`} onClick={close} className="h-20 w-16 flex-none overflow-hidden rounded-img bg-surface-2"><ProductImage product={l.product} size={400} className="h-full w-full" /></Link>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{l.product.name}</div>
                <div className="text-xs text-muted">{l.variant.label} · {money(l.variant.price)}{l.bundle ? ' · in spa set' : ''}</div>
                <div className="mt-1.5 flex items-center gap-3"><Qty size="sm" value={l.quantity} onChange={(n) => setQuantity(l.productId, l.variantId, n)} /><button className="text-xs text-muted underline" onClick={() => remove(l.productId, l.variantId)}>Remove</button></div>
              </div>
              <div className="num font-bold">{money(l.variant.price * l.quantity)}</div>
            </div>
          ))}
          {upsells.length > 0 && (
            <div className="border-t border-line pt-4">
              <div className="eyebrow mb-2">{hydrated.length ? 'Complete the set' : 'Most loved'}</div>
              <div className="space-y-2">
                {upsells.map((p) => { const v = firstVariant(p); return (
                  <div key={p.id} className="flex items-center gap-3 rounded-card border border-line p-2">
                    <Link to={`/product/${p.slug}`} onClick={close} className="h-12 w-12 flex-none overflow-hidden rounded-img bg-surface-2"><ProductImage product={p} size={400} className="h-full w-full" /></Link>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{p.name}</div><div className="text-xs text-muted">{v.label} · {money(v.price)}</div></div>
                    <Button size="sm" variant="ghost" onClick={() => add(p.id, v.id)}>Add</Button>
                  </div>
                ); })}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3 border-t border-line px-5 py-4">
          <div className="flex justify-between"><span>Subtotal</span><b className="num">{money(subtotal)}</b></div>
          <p className="text-xs text-muted">Shipping and tax calculated at checkout. Gift wrap and a handwritten note available.</p>
          <Button block variant="accent" size="lg" to="/checkout" onClick={close} disabled={hydrated.length === 0}>Checkout</Button>
          <Link to="/cart" onClick={close} className="block text-center text-xs text-muted underline">View bag</Link>
        </div>
      </div>
    </div>
  );
}
