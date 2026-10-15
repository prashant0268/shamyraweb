import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getOrder } from '../services/orders';
import { verifyStripePayment, errorMessage } from '../services/api';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';
import Button from '../components/ui/Button';
import { Alert } from '../components/ui/Bits';
import type { Order } from '../types';

const STEPS = ['paid', 'fulfilled', 'shipped', 'delivered'];

export default function OrderConfirmation() {
  useSeo({ title: 'Order confirmation', noindex: true });
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const { clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<'verifying' | 'paid' | 'unpaid' | 'error'>('verifying');
  const [err, setErr] = useState('');
  const orderId = params.get('order') || '';
  const sessionId = params.get('session_id');

  useEffect(() => {
    if (loading || !orderId) return;
    (async () => {
      try {
        if (sessionId) {
          const r = await verifyStripePayment({ sessionId, orderId });
          if (r.paid && r.order) { setOrder(r.order); setState('paid'); clear(); track('purchase', { transaction_id: r.order.number, value: r.order.total, currency: 'USD' }); return; }
          setState('unpaid'); return;
        }
        const o = await getOrder(orderId);
        if (!o) { setErr('We could not find that order.'); setState('error'); return; }
        setOrder(o); setState(o.paymentStatus === 'paid' ? 'paid' : 'unpaid');
        if (o.paymentStatus === 'paid') track('purchase', { transaction_id: o.number, value: o.total, currency: 'USD' });
      } catch (e) { setErr(errorMessage(e)); setState('error'); }
    })();
  }, [loading, orderId, sessionId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!orderId) return <div className="wrap py-20 text-center"><h1 className="text-3xl">No order to show</h1><Button to="/shop" className="mt-4">Back to the shop</Button></div>;
  if (state === 'verifying') return <div className="wrap py-24 text-center text-muted">Confirming your payment…</div>;
  if (state === 'error') return <div className="wrap max-w-xl py-16"><Alert>{err}</Alert><p className="mt-3 text-sm text-muted">If you were charged, email hello@kindflames.com with your order details and we'll sort it out.</p></div>;
  if (state === 'unpaid') return <div className="wrap max-w-xl py-16 text-center"><h1 className="text-3xl">Payment not completed</h1><p className="mt-2 text-muted">Your order was saved but we haven't received payment. Nothing has been charged.</p><Button to="/checkout" className="mt-4">Return to checkout</Button></div>;

  const o = order!;
  const first = o.customerName?.split(' ')[0] || 'there';
  return (
    <div className="wrap max-w-2xl py-12">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-good/15 text-3xl text-good">✓</div>
        <h1 className="mt-4 text-3xl sm:text-4xl">Paid. Thank you, {first}.</h1>
        <p className="mt-2 text-muted">Order <b className="text-ink">{o.number}</b>{o.email && <> · a receipt is on its way to <b className="text-ink">{o.email}</b></>}</p>
      </div>
      <div className="mt-8 flex gap-1">{STEPS.map((s, i) => <div key={s} className={`flex-1 border-t-4 pt-2 text-center text-xs capitalize ${i <= STEPS.indexOf(o.status) ? 'border-good font-bold' : 'border-line text-muted'}`}>{s}</div>)}</div>
      <div className="card mt-6 p-5">
        <div className="space-y-2 text-sm">{o.items.map((i, k) => <div key={k} className="flex justify-between"><span>{i.name} <span className="text-muted">{i.variantLabel} × {i.quantity}</span></span><span className="num">{money(i.price * i.quantity - (i.lineDiscount || 0))}</span></div>)}</div>
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="num">{money(o.subtotal)}</span></div>
          {o.discountTotal > 0 && <div className="flex justify-between text-good"><span>Discounts</span><span className="num">−{money(o.discountTotal)}</span></div>}
          {o.giftWrap > 0 && <div className="flex justify-between"><span>Gift box</span><span className="num">{money(o.giftWrap)}</span></div>}
          <div className="flex justify-between"><span>Shipping</span><span className="num">{o.shipping.amount ? money(o.shipping.amount) : 'Free'}</span></div>
          <div className="flex justify-between"><span>Tax</span><span className="num">{money(o.tax)}</span></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><span>Total</span><span className="num">{money(o.total)}</span></div>
        </div>
        <div className="mt-4 border-t border-line pt-3 text-sm"><div className="font-bold">Ships to</div><div className="text-muted">{o.shippingAddress.fullName}<br />{o.shippingAddress.address}{o.shippingAddress.address2 ? `, ${o.shippingAddress.address2}` : ''}<br />{o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.zipCode}</div></div>
      </div>
      <div className="card mt-4 p-5 text-sm"><b>What happens next.</b> We pack in 1–2 business days and email a tracking link when it ships. Candles ship upright in molded pulp; liquids are sealed and bagged.</div>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Button to="/account">View your orders</Button><Button variant="ghost" to="/shop">Keep shopping</Button></div>
      {user?.isAnonymous && <p className="mt-4 text-center text-sm text-muted"><Link to="/register" className="underline">Create an account</Link> to keep this order in your history.</p>}
    </div>
  );
}
