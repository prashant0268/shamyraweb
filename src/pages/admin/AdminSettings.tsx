import { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { saveSettings } from '../../services/admin';
import Button from '../../components/ui/Button';
import { Field } from '../../components/ui/Bits';
import type { StoreSettings } from '../../types';
import { THEMES, isThemeId } from '../../themes';

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
        <div className="card space-y-3 p-5"><h2 className="text-lg">Homepage</h2><Field label="Announcement bar messages" hint="One per line; they rotate every few seconds. The first line is also used where only one fits."><textarea className="input min-h-24 text-sm" value={(s.announcement.messages?.length ? s.announcement.messages : [s.announcement.text]).join('\n')} onChange={(e) => { const messages = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); setS({ ...s, announcement: { ...s.announcement, messages, text: messages[0] || '' } }); }} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.announcement.visible} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, visible: e.target.checked } })} /> Show announcement bar</label>
          {([['showChristmas', 'Holiday collection section'], ['showCorporate', 'Corporate banner'], ['showNewsletter', 'Newsletter signup']] as ['showChristmas' | 'showCorporate' | 'showNewsletter', string][]).map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.homepage?.[k] !== false} onChange={(e) => setS({ ...s, homepage: { ...s.homepage, [k]: e.target.checked } })} /> {l}</label>)}</div>
        <div className="card space-y-3 p-5 md:col-span-2"><h2 className="text-lg">Appearance</h2>
          <p className="text-sm text-muted">Pick the storefront theme. Preview any of them on the live site before switching: open a theme's “Preview” link; the choice sticks for that browser tab until you exit. Admin screens always use the default look.</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {THEMES.map((t) => { const on = (isThemeId(s.theme) ? s.theme : 'hearth') === t.id; return (
              <label key={t.id} className={`relative flex cursor-pointer flex-col gap-2 rounded-card border p-3 ${on ? 'border-pine ring-2 ring-pine' : 'border-line hover:bg-surface-2'}`}>
                <input type="radio" name="theme" className="sr-only" checked={on} onChange={() => setS({ ...s, theme: t.id })} />
                <div className="flex h-10 overflow-hidden rounded-card border border-line">{t.swatches.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}</div>
                <div><div className="font-bold" style={{ fontFamily: `"${t.fonts.display}", serif` }}>{t.name}</div><div className="text-xs text-muted">{t.tagline}</div></div>
                <p className="text-xs text-muted">{t.description}</p>
                <p className="text-[11px] text-muted">Inspired by {t.inspiredBy} · {t.fonts.display} + {t.fonts.body}</p>
                <a href={`/?theme=${t.id}`} target="_blank" rel="noreferrer" className="text-xs text-pine underline" onClick={(e) => e.stopPropagation()}>Preview in a new tab →</a>
              </label>
            ); })}
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={s.placeholderImages !== false} onChange={(e) => setS({ ...s, placeholderImages: e.target.checked })} /><span>Use placeholder product photos (stock imagery from Unsplash) until the real renders are uploaded. Turn this off once the Gemini images are in place.</span></label>
        </div>
        <div className="card space-y-3 p-5"><h2 className="text-lg">Welcome popup</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.popup?.enabled !== false} onChange={(e) => setS({ ...s, popup: { ...s.popup!, enabled: e.target.checked } })} /> Show first-visit email popup (10% off)</label>
          <Field label="Headline"><input className="input" value={s.popup?.headline || ''} onChange={(e) => setS({ ...s, popup: { ...s.popup!, headline: e.target.value } })} /></Field>
          <Field label="Body"><textarea className="input text-sm" rows={2} value={s.popup?.body || ''} onChange={(e) => setS({ ...s, popup: { ...s.popup!, body: e.target.value } })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Discount code" hint="Must exist in Discounts."><input className="input" value={s.popup?.code || ''} onChange={(e) => setS({ ...s, popup: { ...s.popup!, code: e.target.value.toUpperCase() } })} /></Field><Field label="Delay (seconds)"><input className="input" type="number" min={1} value={s.popup?.delaySeconds ?? 6} onChange={(e) => setS({ ...s, popup: { ...s.popup!, delaySeconds: Number(e.target.value) } })} /></Field></div>
          <p className="text-xs text-muted">Shows once per 30 days, also on exit intent on desktop, never on checkout pages or to people who already subscribed. Test it any time with <code>kindflames.com/?popup=on</code>.</p>
        </div>
        <div className="card space-y-3 p-5"><h2 className="text-lg">Social links</h2>
          {(['instagram', 'facebook', 'tiktok', 'pinterest'] as const).map((k) => <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)}><input className="input" placeholder="https://" value={s.social?.[k] || ''} onChange={(e) => setS({ ...s, social: { ...s.social, [k]: e.target.value } })} /></Field>)}
          <p className="text-xs text-muted">Icons appear in the footer only for links you fill in.</p>
        </div>
      </div>
      <Button variant="accent" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</Button>
    </div>
  );
}
