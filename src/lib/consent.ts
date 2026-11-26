/**
 * Cookie consent + Google Consent Mode v2.
 *
 * - Before any choice, everything optional is denied: analytics_storage, ad_storage, ad_user_data and
 *   ad_personalization. GA4 (Firebase Analytics) then runs cookieless and sends no identifiers.
 * - The Meta Pixel is not loaded at all until the visitor allows "ads & marketing".
 * - A Global Privacy Control signal (navigator.globalPrivacyControl) is an opt-out of sale/sharing and
 *   targeted ads: ads stay denied and the Pixel never loads, whatever the stored choice says.
 * The choice is kept in localStorage `kf_consent`; the footer's "Privacy choices" reopens the banner.
 */
import { setConsent, type ConsentSettings } from 'firebase/analytics';
import { initMetaPixel } from './metaPixel';
import { isPrerender } from './prerender';

export interface ConsentChoice { v: 1; analytics: boolean; ads: boolean; ts: number }
const KEY = 'kf_consent';
export const CONSENT_EVENT = 'kf-consent-change';
export const OPEN_CONSENT_EVENT = 'kf-open-consent';

declare global { interface Navigator { globalPrivacyControl?: boolean } }

export const gpcEnabled = (): boolean => typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;

export function storedConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<ConsentChoice>;
    return c && c.v === 1 ? { v: 1, analytics: !!c.analytics, ads: !!c.ads, ts: Number(c.ts) || 0 } : null;
  } catch { return null; }
}

/** Effective permissions right now (stored choice, then GPC, then the deny-by-default). */
export function effectiveConsent(): { analytics: boolean; ads: boolean } {
  const c = storedConsent();
  return { analytics: !!c?.analytics, ads: !!c?.ads && !gpcEnabled() };
}

export function consentModeSettings(): ConsentSettings {
  const { analytics, ads } = effectiveConsent();
  const g = (b: boolean): 'granted' | 'denied' => (b ? 'granted' : 'denied');
  return {
    analytics_storage: g(analytics),
    ad_storage: g(ads),
    ad_user_data: g(ads),
    ad_personalization: g(ads),
    functionality_storage: 'granted',
    security_storage: 'granted',
  };
}

function apply() {
  try { setConsent(consentModeSettings()); } catch { /* analytics is optional */ }
  if (effectiveConsent().ads) initMetaPixel();
  else if (typeof window !== 'undefined' && typeof window.fbq === 'function') window.fbq('consent', 'revoke');
}

/** Called once at startup, before Firebase Analytics initialises, so the deny-by-default is the Consent Mode default. */
export function initConsent(): void {
  if (isPrerender()) return;
  apply();
}

export function saveConsent(choice: { analytics: boolean; ads: boolean }): void {
  const c: ConsentChoice = { v: 1, analytics: choice.analytics, ads: choice.ads && !gpcEnabled(), ts: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
  apply();
  if (c.ads && typeof window !== 'undefined' && typeof window.fbq === 'function') window.fbq('consent', 'grant');
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}

export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
