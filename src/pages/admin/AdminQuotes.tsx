import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { listQuotes, updateQuote, saveDiscount } from '../../services/admin';
import { Timestamp } from 'firebase/firestore';
import { slugify } from '../../lib/format';
import { createInvoice, errorMessage } from '../../services/api';
import { formatDate, money } from '../../lib/format';
import Button from '../../components/ui/Button';
import { Badge, Field } from '../../components/ui/Bits';
import type { Quote } from '../../types';

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [open, setOpen] = useState<Quote | null>(null);
  const [lines, setLines] = useState([{ description: '', unitPrice: 0, quantity: 25 }]);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const load = () => listQuotes().then(setQuotes).catch(() => {});
  useEffect(() => { load(); }, []);
  const startInvoice = (q: Quote) => { setOpen(q); setLines([{ description: `${q.product} × ${q.quantity}${q.customization.length ? ` (${q.customization.join(', ')})` : ''}`, unitPrice: 0, quantity: q.quantity }]); };
  const send = async () => {
    if (!open) return; setBusy(true);
    try { const r = await createInvoice({ quoteId: open.id, lines, daysUntilDue: days }); toast(`Invoice for ${money(r.total)} sent`); setOpen(null); load(); } catch (e) { toast(errorMessage(e)); } finally { setBusy(false); }
  };
  const total = lines.reduce((t, l) => t + Number(l.unitPrice) * Number(l.quantity), 0);
  const downloadCsv = (q: Quote) => { const rows = [['name', 'address', 'address2', 'city', 'state', 'zip', 'email', 'note'], ...(q.recipients || []).map((r) => [r.name, r.address, r.address2 || '', r.city, r.state, r.zipCode, r.email || '', r.note || ''])]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `${slugify(q.company)}-recipients.csv`; a.click(); };
  const giftCode = async (q: Quote) => {
    const code = q.giftCode || `GIFT-${slugify(q.company).toUpperCase().replace(/-/g, '').slice(0, 10)}`;
    try {
      if (!q.giftCode) { await saveDiscount({ code, type: 'percent', value: 15, minSubtotal: 0, active: true, expiresAt: Timestamp.fromDate(new Date(Date.now() + 180 * 864e5)) as unknown as { seconds: number }, usageLimit: Math.max(10, q.quantity * 3), usageCount: 0, firstOrderOnly: false, appliesTo: 'all', note: `Corporate gift insert for ${q.company}` }); await updateQuote(q.id, { giftCode: code }); load(); }
      window.open(`/internal/prints/insert?code=${encodeURIComponent(code)}&company=${encodeURIComponent(q.company)}&pct=15&copies=${Math.min(12, q.quantity)}`, '_blank');
    } catch (e) { toast(errorMessage(e)); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Quote requests from the <a href="/corporate" className="underline">corporate page</a>. Reply by email, then send a Stripe invoice (card, ACH or Net-30) from here.</p>
      <div className="card overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="p-3">Company</th><th className="p-3">Request</th><th className="p-3">Needed</th><th className="p-3">Status</th><th className="p-3" /></tr></thead><tbody>
        {quotes.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No quote requests yet.</td></tr>}
        {quotes.map((q) => <tr key={q.id} className="border-t border-line align-top"><td className="p-3"><b>{q.company}</b><div className="text-xs text-muted">{q.name} · {q.email}{q.phone ? ` · ${q.phone}` : ''}<br />{formatDate(q.createdAt)}</div></td><td className="p-3">{q.quantity} × {q.product}<div className="text-xs text-muted">{q.budget}/unit · {q.customization.join(', ') || 'no customization'} · {q.shippingMode}</div>{q.notes && <div className="mt-1 text-xs italic">“{q.notes}”</div>}</td><td className="p-3">{q.neededBy || '—'}{q.recipients?.length ? <div className="text-xs"><button className="text-pine underline" onClick={() => downloadCsv(q)}>{q.recipients.length} recipients ↓</button></div> : null}{q.giftCode && <div className="text-xs text-muted">Insert code {q.giftCode}</div>}</td><td className="p-3"><Badge tone={q.status === 'new' ? 'warn' : q.status === 'won' || q.status === 'invoiced' ? 'good' : q.status === 'lost' ? 'bad' : 'accent'}>{q.status}</Badge>{q.invoiceUrl && <a href={q.invoiceUrl} target="_blank" rel="noreferrer" className="block text-xs underline">Invoice {money(q.invoiceTotal || 0)}</a>}</td><td className="space-y-1 p-3 text-right">
          <select className="input text-xs" value={q.status} onChange={async (e) => { await updateQuote(q.id, { status: e.target.value as Quote['status'] }); load(); }}>{['new', 'quoted', 'invoiced', 'won', 'lost'].map((s) => <option key={s}>{s}</option>)}</select>
          <Button size="sm" variant="ghost" onClick={() => startInvoice(q)}>Create invoice</Button>
          <Button size="sm" variant="ghost" onClick={() => giftCode(q)}>{q.giftCode ? 'Print inserts' : 'Gift code + inserts'}</Button></td></tr>)}
      </tbody></table></div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog"><div className="card w-full max-w-lg space-y-3 p-5"><h2 className="text-xl">Invoice · {open.company}</h2><p className="text-sm text-muted">Sent by Stripe to {open.email}. They can pay by card or bank transfer.</p>
          {lines.map((l, i) => <div key={i} className="grid grid-cols-[1fr_90px_70px] gap-2"><input className="input" placeholder="Description" value={l.description} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} /><input className="input" type="number" step="0.01" placeholder="Unit $" value={l.unitPrice || ''} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitPrice: Number(e.target.value) } : x)))} /><input className="input" type="number" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} /></div>)}
          <div className="flex items-center gap-3"><Button size="sm" variant="ghost" onClick={() => setLines([...lines, { description: '', unitPrice: 0, quantity: 1 }])}>+ Line</Button><Field label="Due in days" className="w-28"><input className="input" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field><div className="flex-1 text-right font-bold">Total {money(total)}</div></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button><Button variant="accent" disabled={busy || total <= 0} onClick={send}>{busy ? 'Sending…' : 'Send invoice'}</Button></div></div></div>
      )}
    </div>
  );
}
