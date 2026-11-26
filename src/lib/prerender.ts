/**
 * True while scripts/prerender.mjs is snapshotting a route at build time (it sets window.__KF_PRERENDER__ before
 * any app code runs). Anything personal, network-dependent or time-based (Firestore refresh, analytics, consent
 * banner, popups) is skipped so the captured HTML is the same for every visitor.
 */
declare global { interface Window { __KF_PRERENDER__?: boolean } }
export const isPrerender = (): boolean => typeof window !== 'undefined' && window.__KF_PRERENDER__ === true;
export {};
