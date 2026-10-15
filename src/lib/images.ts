/** Product images are stored as /img/products/<slug>-800.webp; a 400px twin exists for cards. */
export const imgAt = (url: string, w: 400 | 800) => (url && /-800\.webp$/.test(url) ? url.replace(/-800\.webp$/, `-${w}.webp`) : url);
export const srcSet = (url: string) => (url && /-800\.webp$/.test(url) ? `${imgAt(url, 400)} 400w, ${url} 800w` : undefined);
