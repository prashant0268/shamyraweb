import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext';
import { adminListOrders } from '../../services/orders';
import { listQuotes } from '../../services/admin';
import { money } from '../../lib/format';
import { Badge } from '../../components/ui/Bits';
import Button from '../../components/ui/Button';
import type { Order, Quote } from '../../types';

const ms = (t?: { seconds: number } | number | null) => (!t ? 0 : typeof t === 'number' ? t : t.seconds * 1000);

export default function AdminOverview() {
  const { allProducts, source } = useCatalog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  useEffect(() => { adminListOrders().then(setOrders).catch(() => {}); listQuotes().then(setQuotes).catch(() => {}); }, []);

  const stats = useMemo(() => {
    const now = Date.now(), d30 = now - 30 * 864e5, d60 = now - 60 * 864e5;
    const paid = orders.filter((o) => ['paid', 'fulfilled', 'shipped', 'delivered'].includes(o.status));
    const cur = paid.filter((o) => ms(o.createdAt) >= d30), prev = paid.filter((o) => ms(o.createdAt) >= d60 && ms(o.createdAt) < d30);
    const rev = (l: Order[]) => l.reduce((t, o) => t + o.total, 0);
    const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
    const top: Record<string, number> = {};
    for (const o of cur) for (const i of o.items) top[i.name] = (top[i.name] || 0) + i.quantity;
    const days = Array.from({ length: 14 }, (_, k) => { const day = now - (13 - k) * 864e5; return paid.filter((o) => Math.floor(ms(o.createdAt) / 864e5) === Math.floor(day / 864e5)).reduce((t, o) => t + o.total, 0); });
    return { rev: rev(cur), revPct: pct(rev(cur), rev(prev)), count: cur.length, countPct: pct(cur.length, prev.length), aov: cur.length ? rev(cur) / cur.length : 0, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), days, toShip: orders.filter((o) => ['paid', 'fulfilled'].includes(o.status)).length };
  }, [orders]);
  const low = allProducts.flatMap((p) => p.variants.filter((v) => typeof v.stock === 'number' && v.stock < 10).map((v) => ({ p, v })));
  const openQuotes = quotes.filter((q) => ['new', 'quoted'].includes(q.status));
  const max = Math.max(1, ...stats.days);

  return (
    <div className="space-y-6">
      {source === 'local' && <div className="card flex flex-wrap items-center justify-between gap-3 border-honey bg-honey/10 p-4 text-sm"><span><b>Catalog not seeded yet.</b> The store is showing the built-in catalog. Import it to Firestore so you can edit products here.</span><Button size="sm" to="/admin/products">Go to products</Button></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Revenue · 30d', money(stats.rev), stats.revPct], ['Orders · 30d', String(stats.count), stats.countPct], ['Avg order', money(stats.aov), null], ['Open quotes', String(openQuotes.length), null]].map(([l, v, p]) => (
          <div key={l as string} className="card p-4"><div className="eyebrow">{l}</div><div className="num font-display text-2xl font-bold">{v}</div>{p !== null && p !== undefined && <div className={`text-xs ${(p as number) >= 0 ? 'text-good' : 'text-bad'}`}>{(p as number) >= 0 ? '▲' : '▼'} {Math.abs(p as number)}% vs prior 30d</div>}</div>
        ))}
      </div>
      <div className="card p-4"><div className="mb-2 flex justify-between text-sm"><b>Daily revenue</b><span className="text-muted">last 14 days</span></div><div className="flex h-24 items-end gap-1">{stats.days.map((v, i) => <div key={i} title={money(v)} className="flex-1 rounded-t bg-honey/80" style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />)}</div></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2 p-4"><b>Needs attention</b>
          {stats.toShip > 0 && <div className="text-sm"><Badge tone="warn">To ship</Badge> {stats.toShip} paid order{stats.toShip === 1 ? '' : 's'} not shipped · <Link to="/admin/orders" className="underline">open</Link></div>}
          {low.slice(0, 6).map(({ p, v }) => <div key={p.id + v.id} className="text-sm"><Badge tone={v.stock ? 'warn' : 'bad'}>{v.stock ? 'Low' : 'Out'}</Badge> {p.name} {v.label} — {v.stock} left · <Link to={`/admin/products/${p.id}`} className="underline">edit</Link></div>)}
          {openQuotes.slice(0, 4).map((q) => <div key={q.id} className="text-sm"><Badge tone="accent">Quote</Badge> {q.company}, {q.quantity} × {q.product} · <Link to="/admin/quotes" className="underline">open</Link></div>)}
          {stats.toShip === 0 && low.length === 0 && openQuotes.length === 0 && <p className="text-sm text-muted">All clear.</p>}
        </div>
        <div className="card p-4"><b>Top products · 30d</b>{stats.top.length === 0 ? <p className="text-sm text-muted">No paid orders in the last 30 days.</p> : stats.top.map(([n, q]) => <div key={n} className="flex justify-between text-sm"><span>{n}</span><b className="num">{q}</b></div>)}</div>
      </div>
    </div>
  );
}
