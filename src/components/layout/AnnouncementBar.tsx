import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';

/** Rotating top bar: free-shipping threshold, welcome offer, guarantee. Messages come from Admin → Settings. */
export default function AnnouncementBar() {
  const { settings } = useCatalog();
  const a = settings.announcement;
  const msgs = (a?.messages?.length ? a.messages : [a?.text]).map((m) => (m || '').trim()).filter(Boolean);
  const [i, setI] = useState(0);
  useEffect(() => { if (msgs.length < 2) return; const t = window.setInterval(() => setI((x) => (x + 1) % msgs.length), 4500); return () => window.clearInterval(t); }, [msgs.length]);
  if (!a?.visible || msgs.length === 0) return null;
  const btn = 'hidden h-6 w-6 items-center justify-center rounded-btn opacity-70 hover:opacity-100 sm:flex';
  return (
    <div className="bg-pine text-pine-ink">
      <div className="wrap flex h-9 items-center justify-center gap-3 text-xs font-medium sm:text-[13px]">
        {msgs.length > 1 && <button type="button" className={btn} aria-label="Previous message" onClick={() => setI((i - 1 + msgs.length) % msgs.length)}><ChevronLeft size={14} /></button>}
        <span key={i} className="fade-in nav-link truncate text-center !font-medium" aria-live="polite">{msgs[i]}</span>
        {msgs.length > 1 && <button type="button" className={btn} aria-label="Next message" onClick={() => setI((i + 1) % msgs.length)}><ChevronRight size={14} /></button>}
      </div>
    </div>
  );
}
