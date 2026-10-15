import { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { saveSettings } from '../../services/admin';
import Button from '../../components/ui/Button';
import { Field } from '../../components/ui/Bits';
import type { StoreSettings } from '../../types';

export default function AdminSettings() {
  const { settings, refresh } = useCatalog();
  const [s, setS] = useState<StoreSettings>(settings);
  const [taxText, setTaxText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => { setS(settings); setTaxText(Object.entries(settings.taxRates || {}).map(([k, v]) => `${k}=${(v * 100).toFixed(3)}`).join(', ')); }, [settings]);
  const save = async () => {
    setBusy(true);
    try {
      const taxRates: Record<string, number> = {};
      for (const part of taxText.split(',')) { const [k, v] = part.split('=').map((x) => x.trim()); if (k && v && !isNaN(Number(v))) taxRates[k.toUpperCase()] = Number(v) / 100; }
      await saveSettings({ ...s, taxRates }); await refresh(); toast('Settings saved');
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const n = (k: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  const t = (k: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3 p-5"><h2 className="text-lg">Brand</h2><Field label="Brand name"><input className="input" value={s.brandName} onChange={t('brandName')} /></Field><Field label="Legal name (footer, receipts)"><input className="input" value={s.legalName} onChange={t('legalName')} /></Field><Field label="Contact email"><input className="input" value={s.contactEmail} onChange={t('contactEmail')} /></Field><Field label="Contact phone"><input className="input" value={s.contactPhone} onChange={t('contactPhone')} /></Field></div>
        <div className="card space-y-3 p-5"><h2 className="text-lg">Shipping &amp; tax</h2><Field label="Free shipping threshold ($)"><input className="input" type="number" value={s.freeShippingThreshold} onChange={n('freeShippingThreshold')} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Standard rate ($)"><input className="input" type="number" step="0.01" value={s.flatShipping} onChange={n('flatShipping')} /></Field><Field label="Express rate ($)"><input className="input" type="number" step="0.01" value={s.expressShipping} onChange={n('expressShipping')} /></Field></div><Field label="Sales tax by state" hint="STATE=percent, comma separated. Add states where you have nexus."><input className="input" value={taxText} onChange={(e) => setTaxText(e.target.value)} placeholder="NJ=6.625, NY=8" /></Field><div className="grid grid-cols-2 gap-2"><Field label="Gift box fee ($)"><input className="input" type="number" value={s.giftWrapFee} onChange={n('giftWrapFee')} /></Field><Field label="Spa-set discount (%)"><input className="input" type="number" value={s.bundleDiscountPercent} onChange={n('bundleDiscountPercent')} /></Field></div></div>
        <div className="card space-y-3 p-5"><h2 className="text-lg">Payments</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.paypalEnabled} onChange={(e) => setS({ ...s, paypalEnabled: e.target.checked })} /> PayPal enabled</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.cardPaymentsEnabled} onChange={(e) => setS({ ...s, cardPaymentsEnabled: e.target.checked })} /> Card payments (Stripe) enabled on kindflames.com</label>
          <p className="text-xs text-muted">Turn on card payments once your Stripe account is activated and the live secret key is set in Secret Manager. Card checkout is always available on localhost for testing with the test key.</p></div>
        <div className="card space-y-3 p-5"><h2 className="text-lg">Homepage</h2><Field label="Announcement bar"><input className="input" value={s.announcement.text} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, text: e.target.value } })} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.announcement.visible} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, visible: e.target.checked } })} /> Show announcement</label>
          {([['showChristmas', 'Holiday collection section'], ['showCorporate', 'Corporate banner'], ['showNewsletter', 'Newsletter signup']] as ['showChristmas' | 'showCorporate' | 'showNewsletter', string][]).map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.homepage?.[k] !== false} onChange={(e) => setS({ ...s, homepage: { ...s.homepage, [k]: e.target.checked } })} /> {l}</label>)}</div>
      </div>
      <Button variant="accent" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</Button>
    </div>
  );
}
