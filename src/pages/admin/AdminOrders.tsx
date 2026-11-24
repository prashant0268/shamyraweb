import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { adminListOrders, getOrder } from '../../services/orders';
import { refundOrder, updateOrderStatus, deleteOrder, errorMessage } from '../../services/api';
import { formatDate, money } from '../../lib/format';
import Button from '../../components/ui/Button';
import { Badge, Field } from '../../components/ui/Bits';
import type { Order } from '../../types';

const FLOW = ['paid', 'fulfilled', 'shipped', 'delivered'];
const tone = (s: string) => (s === 'delivered' ? 'good' : s === 'paid' ? 'warn' : s === 'refunded' || s === 'cancelled' ? 'bad' : s === 'pending' ? 'neutral' : 'accent');

export default function AdminOrders() {
  const { id } = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const load = () => adminListOrders(filter).then(setOrders).catch(() => setOrders([]));
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  if (id) return <OrderDetail id={id} onChange={load} />;
  const list = orders.filter((o) => !q || (o.number + o.customerName + o.email).toLowerCase().includes(q.toLowerCase()));
  const csv = () => {
    const rows = [['Number', 'Date', 'Customer', 'Email', 'Items', 'Total', 'Payment', 'Status', 'Address'], ...list.map((o) => [o.number, formatDate(o.createdAt), o.customerName, o.email, o.items.map((i) => `${i.name} ${i.variantLabel} x${i.quantity}`).join('; '), o.total.toFixed(2), o.paymentMethod, o.status, `${o.shippingAddress.address} ${o.shippingAddress.address2 || ''}, ${o.shippingAddress.city} ${o.shippingAddress.state} ${o.shippingAddress.zipCode}`])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `orders-${filter}.csv`; a.click();
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">{['all', 'pending', 'paid', 'fulfilled', 'shipped', 'delivered', 'refunded'].map((s) => <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${filter === s ? 'bg-pine text-pine-ink' : 'bg-surface hover:bg-surface-2'}`}>{s}</button>)}<div className="flex-1" /><input className="input max-w-xs" placeholder="Search number, name, email" value={q} onChange={(e) => setQ(e.target.value)} /><Button size="sm" variant="ghost" onClick={csv}>Export CSV</Button></div>
      <div className="card overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr></thead><tbody>
        {list.length === 0 && <tr><td className="p-6 text-center text-muted" colSpan={6}>No orders{filter !== 'all' ? ` with status “${filter}”` : ' yet'}.</td></tr>}
        {list.map((o) => <tr key={o.id} className="border-t border-line hover:bg-surface-2/50"><td className="p-3"><Link to={`/admin/orders/${o.id}`} className="font-bold text-pine underline">{o.number}</Link><div className="text-xs text-muted">{formatDate(o.createdAt)}</div></td><td className="p-3">{o.customerName}<div className="text-xs text-muted">{o.email}</div></td><td className="max-w-[260px] p-3 text-xs">{o.items.map((i) => `${i.name} ${i.variantLabel} ×${i.quantity}`).join(', ')}</td><td className="num p-3">{money(o.total)}</td><td className="p-3 capitalize">{o.paymentMethod}<div className="text-xs text-muted">{o.paymentStatus}</div></td><td className="p-3"><Badge tone={tone(o.status)}>{o.status}</Badge>{o.tracking?.number && <div className="text-xs text-muted">{o.tracking.number.slice(0, 14)}…</div>}</td></tr>)}
      </tbody></table></div>
      <p className="text-xs text-muted">“Pending” orders were started but never paid (abandoned at PayPal/Stripe). They clear on their own; nothing to do.</p>
    </div>
  );
}

function OrderDetail({ id, onChange }: { id: string; onChange: () => void }) {
  const [o, setO] = useState<Order | null>(null);
  const [tracking, setTracking] = useState({ carrier: 'USPS', number: '' });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundRestock, setRefundRestock] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const load = () => getOrder(id).then((x) => { setO(x); setNotes(x?.internalNotes || ''); if (x?.tracking) setTracking({ carrier: x.tracking.carrier, number: x.tracking.number }); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!o) return <p className="text-muted">Loading…</p>;
  const idx = FLOW.indexOf(o.status);
  const next = idx >= 0 && idx < 3 ? FLOW[idx + 1] : null;
  const act = async (status: string) => {
    if (status === 'shipped' && !tracking.number) { toast('Enter a tracking number first'); return; }
    setBusy(true);
    try { await updateOrderStatus({ orderId: o.id, status, tracking: status === 'shipped' ? tracking : undefined, internalNotes: notes }); toast(`Marked ${status}${status === 'shipped' ? ' · customer emailed' : ''}`); await load(); onChange(); } catch (e) { toast(errorMessage(e)); } finally { setBusy(false); }
  };
  const refundable = Math.round((o.total - (o.refundedTotal || 0)) * 100) / 100;
  const amt = refundAmount.trim() === '' ? refundable : Math.round(Number(refundAmount) * 100) / 100;
  const amtValid = Number.isFinite(amt) && amt > 0 && amt <= refundable;
  const isFull = amtValid && amt >= refundable;
  const refund = async () => {
    if (!amtValid) { toast(`Enter an amount between $0.01 and ${money(refundable)}`); return; }
    if (!confirmRefund) { setConfirmRefund(true); return; }
    setBusy(true);
    try {
      const r = await refundOrder({ orderId: o.id, amount: amt, reason: refundReason.trim() || undefined, restock: isFull ? refundRestock : false });
      toast(`Refunded ${money(r.amount)}${r.full ? ' (full)' : ''}${r.restocked ? ' · restocked' : ''}${r.emailed ? ' · customer emailed' : ''}`);
      setRefundOpen(false); setRefundAmount(''); setRefundReason('');
      await load(); onChange();
    } catch (e) { toast(errorMessage(e)); } finally { setBusy(false); setConfirmRefund(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete unpaid order ${o.number}? This cannot be undone.`)) return;
    setBusy(true); try { await deleteOrder({ orderId: o.id }); toast('Order deleted'); onChange(); navigate('/admin/orders'); } catch (e) { toast(errorMessage(e)); setBusy(false); }
  };
  const a = o.shippingAddress;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden"><button onClick={() => navigate('/admin/orders')} className="text-sm text-muted">← Orders</button><h1 className="text-2xl">{o.number}</h1><Badge tone={tone(o.status)}>{o.status}</Badge><span className="text-sm text-muted">{formatDate(o.createdAt)} · {o.paymentMethod} · {o.paymentStatus}</span><div className="flex-1" /><Button size="sm" variant="ghost" onClick={() => window.print()}>Print packing slip</Button></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          <div className="hidden print:block"><div className="font-display text-2xl font-bold">Kind Flames</div><div className="text-sm">Packing slip · {o.number} · {formatDate(o.createdAt)}</div></div>
          <table className="w-full text-sm"><tbody>{o.items.map((i, k) => <tr key={k} className="border-b border-line"><td className="py-2">{i.name} <span className="text-muted">{i.variantLabel}</span>{i.bundle && <span className="ml-1 text-xs text-muted">(spa set)</span>}</td><td className="num py-2 text-right">× {i.quantity}</td><td className="num py-2 text-right print:hidden">{money(i.price * i.quantity - (i.lineDiscount || 0))}</td></tr>)}</tbody></table>
          <div className="mt-3 space-y-1 text-sm print:hidden"><div className="flex justify-between"><span>Subtotal</span><span className="num">{money(o.subtotal)}</span></div>{o.discountTotal > 0 && <div className="flex justify-between text-good"><span>Discounts{o.discount?.code ? ` (${o.discount.code})` : ''}</span><span className="num">−{money(o.discountTotal)}</span></div>}{o.giftWrap > 0 && <div className="flex justify-between"><span>Gift box</span><span className="num">{money(o.giftWrap)}</span></div>}<div className="flex justify-between"><span>Shipping ({o.shipping.method})</span><span className="num">{money(o.shipping.amount)}</span></div><div className="flex justify-between"><span>Tax</span><span className="num">{money(o.tax)}</span></div><div className="flex justify-between border-t border-line pt-1 font-bold"><span>Total</span><span className="num">{money(o.total)}</span></div></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm"><div><div className="font-bold">Ship to</div>{a.fullName}<br />{a.address}{a.address2 ? <><br />{a.address2}</> : null}<br />{a.city}, {a.state} {a.zipCode}{a.phone && <><br />{a.phone}</>}</div><div><div className="font-bold">Customer</div>{o.email}{o.gift?.isGift && <div className="mt-2"><div className="font-bold">Gift {o.gift.wrap ? '· boxed' : ''}</div><div className="italic">“{o.gift.message}”</div></div>}</div></div>
        </div>
        <div className="space-y-4 print:hidden">
          <div className="card space-y-3 p-4"><div className="label">Fulfilment</div>
            <div className="flex gap-1">{FLOW.map((s, i) => <div key={s} className={`flex-1 border-t-4 pt-1 text-center text-[10px] capitalize ${i <= idx ? 'border-good font-bold' : 'border-line text-muted'}`}>{s}</div>)}</div>
            {next === 'shipped' && <div className="grid grid-cols-[100px_1fr] gap-2"><select className="input" value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })}><option>USPS</option><option>UPS</option><option>FedEx</option></select><input className="input" placeholder="Tracking number" value={tracking.number} onChange={(e) => setTracking({ ...tracking, number: e.target.value })} /></div>}
            {next && <Button block disabled={busy} onClick={() => act(next)}>Mark {next}</Button>}
            {o.tracking?.number && <a href={o.tracking.url} target="_blank" rel="noreferrer" className="block text-sm text-pine underline">Track {o.tracking.carrier} {o.tracking.number}</a>}
            {o.paymentStatus === 'paid' && o.status !== 'refunded' && !refundOpen && <Button block variant="ghost" size="sm" disabled={busy} onClick={() => setRefundOpen(true)}>Refund…</Button>}
            {o.paymentStatus === 'paid' && o.status !== 'refunded' && refundOpen && (
              <div className="space-y-2 rounded-card border border-line p-3">
                <Field label={`Amount (up to ${money(refundable)})`}><input className="input" type="number" step="0.01" min="0.01" max={refundable} placeholder={refundable.toFixed(2)} value={refundAmount} onChange={(e) => { setRefundAmount(e.target.value); setConfirmRefund(false); }} /></Field>
                <Field label="Reason (shown to the customer)"><input className="input" maxLength={300} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Jar arrived cracked" /></Field>
                {isFull && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refundRestock} onChange={(e) => setRefundRestock(e.target.checked)} /> Put items back in stock</label>}
                <div className="flex gap-2"><Button block variant={confirmRefund ? 'danger' : 'ghost'} size="sm" disabled={busy || !amtValid} onClick={refund}>{confirmRefund ? `Confirm ${isFull ? 'full' : 'partial'} refund of ${money(amtValid ? amt : 0)}` : `Refund ${money(amtValid ? amt : 0)}`}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => { setRefundOpen(false); setConfirmRefund(false); }}>Close</Button></div>
                <p className="text-xs text-muted">The customer gets an email with the amount and reason.</p>
              </div>
            )}
            {(o.refunds?.length ?? 0) > 0 && <div className="text-xs text-muted"><div className="font-bold text-ink">Refunded {money(o.refundedTotal || 0)} of {money(o.total)}</div>{o.refunds!.map((r, k) => <div key={k}>{money(r.amount)} · {r.provider}{r.reason ? ` · ${r.reason}` : ''}</div>)}{o.restockedAt && <div>Items restocked</div>}</div>}
            {o.oversold?.length ? <div className="rounded-card border border-bad/40 bg-bad/5 p-2 text-xs"><div className="font-bold text-bad">Oversold</div>{o.oversold.map((x, k) => <div key={k}>{x.name} ({x.variantId}): ordered {x.ordered}, had {x.available}</div>)}</div> : null}
            {o.status === 'pending' && <Button block variant="ghost" size="sm" disabled={busy} onClick={() => act('cancelled')}>Cancel unpaid order</Button>}
            {(o.status === 'pending' || o.status === 'cancelled') && o.paymentStatus !== 'paid' && <button className="block w-full text-center text-xs text-muted hover:text-red-700" disabled={busy} onClick={remove}>Delete unpaid order</button>}
          </div>
          <div className="card space-y-2 p-4"><Field label="Internal notes"><textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field><Button size="sm" variant="ghost" disabled={busy} onClick={() => act(o.status)}>Save notes</Button></div>
        </div>
      </div>
    </div>
  );
}
