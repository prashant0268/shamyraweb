import { logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';

export function track(event: string, params?: Record<string, unknown>) {
  try { if (analytics) logEvent(analytics, event, params); } catch { /* analytics is optional */ }
  if (import.meta.env.DEV) console.debug('[analytics]', event, params || '');
}
