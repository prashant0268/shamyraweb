import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { createSubscriptionShipments, errorMessage, syncSubscriptions } from '../../services/api';
import { money } from '../../lib/format';
import Button from '../../components/ui/Button';
import { Badge, Field } from '../../components/ui/Bits';
import type { Subscription } from '../../types';

const ts = (n?: number | null) => (n ? new Date(n * 1000).toLocaleDateString() : '—');

export default function AdminSubscriptions() {
  const { products } = useCatalog();
  const toast = useToast();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [busy, setBusy] = useState(false);
  const [picks, setPicks] = useState<Record<string, string[]>>({ monthly: [''], quarterly: ['', '', ''] });
  const load = () => getDocs(query(collection(db, 'subscriptions'), orderBy('updatedAt', 'desc'))).then((s) => setSubs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subscription, 'id'>) })))).catch(() => setSubs([]));
  useEffect(() => { load(); }, []);
  const active = subs.filter((s) => ['active', 'trialing'].includes(s.status));
  const sync = async () => { setBusy(true); try { const r = await syncSubscriptions({}); toast(`Synced ${r.synced} from Stripe`); await load(); } catch (e) { toast(errorMessage(e)); } finally { setBusy(false); } };
  const ship = async () => {
    setBusy(true);
    try {
      const toPicks = (ids: string[]) => ids.filter(Boolean).map((v) => { const [productId, variantId] = v.split('|'); return { productId: productId!, variantId: variantId! }; });
      const r = await createSubscriptionShipments({ picks: { monthly: toPicks(picks.monthly!), quarterly: toPicks(picks.quarterly!) } });
      toast(`${r.created} shipment order(s) created, ${r.skipped} already existed`);
    } catch (e) { toast(errorMessage(e)); } finally { setBusy(false); }
  };
  const opts = products.flatMap((p) => p.variants.map((v) => ({ v: `${p.id}|${v.id}`, l: `${p.name} — ${v.label}` })));
  const Pick = ({ plan, i }: { plan: 'monthly' | 'quarterly'; i: number }) => <select className="input text-sm" value={picks[plan]![i] || ''} onChange={(e) => setPicks({ ...picks, [plan]: picks[plan]!.map((x, j) => (j === i ? e.target.value : x)) })}><option value="">— choose —</option>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><p className="text-sm text-muted">{active.length} active · {subs.length} total. Stripe bills renewals automatically; you create each period's shipment orders here.</p><div className="flex-1" /><Button size="sm" variant="ghost" disabled={busy} onClick={sync}>Sync from Stripe</Button></div>
      <div className="card grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto]">
        <div><div className="label">This month's candle (Candle of the Month)</div><Pick plan="monthly" i={0} /></div>
        <div><div className="label">This quarter's box (Seasonal Spa Box)</div><div className="space-y-2"><Pick plan="quarterly" i={0} /><Pick plan="quarterly" i={1} /><Pick plan="quarterly" i={2} /></div></div>
        <div className="flex items-end"><Button disabled={busy || active.length === 0} onClick={ship}>Create shipment orders</Button></div>
        <p className="text-xs text-muted md:col-span-3">Creates one paid order per active subscriber for the current billing period (safe to click twice — duplicates are skipped), emails them, and the orders then appear in Orders to pack and ship.</p>
      </div>
      <div className="card overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="p-3">Subscriber</th><th className="p-3">Plan</th><th className="p-3">Preference</th><th className="p-3">Period</th><th className="p-3">Status</th></tr></thead><tbody>
        {subs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No subscribers yet.</td></tr>}
        {subs.map((s) => <tr key={s.id} className="border-t border-line"><td className="p-3">{s.email || s.userId}<div className="text-xs text-muted">{s.shippingAddress ? `${s.shippingAddress.city}, ${s.shippingAddress.state}` : ''}</div></td><td className="p-3">{s.plan}{s.amount ? <div className="text-xs text-muted">{money(s.amount)}</div> : null}</td><td className="p-3">{s.preference || '—'}</td><td className="p-3 text-xs">{ts(s.currentPeriodStart)} → {ts(s.currentPeriodEnd)}</td><td className="p-3"><Badge tone={['active', 'trialing'].includes(s.status) ? 'good' : s.status === 'past_due' ? 'warn' : 'bad'}>{s.status}{s.cancelAtPeriodEnd ? ' · ending' : ''}</Badge></td></tr>)}
      </tbody></table></div>
      <Field label="Note"><p className="text-xs text-muted">Customers manage payment method, pause and cancellation through the Stripe portal from their account page.</p></Field>
    </div>
  );
}
