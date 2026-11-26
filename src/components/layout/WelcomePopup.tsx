import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CONSENT_EVENT, storedConsent } from '../../lib/consent';
import { isPrerender } from '../../lib/prerender';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { subscribeNewsletter, errorMessage } from '../../services/api';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { track } from '../../lib/analytics';
import { IMG } from '../../data/imagery';
import Button from '../ui/Button';

const SEEN_KEY = 'kf_popup_seen';   // timestamp of last dismissal; re-shown after 30 days
const SUB_KEY = 'kf_subscribed';    // set once an email is captured anywhere on the site
const SKIP = ['/checkout', '/cart', '/order-confirmation', '/login', '/register', '/auth', '/subscribe/thanks', '/corporate'];
const DAYS30 = 30 * 24 * 3600 * 1000;
const PV_KEY = 'kf_pv';             // page views this session (mobile trigger)
const MOBILE = '(max-width: 639px)';
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

/**
 * First-visit email capture: photo on the left, offer on the right. Once per 30 days, never on checkout pages,
 * and only after the visitor has answered the cookie banner (so the two never stack).
 * - Desktop: a modal after the configured delay or on exit intent; focus is trapped and restored, Escape closes.
 * - Mobile: a non-blocking bottom sheet (no backdrop, page stays usable) shown after the visitor scrolls 40% of a
 *   page or opens a second page, never on a timer.
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
  const [consented, setConsented] = useState(() => !!storedConsent());
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE).matches);
  const forcedOnce = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const popup = settings.popup;
  const code = popup?.code || 'WELCOME10';

  const eligible = !isPrerender() && consented && !!popup?.enabled && !SKIP.some((p) => pathname.startsWith(p)) && !get(SUB_KEY) && !(Number(get(SEEN_KEY) || 0) > Date.now() - DAYS30) && !/[?&]popup=off/.test(search);
  const forced = /[?&]popup=(on|show)/.test(search);

  useEffect(() => { const h = () => setConsented(!!storedConsent()); window.addEventListener(CONSENT_EVENT, h); return () => window.removeEventListener(CONSENT_EVENT, h); }, []);
  useEffect(() => { const mq = window.matchMedia(MOBILE); const h = () => setMobile(mq.matches); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h); }, []);
  // Count page views per session for the mobile trigger.
  useEffect(() => { try { sessionStorage.setItem(PV_KEY, String(Number(sessionStorage.getItem(PV_KEY) || 0) + 1)); } catch { /* ignore */ } }, [pathname]);

  useEffect(() => {
    if (forced) { if (!forcedOnce.current) { forcedOnce.current = true; setShow(true); } return; }
    if (!eligible || show) return;
    if (mobile) {
      const views = (() => { try { return Number(sessionStorage.getItem(PV_KEY) || 0); } catch { return 0; } })();
      if (views >= 2) { const t = window.setTimeout(() => setShow(true), 1500); return () => window.clearTimeout(t); }
      const onScroll = () => { const max = document.documentElement.scrollHeight - window.innerHeight; if (max > 0 && window.scrollY / max >= 0.4) setShow(true); };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
    const t = window.setTimeout(() => setShow(true), Math.max(1, popup?.delaySeconds ?? 6) * 1000);
    const exit = (e: MouseEvent) => { if (e.clientY <= 0) setShow(true); };
    document.addEventListener('mouseleave', exit);
    return () => { window.clearTimeout(t); document.removeEventListener('mouseleave', exit); };
  }, [eligible, forced, popup?.delaySeconds, show, mobile, pathname]);

  const sheet = mobile && show;
  useFocusTrap(show && !mobile, panel, () => dismiss(), emailRef);
  useEffect(() => { if (!sheet) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });

  const dismiss = () => { set(SEEN_KEY, String(Date.now())); setShow(false); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase(); if (!em) return;
    setBusy(true);
    try {
      await subscribeNewsletter({ email: em, source: 'popup' });
      track('sign_up', { method: 'newsletter' });
      set(SUB_KEY, '1'); set('kf_code', code); set(SEEN_KEY, String(Date.now()));
      setDone(true);
    } catch (err) { toast(errorMessage(err, 'Could not subscribe right now')); }
    finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch { /* ignore */ } };

  if (!show) return null;
  const success = (
    <>
      <div className="eyebrow">You're on the list</div>
      <h2 id="welcome-title" className={sheet ? 'text-2xl' : 'text-3xl'}>Here's your code.</h2>
      <p className="text-muted">It's saved to your bag and applies at checkout. We've also emailed it to you.</p>
      <button type="button" onClick={copy} className="num rounded-card border-2 border-dashed border-honey bg-honey/10 px-4 py-3 text-center font-display text-2xl tracking-widest hover:bg-honey/20" aria-label={`Copy code ${code}`}>{code}</button>
      <Button variant="accent" size={sheet ? 'md' : 'lg'} to="/shop" onClick={() => setShow(false)}>Start shopping</Button>
    </>
  );
  const form = (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="welcome-email" className="sr-only">Email address</label>
      <input id="welcome-email" ref={emailRef} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="input" />
      <Button type="submit" variant="accent" size={sheet ? 'md' : 'lg'} disabled={busy}>{busy ? 'One sec…' : 'Get my 10% code'}</Button>
      <button type="button" onClick={dismiss} className="nav-link py-1 text-xs text-muted underline-offset-4 hover:underline">No thanks</button>
    </form>
  );
  const fine = <p className="text-[11px] text-muted">By joining you agree to receive emails from Kind Flames. Unsubscribe any time.</p>;

  if (sheet) {
    return (
      <div role="dialog" aria-modal="false" aria-labelledby="welcome-title" className="fade-in fixed inset-x-0 bottom-0 z-[64] max-h-[60vh] overflow-auto rounded-t-img border-t border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <button onClick={dismiss} aria-label="Close offer" className="absolute right-2 top-2 rounded-btn p-2 text-ink hover:bg-surface-2"><X size={18} /></button>
        <div className="flex flex-col gap-3 pr-8">
          {done ? success : (<><div><h2 id="welcome-title" className="text-2xl">{popup?.headline}</h2><p className="mt-1 text-sm text-muted">{popup?.body}</p></div>{form}{fine}</>)}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <button className="absolute inset-0 bg-black/50" aria-label="Close offer" tabIndex={-1} onClick={dismiss} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="fade-in relative grid w-full max-w-3xl overflow-hidden rounded-img bg-surface shadow-2xl sm:grid-cols-2">
        <button onClick={dismiss} aria-label="Close offer" className="absolute right-3 top-3 z-10 rounded-btn bg-surface/90 p-2 text-ink hover:bg-surface-2"><X size={18} /></button>
        <div className="relative h-44 sm:h-auto"><img src={IMG.popup} alt="" className="absolute inset-0 h-full w-full object-cover" /></div>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
          {done ? success : (
            <>
              <img src="/img/logo-512.png" alt="" width="40" height="40" className="h-10 w-10" />
              <div><h2 id="welcome-title" className="text-3xl sm:text-4xl">{popup?.headline}</h2><p className="mt-2 text-muted">{popup?.body}</p></div>
              {form}
              {fine}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
