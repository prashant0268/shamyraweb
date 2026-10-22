import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { track } from '../../lib/analytics';
import Button from '../ui/Button';

const PAYMENTS = ['Visa', 'Mastercard', 'Amex', 'Discover', 'PayPal', 'Apple Pay', 'Google Pay'];

export default function Footer() {
  const { settings } = useCatalog();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const join = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase(); if (!em) return;
    try { await setDoc(doc(db, 'newsletter', em), { email: em, source: 'footer', createdAt: serverTimestamp() }); track('sign_up', { method: 'newsletter' }); try { localStorage.setItem('kf_subscribed', '1'); } catch { /* ignore */ } toast(`Welcome — use ${settings.popup?.code || 'WELCOME10'} at checkout`); setEmail(''); }
    catch { toast('Could not subscribe right now'); }
  };
  const col = (title: string, links: [string, string][]) => (
    <div><div className="eyebrow mb-3">{title}</div><ul className="space-y-2">{links.map(([to, l]) => <li key={to}><Link to={to} className="text-muted hover:text-ink">{l}</Link></li>)}</ul></div>
  );
  const social = settings.social || {};
  return (
    <footer className="mt-20 border-t border-line bg-surface text-sm">
      <div className="wrap grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <img src="/img/logo-lockup.png" alt="Kind Flames" width="160" height="109" className="h-auto w-36" loading="lazy" />
          <p className="mt-3 font-display text-lg italic">Light Beyond Fragrance.</p>
          <p className="mt-2 text-muted">Hand-poured coconut-soy candles and small-batch bath &amp; body, made in New Jersey. Scents built to pair.</p>
          <form onSubmit={join} className="mt-5">
            <label htmlFor="footer-email" className="label">Join the list · 10% off your first order</label>
            <div className="flex gap-2"><input id="footer-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" /><Button type="submit" variant="accent">Join</Button></div>
            <p className="mt-1.5 text-xs text-muted">One email a week at most. Unsubscribe with one click.</p>
          </form>
        </div>
        {col('Shop', [['/shop/candle', 'Candles'], ['/shop/scrub', 'Body Scrubs'], ['/shop/lotion', 'Lotions'], ['/shop/salt', 'Bath Salts'], ['/shop/set', 'Gift Sets'], ['/gifts', 'Holiday Gift Guide'], ['/build-a-set', 'Build a Spa Set'], ['/subscribe', 'Candle of the Month']])}
        {col('Company', [['/about', 'Our story'], ['/corporate', 'Corporate gifting'], ['/contact', 'Contact'], ['/faq', 'FAQ']])}
        {col('Help', [['/shipping-returns', 'Shipping & Returns'], ['/candle-care', 'Candle Care & Safety'], ['/account', 'Your account'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service']])}
        <div>
          <div className="eyebrow mb-3">Say hello</div>
          <ul className="space-y-2 text-muted"><li><a href={`mailto:${settings.contactEmail}`} className="hover:text-ink">{settings.contactEmail}</a></li><li>{settings.contactPhone}</li><li>Mon–Fri 9–5 ET</li></ul>
          <div className="mt-4 flex gap-2">
            {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-btn border border-line hover:bg-surface-2"><Instagram size={16} /></a>}
            {social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-btn border border-line hover:bg-surface-2"><Facebook size={16} /></a>}
            {social.tiktok && <a href={social.tiktok} target="_blank" rel="noreferrer" className="flex h-9 items-center justify-center rounded-btn border border-line px-3 text-xs font-bold hover:bg-surface-2">TikTok</a>}
            {social.pinterest && <a href={social.pinterest} target="_blank" rel="noreferrer" className="flex h-9 items-center justify-center rounded-btn border border-line px-3 text-xs font-bold hover:bg-surface-2">Pinterest</a>}
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-muted">
          <span>© {new Date().getFullYear()} {settings.legalName}, d/b/a {settings.brandName}. All rights reserved.</span>
          <ul className="flex flex-wrap gap-1.5" aria-label="Accepted payments">{PAYMENTS.map((p) => <li key={p} className="rounded-pill border border-line px-2 py-0.5 font-semibold">{p}</li>)}</ul>
        </div>
      </div>
    </footer>
  );
}
