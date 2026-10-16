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
// Logo, favicon, apple-touch-icon and og.jpg are built by scripts/brand-assets.mjs.
console.log('done');
