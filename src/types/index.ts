export type Category = 'candle' | 'scrub' | 'salt' | 'set';

export const CATEGORY_LABELS: Record<Category, string> = {
  candle: 'Candles', scrub: 'Body Scrubs', salt: 'Bath Salts', set: 'Gift Sets',
};
export const BODY_CATEGORIES: Category[] = ['scrub', 'salt'];

export interface Variant { id: string; label: string; price: number; compareAt?: number; stock?: number; sku?: string }

export interface Product {
  id: string; slug: string; name: string; category: Category; tagline?: string; description: string;
  images: string[]; family: string; notes?: { top: string; heart: string; base: string };
  burnTime?: string; wax?: string; wick?: string; ingredients?: string; bundleItems?: string[];
  variants: Variant[]; featured: boolean; isNewArrival: boolean; collections: string[]; active: boolean; sortOrder: number;
  rating?: number | null; reviewCount?: number; badge?: string;
  /** Purchasable by direct URL but left out of shop/home listings (e.g. the corporate sample kit). */
  hidden?: boolean;
  /** 'active' = a real product you added; anything else (including missing) = demo/sample product.
   *  Demo products show only while settings.showDemoProducts is on. */
  status?: 'active' | 'demo';
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
  /** Server-written refund ledger (refundOrder). */
  refundedTotal?: number; refunds?: { amount: number; reason: string; provider: string; at?: { seconds: number } | null }[];
  /** Set by markOrderPaid when a paid order wanted more units than were in stock. */
  oversold?: { productId: string; variantId: string; name: string; ordered: number; available: number }[] | null;
  restockedAt?: { seconds: number } | null;
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
  /** Daily low-stock email lists variants below this many units (default 5). */
  lowStockThreshold?: number;
  announcement: { text: string; visible: boolean; messages?: string[] };
  homepage?: { showChristmas?: boolean; showCorporate?: boolean; showNewsletter?: boolean };
  /** Storefront theme id (see src/themes.ts). */
  theme?: string;
  /** Show internet stand-in photos for products until the real renders are uploaded. */
  placeholderImages?: boolean;
  /** Show demo (sample) products on the website alongside active ones. Turn off once the real catalog is in. */
  showDemoProducts?: boolean;
  /** First-visit email popup. */
  popup?: { enabled: boolean; headline: string; body: string; code: string; delaySeconds: number };
  social?: { instagram?: string; facebook?: string; tiktok?: string; pinterest?: string };
}

export interface Discount { code: string; type: 'percent' | 'fixed'; value: number; minSubtotal?: number; active: boolean; expiresAt?: { seconds: number } | null; usageLimit?: number | null; usageCount?: number; firstOrderOnly?: boolean; appliesTo?: 'all' | 'sets'; note?: string }
export interface Review { id: string; productId: string; userId: string; name: string; rating: number; title?: string; body: string; approved: boolean; verified?: boolean; createdAt?: { seconds: number } | null }
export interface Quote { id: string; recipients?: Recipient[]; giftCode?: string; name: string; company: string; email: string; phone?: string; quantity: number; budget: string; neededBy: string; product: string; customization: string[]; shippingMode: string; notes: string; status: 'new' | 'quoted' | 'invoiced' | 'won' | 'lost'; invoiceUrl?: string; invoiceTotal?: number; createdAt?: { seconds: number } | null }

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

export interface Plan { id: 'monthly' | 'quarterly'; name: string; amount: number; interval: string; intervalCount: number; description: string }
export interface Subscription { id: string; stripeSubscriptionId: string; userId: string | null; email?: string | null; plan: 'monthly' | 'quarterly'; status: string; currentPeriodStart?: number | null; currentPeriodEnd?: number | null; cancelAtPeriodEnd?: boolean; amount?: number | null; shippingAddress?: ShippingAddress; preference?: string }
export interface Recipient { name: string; address: string; address2?: string; city: string; state: string; zipCode: string; email?: string; note?: string }
