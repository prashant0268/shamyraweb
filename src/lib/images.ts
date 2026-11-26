/** Product images are stored as /img/products/<slug>-800.webp; a 400px twin exists for cards. */
export const imgAt = (url: string, w: 400 | 800) => (url && /-800\.webp$/.test(url) ? url.replace(/-800\.webp$/, `-${w}.webp`) : url);
export const srcSet = (url: string) => (url && /-800\.webp$/.test(url) ? `${imgAt(url, 400)} 400w, ${url} 800w` : undefined);

const isUnsplash = (url: string) => /^https:\/\/images\.unsplash\.com\//.test(url);
/** Same Unsplash photo at another width (their CDN resizes on the `w` param). Other URLs pass through. */
export const unsplashAt = (url: string, w: number) => (isUnsplash(url) ? (/[?&]w=\d+/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${w}`) : `${url}${url.includes('?') ? '&' : '?'}w=${w}`) : url);
/** srcset for an Unsplash URL at the given widths; undefined for anything else. */
export const unsplashSrcSet = (url: string, widths: number[]) => (isUnsplash(url) ? widths.map((w) => `${unsplashAt(url, w)} ${w}w`).join(', ') : undefined);
export const HERO_WIDTHS = [640, 960, 1280, 1600, 2000];
export const CARD_WIDTHS = [300, 450, 600, 900];
/** Responsive attributes for a full-bleed photo (heroes, banners). */
export const heroImgProps = (url: string) => ({ src: unsplashAt(url, 1280), srcSet: unsplashSrcSet(url, HERO_WIDTHS), sizes: '100vw' });
