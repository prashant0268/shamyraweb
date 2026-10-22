/** Store settings defaults, shared by index.js (getSettings fallback) and scripts/seed-test-env.mjs. */
const DEFAULT_SETTINGS = {
  brandName: "Kind Flames",
  legalName: "Shamyra Naturals LLC",
  contactEmail: "hello@kindflames.com",
  contactPhone: "(732) 666-8013",
  freeShippingThreshold: 60,
  flatShipping: 6.95,
  expressShipping: 14.5,
  giftWrapFee: 5,
  bundleDiscountPercent: 15,
  taxRates: { NJ: 0.06625 },
  cardPaymentsEnabled: false,
  paypalEnabled: true,
  announcement: { text: "Free US shipping on orders over $60", visible: true },
};

module.exports = { DEFAULT_SETTINGS };
