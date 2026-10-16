// Google Merchant Center product feed (Google Shopping RSS 2.0).
// Reads src/data/catalog.json and writes public/feed.xml. Runs automatically via "prebuild".
// Usage: node scripts/feed.mjs [--out path]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://kindflames.com';
const BRAND = 'Kind Flames';
const SHIPPING = { country: 'US', price: '6.95 USD' }; // flat rate; free US shipping over $60 is configured in Merchant Center, not expressible per item here

const CATEGORY = {
  candle: { label: 'Candles', google: 'Home & Garden > Decor > Home Fragrances > Candles' },
  scrub: { label: 'Body Scrubs', google: 'Health & Beauty > Personal Care > Cosmetics > Bath & Body' },
  lotion: { label: 'Lotions', google: 'Health & Beauty > Personal Care > Cosmetics > Bath & Body' },
  salt: { label: 'Bath Salts', google: 'Health & Beauty > Personal Care > Cosmetics > Bath & Body' },
  set: { label: 'Gift Sets', google: 'Arts & Entertainment > Party & Celebration > Gift Giving' },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const money = (n) => `${Number(n).toFixed(2)} USD`;
const abs = (p) => (/^https?:\/\//.test(p) ? p : SITE + (p.startsWith('/') ? p : `/${p}`));

/** Plain text: drop HTML tags, markdown markers, collapse whitespace, cap at 5000 chars. */
export function plainText(s, max = 5000) {
  let t = String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~#>]+/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > max) t = t.slice(0, max - 1).trimEnd() + '…';
  return t;
}

function describe(p) {
  const parts = [p.description, p.tagline && !String(p.description || '').includes(p.tagline) ? p.tagline.replace(/[.!?]?$/, '.') : ''];
  if (p.notes && (p.notes.top || p.notes.heart || p.notes.base)) {
    const n = ['top', 'heart', 'base'].map((k) => p.notes[k]).filter((v) => v && v !== '—');
    if (n.length) parts.push(`Notes: ${n.join(', ')}.`);
  }
  if (p.wax) parts.push(`${p.wax} wax, ${p.wick ? `${p.wick.toLowerCase()} wick` : 'hand-poured'}.`);
  if (p.burnTime) parts.push(`Burn time about ${p.burnTime}.`);
  return plainText(parts.filter(Boolean).join(' ')) || plainText(p.name);
}

function title(p, variant) {
  const cat = CATEGORY[p.category]?.label || '';
  const singular = cat.replace(/s$/, '');
  const base = singular && !new RegExp(singular, 'i').test(p.name) ? `${p.name} ${singular}` : p.name;
  return variant ? `${base}, ${variant.label || variant.id}` : base;
}

export function buildItems(catalog) {
  const items = [];
  for (const p of catalog) {
    if (p.hidden) continue; // unlisted SKUs (e.g. corporate sample kit) stay out of Shopping
    if (p.active === false) continue;
    const variants = Array.isArray(p.variants) && p.variants.length ? p.variants : [{ id: 'default', price: p.price, stock: p.stock }];
    const slug = p.slug || p.id;
    const link = `${SITE}/product/${encodeURIComponent(slug)}`;
    const image = p.images?.[0] ? abs(p.images[0]) : '';
    const extraImages = (p.images || []).slice(1, 11).map(abs);
    const cat = CATEGORY[p.category] || { label: p.category || 'Products', google: '' };
    const description = describe(p);
    const distinct = variants.length > 1 && variants.some((v) => v.price !== variants[0].price || (v.label || v.id) !== (variants[0].label || variants[0].id));
    const list = distinct ? variants : [variants[0]];
    for (const v of list) {
      const inStock = typeof v.stock !== 'number' || v.stock > 0;
      items.push({
        id: distinct ? `${p.id}-${v.id}` : p.id,
        itemGroupId: distinct ? p.id : null,
        title: title(p, distinct ? v : null),
        description,
        link, // the product page does not read a ?variant= param yet; Google allows one link per item group
        image,
        extraImages,
        availability: inStock ? 'in_stock' : 'out_of_stock',
        price: money(typeof v.compareAt === 'number' && v.compareAt > v.price ? v.compareAt : v.price),
        salePrice: typeof v.compareAt === 'number' && v.compareAt > v.price ? money(v.price) : null,
        size: distinct ? v.label || v.id : null,
        googleCategory: cat.google,
        productType: cat.label,
      });
    }
  }
  return items;
}

export function renderFeed(items) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${esc(BRAND)}</title>`,
    `    <link>${SITE}/</link>`,
    '    <description>Hand-poured coconut-soy candles, body scrubs, lotions and bath salts made in New Jersey.</description>',
    `    <!-- Shipping: flat ${SHIPPING.price} to ${SHIPPING.country}; free US shipping on orders over $60 (set as a Merchant Center shipping service). -->`,
  ];
  for (const it of items) {
    lines.push('    <item>');
    lines.push(`      <g:id>${esc(it.id)}</g:id>`);
    lines.push(`      <g:title>${esc(it.title)}</g:title>`);
    lines.push(`      <g:description>${esc(it.description)}</g:description>`);
    lines.push(`      <g:link>${esc(it.link)}</g:link>`);
    lines.push(`      <g:image_link>${esc(it.image)}</g:image_link>`);
    for (const img of it.extraImages) lines.push(`      <g:additional_image_link>${esc(img)}</g:additional_image_link>`);
    lines.push(`      <g:availability>${it.availability}</g:availability>`);
    lines.push(`      <g:price>${it.price}</g:price>`);
    if (it.salePrice) lines.push(`      <g:sale_price>${it.salePrice}</g:sale_price>`);
    lines.push(`      <g:brand>${esc(BRAND)}</g:brand>`);
    lines.push('      <g:condition>new</g:condition>');
    lines.push('      <g:identifier_exists>false</g:identifier_exists>');
    if (it.googleCategory) lines.push(`      <g:google_product_category>${esc(it.googleCategory)}</g:google_product_category>`);
    lines.push(`      <g:product_type>${esc(it.productType)}</g:product_type>`);
    if (it.itemGroupId) lines.push(`      <g:item_group_id>${esc(it.itemGroupId)}</g:item_group_id>`);
    if (it.size) lines.push(`      <g:size>${esc(it.size)}</g:size>`);
    lines.push('      <g:shipping>');
    lines.push(`        <g:country>${SHIPPING.country}</g:country>`);
    lines.push(`        <g:price>${SHIPPING.price}</g:price>`);
    lines.push('      </g:shipping>');
    lines.push('    </item>');
  }
  lines.push('  </channel>', '</rss>', '');
  return lines.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const outIdx = process.argv.indexOf('--out');
  const out = resolve(root, outIdx > -1 ? process.argv[outIdx + 1] : 'public/feed.xml');
  const catalog = JSON.parse(readFileSync(resolve(root, 'src/data/catalog.json'), 'utf8'));
  const items = buildItems(catalog);
  const missing = items.filter((i) => !i.image);
  if (missing.length) console.warn(`feed: ${missing.length} item(s) without an image: ${missing.map((i) => i.id).join(', ')}`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderFeed(items));
  console.log(`feed: wrote ${items.length} items from ${catalog.length} products → ${out}`);
}
