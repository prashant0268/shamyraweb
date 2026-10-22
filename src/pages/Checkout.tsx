import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { capturePayPalOrder, createPayPalOrder, createStripeCheckout, errorMessage, quoteCart, type CheckoutInput } from '../services/api';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import { isProdEnv } from '../lib/env';
import { track } from '../lib/analytics';
import Button from '../components/ui/Button';
import { Alert, Field, ProductImage } from '../components/ui/Bits';
import type { Pricing, ShippingAddress } from '../types';

const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

export default function Checkout() {
  useSeo({ title: 'Checkout', noindex: true });
  const { user, loginAsGuest } = useAuth();
  const { items, hydrated, clear, ready } = useCart();
  const { settings } = useCatalog();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(user?.email || '');
  const [addr, setAddr] = useState<ShippingAddress>({ fullName: user?.displayName || '', address: '', address2: '', city: '', state: 'NJ', zipCode: '', phone: '' });
  const [method, setMethod] = useState<'standard' | 'express'>('standard');
  const [gift, setGift] = useState({ isGift: false, wrap: false, message: '' });
  const savedCode = (() => { try { return localStorage.getItem('kf_code') || ''; } catch { return ''; } })();
  const [code, setCode] = useState(savedCode);
  const [applied, setApplied] = useState<string | null>(savedCode || null);
  const [pay, setPay] = useState<'paypal' | 'card'>('paypal');
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [error, setError] = useState(params.get('cancelled') ? 'Payment was cancelled. Your bag is still here when you are ready.' : '');
  const [busy, setBusy] = useState(false);
  const orderRef = useRef<string>('');

  useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user, email]);
  const cardAllowed = settings.cardPaymentsEnabled || !isProdEnv();
  const valid = !!(email && addr.fullName && addr.address && addr.city && addr.state && /^\d{5}(-\d{4})?$/.test(addr.zipCode));
  const base: Omit<CheckoutInput, 'origin'> = useMemo(() => ({ items, shippingAddress: addr, email, discountCode: applied, shippingMethod: method, gift }), [items, addr, email, applied, method, gift]);

  // Server-priced totals; re-quoted when anything that affects price changes.
  useEffect(() => {
    if (!items.length) return;
    const t = setTimeout(() => {
      quoteCart({ items, shippingAddress: { ...addr, zipCode: addr.zipCode || '00000', fullName: addr.fullName || 'x', address: addr.address || 'x', city: addr.city || 'x' }, discountCode: applied, shippingMethod: method, gift })
        .then((p) => { setPricing(p); setQuoteError(''); })
        .catch((e) => { try { if (applied) localStorage.removeItem('kf_code'); } catch { /* ignore */ } const code = (e as { code?: string }).code || ''; const unreachable = /internal|unavailable|not-found|deadline/.test(code) && !applied; setQuoteError(unreachable ? 'Checkout is temporarily unavailable — our pricing service did not respond. Please try again in a few minutes or email hello@kindflames.com.' : errorMessage(e)); if (applied) setApplied(null); });
    }, 350);
    return () => clearTimeout(t);
  }, [items, addr.state, addr.zipCode, applied, method, gift.wrap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (hydrated.length) track('begin_checkout', { value: hydrated.reduce((n, l) => n + l.variant.price * l.quantity, 0), currency: 'USD' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCode = (e: FormEvent) => { e.preventDefault(); setApplied(code.trim().toUpperCase() || null); };
  const ensureUser = useCallback(async () => user ?? (await loginAsGuest()), [user, loginAsGuest]);

  const payWithCard = async () => {
    if (!valid) { setError('Please complete your email and shipping address.'); return; }
    setBusy(true); setError('');
    try { await ensureUser(); const r = await createStripeCheckout({ ...base, origin: window.location.origin }); window.location.href = r.url; }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  };

  const paypalClientId = (isProdEnv() ? import.meta.env.VITE_PAYPAL_CLIENT_ID_LIVE : import.meta.env.VITE_PAYPAL_CLIENT_ID) || '';

  if (ready && hydrated.length === 0 && !busy) return <div className="wrap py-20 text-center"><h1 className="text-3xl">Your bag is empty</h1><Button to="/shop" className="mt-4">Browse the shop</Button></div>;

  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr({ ...addr, [k]: e.target.value });
  const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => <div className={`flex justify-between ${strong ? 'border-t border-line pt-2 text-lg font-bold' : 'text-sm'}`}><span>{l}</span><span className="num">{v}</span></div>;

  return (
    <div className="wrap py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2"><h1 className="text-3xl">Checkout</h1><span className="text-sm text-muted">Guest checkout · no account needed</span></div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <section className="card space-y-3 p-5">
            <h2 className="text-xl">Contact</h2>
            <Field label="Email"><input id="co-email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
            <p className="text-xs text-muted">Order confirmation and tracking go here.</p>
          </section>
          <section className="card space-y-3 p-5">
            <h2 className="text-xl">Shipping address</h2>
            <Field label="Full name"><input id="co-name" className="input" value={addr.fullName} onChange={set('fullName')} autoComplete="name" required /></Field>
            <Field label="Address"><input id="co-addr" className="input" value={addr.address} onChange={set('address')} autoComplete="address-line1" required /></Field>
            <Field label="Apt, suite (optional)"><input id="co-addr2" className="input" value={addr.address2} onChange={set('address2')} autoComplete="address-line2" /></Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="City"><input id="co-city" className="input" value={addr.city} onChange={set('city')} autoComplete="address-level2" required /></Field>
              <Field label="State"><select id="co-state" className="input" value={addr.state} onChange={set('state')} autoComplete="address-level1">{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="ZIP"><input id="co-zip" className="input" value={addr.zipCode} onChange={set('zipCode')} autoComplete="postal-code" inputMode="numeric" required /></Field>
            </div>
            <Field label="Phone (for delivery questions)"><input id="co-phone" className="input" value={addr.phone} onChange={set('phone')} autoComplete="tel" /></Field>
            <div className="pt-2"><div className="label">Shipping method</div>
              {[['standard', 'USPS Ground Advantage · 2–5 days', pricing ? (pricing.shipping.method === 'standard' && pricing.shipping.amount === 0 ? 'Free' : money(pricing.settings.flatShipping)) : money(settings.flatShipping)], ['express', 'UPS 2nd Day Air', money(settings.expressShipping)]].map(([k, l, p]) => (
                <label key={k} className="flex items-center gap-2 py-1 text-sm"><input type="radio" name="ship" checked={method === k} onChange={() => setMethod(k as 'standard' | 'express')} /> {l} — <b>{p}</b>{k === 'standard' && <span className="text-xs text-muted">(free over ${settings.freeShippingThreshold})</span>}</label>
              ))}
            </div>
          </section>
          <section className="card space-y-3 p-5">
            <h2 className="text-xl">Gift options</h2>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gift.isGift} onChange={(e) => setGift({ ...gift, isGift: e.target.checked })} /> This is a gift (prices hidden on packing slip)</label>
            {gift.isGift && (<>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gift.wrap} onChange={(e) => setGift({ ...gift, wrap: e.target.checked })} /> Kraft gift box, tissue and ribbon (+{money(settings.giftWrapFee)})</label>
              <Field label="Gift message (printed on a card)"><textarea id="co-gift" className="input" rows={2} maxLength={300} value={gift.message} onChange={(e) => setGift({ ...gift, message: e.target.value })} placeholder="Happy birthday, Mom — light it on a slow Sunday." /></Field>
            </>)}
          </section>
          <section className="card space-y-3 p-5">
            <h2 className="text-xl">Payment</h2>
            <div className="flex border-b border-line">
              <button type="button" onClick={() => setPay('paypal')} className={`flex-1 border-b-2 py-2 font-bold ${pay === 'paypal' ? 'border-honey text-ink' : 'border-transparent text-muted'}`}>PayPal</button>
              {cardAllowed && <button type="button" onClick={() => setPay('card')} className={`flex-1 border-b-2 py-2 font-bold ${pay === 'card' ? 'border-honey text-ink' : 'border-transparent text-muted'}`}>Credit / Debit Card</button>}
            </div>
            {!valid && <p className="text-sm text-muted">Complete your email and shipping address to pay.</p>}
            {pay === 'card' && cardAllowed && (
              <div className="space-y-2"><p className="text-sm text-muted">You'll be sent to Stripe's secure checkout. Apple Pay and Google Pay appear there when available.</p><Button block variant="accent" size="lg" disabled={!valid || busy || !pricing} onClick={payWithCard}>{busy ? 'Redirecting…' : `Pay ${pricing ? money(pricing.total) : ''} with card`}</Button></div>
            )}
            {pay === 'paypal' && paypalClientId && (
              <div className={valid && pricing ? '' : 'pointer-events-none opacity-40'}>
                <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD', intent: 'capture', components: 'buttons' }}>
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                    disabled={!valid || busy || !pricing}
                    forceReRender={[pricing?.total, addr.state, addr.zipCode, email, applied, method, gift.wrap]}
                    createOrder={async () => {
                      setError('');
                      await ensureUser();
                      const r = await createPayPalOrder({ ...base, origin: window.location.origin });
                      orderRef.current = r.orderId;
                      return r.paypalOrderId;
                    }}
                    onApprove={async (data) => {
                      setBusy(true);
                      try {
                        const r = await capturePayPalOrder({ paypalOrderId: data.orderID, orderId: orderRef.current });
                        if (r.paid) { clear(); navigate(`/order-confirmation?order=${orderRef.current}&paid=1`); } else setError('Payment was not completed. Please try again.');
                      } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
                    }}
                    onError={(e) => { console.error(e); setError(errorMessage(e, 'PayPal could not start. Please try again.')); }}
                    onCancel={() => setError('Payment cancelled. Your bag is still here.')}
                  />
                </PayPalScriptProvider>
              </div>
            )}
            {pay === 'paypal' && !paypalClientId && <Alert tone="warn">PayPal is not configured for this environment.</Alert>}
            <p className="text-center text-xs text-muted">🔒 Payments are processed by PayPal and Stripe. We never see your card number.</p>
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="text-xl">Order summary</h2>
          <div className="space-y-3">{hydrated.map((l) => <div key={l.productId + l.variantId} className="flex items-center gap-3 text-sm"><div className="h-12 w-12 flex-none overflow-hidden rounded-md bg-surface-2"><ProductImage product={l.product} size={400} className="h-full w-full" /></div><div className="min-w-0 flex-1"><div className="truncate font-semibold">{l.product.name}</div><div className="text-xs text-muted">{l.variant.label} × {l.quantity}{l.bundle ? ' · spa set' : ''}</div></div><span className="num">{money(l.variant.price * l.quantity)}</span></div>)}</div>
          <form onSubmit={applyCode} className="flex gap-2"><input id="co-code" className="input" placeholder="Discount code" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Discount code" /><Button type="submit" variant="ghost" size="sm">Apply</Button></form>
          {quoteError && <Alert tone={/unavailable/.test(quoteError) ? 'bad' : 'warn'}>{quoteError}</Alert>}
          {pricing ? (
            <div className="space-y-1">
              <Row l="Subtotal" v={money(pricing.subtotal)} />
              {pricing.bundleDiscount > 0 && <Row l="Spa set discount" v={`−${money(pricing.bundleDiscount)}`} />}
              {pricing.discount.amount > 0 && <Row l={`Code ${pricing.discount.code}`} v={`−${money(pricing.discount.amount)}`} />}
              {pricing.giftWrap > 0 && <Row l="Gift box" v={money(pricing.giftWrap)} />}
              <Row l="Shipping" v={pricing.shipping.amount ? money(pricing.shipping.amount) : 'Free'} />
              <Row l={`Tax${pricing.taxRate ? ` (${addr.state} ${(pricing.taxRate * 100).toFixed(3).replace(/0+$/, '')}%)` : ''}`} v={money(pricing.tax)} />
              <Row l="Total" v={money(pricing.total)} strong />
            </div>
          ) : !quoteError ? <p className="text-sm text-muted">Calculating totals…</p> : null}
        </aside>
      </div>
    </div>
  );
}
