// Converts the large PNG product photos into small WebP variants served from /img/.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
// Full-resolution originals live outside the repo (see ../shamyraweb-assets/README.md).
const SRC = process.env.KF_ORIGINALS || '../shamyraweb-assets/originals/images';
const MAP = {
  'candle1': 'lavender-dreams', 'candle2': 'vanilla-bliss', 'candle3': 'ocean-breeze', 'candle4': 'pure-soy-natural', 'candle5': 'beeswax-classic',
  'img1': 'cinnamon-spice', 'img2': 'rose-garden', 'img3': 'pine-forest', 'img4': 'eucalyptus-mint', 'img5': 'coconut-paradise', 'img6': 'unscented-white', 'img7': 'pumpkin-spice', 'img8': 'extra-1',
};
await mkdir('public/img/products', { recursive: true });
for (const [src, slug] of Object.entries(MAP)) {
  for (const w of [400, 800]) {
    await sharp(`${SRC}/${src}.png`).resize(w, w, { fit: 'cover' }).webp({ quality: 78 }).toFile(`public/img/products/${slug}-${w}.webp`);
  }
  console.log('ok', slug);
}
await sharp('src/assets/background/background.jpg').resize(1600).webp({ quality: 70 }).toFile('public/img/background.webp');
await sharp('src/assets/images/logo/Color-Logo-Transparent-Background.png').resize(512, 512, { fit: 'inside' }).png().toFile('public/img/logo-512.png');
await sharp('src/assets/images/logo/Color-Logo-Transparent-Background.png').resize(64, 64, { fit: 'inside' }).png().toFile('public/favicon.png');
await sharp('src/assets/images/logo/Color-Logo-Transparent-Background.png').resize(180, 180, { fit: 'inside' }).png().toFile('public/apple-touch-icon.png');
// OG image: logo on a dark pine background
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#214238' } })
  .composite([{ input: await sharp('src/assets/images/logo/Color-Logo-Transparent-Background.png').resize(520, 520, { fit: 'inside' }).toBuffer(), gravity: 'center' }])
  .jpeg({ quality: 85 }).toFile('public/img/og.jpg');
console.log('done');
