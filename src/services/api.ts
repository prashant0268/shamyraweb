import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { CartItem, GiftOptions, Order, Plan, Pricing, ShippingAddress, Subscription } from '../types';

const call = <I, O>(name: string) => async (data: I): Promise<O> => {
  const fn = httpsCallable<I, O>(functions, name);
  const res = await fn(data);
  return res.data;
};

export interface CheckoutInput { items: CartItem[]; shippingAddress: ShippingAddress; email: string; discountCode?: string | null; shippingMethod?: 'standard' | 'express'; gift?: GiftOptions; origin: string }

export const quoteCart = call<Partial<CheckoutInput>, Pricing>('quoteCart');
export const createStripeCheckout = call<CheckoutInput, { orderId: string; orderNumber: string; url: string }>('createStripeCheckout');
export const verifyStripePayment = call<{ sessionId: string; orderId: string }, { paid: boolean; order?: Order; status?: string }>('verifyStripePayment');
export const createPayPalOrder = call<CheckoutInput, { orderId: string; orderNumber: string; paypalOrderId: string }>('createPayPalOrder');
export const capturePayPalOrder = call<{ paypalOrderId: string; orderId: string }, { paid: boolean; order?: Order; status?: string }>('capturePayPalOrder');
export const ensureAdmin = call<Record<string, never>, { admin: boolean; refreshed: boolean }>('ensureAdmin');
export const updateOrderStatus = call<{ orderId: string; status: string; tracking?: { carrier: string; number: string }; internalNotes?: string }, { ok: boolean }>('updateOrderStatus');
export const refundOrder = call<{ orderId: string }, { ok: boolean }>('refundOrder');
export const submitQuote = call<Record<string, unknown>, { ok: boolean; id: string }>('submitQuote');
export const createInvoice = call<{ quoteId: string; lines: { description: string; unitPrice: number; quantity: number }[]; daysUntilDue?: number; memo?: string }, { ok: boolean; url: string; total: number }>('createInvoice');

export const listPlans = call<Record<string, never>, { plans: Plan[] }>('listPlans');
export const createSubscriptionCheckout = call<{ plan: string; shippingAddress: ShippingAddress; email: string; preference?: string; origin: string }, { url: string }>('createSubscriptionCheckout');
export const verifySubscription = call<{ sessionId: string }, { active: boolean; status?: string; subscription?: Subscription }>('verifySubscription');
export const createPortalSession = call<{ origin: string }, { url: string }>('createPortalSession');
export const syncSubscriptions = call<Record<string, never>, { synced: number }>('syncSubscriptions');
export const createSubscriptionShipments = call<{ picks: Record<string, { productId: string; variantId: string }[]> }, { created: number; skipped: number }>('createSubscriptionShipments');

export const errorMessage = (e: unknown, fallback = 'Something went wrong. Please try again.') => {
  const err = e as { message?: string; code?: string };
  if (err?.message && !/^(internal|unknown)$/i.test(err.message)) return err.message.replace(/^Firebase: /, '');
  return fallback;
};
