import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserOrders } from '../services/orders';
import { formatDate, money } from '../lib/format';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Bits';
import type { Order } from '../types';

const STEPS = ['paid', 'fulfilled', 'shipped', 'delivered'];
const tone = (s: string) => (s === 'delivered' || s === 'paid' ? 'good' : s === 'refunded' || s === 'cancelled' ? 'bad' : s === 'pending' ? 'warn' : 'accent');

export default function Account() {
  useSeo({ title: 'My account', noindex: true });
  const { user, loading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => { if (user) getUserOrders(user.uid).then(setOrders).catch(() => setOrders([])); }, [user]);
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
      <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="card p-4"><div className="font-bold">Email</div><div className="text-sm text-muted">{user.email}</div></div><div className="card p-4"><div className="font-bold">Member since</div><div className="text-sm text-muted">{user.creationTime ? new Date(user.creationTime).toLocaleDateString() : '—'}</div></div></div>
    </div>
  );
}
