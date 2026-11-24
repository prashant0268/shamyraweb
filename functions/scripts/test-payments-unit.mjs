// Unit tests for functions/payments.js (pure: no network, no Firestore). Run: node functions/scripts/test-payments-unit.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../payments.js');
let fails = 0, n = 0;
const check = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
const throws = (fn) => { try { fn(); return 'no-throw'; } catch (e) { return e.code || 'error'; } };

/* ---- origins ---- */
const prodOrigins = P.allowedOrigins({ siteUrl: 'https://kindflames.com', projectId: 'shamyra-web', extraOrigins: [], isProduction: true });
const testOrigins = P.allowedOrigins({ siteUrl: 'https://kindflames-test.web.app', projectId: 'kindflames-test', extraOrigins: ['https://test.kindflames.com'], isProduction: false });
check('prod: no localhost origins', prodOrigins.filter((o) => o.includes('localhost')), []);
check('prod: site + www + hosting domains', prodOrigins, ['https://kindflames.com', 'https://www.kindflames.com', 'https://shamyra-web.web.app', 'https://shamyra-web.firebaseapp.com']);
check('test: localhost allowed', P.LOCAL_ORIGINS.every((o) => testOrigins.includes(o)), true);
check('test: extra origin kept', testOrigins.includes('https://test.kindflames.com'), true);

/* ---- PayPal environment ---- */
check('production → live', P.paypalEnvFor(true), 'live');
check('non-production → sandbox', P.paypalEnvFor(false), 'sandbox');
check('prod order with paypalEnv live', P.paypalEnvForOrder({ paypalEnv: 'live', origin: 'http://localhost:5173' }, true), 'live');
check('prod legacy order (no paypalEnv), localhost origin → still live', P.paypalEnvForOrder({ origin: 'http://localhost:5173' }, true), 'live');
check('test legacy order → sandbox', P.paypalEnvForOrder({ origin: 'https://kindflames.com' }, false), 'sandbox');
check('prod refuses a sandbox order', throws(() => P.paypalEnvForOrder({ paypalEnv: 'sandbox' }, true)), 'failed-precondition');
check('test refuses a live order', throws(() => P.paypalEnvForOrder({ paypalEnv: 'live' }, false)), 'failed-precondition');

/* ---- capture validation ---- */
const order = { id: 'ord1', total: 34.06 };
const sdk = (status, capStatus, value = '34.06', currency = 'USD', extra = {}) => ({ status, purchaseUnits: [{ customId: 'ord1', payments: capStatus ? { captures: [{ id: 'CAP1', status: capStatus, amount: { currencyCode: currency, value }, ...extra }] } : undefined }] });
const st = (r, o = order) => P.evaluatePayPalOrder(r, o).state;
check('COMPLETED capture, exact amount → paid', st(sdk('COMPLETED', 'COMPLETED')), 'paid');
check('order COMPLETED but capture PENDING → pending', st(sdk('COMPLETED', 'PENDING', '34.06', 'USD', { statusDetails: { reason: 'ECHECK' } })), 'pending');
check('pending reason surfaced', P.evaluatePayPalOrder(sdk('COMPLETED', 'PENDING', '34.06', 'USD', { statusDetails: { reason: 'ECHECK' } }), order).reason, 'ECHECK');
check('amount short by 1 cent → mismatch', st(sdk('COMPLETED', 'COMPLETED', '34.05')), 'mismatch');
check('amount $0.01 → mismatch', st(sdk('COMPLETED', 'COMPLETED', '0.01')), 'mismatch');
check('currency EUR → mismatch', st(sdk('COMPLETED', 'COMPLETED', '34.06', 'EUR')), 'mismatch');
check('missing amount → mismatch', st({ status: 'COMPLETED', purchaseUnits: [{ payments: { captures: [{ id: 'C', status: 'COMPLETED' }] } }] }), 'mismatch');
check('custom_id for another order → mismatch', st({ ...sdk('COMPLETED', 'COMPLETED'), purchaseUnits: [{ ...sdk('COMPLETED', 'COMPLETED').purchaseUnits[0], customId: 'other' }] }), 'mismatch');
check('two captures → mismatch', st({ status: 'COMPLETED', purchaseUnits: [{ payments: { captures: [{ status: 'COMPLETED', amount: { currencyCode: 'USD', value: '34.06' } }, { status: 'COMPLETED', amount: { currencyCode: 'USD', value: '34.06' } }] } }] }), 'mismatch');
check('DECLINED → failed', st(sdk('COMPLETED', 'DECLINED')), 'failed');
check('REFUNDED → refunded', st(sdk('COMPLETED', 'REFUNDED')), 'refunded');
check('APPROVED, no capture → approved', st({ status: 'APPROVED', purchaseUnits: [{}] }), 'approved');
check('CREATED → unpaid', st({ status: 'CREATED', purchaseUnits: [{}] }), 'unpaid');
check('VOIDED → failed', st({ status: 'VOIDED' }), 'failed');
check('REST snake_case payload → paid', st({ status: 'COMPLETED', purchase_units: [{ custom_id: 'ord1', payments: { captures: [{ id: 'C', status: 'COMPLETED', amount: { currency_code: 'USD', value: '34.06' } }] } }] }), 'paid');
check('float total 0.1+0.2 vs "0.30" → paid', st(sdk('COMPLETED', 'COMPLETED', '0.30'), { id: 'ord1', total: 0.1 + 0.2 }), 'paid');
check('capture id returned', P.evaluatePayPalOrder(sdk('COMPLETED', 'COMPLETED'), order).capture.id, 'CAP1');

/* ---- PayPal errors ---- */
check('issue from result', P.paypalIssue({ result: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } }), 'ORDER_ALREADY_CAPTURED');
check('issue from body string', P.paypalIssue({ body: JSON.stringify({ name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'INSTRUMENT_DECLINED' }] }) }), 'INSTRUMENT_DECLINED');
check('no issue', P.paypalIssue(new Error('network')), null);

/* ---- Stripe sessions ---- */
check('stripe paid', P.stripeSessionState({ status: 'complete', payment_status: 'paid' }), 'paid');
check('stripe no_payment_required → paid', P.stripeSessionState({ status: 'complete', payment_status: 'no_payment_required' }), 'paid');
check('stripe async pending → processing', P.stripeSessionState({ status: 'complete', payment_status: 'unpaid' }), 'processing');
check('stripe open → unpaid', P.stripeSessionState({ status: 'open', payment_status: 'unpaid' }), 'unpaid');
check('stripe expired', P.stripeSessionState({ status: 'expired', payment_status: 'unpaid' }), 'expired');

/* ---- audit helper ---- */
const hosts = ['kindflames.com', 'www.kindflames.com'];
check('audit: kindflames.com is production', P.isProductionHostOrigin('https://kindflames.com', hosts), true);
check('audit: localhost is not', P.isProductionHostOrigin('http://localhost:5173', hosts), false);
check('audit: hosting domain is not', P.isProductionHostOrigin('https://shamyra-web.web.app', hosts), false);
check('audit: empty is not', P.isProductionHostOrigin('', hosts), false);

console.log(fails ? `PAYMENTS UNIT TESTS: ${fails} of ${n} failed` : `PAYMENTS UNIT TESTS: all ${n} passed`);
process.exit(fails ? 1 : 0);
