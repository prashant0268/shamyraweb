import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext';

export default function Footer() {
  const { settings } = useCatalog();
  const col = (title: string, links: [string, string][]) => (
    <div><div className="font-bold">{title}</div><ul className="mt-2 space-y-1.5">{links.map(([to, l]) => <li key={to}><Link to={to} className="text-muted hover:text-ink">{l}</Link></li>)}</ul></div>
  );
  return (
    <footer className="mt-16 border-t border-line bg-surface text-sm">
      <div className="wrap grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <div className="font-display text-xl font-bold">Kind Flames</div>
          <p className="mt-2 max-w-xs text-muted">Hand-poured candles and small-batch bath &amp; body, made in New Jersey.</p>
        </div>
        {col('Shop', [['/shop/candle', 'Candles'], ['/shop/scrub', 'Body Scrubs'], ['/shop/lotion', 'Lotions'], ['/shop/salt', 'Bath Salts'], ['/shop/set', 'Gift Sets'], ['/gifts', 'Holiday Gift Guide'], ['/build-a-set', 'Build a Spa Set'], ['/subscribe', 'Candle of the Month']])}
        {col('Company', [['/corporate', 'Corporate Gifting'], ['/about', 'About'], ['/contact', 'Contact'], ['/faq', 'FAQ']])}
        {col('Help', [['/shipping-returns', 'Shipping & Returns'], ['/candle-care', 'Candle Care & Safety'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service']])}
        <div><div className="font-bold">Contact</div><ul className="mt-2 space-y-1.5 text-muted"><li>{settings.contactEmail}</li><li>{settings.contactPhone}</li><li>Mon–Fri 9–5 ET</li></ul></div>
      </div>
      <div className="border-t border-line"><div className="wrap py-4 text-xs text-muted">© {new Date().getFullYear()} {settings.legalName}, d/b/a {settings.brandName}. All rights reserved.</div></div>
    </footer>
  );
}
