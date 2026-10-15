import { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { deleteReview, listReviews, setReviewApproved } from '../../services/admin';
import { formatDate } from '../../lib/format';
import Button from '../../components/ui/Button';
import { Badge, Stars } from '../../components/ui/Bits';
import type { Review } from '../../types';

export default function AdminReviews() {
  const [list, setList] = useState<Review[]>([]);
  const { byId } = useCatalog();
  const load = () => listReviews().then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Reviews appear on the product page only once approved. Product ratings update automatically.</p>
      {list.length === 0 && <div className="card p-5 text-sm text-muted">No reviews yet.</div>}
      {list.map((r) => <div key={r.id} className="card flex flex-wrap items-start gap-3 p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Stars rating={r.rating} /><b>{r.title || '(no title)'}</b><Badge tone={r.approved ? 'good' : 'warn'}>{r.approved ? 'Live' : 'Pending'}</Badge></div><p className="text-sm">{r.body}</p><div className="text-xs text-muted">{r.name} · {byId(r.productId)?.name || r.productId} · {formatDate(r.createdAt)}</div></div><div className="flex gap-2"><Button size="sm" variant={r.approved ? 'ghost' : 'primary'} onClick={async () => { await setReviewApproved(r.id, !r.approved); load(); }}>{r.approved ? 'Unpublish' : 'Approve'}</Button><Button size="sm" variant="ghost" onClick={async () => { await deleteReview(r.id); load(); }}>Delete</Button></div></div>)}
    </div>
  );
}
