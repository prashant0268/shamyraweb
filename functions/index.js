/**
 * Kind Flames — Cloud Functions (Gen 2, Node 20)
 *
 * All money math happens here. The browser only sends product/variant ids and
 * quantities; prices, discounts, shipping and tax are computed from Firestore
 * (falling back to catalog.json before the catalog is seeded). Orders are
 * written only by these functions, never by the client.
 */
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const Stripe = require("stripe");
const { Client, Environment, OrdersController, PaymentsController } = require("@paypal/paypal-server-sdk");
const CATALOG = require("./catalog.json");
const { priceCart: pricePure, round2, cents, fmt, PricingError } = require("./pricing");
const { createMarketing } = require("./marketing");
const integrity = require("./integrity");
const { cleanEmail, normalizeEmail, sha, rateWindow, clientIp, oneLine, discountHasCapacity, planStockDecrement, planRestock, variantsBackInStock, lowStockVariants, planRefund, clampRating, ordersContainProduct, PAID_STATUSES } = integrity;
const { forEachPage } = require("./paging");

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

/* ----------------------------- configuration -----------------------------
 * Non-secret config comes from functions/.env (shared fallback) overlaid by functions/.env.<projectId>
 * (.env.shamyra-web = production, .env.kindflames-test = test). The Firebase CLI loads both at deploy time and in
 * the emulator. Secrets (STRIPE_*, PAYPAL_*, RESEND_API_KEY) stay in Secret Manager, one set per project.
 * Code defaults below equal the historical hardcoded production values, so a missing env file changes nothing
 * for shamyra-web. See docs/ENVIRONMENTS.md. */
const ENV = process.env;
const PROJECT_ID = ENV.GCLOUD_PROJECT || (() => { try { return JSON.parse(ENV.FIREBASE_CONFIG || "{}").projectId || ""; } catch { return ""; } })();
const SITE_URL = (ENV.SITE_URL || "https://kindflames.com").replace(/\/$/, "");
/** Real store? Gates live PayPal and the "production hosts". Anything but an explicit "false" counts as production. */
const IS_PRODUCTION = String(ENV.IS_PRODUCTION ?? "true").trim().toLowerCase() !== "false";
const ADMIN_EMAILS = (ENV.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const OWNER_EMAIL = ENV.OWNER_EMAIL || ADMIN_EMAILS[0] || "";
const FROM_EMAIL = ENV.FROM_EMAIL || "Kind Flames <orders@kindflames.com>";
// Feature flags that change which secrets a function binds live in features.json (read at both deploy-analysis
// and runtime). .env values are NOT visible during the CLI's deploy analysis, so they can't gate secret bindings.
// features.<projectId>.json (optional) overrides features.json for one project, e.g. the webhook only on test.
const FEATURES_PROJECT = process.env.GCLOUD_PROJECT || (() => { try { return JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId; } catch { return ""; } })() || "";
const FEATURES = (() => { const base = require("./features.json"); try { return { ...base, ...require(`./features.${FEATURES_PROJECT}.json`) }; } catch { return base; } })();
const ENABLE_RESEND = FEATURES.resend === true;
const ENABLE_STRIPE_WEBHOOK = FEATURES.stripeWebhook === true;
// App Check on public callables. Off until the site key is registered and VITE_APPCHECK_SITE_KEY ships in the web
// build (docs/APP_CHECK.md); turning it on first would reject every browser call.
const ENFORCE_APP_CHECK = FEATURES.appCheck === true;
/** Options for callables anyone (including anonymous guests) can hit. */
const PUBLIC_CALL = { cors: true, enforceAppCheck: ENFORCE_APP_CHECK };
const HOUR = 3600e3;
const MAIL_SECRETS = ENABLE_RESEND ? ["RESEND_API_KEY"] : [];
const STRIPE_SECRETS = ["STRIPE_SECRET_KEY", ...MAIL_SECRETS];
const PAYPAL_SECRETS = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_SECRET_LIVE", "PAYPAL_MODE", ...MAIL_SECRETS];
/** "kindflames.com" → ["kindflames.com", "www.kindflames.com"] (and the reverse); Firebase Hosting default domains
 *  have no www form; [] when there is no host. */
const hostVariants = (host) => (!host ? [] : /\.(web\.app|firebaseapp\.com)$/.test(host) ? [host] : host.startsWith("www.") ? [host, host.slice(4)] : [host, `www.${host}`]);
const SITE_HOST = (() => { try { return new URL(SITE_URL).hostname; } catch { return ""; } })();
const EXTRA_ORIGINS = (ENV.EXTRA_ORIGINS || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const LOCAL_ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"];
/** Browser origins allowed to start a checkout: the site (with/without www), this project's Firebase Hosting
 *  domains, EXTRA_ORIGINS from .env, and the Vite dev/preview ports. */
const ALLOWED_ORIGINS = [...new Set([
  SITE_URL,
  ...hostVariants(SITE_HOST).map((h) => `https://${h}`),
  ...(PROJECT_ID ? [`https://${PROJECT_ID}.web.app`, `https://${PROJECT_ID}.firebaseapp.com`] : []),
  ...EXTRA_ORIGINS,
  ...LOCAL_ORIGINS,
])];
/** Only these origins may use live PayPal; empty outside production, so a test project can never charge real money. */
const PRODUCTION_HOSTS = IS_PRODUCTION ? hostVariants(SITE_HOST) : [];
/** PAYPAL_MODE secret wins; otherwise live in production, sandbox everywhere else. */
const PAYPAL_MODE_DEFAULT = IS_PRODUCTION ? "live" : "sandbox";

const { DEFAULT_SETTINGS } = require("./defaults");

async function getProduct(id) {
  const snap = await db.doc(`products/${id}`).get();
  if (snap.exists) return { id: snap.id, ...snap.data() };
  const local = CATALOG.find((p) => p.id === id);
  return local ? { ...local, _fallback: true } : null;
}
const pricingDeps = {
  getProduct,
  getDiscount: async (code) => { const snap = await db.doc(`discounts/${code}`).get(); return snap.exists ? snap.data() : null; },
  /** Paid orders by this uid, or by this normalized email (new orders store emailNormalized; older ones only email). */
  hasPriorOrders: async ({ uid, email }) => {
    const paid = (q) => q.where("status", "in", PAID_STATUSES).limit(1).get().then((s) => !s.empty);
    const checks = [];
    if (uid) checks.push(paid(db.collection("orders").where("userId", "==", uid)));
    if (email) checks.push(paid(db.collection("orders").where("emailNormalized", "==", email)), paid(db.collection("orders").where("email", "==", email)));
    return (await Promise.all(checks)).some(Boolean);
  },
};
async function priceCart(input, settings, uid) {
  try { return await pricePure(input, settings, uid, pricingDeps); }
  catch (e) { if (e instanceof PricingError) throw new HttpsError(e.code, e.message); throw e; }
}

async function getSettings() {
  const snap = await db.doc("settings/store").get();
  return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) };
}


function cleanAddress(a = {}) {
  const s = (v) => String(v || "").trim().slice(0, 120);
  const addr = { fullName: s(a.fullName), address: s(a.address), address2: s(a.address2), city: s(a.city), state: s(a.state).toUpperCase().slice(0, 2), zipCode: s(a.zipCode), phone: s(a.phone), country: "US" };
  for (const k of ["fullName", "address", "city", "state", "zipCode"]) if (!addr[k]) throw new HttpsError("invalid-argument", "Please complete your shipping address.");
  return addr;
}

async function nextOrderNumber() {
  const ref = db.doc("counters/orders");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = snap.exists ? snap.data().next : 1001;
    tx.set(ref, { next: next + 1 }, { merge: true });
    return `KF-${next}`;
  });
}

async function createPendingOrder({ uid, email, pricing, shippingAddress, gift, paymentMethod, origin }) {
  const code = pricing.discount?.code || null;
  // A new checkout supersedes this customer's earlier unpaid ones: free their code reservations first, so a
  // retry doesn't count against a usage-limited code twice.
  if (code) await releaseUserReservations(uid).catch((e) => console.error("release stale reservations failed", e.message));
  const number = await nextOrderNumber();
  const ref = db.collection("orders").doc();
  const order = {
    number, userId: uid, email: String(email || "").toLowerCase().slice(0, 200), emailNormalized: normalizeEmail(email), customerName: shippingAddress.fullName,
    items: pricing.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, name: l.name, variantLabel: l.variantLabel, price: l.unitPrice, quantity: l.quantity, image: l.image, lineDiscount: l.lineDiscount, bundle: l.bundle })),
    subtotal: pricing.subtotal, bundleDiscount: pricing.bundleDiscount, discount: pricing.discount, discountTotal: pricing.discountTotal, giftWrap: pricing.giftWrap,
    shipping: pricing.shipping, tax: pricing.tax, taxRate: pricing.taxRate, total: pricing.total, currency: "usd",
    shippingAddress, gift: { isGift: !!gift?.isGift, wrap: !!gift?.wrap, message: String(gift?.message || "").slice(0, 300) },
    paymentMethod, paymentStatus: "pending", status: "pending", origin: origin || "",
    tracking: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), paidAt: null,
    discountReservation: code ? { code, state: "reserved" } : null,
  };
  if (!code) { await ref.set(order); return { id: ref.id, ...order }; }
  // Reserve one use of the code atomically with the order, so concurrent checkouts can't exceed usageLimit.
  // markOrderPaid turns the reservation into a use; releaseReservation / releaseExpiredReservations give it back.
  const dref = db.doc(`discounts/${code}`);
  await db.runTransaction(async (tx) => {
    const ds = await tx.get(dref);
    const d = ds.exists ? ds.data() : null;
    if (!d || d.active === false || !discountHasCapacity(d)) throw new HttpsError("failed-precondition", `${code} has reached its usage limit. Remove it to continue.`);
    tx.update(dref, { reservedCount: FieldValue.increment(1) });
    tx.set(ref, order);
  });
  return { id: ref.id, ...order };
}

/** Gives back an unpaid order's discount reservation (idempotent). */
async function releaseReservation(orderId) {
  const ref = db.doc(`orders/${orderId}`);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const o = s.exists ? s.data() : null;
    if (!o || o.discountReservation?.state !== "reserved" || o.paymentStatus === "paid") return false;
    const dref = db.doc(`discounts/${o.discountReservation.code}`);
    const ds = await tx.get(dref);
    if (ds.exists) tx.update(dref, { reservedCount: FieldValue.increment(-1) });
    tx.update(ref, { "discountReservation.state": "released", "discountReservation.releasedAt": FieldValue.serverTimestamp() });
    return true;
  });
}
async function releaseUserReservations(uid) {
  if (!uid) return;
  const snap = await db.collection("orders").where("userId", "==", uid).where("discountReservation.state", "==", "reserved").limit(20).get();
  for (const d of snap.docs) if (d.data().paymentStatus !== "paid") await releaseReservation(d.id);
}

/**
 * Inside markOrderPaid's transaction: re-check stock and decrement it, and turn the discount reservation into a
 * use. Does all its reads before any write (Firestore transaction rule). Returns the patch for the order doc.
 */
async function applyPaidInventory(tx, order) {
  const ids = [...new Set((order.items || []).map((i) => String(i.productId)))];
  const psnaps = ids.length ? await tx.getAll(...ids.map((id) => db.doc(`products/${id}`))) : [];
  const code = order.discount?.code || null;
  const dref = code ? db.doc(`discounts/${code}`) : null;
  const dsnap = dref ? await tx.get(dref) : null;
  const products = {};
  for (const ps of psnaps) if (ps.exists) products[ps.id] = ps.data();
  const plan = planStockDecrement(products, order.items);
  const touched = new Set(plan.decremented.map((d) => d.productId));
  for (const pid of touched) tx.update(db.doc(`products/${pid}`), { variants: plan.variantsByProduct[pid], updatedAt: FieldValue.serverTimestamp() });
  if (dsnap?.exists) {
    const reserved = order.discountReservation?.state === "reserved";
    tx.update(dref, { usageCount: FieldValue.increment(1), ...(reserved ? { reservedCount: FieldValue.increment(-1) } : {}) });
  }
  const patch = { stockDecremented: plan.decremented, oversold: plan.oversold.length ? plan.oversold : null };
  if (order.discountReservation) patch.discountReservation = { ...order.discountReservation, state: "redeemed" };
  return { patch, oversold: plan.oversold };
}

/** Puts back the stock a paid order took (idempotent via restockedAt). */
async function restockOrder(orderId) {
  const ref = db.doc(`orders/${orderId}`);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const o = s.exists ? s.data() : null;
    if (!o || o.restockedAt) return false;
    // Orders paid before stockDecremented existed: fall back to the line items (subscription boxes never took stock).
    const taken = Array.isArray(o.stockDecremented) ? o.stockDecremented
      : o.paidAt && o.paymentMethod !== "subscription" ? (o.items || []).map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })) : [];
    if (!taken.length) return false;
    const ids = [...new Set(taken.map((t) => String(t.productId)))];
    const psnaps = await tx.getAll(...ids.map((id) => db.doc(`products/${id}`)));
    const products = {};
    for (const ps of psnaps) if (ps.exists) products[ps.id] = ps.data();
    const out = planRestock(products, taken);
    for (const [pid, variants] of Object.entries(out)) tx.update(db.doc(`products/${pid}`), { variants, updatedAt: FieldValue.serverTimestamp() });
    tx.update(ref, { restockedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

/** Fixed-window rate limit backed by rateLimits/{kind_hash}. Throws resource-exhausted when over. */
async function throttle(kind, key, limit, windowMs) {
  const ref = db.doc(`rateLimits/${kind}_${sha(key).slice(0, 32)}`);
  const allowed = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const r = rateWindow(s.exists ? s.data() : null, Date.now(), limit, windowMs);
    // expireAt lets a Firestore TTL policy on rateLimits.expireAt clean these up (docs/APP_CHECK.md).
    tx.set(ref, { ...r.state, kind, expireAt: new Date(r.state.windowStart + windowMs) });
    return r.allowed;
  });
  if (!allowed) throw new HttpsError("resource-exhausted", "Too many requests. Please try again in a little while.");
}

/** Idempotently marks an order paid, decrements stock, counts discount usage, sends emails. */
async function markOrderPaid(orderId, payment) {
  const ref = db.doc(`orders/${orderId}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snap.data();
    if (order.paymentStatus === "paid") return { already: true, order: { id: snap.id, ...order } };
    const inventory = await applyPaidInventory(tx, order); // stock re-check/decrement + discount use, same transaction
    tx.update(ref, { paymentStatus: "paid", status: "paid", paidAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), payment: payment || {}, ...inventory.patch });
    return { already: false, oversold: inventory.oversold, order: { id: snap.id, ...order, ...inventory.patch, paymentStatus: "paid", status: "paid" } };
  });
  if (result.already) return result.order;

  if (result.oversold?.length) await sendOwnerOversold(result.order, result.oversold).catch((e) => console.error("oversold email failed", e.message));
  await Promise.all([sendOrderConfirmation(result.order), sendOwnerNewOrder(result.order)]).catch((e) => console.error("email failed", e.message));
  await marketing.onOrderPaid(result.order).catch((e) => console.error("marketing contact failed", e.message));
  return result.order;
}

function assertOrigin(origin) {
  if (!origin) return SITE_URL;
  const o = String(origin).replace(/\/$/, "");
  if (!ALLOWED_ORIGINS.includes(o)) throw new HttpsError("permission-denied", "Unknown origin.");
  return o;
}
function isProductionOrigin(origin) { try { return PRODUCTION_HOSTS.includes(new URL(origin).hostname); } catch { return false; } }
function requireAuth(request) { if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in or continue as guest."); return request.auth.uid; }
function requireAdmin(request) { if (!request.auth?.token?.admin) throw new HttpsError("permission-denied", "Admins only."); return request.auth.uid; }

/* ------------------------------- quoting --------------------------------- */
exports.quoteCart = onCall(PUBLIC_CALL, async (request) => {
  const settings = await getSettings();
  const pricing = await priceCart(request.data || {}, settings, request.auth?.uid);
  return { ...pricing, settings: { freeShippingThreshold: settings.freeShippingThreshold, flatShipping: settings.flatShipping, expressShipping: settings.expressShipping, giftWrapFee: settings.giftWrapFee } };
});

/* -------------------------------- Stripe --------------------------------- */
const getStripe = () => { const k = process.env.STRIPE_SECRET_KEY; if (!k) throw new HttpsError("failed-precondition", "Card payments are not configured."); return new Stripe(k); };

exports.createStripeCheckout = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const origin = assertOrigin(data.origin);
  const settings = await getSettings();
  if (isProductionOrigin(origin) && !settings.cardPaymentsEnabled) throw new HttpsError("failed-precondition", "Card payments are not enabled yet. Please use PayPal.");
  const shippingAddress = cleanAddress(data.shippingAddress);
  const pricing = await priceCart({ ...data, shippingAddress }, settings, uid);
  const order = await createPendingOrder({ uid, email: data.email, pricing, shippingAddress, gift: data.gift, paymentMethod: "stripe", origin });
  const stripe = getStripe();

  const line_items = pricing.lines.map((l) => ({
    quantity: l.quantity,
    price_data: { currency: "usd", unit_amount: cents(l.unitPrice), product_data: { name: `${l.name} — ${l.variantLabel}`, images: l.image ? [SITE_URL + l.image] : [] } },
  }));
  if (pricing.giftWrap) line_items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(pricing.giftWrap), product_data: { name: "Gift box & card" } } });
  if (pricing.shipping.amount) line_items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(pricing.shipping.amount), product_data: { name: pricing.shipping.method === "express" ? "UPS 2nd Day Air" : "Standard shipping" } } });
  if (pricing.tax) line_items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(pricing.tax), product_data: { name: `Sales tax (${shippingAddress.state})` } } });

  const sessionParams = {
    mode: "payment", line_items, customer_email: order.email || undefined,
    success_url: `${origin}/order-confirmation?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
    metadata: { orderId: order.id, orderNumber: order.number },
    payment_intent_data: { description: `Kind Flames order ${order.number}`, metadata: { orderId: order.id } },
  };
  if (pricing.discountTotal > 0) {
    const coupon = await stripe.coupons.create({ amount_off: cents(pricing.discountTotal), currency: "usd", duration: "once", name: pricing.discount.code ? `${pricing.discount.code}${pricing.bundleDiscount ? " + bundle" : ""}` : "Bundle discount" });
    sessionParams.discounts = [{ coupon: coupon.id }];
  }
  const session = await stripe.checkout.sessions.create(sessionParams);
  await db.doc(`orders/${order.id}`).update({ stripeSessionId: session.id });
  return { orderId: order.id, orderNumber: order.number, url: session.url };
});

exports.verifyStripePayment = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const { sessionId, orderId } = request.data || {};
  if (!sessionId || !orderId) throw new HttpsError("invalid-argument", "Missing session.");
  const snap = await db.doc(`orders/${orderId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  if (snap.data().userId !== uid && !request.auth.token.admin) throw new HttpsError("permission-denied", "Not your order.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(String(sessionId));
  if (session.metadata?.orderId !== orderId) throw new HttpsError("permission-denied", "Session does not match order.");
  if (session.payment_status !== "paid") return { paid: false, status: session.payment_status };
  const order = await markOrderPaid(orderId, { provider: "stripe", sessionId: session.id, paymentIntentId: session.payment_intent, payerEmail: session.customer_details?.email || null });
  return { paid: true, order: publicOrder(order) };
});

if (ENABLE_STRIPE_WEBHOOK) {
  exports.stripeWebhook = onRequest({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", ...MAIL_SECRETS] }, async (req, res) => {
    const stripe = getStripe();
    let event;
    try { event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
    catch (e) { console.error("webhook signature failed", e.message); return res.status(400).send("bad signature"); }
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      if (s.payment_status === "paid" && s.metadata?.orderId) await markOrderPaid(s.metadata.orderId, { provider: "stripe", sessionId: s.id, paymentIntentId: s.payment_intent, payerEmail: s.customer_details?.email || null });
    }
    res.json({ received: true });
  });
}

/* -------------------------------- PayPal --------------------------------- */
function getPayPalClient(origin) {
  const mode = (process.env.PAYPAL_MODE || "").trim() || PAYPAL_MODE_DEFAULT;
  const wantLive = mode === "live" && isProductionOrigin(origin);
  const clientId = (wantLive ? process.env.PAYPAL_CLIENT_ID_LIVE : process.env.PAYPAL_CLIENT_ID || "").trim();
  const clientSecret = (wantLive ? process.env.PAYPAL_CLIENT_SECRET_LIVE : process.env.PAYPAL_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) throw new HttpsError("failed-precondition", `PayPal ${wantLive ? "live" : "sandbox"} credentials are not configured.`);
  return new Client({ clientCredentialsAuthCredentials: { oAuthClientId: clientId, oAuthClientSecret: clientSecret }, environment: wantLive ? Environment.Production : Environment.Sandbox });
}

exports.createPayPalOrder = onCall({ cors: true, secrets: PAYPAL_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const origin = assertOrigin(data.origin);
  const settings = await getSettings();
  if (!settings.paypalEnabled) throw new HttpsError("failed-precondition", "PayPal is not enabled.");
  const shippingAddress = cleanAddress(data.shippingAddress);
  const pricing = await priceCart({ ...data, shippingAddress }, settings, uid);
  const order = await createPendingOrder({ uid, email: data.email, pricing, shippingAddress, gift: data.gift, paymentMethod: "paypal", origin });

  const usd = (v) => ({ currencyCode: "USD", value: Number(v).toFixed(2) });
  const items = pricing.lines.map((l) => ({ name: `${l.name} — ${l.variantLabel}`.slice(0, 127), quantity: String(l.quantity), unitAmount: usd(l.unitPrice), category: "PHYSICAL_GOODS" }));
  if (pricing.giftWrap) items.push({ name: "Gift box & card", quantity: "1", unitAmount: usd(pricing.giftWrap), category: "PHYSICAL_GOODS" });
  const itemTotal = round2(pricing.subtotal + pricing.giftWrap);
  const client = getPayPalClient(origin);
  const { result } = await new OrdersController(client).createOrder({
    body: {
      intent: "CAPTURE",
      purchaseUnits: [{
        customId: order.id, invoiceId: order.number, description: `Kind Flames order ${order.number}`,
        amount: { currencyCode: "USD", value: pricing.total.toFixed(2), breakdown: { itemTotal: usd(itemTotal), shipping: usd(pricing.shipping.amount), taxTotal: usd(pricing.tax), discount: usd(pricing.discountTotal) } },
        items,
        shipping: { name: { fullName: shippingAddress.fullName }, address: { addressLine1: shippingAddress.address, addressLine2: shippingAddress.address2 || undefined, adminArea2: shippingAddress.city, adminArea1: shippingAddress.state, postalCode: shippingAddress.zipCode, countryCode: "US" } },
      }],
      applicationContext: { shippingPreference: "SET_PROVIDED_ADDRESS", brandName: "Kind Flames", userAction: "PAY_NOW" },
    },
    prefer: "return=representation",
  });
  await db.doc(`orders/${order.id}`).update({ paypalOrderId: result.id });
  return { orderId: order.id, orderNumber: order.number, paypalOrderId: result.id };
});

exports.capturePayPalOrder = onCall({ cors: true, secrets: PAYPAL_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const { paypalOrderId, orderId } = request.data || {};
  if (!paypalOrderId || !orderId) throw new HttpsError("invalid-argument", "Missing order.");
  const snap = await db.doc(`orders/${orderId}`).get();
  if (!snap.exists || snap.data().userId !== uid) throw new HttpsError("permission-denied", "Not your order.");
  if (snap.data().paypalOrderId !== paypalOrderId) throw new HttpsError("permission-denied", "PayPal order does not match.");
  const client = getPayPalClient(snap.data().origin);
  const { result } = await new OrdersController(client).captureOrder({ id: paypalOrderId, prefer: "return=representation" });
  if (result.status !== "COMPLETED") return { paid: false, status: result.status };
  const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];
  const order = await markOrderPaid(orderId, { provider: "paypal", paypalOrderId, captureId: capture?.id || null, payerEmail: result.payer?.emailAddress || null });
  return { paid: true, order: publicOrder(order) };
});

/* --------------------------------- admin --------------------------------- */
/**
 * Grants or revokes the admin claim from ADMIN_EMAILS. The email only counts when Firebase has verified it and the
 * sign-in was Google or email/password (not anonymous, phone, or a custom token carrying an unverified email).
 */
exports.ensureAdmin = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const token = request.auth.token;
  const email = (token.email || "").toLowerCase();
  const provider = token.firebase?.sign_in_provider || "";
  const trusted = token.email_verified === true && (provider === "google.com" || provider === "password");
  const listed = !!email && ADMIN_EMAILS.includes(email);
  const should = trusted && listed;
  const has = token.admin === true;
  const auth = getAuth();
  if (should && !has) {
    const user = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: true });
    await db.doc(`users/${uid}`).set({ role: "admin", email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  // Revoke when the address is no longer listed (or no longer verified). Skip when ADMIN_EMAILS is empty: that is a
  // missing .env, and wiping every admin because of it would lock the owner out.
  let revoked = false;
  if (!should && has && ADMIN_EMAILS.length) {
    const user = await auth.getUser(uid);
    const { admin: _drop, ...rest } = user.customClaims || {};
    await auth.setCustomUserClaims(uid, rest);
    await auth.revokeRefreshTokens(uid); // old ID tokens still carry admin until they expire (<1h); stop refreshes now
    await db.doc(`users/${uid}`).set({ role: "customer", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.warn("admin claim revoked", uid, listed ? "email not verified / untrusted provider" : "email not in ADMIN_EMAILS");
    revoked = true;
  }
  if (listed && !trusted && !has) console.warn("admin email signed in without verification", uid, provider);
  return { admin: should || (has && !revoked), refreshed: (should && !has) || revoked, needsVerification: listed && !trusted };
});

exports.updateOrderStatus = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  const { orderId, status, tracking, internalNotes } = request.data || {};
  const allowed = ["pending", "paid", "fulfilled", "shipped", "delivered", "cancelled", "refunded"];
  if (!orderId || !allowed.includes(status)) throw new HttpsError("invalid-argument", "Bad status.");
  const ref = db.doc(`orders/${orderId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const cur = snap.data();
  // Money moved: the status has to match it. "refunded" only comes from refundOrder, and a paid order can only be
  // cancelled once the money is back.
  if (status === "refunded" && cur.paymentStatus !== "refunded") throw new HttpsError("failed-precondition", "Use Refund to refund an order; it returns the money and sets the status.");
  if (status === "cancelled" && cur.paymentStatus === "paid") throw new HttpsError("failed-precondition", "This order is paid. Refund it in full before cancelling.");
  const update = { status, updatedAt: FieldValue.serverTimestamp() };
  if (status === "shipped" && !snap.data().shippedAt) update.shippedAt = FieldValue.serverTimestamp();
  if (tracking) update.tracking = { carrier: String(tracking.carrier || "").slice(0, 40), number: String(tracking.number || "").slice(0, 60), url: trackingUrl(tracking) };
  if (typeof internalNotes === "string") update.internalNotes = internalNotes.slice(0, 2000);
  await ref.update(update);
  if (status === "cancelled") {
    await releaseReservation(orderId).catch((e) => console.error("release reservation failed", orderId, e.message));
    if (cur.paymentStatus === "refunded") await restockOrder(orderId).catch((e) => console.error("restock failed", orderId, e.message));
  }
  const order = { id: snap.id, ...cur, ...update };
  if (status === "shipped") await sendShipped(order).catch((e) => console.error(e.message));
  if (status === "delivered") await sendReviewRequest(order).catch((e) => console.error(e.message));
  return { ok: true };
});

/**
 * Full or partial refund. data: { orderId, amount? (dollars; default = everything not yet refunded), reason?, restock? }
 * restock defaults to true for the final (full) refund and false for partial ones. Emails the customer.
 */
exports.refundOrder = onCall({ cors: true, secrets: [...new Set([...STRIPE_SECRETS, ...PAYPAL_SECRETS])] }, async (request) => {
  requireAdmin(request);
  const { orderId, amount, reason, restock } = request.data || {};
  if (!orderId || typeof orderId !== "string") throw new HttpsError("invalid-argument", "orderId required.");
  const note = oneLine(reason, 300);
  const ref = db.doc(`orders/${orderId}`);
  // Claim the amount first so two clicks (or two admins) can't refund the same money twice.
  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snap.data();
    if (order.paymentStatus !== "paid") throw new HttpsError("failed-precondition", "Order is not paid.");
    if (order.refundInFlight) throw new HttpsError("aborted", "A refund on this order is already in progress.");
    const plan = planRefund(order, amount);
    if (plan.error) throw new HttpsError("invalid-argument", plan.error);
    tx.update(ref, { refundInFlight: { amount: plan.amount, at: FieldValue.serverTimestamp() } });
    return { order: { id: snap.id, ...order }, plan };
  });
  const { order, plan } = claim;
  let providerRefundId = null;
  try {
    if (order.payment?.provider === "stripe" && order.payment.paymentIntentId) {
      const r = await getStripe().refunds.create({ payment_intent: order.payment.paymentIntentId, amount: cents(plan.amount), reason: "requested_by_customer", metadata: { orderId, orderNumber: order.number || "", note } });
      providerRefundId = r.id;
    } else if (order.payment?.provider === "paypal" && order.payment.captureId) {
      const { result } = await new PaymentsController(getPayPalClient(order.origin)).refundCapturedPayment({
        captureId: order.payment.captureId, prefer: "return=representation",
        body: { amount: { currencyCode: "USD", value: plan.amount.toFixed(2) }, invoiceId: `${order.number || orderId}-R${(order.refunds || []).length + 1}`, noteToPayer: note || undefined },
      });
      providerRefundId = result?.id || null;
    } else {
      throw new HttpsError("failed-precondition", "No refundable payment on this order.");
    }
  } catch (e) {
    await ref.update({ refundInFlight: FieldValue.delete() }).catch(() => {});
    if (e instanceof HttpsError) throw e;
    console.error("refund failed", orderId, e.message);
    throw new HttpsError("internal", "The payment provider rejected the refund. Check the PayPal/Stripe dashboard, then try again.");
  }
  const refundedTotal = round2((Number(order.refundedTotal) || 0) + plan.amount);
  const entry = { amount: plan.amount, reason: note, provider: order.payment.provider, providerRefundId, at: new Date(), by: request.auth.uid };
  const update = { refundInFlight: FieldValue.delete(), refundedTotal, refunds: FieldValue.arrayUnion(entry), updatedAt: FieldValue.serverTimestamp() };
  if (plan.full) Object.assign(update, { status: "refunded", paymentStatus: "refunded", refundedAt: FieldValue.serverTimestamp() });
  await ref.update(update);
  const doRestock = typeof restock === "boolean" ? restock : plan.full;
  let restocked = false;
  if (doRestock) restocked = await restockOrder(orderId).catch((e) => { console.error("restock failed", orderId, e.message); return false; });
  if (plan.full) await releaseReservation(orderId).catch(() => {});
  const mail = await sendRefundEmail({ ...order, refundedTotal }, plan.amount, note, plan.full).catch((e) => { console.error("refund email failed", e.message); return { ok: false }; });
  return { ok: true, amount: plan.amount, refundedTotal, full: plan.full, restocked, emailed: !!mail?.ok };
});

/* ---------------------------- reviews aggregate --------------------------- */
/**
 * Keeps product rating/reviewCount in sync (paging through every approved review) and stamps each review with a
 * server-computed `verified` flag (the reviewer has a paid order containing that product) and a clamped rating.
 * Its own write-back re-triggers this function once; that run finds nothing to change and stops.
 */
exports.onReviewWritten = onDocumentWritten("reviews/{reviewId}", async (event) => {
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  const before = event.data?.before?.exists ? event.data.before.data() : null;

  if (after) {
    const patch = {};
    const r = clampRating(after.rating);
    if (r !== null && r !== after.rating) patch.rating = r;
    if (r === null) { patch.rating = 1; patch.approved = false; }
    const identityChanged = !before || before.userId !== after.userId || before.productId !== after.productId;
    if (identityChanged || typeof after.verified !== "boolean") {
      const verified = await reviewerBoughtProduct(after.userId, after.productId).catch((e) => { console.error("verify review failed", e.message); return false; });
      if (verified !== after.verified) patch.verified = verified;
    }
    // Written before the aggregate below reads it back. The re-trigger this causes sees no rating/approval change
    // and stops without doing anything.
    if (Object.keys(patch).length) await event.data.after.ref.update(patch);
  }

  const productIds = [...new Set([after?.productId, before?.productId].filter(Boolean))];
  const aggregateChanged = !before || !after || before.approved !== after.approved || before.rating !== after.rating || before.productId !== after.productId;
  if (!aggregateChanged) return;
  for (const productId of productIds) {
    let sum = 0, count = 0;
    await forEachPage(db.collection("reviews").where("productId", "==", productId).where("approved", "==", true).select("rating"), (docs) => {
      for (const d of docs) { const r = clampRating(d.data().rating); if (r) { sum += r; count++; } }
    }, { pageSize: 500, orderById: true });
    const rating = count ? round2(sum / count) : null;
    await db.doc(`products/${productId}`).set({ rating, reviewCount: count }, { merge: true }).catch(() => {});
  }
});

/** Paid order containing productId, by the reviewer's uid or (for guests who later made an account) verified email. */
async function reviewerBoughtProduct(uid, productId) {
  if (!uid || !productId) return false;
  const check = async (q) => {
    let found = false;
    await forEachPage(q.select("status", "items"), (docs) => { // single equality filter: no composite index needed
      found = ordersContainProduct(docs.map((d) => d.data()), productId);
      return !found;
    }, { pageSize: 100, orderById: true });
    return found;
  };
  if (await check(db.collection("orders").where("userId", "==", uid))) return true;
  const user = await getAuth().getUser(uid).catch(() => null);
  const email = user?.emailVerified ? normalizeEmail(user.email) : "";
  if (!email) return false;
  return (await check(db.collection("orders").where("emailNormalized", "==", email))) || check(db.collection("orders").where("email", "==", String(user.email).toLowerCase()));
}

/* ------------------------------- corporate -------------------------------- */
// Admin-only: remove an order that was never paid (abandoned checkout, test order). Paid orders must be refunded, not deleted.
exports.deleteOrder = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const { orderId } = request.data || {};
  if (!orderId || typeof orderId !== "string") throw new HttpsError("invalid-argument", "orderId required.");
  const ref = db.doc(`orders/${orderId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const o = snap.data();
  if (o.paymentStatus === "paid" || ["paid", "fulfilled", "shipped", "delivered"].includes(o.status)) {
    throw new HttpsError("failed-precondition", "Paid orders can't be deleted. Refund or cancel instead.");
  }
  await releaseReservation(orderId).catch((e) => console.error("release reservation failed", orderId, e.message));
  await ref.delete();
  return { ok: true };
});

exports.submitQuote = onCall({ ...PUBLIC_CALL, secrets: MAIL_SECRETS }, async (request) => {
  const d = request.data || {};
  const s = (v, n = 200) => String(v || "").trim().slice(0, n);
  const email = cleanEmail(d.email);
  const quote = {
    name: s(d.name), company: s(d.company), email, phone: s(d.phone, 40), quantity: Math.min(100000, Math.max(1, parseInt(d.quantity, 10) || 25)),
    budget: s(d.budget, 40), neededBy: s(d.neededBy, 40), product: s(d.product), customization: Array.isArray(d.customization) ? d.customization.map((c) => s(c, 40)).slice(0, 10) : [],
    shippingMode: s(d.shippingMode, 40), notes: s(d.notes, 2000), status: "new", userId: request.auth?.uid || null,
    recipients: Array.isArray(d.recipients) ? d.recipients.slice(0, 500).map((r) => ({ name: s(r?.name, 80), address: s(r?.address, 120), address2: s(r?.address2, 60), city: s(r?.city, 60), state: s(r?.state, 2).toUpperCase(), zipCode: s(r?.zipCode, 12), email: s(r?.email, 120), note: s(r?.note, 140) })).filter((r) => r.name && r.address && r.city && r.state && r.zipCode) : [],
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  };
  if (!quote.name || !quote.company) throw new HttpsError("invalid-argument", "Name, company and email are required.");
  if (!email) throw new HttpsError("invalid-argument", "Please enter a valid email address.");
  // This sends mail to an address the caller chooses, so cap it per address and per network.
  await throttle("quote-ip", clientIp(request.rawRequest), 3, HOUR);
  await throttle("quote-email", email, 3, HOUR);
  const ref = await db.collection("quotes").add(quote);
  const e = esc;
  const ownerHtml = `<p><b>${e(quote.name)}</b> at <b>${e(quote.company)}</b> (${e(quote.email)}${quote.phone ? ", " + e(quote.phone) : ""}) requested a quote.</p><ul><li>Quantity: ${quote.quantity}</li><li>Product: ${e(quote.product)}</li><li>Budget/unit: ${e(quote.budget)}</li><li>Needed by: ${e(quote.neededBy)}</li><li>Customization: ${e(quote.customization.join(", ") || "none")}</li><li>Shipping: ${e(quote.shippingMode)}${quote.recipients.length ? ` · ${quote.recipients.length} recipient addresses attached` : ""}</li></ul><p>${e(quote.notes)}</p><p><a href="${SITE_URL}/admin/quotes">Open in admin</a></p>`;
  const mail = await Promise.all([
    sendMail({ to: OWNER_EMAIL, subject: oneLine(`New corporate quote: ${quote.company} (${quote.quantity} units)`), html: ownerHtml }),
    sendMail({ to: quote.email, subject: "We got your Kind Flames corporate gifting request", html: wrapEmail(`<h2>Thanks, ${e(quote.name)}.</h2><p>We received your request for <b>${quote.quantity}</b> units for ${e(quote.company)}. You'll hear from us within one business day with pricing and a mock-up.</p><p>In the meantime, our tiers: 25–49 units 10% off · 50–99 15% off · 100+ 20% off and free design.</p>`) }),
  ]).catch((err) => { console.error("quote mail failed", err.message); return [{ ok: false, reason: err.message }]; });
  await ref.update({ mailStatus: mail }).catch(() => {}); // provider detail stays server-side (admin-only doc)
  return { ok: true, id: ref.id, mailed: mail.every((m) => m?.ok) };
});

/* ------------------------------- newsletter -------------------------------- */
const NEWSLETTER_SOURCES = ["popup", "footer", "home", "checkout", "other"];
/** The only way onto the list: validates, throttles, then creates newsletter/{email} (which starts the welcome series). */
exports.subscribeNewsletter = onCall(PUBLIC_CALL, async (request) => {
  const email = cleanEmail(request.data?.email);
  if (!email) throw new HttpsError("invalid-argument", "Please enter a valid email address.");
  const source = NEWSLETTER_SOURCES.includes(request.data?.source) ? request.data.source : "other";
  await throttle("news-ip", clientIp(request.rawRequest), 10, HOUR);
  await throttle("news-email", email, 3, 24 * HOUR);
  try {
    await db.doc(`newsletter/${email}`).create({ email, source, createdAt: FieldValue.serverTimestamp(), uid: request.auth?.uid || null });
  } catch (e) {
    if (e.code !== 6 /* ALREADY_EXISTS */) throw e; // already subscribed: same answer, no second welcome email
  }
  return { ok: true };
});

/* ------------------------------ back in stock ------------------------------ */
const stockKey = (productId, variantId) => `${productId}_${variantId}`.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 200);
/** "Notify me" on a sold-out variant: stores backInStock/{productId_variant}/requests/{hash(email)}. */
exports.requestBackInStock = onCall(PUBLIC_CALL, async (request) => {
  const { productId, variantId } = request.data || {};
  const email = cleanEmail(request.data?.email);
  if (!email) throw new HttpsError("invalid-argument", "Please enter a valid email address.");
  if (!productId || !variantId || typeof productId !== "string" || typeof variantId !== "string") throw new HttpsError("invalid-argument", "Pick an option first.");
  await throttle("bis-ip", clientIp(request.rawRequest), 20, HOUR);
  await throttle("bis-email", email, 10, 24 * HOUR);
  const product = await getProduct(productId);
  const variant = product?.variants?.find((v) => v.id === variantId);
  if (!product || !variant) throw new HttpsError("not-found", "That product isn't available.");
  const key = stockKey(product.id, variant.id);
  const parent = db.doc(`backInStock/${key}`);
  await parent.set({ productId: product.id, variantId: variant.id, productName: product.name || product.id, variantLabel: variant.label || variant.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await parent.collection("requests").doc(sha(email).slice(0, 40)).set({ email, notified: false, uid: request.auth?.uid || null, createdAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

/** Emails everyone waiting on a variant when its stock goes from 0 to more than 0. */
exports.onProductStockChanged = onDocumentWritten({ document: "products/{productId}", secrets: MAIL_SECRETS }, async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  if (!before || !after || after.active === false) return;
  const restocked = variantsBackInStock(before, after);
  for (const variantId of restocked) {
    const variant = after.variants.find((v) => v.id === variantId);
    const key = stockKey(event.params.productId, variantId);
    let sent = 0;
    await forEachPage(db.collection(`backInStock/${key}/requests`).where("notified", "==", false), async (docs) => {
      for (const d of docs) {
        const { email } = d.data();
        if (email && !(await marketing.isUnsubscribed(email))) {
          await sendMail({ to: email, subject: oneLine(`${after.name || "Your pick"} is back in stock`), html: wrapEmail(`<h2>It's back.</h2><p><b>${esc(after.name)}</b> (${esc(variant?.label || variantId)}) is in stock again. Small batches go quickly.</p><p><a href="${SITE_URL}/product/${encodeURIComponent(event.params.productId)}" style="color:#214238">Shop it now</a></p><p style="color:#6B7266;font-size:12px">You asked us to tell you when this restocked. This is a one-time email.</p>`) }).catch((e) => console.error("back-in-stock mail failed", e.message));
          sent++;
        }
        await d.ref.update({ notified: true, notifiedAt: FieldValue.serverTimestamp() });
      }
    }, { pageSize: 200, orderById: true });
    if (sent) console.log("back-in-stock emails", key, sent);
  }
});

/* ------------------------------ stock + reservations ------------------------------ */
/** Daily email to OWNER_EMAIL listing variants below settings.lowStockThreshold (default 5). */
exports.lowStockReport = onSchedule({ schedule: "every day 08:00", timeZone: "America/New_York", secrets: MAIL_SECRETS }, async () => {
  const settings = await getSettings();
  const threshold = Number(settings.lowStockThreshold) > 0 ? Number(settings.lowStockThreshold) : 5;
  const products = [];
  await forEachPage(db.collection("products"), (docs) => { for (const d of docs) products.push({ id: d.id, ...d.data() }); }, { orderById: true });
  const low = lowStockVariants(products, threshold);
  if (!low.length || !OWNER_EMAIL) return;
  const rows = low.map((l) => `<tr><td style="padding:4px 8px 4px 0">${esc(l.productName)}</td><td style="padding:4px 8px">${esc(l.label)}</td><td style="text-align:right;font-weight:700;color:${l.stock <= 0 ? "#B42318" : "#1E231D"}">${l.stock <= 0 ? "sold out" : l.stock}</td></tr>`).join("");
  await sendMail({ to: OWNER_EMAIL, subject: oneLine(`Low stock: ${low.length} item${low.length === 1 ? "" : "s"} below ${threshold}`), html: wrapEmail(`<h2>Low stock</h2><p>These variants are below ${threshold} units:</p><table style="border-collapse:collapse;font-size:14px">${rows}</table><p><a href="${SITE_URL}/admin/products">Update stock in admin</a></p><p style="color:#6B7266;font-size:12px">Change the threshold in Admin → Settings.</p>`) });
});

/** Hourly: gives back discount reservations held by checkouts that were never paid (Stripe sessions expire at 24h). */
exports.releaseExpiredReservations = onSchedule({ schedule: "every 60 minutes", timeZone: "America/New_York" }, async () => {
  const cutoff = Date.now() - 26 * HOUR;
  let released = 0;
  await forEachPage(db.collection("orders").where("discountReservation.state", "==", "reserved"), async (docs) => {
    for (const d of docs) {
      const o = d.data();
      const created = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
      if (o.paymentStatus === "paid" || created > cutoff) continue;
      if (await releaseReservation(d.id).catch((e) => { console.error("release failed", d.id, e.message); return false; })) released++;
    }
  }, { orderById: true });
  if (released) console.log("released expired discount reservations", released);
});

exports.createInvoice = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  requireAdmin(request);
  const { quoteId, lines, daysUntilDue = 30, memo } = request.data || {};
  const qsnap = await db.doc(`quotes/${quoteId}`).get();
  if (!qsnap.exists) throw new HttpsError("not-found", "Quote not found.");
  const q = qsnap.data();
  if (!Array.isArray(lines) || !lines.length) throw new HttpsError("invalid-argument", "Add at least one line.");
  const stripe = getStripe();
  const customer = await stripe.customers.create({ email: q.email, name: q.company, description: q.name, metadata: { quoteId } });
  for (const l of lines) {
    await stripe.invoiceItems.create({ customer: customer.id, currency: "usd", unit_amount: cents(Number(l.unitPrice)), quantity: Math.max(1, parseInt(l.quantity, 10) || 1), description: String(l.description || "Custom order").slice(0, 200) });
  }
  const invoice = await stripe.invoices.create({ customer: customer.id, collection_method: "send_invoice", days_until_due: Math.max(1, parseInt(daysUntilDue, 10) || 30), description: memo ? String(memo).slice(0, 500) : `Kind Flames corporate order for ${q.company}`, metadata: { quoteId } });
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(finalized.id);
  await qsnap.ref.update({ status: "invoiced", stripeInvoiceId: finalized.id, invoiceUrl: finalized.hosted_invoice_url, invoiceTotal: finalized.total / 100, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true, url: finalized.hosted_invoice_url, total: finalized.total / 100 };
});


/* ----------------------------- subscriptions ------------------------------ */
const PLANS = {
  monthly: { id: "monthly", name: "Candle of the Month", amount: 2400, interval: "month", intervalCount: 1, description: "One 8 oz candle in a new scent every month, free shipping." },
  quarterly: { id: "quarterly", name: "Seasonal Spa Box", amount: 6900, interval: "month", intervalCount: 3, description: "A candle, a bath soak and a lotion every season, free shipping." },
};
exports.listPlans = onCall({ cors: true }, async () => ({ plans: Object.values(PLANS) }));

exports.createSubscriptionCheckout = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const origin = assertOrigin(data.origin);
  const plan = PLANS[data.plan];
  if (!plan) throw new HttpsError("invalid-argument", "Unknown plan.");
  const settings = await getSettings();
  if (isProductionOrigin(origin) && !settings.cardPaymentsEnabled) throw new HttpsError("failed-precondition", "Subscriptions open once card payments are enabled.");
  const shippingAddress = cleanAddress(data.shippingAddress);
  const email = String(data.email || request.auth.token.email || "").toLowerCase().slice(0, 200);
  if (!email) throw new HttpsError("invalid-argument", "Email is required.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: plan.amount, recurring: { interval: plan.interval, interval_count: plan.intervalCount }, product_data: { name: plan.name, description: plan.description } } }],
    success_url: `${origin}/subscribe/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscribe?cancelled=1`,
    metadata: { uid, plan: plan.id, shippingAddress: JSON.stringify(shippingAddress), preference: String(data.preference || "").slice(0, 60) },
    subscription_data: { metadata: { uid, plan: plan.id } },
  });
  return { url: session.url };
});

async function upsertSubscriptionDoc(sub, extra = {}) {
  const ref = db.doc(`subscriptions/${sub.id}`);
  const existing = await ref.get();
  const doc = {
    stripeSubscriptionId: sub.id, stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    status: sub.status, plan: sub.metadata?.plan || existing.data()?.plan || "monthly", userId: sub.metadata?.uid || existing.data()?.userId || null,
    currentPeriodStart: sub.current_period_start || sub.items?.data?.[0]?.current_period_start || null,
    currentPeriodEnd: sub.current_period_end || sub.items?.data?.[0]?.current_period_end || null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end, amount: sub.items?.data?.[0]?.price?.unit_amount ? sub.items.data[0].price.unit_amount / 100 : null,
    updatedAt: FieldValue.serverTimestamp(), ...extra,
  };
  if (!existing.exists) doc.createdAt = FieldValue.serverTimestamp();
  await ref.set(doc, { merge: true });
  return { id: sub.id, ...(existing.exists ? existing.data() : {}), ...doc };
}

exports.verifySubscription = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const { sessionId } = request.data || {};
  if (!sessionId) throw new HttpsError("invalid-argument", "Missing session.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(String(sessionId), { expand: ["subscription"] });
  if (session.metadata?.uid !== uid && !request.auth.token.admin) throw new HttpsError("permission-denied", "Not your subscription.");
  if (session.status !== "complete" || !session.subscription) return { active: false, status: session.status };
  const sub = session.subscription;
  const already = (await db.doc(`subscriptions/${sub.id}`).get()).exists;
  const doc = await upsertSubscriptionDoc(sub, { email: session.customer_details?.email || session.customer_email || null, shippingAddress: JSON.parse(session.metadata.shippingAddress || "{}"), preference: session.metadata.preference || "", userId: uid });
  if (!already) {
    const plan = PLANS[doc.plan] || PLANS.monthly;
    await Promise.all([
      sendMail({ to: doc.email, subject: `Welcome to ${plan.name}`, html: wrapEmail(`<h2>You're in.</h2><p>Your <b>${plan.name}</b> subscription is active. First box ships within 5 business days; after that, on each renewal.</p><p>Manage, pause or cancel any time from <a href="${SITE_URL}/account">your account</a>.</p>`) }),
      sendMail({ to: OWNER_EMAIL, subject: `New subscriber: ${plan.name}`, html: wrapEmail(`<p>${esc(doc.email)} subscribed to ${plan.name}. Preference: ${esc(doc.preference || "none")}.</p><p><a href="${SITE_URL}/admin/subscriptions">Open in admin</a></p>`) }),
    ]).catch((e) => console.error(e.message));
  }
  return { active: ["active", "trialing"].includes(sub.status), subscription: publicSub(doc) };
});

exports.createPortalSession = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const origin = assertOrigin(request.data?.origin);
  const snap = await db.collection("subscriptions").where("userId", "==", uid).limit(1).get();
  if (snap.empty) throw new HttpsError("not-found", "No subscription found.");
  const stripe = getStripe();
  let configuration;
  const configs = await stripe.billingPortal.configurations.list({ limit: 1, active: true });
  if (configs.data.length) configuration = configs.data[0].id;
  else {
    const c = await stripe.billingPortal.configurations.create({ business_profile: { headline: "Kind Flames subscriptions" }, features: { customer_update: { enabled: true, allowed_updates: ["email", "address", "shipping"] }, invoice_history: { enabled: true }, payment_method_update: { enabled: true }, subscription_cancel: { enabled: true, mode: "at_period_end" } } });
    configuration = c.id;
  }
  const portal = await stripe.billingPortal.sessions.create({ customer: snap.docs[0].data().stripeCustomerId, return_url: `${origin}/account`, configuration });
  return { url: portal.url };
});

exports.syncSubscriptions = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  requireAdmin(request);
  const stripe = getStripe();
  let n = 0;
  for await (const sub of stripe.subscriptions.list({ limit: 100, status: "all", expand: ["data.customer"] })) {
    await upsertSubscriptionDoc(sub, { email: sub.customer?.email || undefined });
    n++;
  }
  return { synced: n };
});

/** Creates one fulfilment order per active subscription for the current billing period (idempotent). */
exports.createSubscriptionShipments = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  const { picks } = request.data || {}; // { monthly: [{productId, variantId}], quarterly: [...] }
  const settings = await getSettings();
  const subs = await db.collection("subscriptions").where("status", "in", ["active", "trialing"]).get();
  let created = 0, skipped = 0;
  for (const d of subs.docs) {
    const sub = d.data();
    const periodKey = `${sub.stripeSubscriptionId}:${sub.currentPeriodStart || "na"}`;
    const dup = await db.collection("orders").where("subscriptionPeriodKey", "==", periodKey).limit(1).get();
    if (!dup.empty) { skipped++; continue; }
    const chosen = (picks?.[sub.plan] || []).filter((x) => x?.productId);
    if (!chosen.length) continue;
    const lines = [];
    for (const c of chosen) { const p = await getProduct(c.productId); if (!p) continue; const v = p.variants.find((x) => x.id === c.variantId) || p.variants[0]; lines.push({ productId: p.id, variantId: v.id, name: p.name, variantLabel: v.label, price: v.price, quantity: 1, image: p.images?.[0] || "", lineDiscount: v.price, bundle: null }); }
    if (!lines.length) continue;
    const plan = PLANS[sub.plan] || PLANS.monthly;
    const number = await nextOrderNumber();
    const ref = db.collection("orders").doc();
    const order = {
      number, userId: sub.userId, email: sub.email || "", customerName: sub.shippingAddress?.fullName || sub.email || "Subscriber",
      items: lines, subtotal: round2(lines.reduce((t, l) => t + l.price, 0)), bundleDiscount: 0, discount: { code: null, amount: 0 }, discountTotal: 0, giftWrap: 0,
      shipping: { method: "standard", amount: 0 }, tax: 0, taxRate: 0, total: plan.amount / 100, currency: "usd",
      shippingAddress: sub.shippingAddress || null, gift: { isGift: false, wrap: false, message: "" }, paymentMethod: "subscription", paymentStatus: "paid", status: "paid",
      subscriptionId: sub.stripeSubscriptionId, subscriptionPeriodKey: periodKey, origin: SITE_URL, tracking: null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp(),
    };
    await ref.set(order);
    created++;
    if (order.email) await sendMail({ to: order.email, subject: `Your ${plan.name} box is being packed`, html: wrapEmail(`<h2>This period's box</h2><p>${lines.map((l) => esc(l.name) + " (" + esc(l.variantLabel) + ")").join(", ")} is on its way to you within 5 business days. Order ${number}.</p>`) }).catch(() => {});
  }
  void settings;
  return { created, skipped };
});
function publicSub(s) { const { stripeCustomerId, ...rest } = s; return { ...rest, createdAt: null, updatedAt: null }; }

/* --------------------------- scheduled reminders -------------------------- */
exports.abandonedCartReminder = onSchedule({ schedule: "every day 15:00", timeZone: "America/New_York", secrets: MAIL_SECRETS }, async () => {
  const now = Date.now();
  const snap = await db.collection("orders").where("status", "==", "pending").orderBy("createdAt", "desc").limit(200).get();
  let sent = 0;
  for (const d of snap.docs) {
    const o = d.data();
    const age = now - (o.createdAt?.toMillis ? o.createdAt.toMillis() : now);
    if (o.reminderSent || !o.email || age < 3600e3 || age > 3 * 864e5) continue;
    if (await marketing.isUnsubscribed(o.email)) { await d.ref.update({ reminderSent: true }); continue; }
    await sendMail({ to: o.email, subject: "Your Kind Flames bag is waiting", html: wrapEmail(`<h2>Still thinking it over?</h2><p>You left ${o.items.map((i) => esc(i.name)).join(", ")} in your bag. It's saved for you.</p><p><a href="${SITE_URL}/checkout">Finish checking out</a> — free shipping over $60.</p>`) }).catch(() => {});
    await d.ref.update({ reminderSent: true });
    sent++;
  }
  console.log(`abandoned cart reminders sent: ${sent}`);
});

async function sendReviewRequest(order) {
  if (!order.email) return;
  const links = order.items.map((i) => `<li><a href="${SITE_URL}/product/${esc(i.productId)}#reviews">${esc(i.name)}</a></li>`).join("");
  return sendMail({ to: order.email, subject: "How was your Kind Flames order?", html: wrapEmail(`<h2>Delivered — how is it?</h2><p>A quick review helps other people pick a scent, and helps us a lot.</p><ul>${links}</ul>`) });
}

/* --------------------------------- email --------------------------------- */
/** Sends via Resend when enabled; otherwise queues in Firestore `mail/` (Trigger Email format). Returns a status summary. */
async function sendMail({ to, subject, html, text, headers }) {
  if (!to) return { ok: false, via: "none", reason: "no recipient" };
  if (ENABLE_RESEND) {
    if (!process.env.RESEND_API_KEY) { console.error("ENABLE_RESEND is true but RESEND_API_KEY is not bound"); return { ok: false, via: "resend", reason: "secret not bound" }; }
    try {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM_EMAIL, to: [to], reply_to: ENV.REPLY_TO || "hello@kindflames.com", subject, html, text, headers: headers || undefined }) });
      const body = await r.text();
      if (!r.ok) { console.error("resend error", r.status, body); return { ok: false, via: "resend", status: r.status, reason: body.slice(0, 300) }; }
      return { ok: true, via: "resend", id: (() => { try { return JSON.parse(body).id; } catch { return null; } })() };
    } catch (e) { console.error("resend fetch failed", e.message); return { ok: false, via: "resend", reason: e.message }; }
  }
  await db.collection("mail").add({ to, from: FROM_EMAIL, message: { subject, html, text: text || "" }, createdAt: FieldValue.serverTimestamp() });
  return { ok: true, via: "queue" };
}
const esc = integrity.esc;
function wrapEmail(body) {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1E231D"><div style="background:#214238;color:#EAF2EC;padding:18px 24px;font-size:20px;font-weight:700">Kind Flames</div><div style="padding:24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5">${body}</div><div style="padding:16px 24px;font-size:12px;color:#6B7266;font-family:Helvetica,Arial,sans-serif">Shamyra Naturals LLC, d/b/a Kind Flames · hello@kindflames.com · (732) 666-8013</div></div>`;
}
function orderTable(order) {
  const rows = order.items.map((i) => `<tr><td style="padding:6px 0">${esc(i.name)} <span style="color:#6B7266">${esc(i.variantLabel)} × ${i.quantity}</span></td><td style="text-align:right">${fmt(i.price * i.quantity - (i.lineDiscount || 0))}</td></tr>`).join("");
  const line = (l, v) => `<tr><td style="padding:4px 0;color:#6B7266">${l}</td><td style="text-align:right">${v}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:14px">${rows}<tr><td colspan="2" style="border-top:1px solid #ddd"></td></tr>${line("Subtotal", fmt(order.subtotal))}${order.discountTotal ? line("Discount", "−" + fmt(order.discountTotal)) : ""}${order.giftWrap ? line("Gift box", fmt(order.giftWrap)) : ""}${line("Shipping", order.shipping.amount ? fmt(order.shipping.amount) : "Free")}${line("Tax", fmt(order.tax))}<tr><td style="padding-top:6px;font-weight:700">Total</td><td style="text-align:right;font-weight:700">${fmt(order.total)}</td></tr></table>`;
}
function addressBlock(a) { return `${esc(a.fullName)}<br>${esc(a.address)}${a.address2 ? "<br>" + esc(a.address2) : ""}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.zipCode)}`; }
async function sendOrderConfirmation(order) {
  if (!order.email) return;
  return sendMail({ to: order.email, subject: `Order ${order.number} confirmed — Kind Flames`, html: wrapEmail(`<h2>Thanks, ${esc(order.customerName.split(" ")[0])}. Your order is in.</h2><p>Order <b>${order.number}</b> is paid. We pack in 1–2 business days and will email you a tracking link when it ships.</p>${orderTable(order)}<p style="margin-top:16px"><b>Ships to</b><br>${addressBlock(order.shippingAddress)}</p>${order.gift?.isGift ? `<p><b>Gift message:</b> ${esc(order.gift.message)}</p>` : ""}<p><a href="${SITE_URL}/account">View your order</a></p>`) });
}
async function sendOwnerNewOrder(order) {
  return sendMail({ to: OWNER_EMAIL, subject: `New order ${order.number} — ${fmt(order.total)} (${order.paymentMethod})`, html: wrapEmail(`<h2>New order ${order.number}</h2><p>${esc(order.customerName)} · ${esc(order.email)}</p>${orderTable(order)}<p><b>Ship to</b><br>${addressBlock(order.shippingAddress)}</p><p><a href="${SITE_URL}/admin/orders">Open in admin</a></p>`) });
}
async function sendShipped(order) {
  if (!order.email) return;
  const t = order.tracking || {};
  return sendMail({ to: order.email, subject: `Order ${order.number} is on its way`, html: wrapEmail(`<h2>Shipped.</h2><p>Your Kind Flames order <b>${order.number}</b> left us today${t.carrier ? ` via ${esc(t.carrier)}` : ""}.</p>${t.number ? `<p>Tracking: <a href="${t.url || "#"}">${esc(t.number)}</a></p>` : ""}<p>Candle tip: trim the wick to ¼″ and let the first burn reach the edge of the jar.</p>`) });
}
async function sendRefundEmail(order, amount, reason, full) {
  if (!order.email) return { ok: false, reason: "no email" };
  const via = order.payment?.provider === "paypal" ? "your PayPal account" : "your card";
  return sendMail({ to: order.email, subject: oneLine(`Refund for order ${order.number}${full ? "" : " (partial)"} — Kind Flames`), html: wrapEmail(`<h2>Your refund is on its way.</h2><p>We've refunded <b>${fmt(amount)}</b> on order <b>${esc(order.number)}</b> to ${via}${full ? "" : `; ${fmt(order.refundedTotal)} of ${fmt(order.total)} refunded so far`}.</p>${reason ? `<p><b>Note:</b> ${esc(reason)}</p>` : ""}<p>Depending on your bank it can take 5–10 business days to show up.</p><p>Questions? Just reply to this email.</p>`) });
}
async function sendOwnerOversold(order, oversold) {
  const rows = oversold.map((o) => `<li>${esc(o.name)} (${esc(o.variantId)}): ordered ${o.ordered}, only ${o.available} in stock</li>`).join("");
  return sendMail({ to: OWNER_EMAIL, subject: oneLine(`Oversold: order ${order.number} needs attention`), html: wrapEmail(`<h2>Order ${esc(order.number)} was paid for more than you had.</h2><p>Two checkouts raced for the last units, or stock was edited while the customer paid.</p><ul>${rows}</ul><p>Stock is now 0 for these. Restock and ship, or contact ${esc(order.email)} and refund the missing items.</p><p><a href="${SITE_URL}/admin/orders/${encodeURIComponent(order.id)}">Open the order</a></p>`) });
}
function trackingUrl(t) {
  const n = encodeURIComponent(String(t.number || ""));
  const c = String(t.carrier || "").toLowerCase();
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
}
function publicOrder(o) {
  const { payment, internalNotes, ...rest } = o;
  return { ...rest, createdAt: rest.createdAt?.toMillis ? rest.createdAt.toMillis() : rest.createdAt || null, paidAt: rest.paidAt?.toMillis ? rest.paidAt.toMillis() : null, updatedAt: null };
}

/* ------------------------------ marketing email ----------------------------- */
// Flows live in marketing.js: welcome series on newsletter signup, care tips after shipping,
// 45-day reorder nudge, Resend audience sync, one-click unsubscribe (hosting rewrites /api/unsubscribe here).
const marketing = createMarketing({ db, FieldValue, sendMail, wrapEmail, esc, fmt, getProduct, CATALOG, SITE_URL, ENV });

exports.onNewsletterSignup = onDocumentCreated({ document: "newsletter/{email}", secrets: MAIL_SECRETS }, async (event) => {
  const email = event.params.email;
  await marketing.onNewsletterSignup(email, event.data?.data() || {}).catch((e) => console.error("newsletter welcome failed", email, e.message));
});

exports.marketingDrip = onSchedule({ schedule: "every day 10:00", timeZone: "America/New_York", secrets: MAIL_SECRETS }, async () => {
  await marketing.runDrip();
});

exports.unsubscribe = onRequest({ secrets: MAIL_SECRETS }, async (req, res) => {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).send("Method not allowed");
  try { await marketing.handleUnsubscribe(req, res); }
  catch (e) { console.error("unsubscribe failed", e.message); res.status(500).send("Something went wrong. Reply to any Kind Flames email and we'll remove you by hand."); }
});

exports.syncMarketingAudience = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  return marketing.syncAudience();
});

exports.sendMarketingTest = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  const to = request.auth?.token?.email;
  if (!to) throw new HttpsError("failed-precondition", "Your account has no email address.");
  return marketing.sendTestEmails(to);
});
