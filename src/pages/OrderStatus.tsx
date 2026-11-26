import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lookupOrder, errorMessage, type OrderLookup } from '../services/api';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { Alert, Field } from '../components/ui/Bits';

const STEPS = ['paid', 'fulfilled', 'shipped', 'delivered'];
const LABEL: Record<string, string> = { pending: 'Awaiting payment', paid: 'Paid', fulfilled: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' };

/** Guest order lookup: order number + checkout email. Works on any device, no account needed. */
export default function OrderStatus() {
  useSeo({ title: 'Order status', noindex: true });
  const [params] = useSearchParams();
  const [number, setNumber] = useState(params.get('n') || '');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState<OrderLookup | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setOrder(null);
    try { setOrder(await lookupOrder({ number, email })); } catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };

  const step = order ? STEPS.indexOf(order.status) : -1;
  return (
    <div className="wrap max-w-xl py-12">
      <h1 className="text-3xl sm:text-4xl">Order status</h1>
      <p className="mt-2 text-muted">Enter the order number from your receipt and the email you used at checkout.</p>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
        <Field label="Order number"><input className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="KF-1042" autoComplete="off" required /></Field>
        <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
        <Button type="submit" disabled={busy}>{busy ? 'Looking…' : 'Find my order'}</Button>
      </form>
      {err && <div className="mt-4"><Alert>{err}</Alert></div>}
      {order && (
        <div className="card mt-6 p-5" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3"><h2 className="text-xl">Order {order.number}</h2><span className="font-bold">{LABEL[order.status] || order.status}</span></div>
          {step >= 0 && <div className="mt-4 flex gap-1">{STEPS.map((s, i) => <div key={s} className={`flex-1 border-t-4 pt-2 text-center text-xs capitalize ${i <= step ? 'border-good font-bold' : 'border-line text-muted'}`}>{s}</div>)}</div>}
          <ul className="mt-4 space-y-1 text-sm">{order.items.map((i, k) => <li key={k}>{i.name} <span className="text-muted">{i.variantLabel} × {i.quantity}</span></li>)}</ul>
          <div className="mt-3 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><span>Total</span><span className="num font-bold">{money(order.total)}</span></div>
            {order.refundedTotal > 0 && <div className="flex justify-between text-muted"><span>Refunded</span><span className="num">{money(order.refundedTotal)}</span></div>}
            {order.shipTo && <div className="mt-1 text-muted">Ships to {order.shipTo.city}, {order.shipTo.state}</div>}
          </div>
          {order.tracking && <p className="mt-3 text-sm">Tracking{order.tracking.carrier ? ` (${order.tracking.carrier})` : ''}: <a className="underline" href={order.tracking.url} target="_blank" rel="noopener noreferrer">{order.tracking.number}</a></p>}
          <p className="mt-4 text-sm text-muted">Questions? Email hello@kindflames.com with your order number.</p>
        </div>
      )}
    </div>
  );
}
