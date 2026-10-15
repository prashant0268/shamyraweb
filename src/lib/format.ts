export const money = (n: number) => '$' + (Number(n) || 0).toFixed(2);
export const fromPrice = (variants: { price: number }[]) => Math.min(...variants.map((v) => v.price));
export const formatDate = (ts?: { seconds: number } | number | null) => {
  if (!ts) return '';
  const ms = typeof ts === 'number' ? ts : ts.seconds * 1000;
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
