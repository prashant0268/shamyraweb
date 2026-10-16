import { logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';
import { fbTrack } from './metaPixel';

type Item = { item_id?: string; item_name?: string; item_variant?: string; quantity?: number; price?: number };

/** Map a GA4 e-commerce event to the matching standard Meta Pixel event (null = no equivalent). */
export function toMetaEvent(event: string, params: Record<string, unknown> = {}): { name: string; params: Record<string, unknown> }[] {
  const items = (Array.isArray(params.items) ? params.items : []) as Item[];
  const ids = items.map((i) => i.item_id).filter((x): x is string => typeof x === 'string');
  const contents = items.filter((i) => i.item_id).map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, ...(typeof i.price === 'number' ? { item_price: i.price } : {}) }));
  const value = typeof params.value === 'number' ? params.value : undefined;
  const currency = typeof params.currency === 'string' ? params.currency : 'USD';
  const commerce = { ...(ids.length ? { content_ids: ids, content_type: 'product', contents } : {}), ...(value !== undefined ? { value, currency } : {}) };
  switch (event) {
    case 'view_item': return [{ name: 'ViewContent', params: { ...commerce, ...(items[0]?.item_name ? { content_name: items[0].item_name } : {}) } }];
    case 'add_to_cart': return [{ name: 'AddToCart', params: commerce }];
    case 'add_to_wishlist': return [{ name: 'AddToWishlist', params: commerce }];
    case 'begin_checkout': return [{ name: 'InitiateCheckout', params: commerce }];
    case 'purchase': {
      const p = { value: value ?? 0, currency, ...(ids.length ? { content_ids: ids, content_type: 'product', contents } : {}) };
      // Subscriptions (Stripe Billing) fire purchase with { subscription: true }: report both the revenue and the Subscribe signal.
      return params.subscription ? [{ name: 'Purchase', params: p }, { name: 'Subscribe', params: { value: value ?? 0, currency } }] : [{ name: 'Purchase', params: p }];
    }
    case 'sign_up': return params.method === 'newsletter' ? [{ name: 'Lead', params: { content_name: 'newsletter' } }] : [{ name: 'CompleteRegistration', params: {} }];
    case 'generate_lead': return [{ name: 'Lead', params: { content_name: 'corporate_quote', ...(value !== undefined ? { value, currency } : {}) } }];
    default: return [];
  }
}

export function track(event: string, params?: Record<string, unknown>) {
  try { if (analytics) logEvent(analytics, event, params); } catch { /* analytics is optional */ }
  const eventId = typeof params?.transaction_id === 'string' ? `${event}:${params.transaction_id}` : undefined; // dedupe key for a future Conversions API
  for (const m of toMetaEvent(event, params)) fbTrack(m.name, m.params, eventId);
  if (import.meta.env.DEV) console.debug('[analytics]', event, params || '');
}
