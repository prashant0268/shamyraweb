/**
 * Build-time environment. One place decides "is this the real store?" so card gating, the PayPal client id,
 * analytics and robots meta all agree. See docs/ENVIRONMENTS.md.
 *
 * VITE_ENV is set in .env.production ("production") and .env.test ("test"). When it is missing, a production
 * bundle (`vite build`) counts as production and the dev server does not, which matches the old
 * "is the hostname kindflames.com" check for the cases that exist today.
 */
export type AppEnv = 'production' | 'test' | 'development';

export const APP_ENV: AppEnv = (() => {
  const v = String(import.meta.env.VITE_ENV || '').trim().toLowerCase();
  if (v === 'production' || v === 'test' || v === 'development') return v;
  return import.meta.env.PROD ? 'production' : 'development';
})();

/** Firebase project this bundle talks to (from VITE_FIREBASE_PROJECT_ID). */
export const FIREBASE_PROJECT_ID: string = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();

export const isProdEnv = (): boolean => APP_ENV === 'production';

/** Short label for the on-screen chip; empty in production so nothing renders there. */
export const ENV_LABEL: string = APP_ENV === 'production' ? '' : APP_ENV === 'test' ? 'TEST ENVIRONMENT' : 'LOCAL DEV';
