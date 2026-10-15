import { useEffect, useState } from 'react';
import { listNewsletter } from '../../services/admin';
import { formatDate } from '../../lib/format';
import Button from '../../components/ui/Button';

export default function AdminNewsletter() {
  const [list, setList] = useState<{ email: string; createdAt?: { seconds: number } }[]>([]);
  useEffect(() => { listNewsletter().then(setList).catch(() => {}); }, []);
  const csv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['email,joined', ...list.map((x) => `${x.email},${formatDate(x.createdAt)}`)].join('\n')], { type: 'text/csv' })); a.download = 'newsletter.csv'; a.click(); };
  return <div className="space-y-3"><div className="flex items-center gap-2"><p className="text-sm text-muted">{list.length} subscriber{list.length === 1 ? '' : 's'}. Export and import into Klaviyo/Mailchimp when you set up email marketing.</p><div className="flex-1" /><Button size="sm" variant="ghost" onClick={csv} disabled={!list.length}>Export CSV</Button></div><div className="card divide-y divide-line">{list.map((x) => <div key={x.email} className="flex justify-between p-3 text-sm"><span>{x.email}</span><span className="text-muted">{formatDate(x.createdAt)}</span></div>)}{list.length === 0 && <div className="p-5 text-sm text-muted">No subscribers yet.</div>}</div></div>;
}
