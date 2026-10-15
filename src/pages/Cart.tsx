import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { ProductImage, Qty } from '../components/ui/Bits';

export default function Cart() {
  useSeo({ title: 'Your bag', noindex: true });
  const { hydrated, subtotal, setQuantity, remove, clear } = useCart();
  const { settings } = useCatalog();
  if (hydrated.length === 0) return <div className="wrap py-20 text-center"><h1 className="text-3xl">Your bag is empty</h1><p className="mt-2 text-muted">Start with a candle, or build a spa set.</p><div className="mt-5 flex justify-center gap-3"><Button to="/shop">Browse the shop</Button><Button variant="ghost" to="/build-a-set">Build a set</Button></div></div>;
  return (
    <div className="wrap py-8">
      <div className="mb-6 flex items-center justify-between"><h1 className="text-3xl">Your bag</h1><button onClick={clear} className="text-sm text-muted underline">Clear</button></div>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">{hydrated.map((l) => (
          <div key={l.productId + l.variantId} className="card flex items-center gap-4 p-3">
            <Link to={`/product/${l.product.slug}`} className="h-20 w-20 flex-none overflow-hidden rounded-lg bg-surface-2"><ProductImage product={l.product} size={400} className="h-full w-full" /></Link>
            <div className="min-w-0 flex-1"><Link to={`/product/${l.product.slug}`} className="font-display text-lg font-semibold hover:underline">{l.product.name}</Link><div className="text-sm text-muted">{l.variant.label} · {money(l.variant.price)}{l.bundle ? ' · spa set (15% off at checkout)' : ''}</div><div className="mt-2 flex items-center gap-3"><Qty size="sm" value={l.quantity} onChange={(n) => setQuantity(l.productId, l.variantId, n)} /><button className="text-xs text-muted underline" onClick={() => remove(l.productId, l.variantId)}>Remove</button></div></div>
            <div className="num font-bold">{money(l.variant.price * l.quantity)}</div>
          </div>
        ))}</div>
        <div className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-xl">Summary</h2>
          <div className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><b className="num">{money(subtotal)}</b></div><div className="flex justify-between text-muted"><span>Shipping</span><span>{subtotal >= settings.freeShippingThreshold ? 'Free' : `${money(settings.flatShipping)} (free over $${settings.freeShippingThreshold})`}</span></div><div className="flex justify-between text-muted"><span>Tax</span><span>Calculated at checkout</span></div></div>
          <Button block variant="accent" to="/checkout" className="mt-4">Checkout</Button>
          <p className="mt-2 text-center text-xs text-muted">Guest checkout available · PayPal{settings.cardPaymentsEnabled ? ' or card' : ''}</p>
        </div>
      </div>
    </div>
  );
}
