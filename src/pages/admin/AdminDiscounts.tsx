import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { deleteDiscount, listDiscounts, saveDiscount } from '../../services/admin';
import Button from '../../components/ui/Button';
import { Badge, Field } from '../../components/ui/Bits';
import type { Discount } from '../../types';

const blank = (): Discount => ({ code: '', type: 'percent', value: 10, minSubtotal: 0, active: true, expiresAt: null, usageLimit: null, usageCount: 0, firstOrderOnly: false, appliesTo: 'all', note: '' });

export default function AdminDiscounts() {
  const [list, setList] = useState<Discount[]>([]);
  const [d, setD] = useState<Discount | null>(null);
  const [expires, setExpires] = useState('');
  const toast = useToast();
  const load = () => listDiscounts().then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!d?.code) return;
    try { await saveDiscount({ ...d, expiresAt: expires ? (Timestamp.fromDate(new Date(expires + 'T23:59:59')) as unknown as { seconds: number }) : null }); toast('Saved'); setD(null); load(); } catch (e) { toast((e as Error).message); }
  };
  const edit = (x: Discount) => { setD(x); setExpires(x.expiresAt ? new Date(x.expiresAt.seconds * 1000).toISOString().slice(0, 10) : ''); };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><p className="text-sm text-muted">Automatic rules also apply: free shipping over the threshold (Settings), {`spa-set bundles 15% off`}.</p><div className="flex-1" /><Button size="sm" onClick={() => { setD(blank()); setExpires(''); }}>+ New code</Button></div>
      {list.length === 0 && <div className="card p-5 text-sm text-muted">No codes yet. Suggested: <b>WELCOME10</b> — 10% off, first order only (the homepage newsletter promises it).</div>}
      <div className="card overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Rules</th><th className="p-3">Uses</th><th className="p-3">Status</th><th className="p-3" /></tr></thead><tbody>
        {list.map((x) => <tr key={x.code} className="border-t border-line"><td className="p-3 font-bold">{x.code}</td><td className="p-3">{x.type === 'percent' ? `${x.value}% off` : `$${x.value} off`}{x.appliesTo === 'sets' ? ' sets' : ''}</td><td className="p-3 text-xs text-muted">{[x.minSubtotal ? `min $${x.minSubtotal}` : null, x.firstOrderOnly ? 'first order' : null, x.expiresAt ? `ends ${new Date(x.expiresAt.seconds * 1000).toLocaleDateString()}` : null, x.usageLimit ? `limit ${x.usageLimit}` : null].filter(Boolean).join(' · ') || '—'}</td><td className="num p-3">{x.usageCount || 0}</td><td className="p-3"><Badge tone={x.active ? 'good' : 'neutral'}>{x.active ? 'Active' : 'Off'}</Badge></td><td className="p-3 text-right"><button className="text-pine underline" onClick={() => edit(x)}>Edit</button> · <button className="text-bad underline" onClick={async () => { await deleteDiscount(x.code); load(); }}>Delete</button></td></tr>)}
      </tbody></table></div>
      {d && (
        <div className="card grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Code"><input className="input uppercase" value={d.code} onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase() })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Type"><select className="input" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as Discount['type'] })}><option value="percent">% off</option><option value="fixed">$ off</option></select></Field><Field label="Value"><input className="input" type="number" value={d.value} onChange={(e) => setD({ ...d, value: Number(e.target.value) })} /></Field></div>
          <Field label="Minimum subtotal"><input className="input" type="number" value={d.minSubtotal || 0} onChange={(e) => setD({ ...d, minSubtotal: Number(e.target.value) })} /></Field>
          <Field label="Expires (optional)"><input className="input" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
          <Field label="Usage limit (blank = unlimited)"><input className="input" type="number" value={d.usageLimit ?? ''} onChange={(e) => setD({ ...d, usageLimit: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Applies to"><select className="input" value={d.appliesTo || 'all'} onChange={(e) => setD({ ...d, appliesTo: e.target.value as Discount['appliesTo'] })}><option value="all">Everything</option><option value="sets">Gift sets only</option></select></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.firstOrderOnly} onChange={(e) => setD({ ...d, firstOrderOnly: e.target.checked })} /> First order only</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /> Active</label>
          <div className="flex gap-2 sm:col-span-2"><Button onClick={save}>Save code</Button><Button variant="ghost" onClick={() => setD(null)}>Cancel</Button></div>
        </div>
      )}
    </div>
  );
}
