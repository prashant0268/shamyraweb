export type Category = 'candle' | 'scrub' | 'lotion' | 'salt' | 'set';

export const CATEGORY_LABELS: Record<Category, string> = {
  candle: 'Candles', scrub: 'Body Scrubs', lotion: 'Lotions', salt: 'Bath Salts', set: 'Gift Sets',
};
export const BODY_CATEGORIES: Category[] = ['scrub', 'lotion', 'salt'];

export interface Variant { id: string; label: string; price: number; compareAt?: number; stock?: number; sku?: string }

export interface Product {
  id: string; slug: string; name: string; category: Category; tagline?: string; description: string;
  images: string[]; family: string; notes?: { top: string; heart: string; base: string };
  burnTime?: string; wax?: string; wick?: string; ingredients?: string; bundleItems?: string[];
  variants: Variant[]; featured: boolean; isNewArrival: boolean; collections: string[]; active: boolean; sortOrder: number;
  rating?: number | null; reviewCount?: number; badge?: string;
}

export interface CartItem { productId: string; variantId: string; quantity: number; bundle?: string | null }
export interface HydratedCartItem extends CartItem { product: Product; variant: Variant }

export interface ShippingAddress { fullName: string; address: string; address2?: string; city: string; state: string; zipCode: string; phone?: string; email?: string }
export interface GiftOptions { isGift: boolean; wrap: boolean; message: string }

export interface OrderItem { productId: string; variantId: string; name: string; variantLabel: string; price: number; quantity: number; image: string; lineDiscount?: number; bundle?: string | null }
export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export interface Order {
  id: string; number: string; userId: string; email: string; customerName: string; items: OrderItem[];
  subtotal: number; bundleDiscount: number; discount: { code: string | null; amount: number }; discountTotal: number; giftWrap: number;
  shipping: { method: 'standard' | 'express'; amount: number }; tax: number; total: number;
  shippingAddress: ShippingAddress; gift: GiftOptions; paymentMethod: 'stripe' | 'paypal'; paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'; status: OrderStatus;
  tracking?: { carrier: string; number: string; url: string } | null; internalNotes?: string;
  createdAt?: { seconds: number } | number | null; paidAt?: { seconds: number } | number | null;
}

export interface Pricing {
  lines: Array<{ productId: string; variantId: string; name: string; variantLabel: string; unitPrice: number; quantity: number; lineDiscount: number; bundle: string | null }>;
  subtotal: number; bundleDiscount: number; discount: { code: string | null; amount: number }; discountTotal: number; giftWrap: number;
  shipping: { method: 'standard' | 'express'; amount: number }; tax: number; taxRate: number; total: number;
  settings: { freeShippingThreshold: number; flatShipping: number; expressShipping: number; giftWrapFee: number };
}

export interface StoreSettings {
  brandName: string; legalName: string; contactEmail: string; contactPhone: string;
  freeShippingThreshold: number; flatShipping: number; expressShipping: number; giftWrapFee: number; bundleDiscountPercent: number;
  taxRates: Record<string, number>; cardPaymentsEnabled: boolean; paypalEnabled: boolean;
  announcement: { text: string; visible: boolean };
  homepage?: { showChristmas?: boolean; showCorporate?: boolean; showNewsletter?: boolean };
}

export interface Discount { code: string; type: 'percent' | 'fixed'; value: number; minSubtotal?: number; active: boolean; expiresAt?: { seconds: number } | null; usageLimit?: number | null; usageCount?: number; firstOrderOnly?: boolean; appliesTo?: 'all' | 'sets'; note?: string }
export interface Review { id: string; productId: string; userId: string; name: string; rating: number; title?: string; body: string; approved: boolean; createdAt?: { seconds: number } | null }
export interface Quote { id: string; name: string; company: string; email: string; phone?: string; quantity: number; budget: string; neededBy: string; product: string; customization: string[]; shippingMode: string; notes: string; status: 'new' | 'quoted' | 'invoiced' | 'won' | 'lost'; invoiceUrl?: string; invoiceTotal?: number; createdAt?: { seconds: number } | null }

export interface UserProfile { uid: string; email: string | null; displayName: string | null; isAnonymous: boolean; isAdmin: boolean; creationTime?: string }

export interface AuthContextType {
  user: UserProfile | null; loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  signup: (email: string, password: string, name?: string) => Promise<unknown>;
  loginWithGoogle: () => Promise<unknown>;
  loginAsGuest: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export interface CartContextType {
  items: CartItem[]; hydrated: HydratedCartItem[]; isOpen: boolean; count: number; subtotal: number; ready: boolean;
  add: (productId: string, variantId: string, quantity?: number, bundle?: string | null) => void;
  remove: (productId: string, variantId: string) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  clear: () => void; open: () => void; close: () => void;
}
