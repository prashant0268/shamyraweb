import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { createSubscriptionCheckout, errorMessage, listPlans, verifySubscription } from '../services/api';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';
import Button from '../components/ui/Button';
import { Alert, Field } from '../components/ui/Bits';
import type { Plan, ShippingAddress } from '../types';

const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
const FALLBACK: Plan[] = [{ id: 'monthly', name: 'Candle of the Month', amount: 2400, interval: 'month', intervalCount: 1, description: 'One 8 oz candle in a new scent every month, free shipping.' }, { id: 'quarterly', name: 'Seasonal Spa Box', amount: 6900, interval: 'month', intervalCount: 3, description: 'A candle, a bath soak and a lotion every season, free shipping.' }];

export function SubscribeThanks() {
  useSeo({ title: 'Subscription confirmed', noindex: true });
  const [params] = useSearchParams();
  const { loading } = useAuth();
  const [state, setState] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (loading) return;
    const sessionId = params.get('session_id');
    if (!sessionId) { setState('fail'); setMsg('Missing session.'); return; }
    verifySubscription({ sessionId }).then((r) => { if (r.active) { setState('ok'); track('purchase', { transaction_id: r.subscription?.id, value: (r.subscription?.amount || 0), currency: 'USD', subscription: true }); } else { setState('fail'); setMsg(`Subscription status: ${r.status}`); } }).catch((e) => { setState('fail'); setMsg(errorMessage(e)); });
  }, [loading, params]);
  if (state === 'checking') return <div className="wrap py-24 text-center text-muted">Confirming your subscription…</div>;
  if (state === 'fail') return <div className="wrap max-w-lg py-16"><Alert>{msg}</Alert><Button to="/subscribe" className="mt-4">Back</Button></div>;
  return <div className="wrap max-w-lg py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-btn bg-good/15 text-3xl text-good">✓</div><h1 className="mt-4 text-3xl">You're in.</h1><p className="mt-2 text-muted">Your first box ships within 5 business days. Manage, pause or cancel any time from your account.</p><div className="mt-5 flex justify-center gap-3"><Button to="/account">My account</Button><Button variant="ghost" to="/shop">Keep browsing</Button></div></div>;
}

export default function Subscribe() {
  useSeo({ title: 'Candle of the Month', description: 'A new hand-poured scent every month, or a seasonal spa box. Free shipping, cancel any time.', path: '/subscribe' });
  const { user, loginAsGuest } = useAuth();
  const { settings } = useCatalog();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK);
  const [plan, setPlan] = useState<'monthly' | 'quarterly'>('monthly');
  const [pref, setPref] = useState('Surprise me');
  const [email, setEmail] = useState(user?.email || '');
  const [addr, setAddr] = useState<ShippingAddress>({ fullName: user?.displayName || '', address: '', address2: '', city: '', state: 'NJ', zipCode: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get('cancelled') ? 'Checkout cancelled — nothing was charged.' : '');
  useEffect(() => { listPlans({}).then((r) => setPlans(r.plans)).catch(() => {}); }, []);
  useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user, email]);
  const isProd = ['kindflames.com', 'www.kindflames.com'].includes(window.location.hostname);
  const open = settings.cardPaymentsEnabled || !isProd;
  const valid = !!(email && addr.fullName && addr.address && addr.city && /^\d{5}(-\d{4})?$/.test(addr.zipCode));
  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr({ ...addr, [k]: e.target.value });
  const go = async () => {
    if (!valid) { setError('Please complete your email and shipping address.'); return; }
    setBusy(true); setError('');
    try { if (!user) await loginAsGuest(); const r = await createSubscriptionCheckout({ plan, shippingAddress: addr, email, preference: pref, origin: window.location.origin }); window.location.href = r.url; }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  };
  return (
    <div className="wrap py-8">
      <div className="mb-8 max-w-2xl"><div className="eyebrow">Subscriptions</div><h1 className="text-4xl sm:text-5xl">A new scent on the doorstep, every month.</h1><p className="mt-3 text-lg text-muted">Hand-poured in New Jersey, shipped free, and you can pause or cancel any time from your account. Tell us a scent family you love and we'll steer around what you don't.</p></div>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">{plans.map((p) => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)} className={`card p-5 text-left transition ${plan === p.id ? 'border-honey shadow-lg' : 'hover:border-pine'}`}><div className="eyebrow">{p.intervalCount === 1 ? 'Monthly' : 'Every 3 months'}</div><div className="font-display text-2xl font-semibold">{p.name}</div><div className="num mt-1 text-xl font-bold">{money(p.amount / 100)}<span className="text-sm font-normal text-muted"> / {p.intervalCount === 1 ? 'month' : 'quarter'}</span></div><p className="mt-2 text-sm text-muted">{p.description}</p>{p.id === 'quarterly' && <span className="mt-2 inline-block rounded-btn bg-good/15 px-2 py-0.5 text-xs font-bold text-good">Save vs. buying separately</span>}</button>
          ))}</div>
          <div className="card space-y-3 p-5">
            <h2 className="text-xl">Your preferences</h2>
            <Field label="Scent direction"><select id="sub-pref" className="input" value={pref} onChange={(e) => setPref(e.target.value)}>{['Surprise me', 'Floral & fresh', 'Woody & spiced', 'Gourmand & sweet', 'Unscented / low fragrance'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          </div>
          <div className="card space-y-3 p-5">
            <h2 className="text-xl">Ship to</h2>
            <Field label="Email"><input id="sub-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
            <Field label="Full name"><input id="sub-name" className="input" value={addr.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
            <Field label="Address"><input id="sub-addr" className="input" value={addr.address} onChange={set('address')} autoComplete="address-line1" /></Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Field label="City"><input id="sub-city" className="input" value={addr.city} onChange={set('city')} /></Field><Field label="State"><select id="sub-state" className="input" value={addr.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="ZIP"><input id="sub-zip" className="input" value={addr.zipCode} onChange={set('zipCode')} inputMode="numeric" /></Field></div>
          </div>
        </div>
        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="text-xl">Summary</h2>
          {(() => { const p = plans.find((x) => x.id === plan)!; return <><div className="flex justify-between"><span>{p.name}</span><b className="num">{money(p.amount / 100)}</b></div><div className="flex justify-between text-sm text-muted"><span>Shipping</span><span>Free</span></div><div className="flex justify-between text-sm text-muted"><span>Billed</span><span>{p.intervalCount === 1 ? 'monthly' : 'every 3 months'}</span></div></>; })()}
          {error && <Alert>{error}</Alert>}
          {open ? <Button block variant="accent" size="lg" disabled={!valid || busy} onClick={go}>{busy ? 'Redirecting…' : 'Subscribe with card'}</Button> : <Alert tone="warn">Subscriptions open as soon as card payments go live. <Link to="/shop/candle" className="underline">Shop single candles</Link> in the meantime.</Alert>}
          <p className="text-xs text-muted">Secure checkout by Stripe. Cancel any time; no minimum term. Renewals charge on the same day each period.</p>
          <p className="text-xs text-muted">Already subscribed? <Link to="/account" className="underline">Manage it here</Link>.</p>
        </aside>
      </div>
      {user?.isAnonymous && <p className="mt-4 text-xs text-muted">Tip: <button className="underline" onClick={() => navigate('/register')}>create an account</button> so your subscription shows up in your account page.</p>}
    </div>
  );
}
