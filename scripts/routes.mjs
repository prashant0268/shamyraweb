// Single list of public, indexable routes. Used by scripts/sitemap.mjs (sitemap.xml) and scripts/prerender.mjs
// (static HTML per route). Each route names the source file whose last git commit is its <lastmod>.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = 'https://kindflames.com';
const CATALOG = 'src/data/catalog.json';
export const catalog = JSON.parse(readFileSync(resolve(root, CATALOG), 'utf8'));

const CATEGORIES = ['candle', 'body', 'scrub', 'lotion', 'salt', 'set'];
const INFO = ['about', 'contact', 'shipping-returns', 'candle-care', 'faq', 'privacy', 'terms'];

/** @returns {{ path: string, source: string[], sitemap: boolean }[]} */
export function publicRoutes() {
  const active = catalog.filter((p) => p.active !== false);
  return [
    { path: '/', source: ['src/pages/Home.tsx', CATALOG], sitemap: true },
    { path: '/shop', source: ['src/pages/Shop.tsx', CATALOG], sitemap: true },
    ...CATEGORIES.map((c) => ({ path: `/shop/${c}`, source: ['src/pages/Shop.tsx', CATALOG], sitemap: true })),
    { path: '/build-a-set', source: ['src/pages/BuildASet.tsx', CATALOG], sitemap: true },
    { path: '/corporate', source: ['src/pages/Corporate.tsx'], sitemap: true },
    { path: '/gifts', source: ['src/pages/Gifts.tsx', CATALOG], sitemap: true },
    { path: '/subscribe', source: ['src/pages/Subscribe.tsx'], sitemap: true },
    ...INFO.map((s) => ({ path: `/${s}`, source: ['src/pages/InfoPage.tsx'], sitemap: true })),
    // Hidden products (e.g. the corporate sample kit) are reachable by URL, so they get a page, but stay out of the sitemap.
    ...active.map((p) => ({ path: `/product/${p.slug || p.id}`, source: [CATALOG, 'src/pages/ProductDetail.tsx'], sitemap: !p.hidden })),
  ];
}
