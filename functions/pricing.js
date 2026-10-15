/**
 * Pure pricing logic (no Firestore). Injected: getProduct(id), getDiscount(code), hasPriorOrders(uid).
 * Throws { code, message } errors that index.js maps to HttpsError.
 */
class PricingError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new PricingError(code, message); };
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const cents = (n) => Math.round(n * 100);
const BODY_CATEGORIES = ["scrub", "lotion", "salt"];

/* -------------------------------- catalog -------------------------------- */
async function getProduct(id) {
  const snap = await db.doc(`products/${id}`).get();
  if (snap.exists) return { id: snap.id, ...snap.data() };
  const local = CATALOG.find((p) => p.id === id);
  return local ? { ...local, _fallback: true } : null;
}

/**
 * Validates cart items and prices them.
 * items: [{ productId, variantId, quantity, bundle? }]
 */
async function priceCart({ items, discountCode, shippingAddress, shippingMethod, gift }, settings, uid, deps) {
  const { getProduct, getDiscount, hasPriorOrders } = deps;
  if (!Array.isArray(items) || items.length === 0) fail("invalid-argument", "Your bag is empty.");
  if (items.length > 50) fail("invalid-argument", "Too many items.");

  const lines = [];
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) fail("invalid-argument", "Invalid quantity.");
    const product = await getProduct(String(item.productId));
    if (!product || product.active === false) fail("failed-precondition", `"${item.productId}" is no longer available.`);
    const variant = (product.variants || []).find((v) => v.id === item.variantId) || product.variants?.[0];
    if (!variant) fail("failed-precondition", `${product.name} has no purchasable option.`);
    if (typeof variant.stock === "number" && variant.stock < qty) {
      fail("failed-precondition", variant.stock > 0 ? `Only ${variant.stock} left of ${product.name} (${variant.label}).` : `${product.name} (${variant.label}) is sold out.`);
    }
    lines.push({
      productId: product.id, variantId: variant.id, name: product.name, variantLabel: variant.label,
      category: product.category, image: product.images?.[0] || "", unitPrice: round2(variant.price), quantity: qty,
      bundle: item.bundle ? String(item.bundle) : null, lineDiscount: 0,
    });
  }

  // Build-a-set bundles: 1 candle + 2 bath items sharing a bundle id → 15% off those lines.
  const groups = {};
  for (const l of lines) if (l.bundle) (groups[l.bundle] = groups[l.bundle] || []).push(l);
  let bundleDiscount = 0;
  for (const g of Object.values(groups)) {
    const candles = g.filter((l) => l.category === "candle").reduce((n, l) => n + l.quantity, 0);
    const body = g.filter((l) => BODY_CATEGORIES.includes(l.category)).reduce((n, l) => n + l.quantity, 0);
    if (candles === 1 && body === 2) {
      for (const l of g) { l.lineDiscount = round2(l.unitPrice * l.quantity * (settings.bundleDiscountPercent / 100)); bundleDiscount += l.lineDiscount; }
    } else {
      for (const l of g) l.bundle = null; // incomplete bundle: charge normally
    }
  }
  bundleDiscount = round2(bundleDiscount);

  const subtotal = round2(lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0));
  const giftWrap = gift?.wrap ? round2(settings.giftWrapFee) : 0;

  // Discount code
  let discount = { code: null, amount: 0, type: null };
  if (discountCode) {
    const code = String(discountCode).trim().toUpperCase();
    const d = await getDiscount(code);
    const now = Date.now();
    const expired = d?.expiresAt && d.expiresAt.toMillis ? d.expiresAt.toMillis() < now : false;
    const exhausted = d?.usageLimit ? (d.usageCount || 0) >= d.usageLimit : false;
    if (!d || d.active === false || expired || exhausted) fail("failed-precondition", "That discount code isn't valid.");
    if (d.minSubtotal && subtotal < d.minSubtotal) fail("failed-precondition", `Add ${fmt(d.minSubtotal - subtotal)} more to use ${code}.`);
    if (d.firstOrderOnly && uid && (await hasPriorOrders(uid))) fail("failed-precondition", `${code} is for first orders only.`);
    const eligible = d.appliesTo === "sets" ? lines.filter((l) => l.category === "set") : lines;
    const base = round2(eligible.reduce((t, l) => t + l.unitPrice * l.quantity - l.lineDiscount, 0));
    const amount = d.type === "percent" ? round2(base * (Number(d.value) / 100)) : Math.min(base, round2(Number(d.value)));
    discount = { code, amount, type: d.type };
  }

  const discountTotal = round2(bundleDiscount + discount.amount);
  const merch = round2(subtotal - discountTotal);
  const method = shippingMethod === "express" ? "express" : "standard";
  const shipping = method === "express" ? round2(settings.expressShipping) : merch >= settings.freeShippingThreshold ? 0 : round2(settings.flatShipping);
  const state = (shippingAddress?.state || "").toUpperCase();
  const rate = settings.taxRates?.[state] || 0;
  const tax = round2((merch + giftWrap + shipping) * rate);
  const total = round2(merch + giftWrap + shipping + tax);

  return {
    lines, subtotal, bundleDiscount, discount, discountTotal, giftWrap, shipping: { method, amount: shipping },
    tax, taxRate: rate, total, currency: "usd",
  };
}


function fmt(n) { return "$" + Number(n).toFixed(2); }
module.exports = { priceCart, round2, cents, fmt, PricingError, BODY_CATEGORIES };
