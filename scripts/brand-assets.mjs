// Builds every logo asset from the brand artwork in src/assets/images/logo/kindflames-brand-source.jpg.
// Run: node scripts/brand-assets.mjs
import sharp from 'sharp';
const SRC = 'src/assets/images/logo/kindflames-brand-source.jpg';
const CREAM = '#F3F1EC';
const T = { r: 0, g: 0, b: 0, alpha: 0 };

// Black-on-white artwork → black with alpha. Hard cut at luminance 110 so the gold foliage/stars (lum ≈ 140+) vanish.
async function cut(region, name, { pad = 0.08, square = false } = {}) {
  const { data, info } = await sharp(SRC).extract(region).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const lum = data[i];
    rgba[i * 4 + 3] = lum >= 110 ? 0 : lum <= 40 ? 255 : Math.round((110 - lum) * 255 / 70);
  }
  const trimmed = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().trim({ threshold: 1 }).toBuffer();
  const m = await sharp(trimmed).metadata();
  const p = Math.round(Math.max(m.width, m.height) * pad);
  const side = Math.max(m.width, m.height) + 2 * p;
  const ext = square
    ? { left: Math.floor((side - m.width) / 2), right: Math.ceil((side - m.width) / 2), top: Math.floor((side - m.height) / 2), bottom: Math.ceil((side - m.height) / 2) }
    : { left: p, right: p, top: p, bottom: p };
  const out = `src/assets/images/logo/${name}.png`;
  await sharp(trimmed).extend({ ...ext, background: T }).png().toFile(out);
  return out;
}

const mark = await cut({ left: 380, top: 110, width: 630, height: 520 }, 'kf-mark', { square: true });
const lockup = await cut({ left: 150, top: 110, width: 1000, height: 660 }, 'kf-lockup');
const tagline = await cut({ left: 250, top: 1010, width: 850, height: 120 }, 'kf-tagline');

// Site assets
await sharp(mark).resize(512, 512).png().toFile('public/img/logo-512.png');
await sharp(lockup).resize({ width: 1200 }).png().toFile('public/img/logo-lockup.png');
const iconBg = (size, radius) => Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${CREAM}"/></svg>`);
for (const [file, size, radius, inner] of [['public/favicon.png', 64, 12, 48], ['public/apple-touch-icon.png', 180, 0, 132]]) {
  await sharp(iconBg(size, radius)).composite([{ input: await sharp(mark).resize(inner, inner).toBuffer(), gravity: 'center' }]).png().toFile(file);
}
// OG image: lockup + tagline on cream
const lock = await sharp(lockup).resize({ height: 360 }).toBuffer();
const tag = await sharp(tagline).resize({ height: 64 }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: CREAM } })
  .composite([{ input: lock, top: 90, left: Math.round((1200 - (await sharp(lock).metadata()).width) / 2) }, { input: tag, top: 490, left: Math.round((1200 - (await sharp(tag).metadata()).width) / 2) }])
  .jpeg({ quality: 88 }).toFile('public/img/og.jpg');
console.log('brand assets written');
