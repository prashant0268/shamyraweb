import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { CartItem } from '../types';

// Stripe public key - this is safe to expose
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export interface ShippingInfo {
  fullName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
}

// Stripe Checkout
export const createStripeCheckout = async (
  items: CartItem[],
  shippingAddress: ShippingInfo
): Promise<{ sessionId: string; url: string }> => {
  const createCheckout = httpsCallable<
    { items: CartItem[]; shippingAddress: ShippingInfo; successUrl: string; cancelUrl: string },
    { sessionId: string; url: string }
  >(functions, 'createStripeCheckout');

  const result = await createCheckout({
    items,
    shippingAddress,
    successUrl: `${window.location.origin}/order-confirmation?payment=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/checkout`,
  });

  return result.data;
};

export const redirectToStripeCheckout = async (
  items: CartItem[],
  shippingAddress: ShippingInfo
): Promise<void> => {
  const { url } = await createStripeCheckout(items, shippingAddress);

  if (url) {
    window.location.href = url;
  } else {
    // Fallback to using Stripe.js redirect
    const stripe = await stripePromise;
    const { sessionId } = await createStripeCheckout(items, shippingAddress);

    if (stripe) {
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw new Error(error.message);
      }
    }
  }
};

// PayPal
export const createPayPalOrder = async (
  items: CartItem[],
  total: number
): Promise<string> => {
  const createOrder = httpsCallable<
    { items: CartItem[]; total: number },
    { orderId: string }
  >(functions, 'createPayPalOrder');

  const result = await createOrder({ items, total });
  return result.data.orderId;
};

export const capturePayPalOrder = async (
  orderId: string
): Promise<{ status: string; orderId: string; payerEmail?: string }> => {
  const captureOrder = httpsCallable<
    { orderId: string },
    { status: string; orderId: string; payerEmail?: string }
  >(functions, 'capturePayPalOrder');

  const result = await captureOrder({ orderId });
  return result.data;
};

export { stripePromise };
