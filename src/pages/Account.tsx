import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserOrders } from '../services/orders';
import { createPortalSession, errorMessage } from '../services/api';
import { useCatalog } from '../context/CatalogContext';
import { useWishlist } from '../lib/wishlist';
import ProductCard from '../components/ui/ProductCard';
import { useToast } from '../context/ToastContext';
import { formatDate, money } from '../lib/format';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Bits';
import type { Order, Subscription } from '../types';

const STEPS = ['paid', 'fulfilled', 'shipped', 'delivered'];
const tone = (s: string) => (s === 'delivered' || s === 'paid' ? 'good' : s === 'refunded' || s === 'cancelled' ? 'bad' : s === 'pending' ? 'warn' : 'accent');

export default function Account() {
  useSeo({ title: 'My account', noindex: true });
  const { user, loading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [portalBusy, setPortalBusy] = useState(false);
  const { products } = useCatalog();
  const { ids } = useWishlist();
  const toast = useToast();
  useEffect(() => { if (user) { getUserOrders(user.uid).then(setOrders).catch(() => setOrders([])); getDocs(query(collection(db, 'subscriptions'), where('userId', '==', user.uid))).then((s) => setSubs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subscription, 'id'>) })))).catch(() => {}); } }, [user]);
  const openPortal = async () => { setPortalBusy(true); try { const r = await createPortalSession({ origin: window.location.origin }); window.location.href = r.url; } catch (e) { toast(errorMessage(e)); setPortalBusy(false); } };
  const wished = products.filter((p) => ids.includes(p.id));
  if (loading) return <div className="wrap py-24 text-center text-muted">Loading…</div>;
  if (!user || user.isAnonymous) return <Navigate to="/login?next=/account" replace />;
  return (
    <div className="wrap py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">My account</div><h1 className="text-3xl">Hi, {user.displayName?.split(' ')[0] || user.email}</h1></div><div className="flex gap-2">{user.isAdmin && <Button variant="accent" size="sm" to="/admin">Admin</Button>}<Button variant="ghost" size="sm" onClick={() => logout()}>Sign out</Button></div></div>
      <h2 className="mb-3 text-xl">Orders</h2>
      {orders === null ? <p className="text-muted">Loading orders…</p> : orders.length === 0 ? <div className="card p-6 text-muted">No orders yet. <Link to="/shop" className="text-pine underline">Find something →</Link></div> : (
        <div className="grid gap-4 md:grid-cols-2">{orders.map((o) => (
          <div key={o.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{o.number}</b><div className="text-xs text-muted">{formatDate(o.createdAt)}</div></div><Badge tone={tone(o.status)}>{o.status}</Badge></div>
            <ul className="text-sm">{o.items.map((i, k) => <li key={k}>{i.name} <span className="text-muted">{i.variantLabel} × {i.quantity}</span></li>)}</ul>
            {!['cancelled', 'refunded', 'pending'].includes(o.status) && <div className="flex gap-1">{STEPS.map((s, i) => <div key={s} className={`flex-1 border-t-4 pt-1 text-center text-[10px] capitalize ${i <= STEPS.indexOf(o.status) ? 'border-good font-bold' : 'border-line text-muted'}`}>{s}</div>)}</div>}
            <div className="flex items-center justify-between"><b className="num">{money(o.total)}</b>{o.tracking?.number ? <a href={o.tracking.url} target="_blank" rel="noreferrer" className="text-sm text-pine underline">Track {o.tracking.carrier} →</a> : <Link to={`/order-confirmation?order=${o.id}`} className="text-sm text-muted underline">Details</Link>}</div>
          </div>
        ))}</div>
      )}
      {subs.length > 0 && <section className="mt-8"><h2 className="mb-3 text-xl">Subscription</h2>{subs.map((s) => <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4"><div><b>{s.plan === 'quarterly' ? 'Seasonal Spa Box' : 'Candle of the Month'}</b><div className="text-sm text-muted">{s.status}{s.cancelAtPeriodEnd ? ' · ends at period end' : ''}{s.currentPeriodEnd ? ` · renews ${new Date(s.currentPeriodEnd * 1000).toLocaleDateString()}` : ''}</div></div><Button size="sm" variant="ghost" disabled={portalBusy} onClick={openPortal}>{portalBusy ? 'Opening…' : 'Manage / pause / cancel'}</Button></div>)}</section>}
      {wished.length > 0 && <section className="mt-8"><h2 className="mb-3 text-xl">Wishlist</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{wished.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>}
      <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="card p-4"><div className="font-bold">Email</div><div className="text-sm text-muted">{user.email}</div></div><div className="card p-4"><div className="font-bold">Member since</div><div className="text-sm text-muted">{user.creationTime ? new Date(user.creationTime).toLocaleDateString() : '—'}</div></div></div>
    </div>
  );
}
