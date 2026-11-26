/**
 * Pure helpers for abuse protection and data integrity (no Firestore, no network).
 * index.js wires them to Firestore; scripts/test-integrity-unit.mjs tests them.
 */
const crypto = require("crypto");

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/* --------------------------------- email ---------------------------------- */
// Deliberately conservative: one @, a dotted domain, no spaces, quotes, angle brackets, slashes or control chars.
const EMAIL_RE = /^[a-z0-9.!#$%&'*+=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
/** Lowercased, trimmed email, or "" when it isn't a plausible address. */
function cleanEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  return e.length <= 200 && EMAIL_RE.test(e) ? e : "";
}
/**
 * Canonical identity for "one person" checks (first-order discounts): lowercase, drop +tags everywhere,
 * drop dots for Gmail, googlemail.com → gmail.com. Never used as a send-to address.
 */
function normalizeEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return "";
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  local = local.split("+")[0];
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return local && domain ? `${local}@${domain}` : "";
}
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

/* ------------------------------- throttling -------------------------------- */
/**
 * Fixed-window rate limit. state = { windowStart, count } | null.
 * Returns { allowed, state } where state is what to store back.
 */
function rateWindow(state, now, limit, windowMs) {
  const fresh = !state || typeof state.windowStart !== "number" || now - state.windowStart >= windowMs;
  const cur = fresh ? { windowStart: now, count: 0 } : { windowStart: state.windowStart, count: Number(state.count) || 0 };
  if (cur.count >= limit) return { allowed: false, state: cur };
  return { allowed: true, state: { ...cur, count: cur.count + 1 } };
}

/** Best-effort client IP from a callable's rawRequest. On Cloud Run Google appends the real peer address last. */
function clientIp(rawRequest) {
  const xff = String(rawRequest?.headers?.["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff[xff.length - 1] || rawRequest?.ip || "unknown";
}

/* ------------------------------ email safety -------------------------------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/** For email subjects/headers: no CR/LF (header injection) and no other control characters. */
// eslint-disable-next-line no-control-regex -- strips control chars on purpose
const oneLine = (s, max = 200) => String(s ?? "").replace(/[\r\n\t\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/* -------------------------------- discounts --------------------------------- */
/** Can one more checkout reserve this code? Counts paid uses plus open reservations. */
function discountHasCapacity(d) {
  if (!d?.usageLimit) return true;
  return (Number(d.usageCount) || 0) + Math.max(0, Number(d.reservedCount) || 0) < Number(d.usageLimit);
}

/* ---------------------------------- stock ----------------------------------- */
/**
 * Plans the stock decrement for a paid order.
 * products: { [productId]: productData | undefined } (undefined = not in Firestore, e.g. catalog.json fallback)
 * items: order.items
 * Returns { variantsByProduct: { [productId]: newVariants }, decremented: [{productId, variantId, quantity}],
 *           oversold: [{productId, variantId, name, ordered, available}] }
 * Stock never goes below 0; anything that didn't fit is reported as oversold.
 */
function planStockDecrement(products, items) {
  const variantsByProduct = {};
  const decremented = [];
  const oversold = [];
  for (const item of items || []) {
    const p = products[item.productId];
    if (!p) continue;
    const variants = variantsByProduct[item.productId] || (p.variants || []).map((v) => ({ ...v }));
    const v = variants.find((x) => x.id === item.variantId);
    if (!v || typeof v.stock !== "number") { variantsByProduct[item.productId] = variants; continue; }
    const qty = Number(item.quantity) || 0;
    const take = Math.max(0, Math.min(v.stock, qty));
    if (take < qty) oversold.push({ productId: item.productId, variantId: item.variantId, name: item.name || p.name || item.productId, ordered: qty, available: Math.max(0, v.stock) });
    v.stock = Math.max(0, v.stock - take);
    if (take > 0) decremented.push({ productId: item.productId, variantId: item.variantId, quantity: take });
    variantsByProduct[item.productId] = variants;
  }
  return { variantsByProduct, decremented, oversold };
}

/** Adds back what planStockDecrement took. Returns { [productId]: newVariants } for products that changed. */
function planRestock(products, decremented) {
  const out = {};
  for (const d of decremented || []) {
    const p = products[d.productId];
    if (!p) continue;
    const variants = out[d.productId] || (p.variants || []).map((v) => ({ ...v }));
    const v = variants.find((x) => x.id === d.variantId);
    if (v && typeof v.stock === "number") v.stock += Number(d.quantity) || 0;
    out[d.productId] = variants;
  }
  return out;
}

/** Variants that went from 0 (or less) to in stock between two product snapshots. */
function variantsBackInStock(before, after) {
  const prev = new Map((before?.variants || []).map((v) => [v.id, v]));
  return (after?.variants || []).filter((v) => {
    const b = prev.get(v.id);
    return b && typeof b.stock === "number" && b.stock <= 0 && typeof v.stock === "number" && v.stock > 0;
  }).map((v) => v.id);
}

/** [{ productId, productName, variantId, label, stock }] for active products with any variant below threshold. */
function lowStockVariants(products, threshold) {
  const out = [];
  for (const p of products) {
    if (p.active === false || p.hidden) continue;
    for (const v of p.variants || []) {
      if (typeof v.stock === "number" && v.stock < threshold) out.push({ productId: p.id, productName: p.name || p.id, variantId: v.id, label: v.label || v.id, stock: v.stock });
    }
  }
  return out.sort((a, b) => a.stock - b.stock);
}

/* --------------------------------- refunds ---------------------------------- */
/**
 * Validates a refund request against what's left on the order.
 * amount: dollars, or null/undefined for "everything that's left".
 * Returns { amount, remaining, full } or { error }.
 */
function planRefund(order, amount) {
  const total = round2(Number(order.total) || 0);
  const already = round2(Number(order.refundedTotal) || 0);
  const remaining = round2(total - already);
  if (remaining <= 0) return { error: "This order has already been fully refunded." };
  const want = amount == null || amount === "" ? remaining : round2(Number(amount));
  if (!Number.isFinite(want) || want <= 0) return { error: "Enter a refund amount greater than $0." };
  if (want > remaining + 1e-9) return { error: `You can refund at most $${remaining.toFixed(2)} on this order.` };
  return { amount: want, remaining: round2(remaining - want), full: round2(remaining - want) <= 0 };
}

/* --------------------------------- reviews ---------------------------------- */
const clampRating = (r) => { const n = Math.round(Number(r)); return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : null; };
const PAID_STATUSES = ["paid", "fulfilled", "shipped", "delivered"];
/** True when one of these orders is paid and contains the product. */
function ordersContainProduct(orders, productId) {
  return orders.some((o) => PAID_STATUSES.includes(o.status) && (o.items || []).some((i) => i.productId === productId));
}

module.exports = {
  cleanEmail, normalizeEmail, sha, rateWindow, clientIp, esc, oneLine, discountHasCapacity,
  planStockDecrement, planRestock, variantsBackInStock, lowStockVariants, planRefund, clampRating, ordersContainProduct, PAID_STATUSES,
};
