import type { Product, Review } from '../types';
import { SITE, absUrl } from './seo';
import { imgAt } from './images';

const inStock = (stock?: number) => typeof stock !== 'number' || stock > 0;
const availability = (ok: boolean) => `https://schema.org/${ok ? 'InStock' : 'OutOfStock'}`;
const isoDate = (c?: { seconds: number } | null) => (c?.seconds ? new Date(c.seconds * 1000).toISOString().slice(0, 10) : undefined);
const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** schema.org Product for the product page. Reviews passed in must already be approved. */
export function productJsonLd(p: Product, reviews: Review[]) {
  const url = `${SITE}/product/${p.slug}`;
  const images = p.images.filter(Boolean).flatMap((u) => [absUrl(u), ...(imgAt(u, 400) !== u ? [absUrl(imgAt(u, 400))] : [])]);
  const prices = p.variants.map((v) => v.price);
  const anyInStock = p.variants.some((v) => inStock(v.stock));
  const offers = p.variants.length === 1
    ? { '@type': 'Offer', url, price: p.variants[0]!.price.toFixed(2), priceCurrency: 'USD', availability: availability(inStock(p.variants[0]!.stock)), itemCondition: 'https://schema.org/NewCondition', ...(p.variants[0]!.sku ? { sku: p.variants[0]!.sku } : {}) }
    : { '@type': 'AggregateOffer', url, lowPrice: Math.min(...prices).toFixed(2), highPrice: Math.max(...prices).toFixed(2), offerCount: p.variants.length, priceCurrency: 'USD', availability: availability(anyInStock) };
  const rated = reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  const avg = rated.length ? rated.reduce((n, r) => n + r.rating, 0) / rated.length : 0;
  const aggregateRating = rated.length
    ? { '@type': 'AggregateRating', ratingValue: Number((p.rating || avg).toFixed(2)), reviewCount: Math.max(p.reviewCount || 0, rated.length), bestRating: 5, worstRating: 1 }
    : undefined;
  const review = rated.slice(0, 5).map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.name || 'Customer' },
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    ...(r.title ? { name: r.title } : {}),
    reviewBody: r.body,
    ...(isoDate(r.createdAt) ? { datePublished: isoDate(r.createdAt) } : {}),
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    url,
    image: images,
    description: strip([p.tagline, p.description].filter(Boolean).join(' ')),
    sku: p.id,
    brand: { '@type': 'Brand', name: 'Kind Flames' },
    category: p.category,
    offers,
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(review.length ? { review } : {}),
  };
}
