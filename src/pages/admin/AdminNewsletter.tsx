import { useEffect, useState } from 'react';
import { listMarketing, listNewsletter, type MarketingContact } from '../../services/admin';
import { errorMessage, sendMarketingTest, syncMarketingAudience } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../lib/format';
import Button from '../../components/ui/Button';

const STAGE: Record<number, string> = { 0: 'welcome pending', 1: 'welcome 1/3', 2: 'welcome 2/3', 3: 'series done' };

export default function AdminNewsletter() {
  const toast = useToast();
  const [list, setList] = useState<{ email: string; createdAt?: { seconds: number } }[]>([]);
  const [contacts, setContacts] = useState<MarketingContact[]>([]);
  const [busy, setBusy] = useState<'' | 'sync' | 'test'>('');
  const refresh = () => { listNewsletter().then(setList).catch(() => {}); listMarketing().then(setContacts).catch(() => {}); };
  useEffect(refresh, []);

  const csv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['email,joined', ...list.map((x) => `${x.email},${formatDate(x.createdAt)}`)].join('\n')], { type: 'text/csv' })); a.download = 'newsletter.csv'; a.click(); };
  const sync = async () => {
    setBusy('sync');
    try { const r = await syncMarketingAudience({}); toast(r.audienceId ? `${r.contacts} contacts, ${r.synced} synced to Resend${r.failed ? `, ${r.failed} failed` : ''}` : `${r.contacts} contacts saved; Resend audience not available`); refresh(); }
    catch (e) { toast(errorMessage(e)); } finally { setBusy(''); }
  };
  const test = async () => {
    setBusy('test');
    try { const r = await sendMarketingTest({}); const ok = r.sent.filter((s) => s.ok).length; toast(`${ok}/${r.sent.length} test emails sent to your address`); }
    catch (e) { toast(errorMessage(e)); } finally { setBusy(''); }
  };

  const unsub = contacts.filter((c) => c.unsubscribed).length;
  const synced = contacts.filter((c) => c.resend?.contactId).length;
  const inSeries = contacts.filter((c) => c.source === 'newsletter' && c.welcomeStage > 0 && c.welcomeStage < 3).length;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h2 className="font-display text-lg">Marketing contacts</h2>
            <p className="text-sm text-muted">{contacts.length} contact{contacts.length === 1 ? '' : 's'} · {synced} in Resend audience · {inSeries} in welcome series · {unsub} unsubscribed</p>
          </div>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={test} disabled={busy !== ''}>{busy === 'test' ? 'Sending…' : 'Send me test emails'}</Button>
          <Button size="sm" variant="accent" onClick={sync} disabled={busy !== ''}>{busy === 'sync' ? 'Syncing…' : 'Sync to Resend audience'}</Button>
        </div>
        <p className="text-xs text-muted">Automatic: welcome series (signup, +3 days, +4 days), care tips 2 days after shipping, reorder nudge 45 days after purchase. Every email carries a one-click unsubscribe. Sync adds past subscribers and customers as contacts and pushes everyone to the Resend audience for broadcasts.</p>
        <div className="card divide-y divide-line">
          {contacts.map((c) => (
            <div key={c.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{c.email}{c.firstName ? <span className="text-muted"> · {c.firstName}</span> : null}</span>
              <span className="text-xs text-muted">{c.source}</span>
              {c.source === 'newsletter' && <span className="text-xs text-muted">{STAGE[c.welcomeStage] ?? ''}</span>}
              {c.unsubscribed ? <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">unsubscribed</span> : c.resend?.contactId ? <span className="text-xs text-pine">synced</span> : <span className="text-xs text-muted">not synced</span>}
            </div>
          ))}
          {contacts.length === 0 && <div className="p-5 text-sm text-muted">No contacts yet. Click “Sync to Resend audience” to import existing subscribers and customers.</div>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted">{list.length} newsletter signup{list.length === 1 ? '' : 's'} from the site.</p>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={csv} disabled={!list.length}>Export CSV</Button>
        </div>
        <div className="card divide-y divide-line">
          {list.map((x) => <div key={x.email} className="flex justify-between p-3 text-sm"><span>{x.email}</span><span className="text-muted">{formatDate(x.createdAt)}</span></div>)}
          {list.length === 0 && <div className="p-5 text-sm text-muted">No subscribers yet.</div>}
        </div>
      </section>
    </div>
  );
}
