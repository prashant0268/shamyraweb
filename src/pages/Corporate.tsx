import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useToast } from '../context/ToastContext';
import { submitQuote, errorMessage } from '../services/api';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';
import Button from '../components/ui/Button';
import { Alert, Field, ProductImage } from '../components/ui/Bits';
import type { Recipient } from '../types';

const HEADERS: Record<string, keyof Recipient> = { name: 'name', recipient: 'name', 'full name': 'name', address: 'address', 'address 1': 'address', street: 'address', 'address 2': 'address2', apt: 'address2', city: 'city', state: 'state', zip: 'zipCode', 'zip code': 'zipCode', postal: 'zipCode', email: 'email', note: 'note', message: 'note' };
function parseCsv(text: string): { rows: Recipient[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['The file needs a header row and at least one recipient.'] };
  const split = (l: string) => { const out: string[] = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((c) => c.trim()); };
  const head = split(lines[0]!).map((h) => HEADERS[h.toLowerCase()]);
  const errors: string[] = [];
  const rows = lines.slice(1).map((l, i) => { const cells = split(l); const r: Partial<Recipient> = {}; head.forEach((k, j) => { if (k && cells[j]) r[k] = cells[j]; }); if (!r.name || !r.address || !r.city || !r.state || !r.zipCode) errors.push(`Row ${i + 2}: missing ${['name', 'address', 'city', 'state', 'zipCode'].filter((k) => !r[k as keyof Recipient]).join(', ')}`); return r as Recipient; }).filter((r) => r.name && r.address && r.city && r.state && r.zipCode);
  return { rows: rows.slice(0, 500), errors: errors.slice(0, 5) };
}

const CUSTOM = ['Logo label', 'Custom sleeve', 'Card insert', 'Custom scent'];

export default function Corporate() {
  useSeo({ title: 'Corporate gifting', description: 'Hand-poured candles and spa sets with your logo. Tiered pricing from 25 units, multi-address shipping, Net-30 invoicing.', path: '/corporate' });
  const { products, byId } = useCatalog();
  const { add } = useCart();
  const toast = useToast();
  const [f, setF] = useState({ name: '', company: '', email: '', phone: '', quantity: 50, budget: '$20–30', neededBy: '', product: 'Pine Forest 8 oz candle', customization: ['Logo label'] as string[], shippingMode: 'One address', notes: '' });
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]); const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const onCsv = (file: File | null) => { if (!file) return; file.text().then((t) => { const { rows, errors } = parseCsv(t); setRecipients(rows); setCsvErrors(errors); if (rows.length) setF((x) => ({ ...x, shippingMode: 'Multiple addresses (list attached)' })); }); };
  const kit = byId('corporate-sample-kit');
  const sample = kit || products.find((p) => p.id === 'spa-night-set');
  const addKit = () => { if (!kit) return; add(kit.id, kit.variants[0]!.id); track('add_to_cart', { items: [{ item_id: kit.id, item_name: kit.name }], value: kit.variants[0]!.price }); toast('Sample kit added — credited on your first corporate order'); };
  const hero = products.find((p) => p.id === 'pine-forest');

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await submitQuote({ ...f, recipients }); setDone(true); track('generate_lead', { value: f.quantity }); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const toggle = (c: string) => setF({ ...f, customization: f.customization.includes(c) ? f.customization.filter((x) => x !== c) : [...f.customization, c] });

  return (
    <div className="wrap py-8">
      <section className="grid items-center gap-8 pb-10 md:grid-cols-2">
        <div className="space-y-4"><div className="eyebrow">Corporate &amp; bulk gifting</div><h1 className="text-4xl sm:text-5xl">Gifts people actually keep on their desk.</h1><p className="max-w-[48ch] text-lg text-muted">Hand-poured candles and spa sets with your logo on the label or a card inside. From 25 units. Ship to your office or straight to each recipient.</p>
          <div className="flex flex-wrap gap-3"><Button variant="accent" size="lg" href="#quote">Request a quote</Button>{sample && <Button variant="ghost" size="lg" onClick={() => { if (kit) addKit(); else { add(sample.id, sample.variants[0]!.id); toast('Sample set added — credited on your first corporate order'); } }}>{kit ? 'Order a sample kit' : 'Order a sample set'}</Button>}</div>
          <p className="text-sm text-muted">Sample cost is credited on your first order. Typical lead time 10 business days; custom labels 15.</p></div>
        {hero && <div className="overflow-hidden rounded-img bg-surface-2"><ProductImage product={hero} size={800} className="aspect-[4/3] w-full" /></div>}
      </section>

      <section className="py-8"><div className="mb-5"><div className="eyebrow">Pricing</div><h2 className="text-3xl">Simple tiers, no setup fee under 100</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">{[['Starter', '25–49', '10% off retail', 'Branded card insert · one ship-to address', false], ['Team', '50–99', '15% off retail', 'Custom label or sleeve · up to 10 addresses', true], ['Company', '100+', '20% off + free design', 'Full custom branding · CSV multi-address shipping · Net-30 invoicing', false]].map(([t, n, d, s, hi]) => (
          <div key={t as string} className={`card space-y-1 p-5 ${hi ? 'border-honey shadow-lg' : ''}`}><div className="eyebrow">{t}</div><div className="font-display text-4xl font-bold">{n}</div><div className="font-semibold">{d}</div><div className="text-sm text-muted">{s}</div></div>
        ))}</div></section>

      <section className="py-8" id="sample-kit" aria-labelledby="sample-kit-title">
        <div className="card grid items-center gap-6 overflow-hidden p-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Link to="/product/corporate-sample-kit" className="block h-full w-full bg-surface-2">{kit ? <ProductImage product={kit} size={800} className="aspect-square h-full w-full sm:aspect-[4/3] md:aspect-auto" /> : <div className="aspect-square w-full sm:aspect-[4/3]" />}</Link>
          <div className="space-y-3 p-6 pt-0 md:py-8 md:pr-8">
            <div className="eyebrow">Try before you order</div>
            <h2 id="sample-kit-title" className="text-3xl">Corporate Sample Kit</h2>
            <p className="max-w-[52ch] text-muted">Three mini candles plus a body scrub and a bath-salt sachet, so your team can check scent, burn and packaging before committing. Ships in 1–2 business days.</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="num text-2xl font-bold">{money(kit?.variants[0]?.price ?? 25)}</span>
              <span className="text-sm text-muted">credited back on your first order of 25+ units</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {kit ? <Button variant="accent" onClick={addKit}>Add sample kit to bag</Button> : <Button variant="accent" href="#quote">Ask for a sample in your quote</Button>}
              <Button variant="ghost" to="/product/corporate-sample-kit">What's inside</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8"><div className="mb-5"><div className="eyebrow">How it works</div><h2 className="text-3xl">Quote to doorstep</h2></div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Tell us the occasion', 'Quantity, budget, date, and whether you want our scents or a custom blend.'], ['Quote in 1 business day', 'With a mock-up of the label or card.'], ['Approve & pay', 'Card, ACH, or Net-30 invoice for approved accounts.'], ['We pour, pack, ship', 'Upload a recipient list and we handle every address. Each box carries a QR code offering recipients 15% off.']].map(([t, d], i) => (
          <li key={t} className="card p-4"><div className="mb-2 flex h-7 w-7 items-center justify-center rounded-btn bg-honey text-sm font-bold text-honey-ink">{i + 1}</div><div className="font-bold">{t}</div><p className="text-sm text-muted">{d}</p></li>
        ))}</ol></section>

      <section id="quote" className="grid gap-8 py-8 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl">Request a quote</h2>
          {done ? <Alert tone="good">Thanks, {f.name.split(' ')[0]}. We'll reply to {f.email} within one business day.</Alert> : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              {error && <Alert>{error}</Alert>}
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Your name"><input id="q-name" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Company"><input id="q-co" className="input" required value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field></div>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Work email"><input id="q-email" type="email" className="input" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field><Field label="Phone (optional)"><input id="q-phone" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Field label="Quantity"><input id="q-qty" type="number" min={25} className="input" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} /></Field><Field label="Budget / unit"><select id="q-budget" className="input" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })}>{['$15–20', '$20–30', '$30–50', '$50+'].map((b) => <option key={b}>{b}</option>)}</select></Field><Field label="Needed by"><input id="q-date" type="date" className="input" value={f.neededBy} onChange={(e) => setF({ ...f, neededBy: e.target.value })} /></Field></div>
              <Field label="Product"><select id="q-product" className="input" value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}>{['Pine Forest 8 oz candle', 'Lavender Dreams 8 oz candle', 'Spa Night Set', 'Cozy Evening Trio', 'Mixed: suggest for us', 'Custom scent'].map((p) => <option key={p}>{p}</option>)}</select></Field>
              <div><div className="label">Customization</div><div className="flex flex-wrap gap-3 text-sm">{CUSTOM.map((c) => <label key={c} className="flex items-center gap-1.5"><input type="checkbox" checked={f.customization.includes(c)} onChange={() => toggle(c)} /> {c}</label>)}</div></div>
              <Field label="Shipping"><select id="q-ship" className="input" value={f.shippingMode} onChange={(e) => setF({ ...f, shippingMode: e.target.value })}><option>One address</option><option>Multiple addresses (I'll send a list)</option><option>Multiple addresses (list attached)</option></select></Field>
              {f.shippingMode.startsWith('Multiple') && <Field label="Recipient list (CSV, optional now)" hint="Columns: name, address, address 2, city, state, zip, email, note. One row per recipient."><input id="q-csv" type="file" accept=".csv,text/csv" className="text-sm" onChange={(e) => onCsv(e.target.files?.[0] || null)} />{recipients.length > 0 && <p className="mt-1 text-sm text-good">{recipients.length} recipients ready.</p>}{csvErrors.map((er) => <p key={er} className="mt-1 text-xs text-bad">{er}</p>)}</Field>}
              <Field label="Notes"><textarea id="q-notes" className="input" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Holiday client gifts; our brand color is navy." /></Field>
              <Button type="submit" variant="accent" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Button>
            </form>
          )}
        </div>
        <div className="space-y-4">
          <div className="card p-5"><div className="font-bold">Good fits</div><ul className="mt-2 list-disc pl-5 text-sm text-muted"><li>Client closing gifts (real estate, law, wealth management)</li><li>Employee appreciation &amp; onboarding kits</li><li>Wedding and event favors</li><li>Hotel &amp; short-term-rental welcome amenities (wholesale pricing)</li></ul></div>
          <div className="card p-5"><div className="font-bold">Minimums &amp; timing</div><p className="mt-1 text-sm text-muted">25 units for stock scents, 100 for a custom scent. Order by November 15 for December delivery. Q4 fills fast; we cap monthly capacity.</p></div>
          <div className="card p-5"><div className="font-bold">Prefer to talk?</div><p className="mt-1 text-sm text-muted">hello@kindflames.com · (732) 666-8013, Mon–Fri 9–5 ET.</p></div>
        </div>
      </section>
    </div>
  );
}
