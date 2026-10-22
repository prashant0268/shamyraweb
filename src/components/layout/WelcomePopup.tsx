import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { track } from '../../lib/analytics';
import { IMG } from '../../data/imagery';
import Button from '../ui/Button';

const SEEN_KEY = 'kf_popup_seen';   // timestamp of last dismissal; re-shown after 30 days
const SUB_KEY = 'kf_subscribed';    // set once an email is captured anywhere on the site
const SKIP = ['/checkout', '/cart', '/order-confirmation', '/login', '/register', '/auth', '/subscribe/thanks', '/corporate'];
const DAYS30 = 30 * 24 * 3600 * 1000;
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

/**
 * First-visit email capture, the pattern every brand in the teardown runs: photo on the left, offer on the right,
 * "Yes please / No thanks". Shows after a delay or on exit intent, once per 30 days, never on checkout pages.
 * A signup writes `newsletter/{email}`, which starts the welcome email series.
 */
export default function WelcomePopup() {
  const { settings } = useCatalog();
  const toast = useToast();
  const { pathname, search } = useLocation();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const forcedOnce = useRef(false);
  const popup = settings.popup;
  const code = popup?.code || 'WELCOME10';

  const eligible = !!popup?.enabled && !SKIP.some((p) => pathname.startsWith(p)) && !get(SUB_KEY) && !(Number(get(SEEN_KEY) || 0) > Date.now() - DAYS30) && !/[?&]popup=off/.test(search);
  const forced = /[?&]popup=(on|show)/.test(search);

  useEffect(() => {
    if (forced) { if (!forcedOnce.current) { forcedOnce.current = true; setShow(true); } return; }
    if (!eligible || show) return;
    const t = window.setTimeout(() => setShow(true), Math.max(1, popup?.delaySeconds ?? 6) * 1000);
    const exit = (e: MouseEvent) => { if (e.clientY <= 0 && window.innerWidth >= 1024) { setShow(true); } };
    document.addEventListener('mouseleave', exit);
    return () => { window.clearTimeout(t); document.removeEventListener('mouseleave', exit); };
  }, [eligible, forced, popup?.delaySeconds, show]);

  useEffect(() => { if (!show) return; const h = (e: KeyboardEvent) => e.key === 'Escape' && dismiss(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });

  const dismiss = () => { set(SEEN_KEY, String(Date.now())); setShow(false); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase(); if (!em) return;
    setBusy(true);
    try {
      await setDoc(doc(db, 'newsletter', em), { email: em, source: 'popup', createdAt: serverTimestamp() });
      track('sign_up', { method: 'newsletter' });
      set(SUB_KEY, '1'); set('kf_code', code); set(SEEN_KEY, String(Date.now()));
      setDone(true);
    } catch { toast('Could not subscribe right now'); }
    finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch { /* ignore */ } };

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <button className="absolute inset-0 bg-black/50" aria-label="Close" onClick={dismiss} />
      <div className="fade-in relative grid w-full max-w-3xl overflow-hidden rounded-t-img bg-surface shadow-2xl sm:grid-cols-2 sm:rounded-img">
        <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-btn bg-surface/90 p-2 text-ink hover:bg-surface-2"><X size={18} /></button>
        <div className="relative h-44 sm:h-auto"><img src={IMG.popup} alt="" className="absolute inset-0 h-full w-full object-cover" /></div>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
          {done ? (
            <>
              <div className="eyebrow">You're on the list</div>
              <h2 id="welcome-title" className="text-3xl">Here's your code.</h2>
              <p className="text-muted">It's saved to your bag and applies at checkout. We've also emailed it to you.</p>
              <button type="button" onClick={copy} className="num rounded-card border-2 border-dashed border-honey bg-honey/10 px-4 py-3 text-center font-display text-2xl tracking-widest hover:bg-honey/20" aria-label={`Copy code ${code}`}>{code}</button>
              <Button variant="accent" size="lg" to="/shop" onClick={() => setShow(false)}>Start shopping</Button>
            </>
          ) : (
            <>
              <img src="/img/logo-512.png" alt="" className="h-10 w-10" />
              <div><h2 id="welcome-title" className="text-3xl sm:text-4xl">{popup?.headline}</h2><p className="mt-2 text-muted">{popup?.body}</p></div>
              <form onSubmit={submit} className="flex flex-col gap-2">
                <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" className="input" />
                <Button type="submit" variant="accent" size="lg" disabled={busy}>{busy ? 'One sec…' : 'Yes, please'}</Button>
                <button type="button" onClick={dismiss} className="nav-link py-1 text-xs text-muted underline-offset-4 hover:underline">No thanks, full price is fine</button>
              </form>
              <p className="text-[11px] text-muted">By joining you agree to receive emails from Kind Flames. Unsubscribe any time.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
