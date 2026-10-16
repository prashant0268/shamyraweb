/**
 * Meta (Facebook) Pixel loader. Reads VITE_META_PIXEL_ID at build time; when it is unset
 * nothing is injected and window.fbq stays undefined, so every caller must guard on it.
 * Events are mirrored from GA4 in ./analytics.ts.
 */
declare global {
  interface Window { fbq?: (...args: unknown[]) => void; _fbq?: unknown }
}

export const META_PIXEL_ID: string = (import.meta.env.VITE_META_PIXEL_ID || '').trim();

export function initMetaPixel(): void {
  if (!META_PIXEL_ID || typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.fbq === 'function') return; // already loaded
  // Standard base code, written without `new Function`/eval so it passes a strict CSP.
  type Queue = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown };
  const n = function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue.push(args); } as Queue;
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  window.fbq = n; if (!window._fbq) window._fbq = n;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  n('init', META_PIXEL_ID);
  n('track', 'PageView');
}

/** Fire a standard Meta event if the Pixel is loaded; no-op otherwise. */
export function fbTrack(event: string, params?: Record<string, unknown>, eventId?: string): void {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    if (eventId) window.fbq('track', event, params || {}, { eventID: eventId });
    else window.fbq('track', event, params || {});
  } catch { /* pixel is optional */ }
}

export {};
