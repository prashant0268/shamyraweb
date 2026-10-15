import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';
import { money } from '../../lib/format';
import { ProductImage, Qty } from '../ui/Bits';
import Button from '../ui/Button';

export default function CartDrawer() {
  const { hydrated, isOpen, close, subtotal, setQuantity, remove } = useCart();
  const { settings } = useCatalog();
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && close(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [close]);
  if (!isOpen) return null;
  const left = Math.max(0, settings.freeShippingThreshold - subtotal);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <button className="flex-1 bg-black/40" aria-label="Close bag" onClick={close} />
      <div className="flex h-full w-[min(420px,100vw)] flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><span className="font-display text-xl font-bold">Your bag</span><button onClick={close} aria-label="Close" className="rounded-lg p-2 hover:bg-surface-2"><X size={20} /></button></div>
        <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
          {hydrated.length === 0 ? <p className="text-muted">Your bag is empty. <Link to="/shop" onClick={close} className="text-pine underline">Start with a candle →</Link></p> : hydrated.map((l) => (
            <div key={l.productId + l.variantId} className="flex items-center gap-3">
              <Link to={`/product/${l.product.slug}`} onClick={close} className="h-16 w-16 flex-none overflow-hidden rounded-lg bg-surface-2"><ProductImage product={l.product} size={400} className="h-full w-full" /></Link>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{l.product.name}</div>
                <div className="text-xs text-muted">{l.variant.label} · {money(l.variant.price)}{l.bundle ? ' · in spa set' : ''}</div>
                <div className="mt-1 flex items-center gap-3"><Qty size="sm" value={l.quantity} onChange={(n) => setQuantity(l.productId, l.variantId, n)} /><button className="text-xs text-muted underline" onClick={() => remove(l.productId, l.variantId)}>Remove</button></div>
              </div>
              <div className="num font-bold">{money(l.variant.price * l.quantity)}</div>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-line px-5 py-4">
          {hydrated.length > 0 && (
            <>
              <div className="text-xs">{left > 0 ? <>Add <b>{money(left)}</b> for free shipping</> : <b className="text-good">You've unlocked free shipping</b>}</div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-good transition-all" style={{ width: `${Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)}%` }} /></div>
            </>
          )}
          <div className="flex justify-between"><span>Subtotal</span><b className="num">{money(subtotal)}</b></div>
          <Button block variant="accent" to="/checkout" onClick={close} disabled={hydrated.length === 0}>Checkout</Button>
          <Link to="/cart" onClick={close} className="block text-center text-xs text-muted underline">View bag</Link>
        </div>
      </div>
    </div>
  );
}
