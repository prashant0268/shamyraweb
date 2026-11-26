import { useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { OPEN_CONSENT_EVENT, gpcEnabled, saveConsent, storedConsent } from '../../lib/consent';
import { isPrerender } from '../../lib/prerender';
import Button from '../ui/Button';

/**
 * Non-blocking cookie banner (bottom of the screen, not a modal). Shown until the visitor makes a choice; the
 * footer's "Privacy choices" link reopens it. Choices map to Google Consent Mode v2 and gate the Meta Pixel
 * (see lib/consent.ts). With Global Privacy Control on, ads & marketing is off and cannot be switched on here.
 */
export default function ConsentBanner() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => !isPrerender() && !storedConsent());
  const [details, setDetails] = useState(false);
  const gpc = gpcEnabled();
  const current = storedConsent();
  const [analytics, setAnalytics] = useState(current?.analytics ?? false);
  const [ads, setAds] = useState(gpc ? false : current?.ads ?? false);
  const titleId = useId();

  useEffect(() => {
    const show = () => { const c = storedConsent(); setAnalytics(c?.analytics ?? false); setAds(gpc ? false : c?.ads ?? false); setDetails(true); setOpen(true); };
    window.addEventListener(OPEN_CONSENT_EVENT, show);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, show);
  }, [gpc]);

  if (!open || pathname.startsWith('/admin') || pathname.startsWith('/internal')) return null;
  const done = (c: { analytics: boolean; ads: boolean }) => { saveConsent(c); setOpen(false); setDetails(false); };

  return (
    <section role="region" aria-labelledby={titleId} className="fixed inset-x-0 bottom-0 z-[65] border-t border-line bg-surface shadow-2xl print:hidden">
      <div className="wrap flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 flex-1 text-sm">
          <h2 id={titleId} className="font-body text-sm font-bold">Your privacy choices</h2>
          <p className="mt-1 text-muted">
            We use essential storage for your bag and sign-in. With your OK we also use analytics cookies to see how the store is used and ads cookies (Meta, Google) to measure our ads.{' '}
            {gpc && <b className="text-ink">Your browser's Global Privacy Control signal is on, so we won't share data for ads. </b>}
            <Link to="/privacy" className="text-ink underline">Privacy policy</Link>
          </p>
          {details && (
            <fieldset className="mt-3 grid gap-2 sm:grid-cols-3">
              <legend className="sr-only">Cookie categories</legend>
              <label className="flex items-start gap-2 rounded-card border border-line p-3"><input type="checkbox" checked disabled className="mt-1" /><span><b className="block">Essential</b><span className="text-xs text-muted">Bag, sign-in, checkout. Always on.</span></span></label>
              <label className="flex items-start gap-2 rounded-card border border-line p-3"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1" /><span><b className="block">Analytics</b><span className="text-xs text-muted">Google Analytics: pages viewed, device type.</span></span></label>
              <label className="flex items-start gap-2 rounded-card border border-line p-3"><input type="checkbox" checked={ads} disabled={gpc} onChange={(e) => setAds(e.target.checked)} className="mt-1" /><span><b className="block">Ads &amp; marketing</b><span className="text-xs text-muted">{gpc ? 'Off: Global Privacy Control is on.' : 'Meta Pixel and Google ads measurement.'}</span></span></label>
            </fieldset>
          )}
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-none">
          {details ? (
            <Button size="sm" onClick={() => done({ analytics, ads })}>Save choices</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setDetails(true)}>Choose</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => done({ analytics: false, ads: false })}>Reject non-essential</Button>
          <Button size="sm" onClick={() => done({ analytics: true, ads: !gpc })}>{gpc ? 'Accept analytics' : 'Accept all'}</Button>
        </div>
      </div>
    </section>
  );
}
