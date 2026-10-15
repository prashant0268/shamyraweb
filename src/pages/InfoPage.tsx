import { useParams } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { useCatalog } from '../context/CatalogContext';
import NotFound from './NotFound';

const PAGES: Record<string, { title: string; description: string; body: (s: { legalName: string; contactEmail: string; contactPhone: string }) => string }> = {
  about: { title: 'About Kind Flames', description: 'Hand-poured candles and small-batch bath & body from New Jersey.', body: (s) => `
<p>Kind Flames started at a kitchen table in New Jersey with one scent and a lot of test burns. Today we pour every candle by hand in a coconut-soy blend, with phthalate-free fragrance and cotton or wood wicks, and we make the bath &amp; body line in the same scent families so an evening can match from the candle to the bath.</p>
<h2>What we care about</h2>
<ul><li><b>Clean burn.</b> Coconut-soy wax, lead-free wicks, and fragrance oils free of phthalates and parabens.</li><li><b>Honest labels.</b> Every bath &amp; body product lists its full ingredients (INCI) and is made in a MoCRA-registered facility.</li><li><b>Small batches.</b> We pour in runs of 24–48 so nothing sits on a shelf for months.</li><li><b>Reuse.</b> Jars are glass; clean them out and keep them.</li></ul>
<p>Kind Flames is the brand of ${s.legalName}. Questions? ${s.contactEmail}.</p>` },
  contact: { title: 'Contact', description: 'Get in touch with Kind Flames.', body: (s) => `
<p>Email <b>${s.contactEmail}</b> or call <b>${s.contactPhone}</b>, Monday–Friday 9–5 ET. We answer within one business day.</p>
<h2>Order questions</h2><p>Include your order number (it starts with KF-). For damaged items, a photo of the box and product helps us replace it fastest.</p>
<h2>Wholesale &amp; corporate</h2><p>See <a href="/corporate">Corporate gifting</a> for tiered pricing, or email us for wholesale terms for shops, hotels and short-term rentals.</p>` },
  'shipping-returns': { title: 'Shipping & Returns', description: 'Shipping rates, delivery times, and our 30-day return policy.', body: (s) => `
<h2>Shipping</h2><ul><li>Orders ship within 1–2 business days from New Jersey.</li><li><b>Standard</b> (USPS Ground Advantage): 2–5 business days. Free on orders over $60, otherwise $6.95.</li><li><b>Express</b> (UPS 2nd Day Air): $14.50.</li><li>We currently ship within the United States only.</li><li>Candles ship upright in molded pulp. Scrubs, lotions and soaks are sealed and bagged to prevent leaks.</li><li>June–September we add heat protection; if a candle arrives softened, let it cool upright for a few hours before lighting.</li></ul>
<h2>Returns &amp; exchanges</h2><ul><li>Unopened items may be returned within 30 days of delivery for a refund to the original payment method, less return shipping.</li><li>Opened candles can be exchanged once for a different scent within 30 days (our “wrong scent” swap). Opened bath &amp; body products can't be returned for hygiene reasons, but tell us if something isn't right and we'll make it right.</li><li>Damaged in transit? Email a photo within 7 days and we'll replace it at no cost.</li></ul>
<p>To start a return, email ${s.contactEmail} with your order number.</p>` },
  'candle-care': { title: 'Candle Care & Safety', description: 'How to get the best burn from your Kind Flames candle.', body: () => `
<h2>First burn</h2><p>Let the melt pool reach the edge of the jar (2–3 hours for an 8 oz). Wax has memory; a short first burn causes tunnelling later.</p>
<h2>Every burn</h2><ul><li>Trim the wick to ¼″ before lighting. Wood wicks: snap off the charred tip.</li><li>Burn no longer than 4 hours at a time.</li><li>Keep away from drafts, which cause uneven burning and soot.</li><li>Stop using when ½″ of wax remains.</li></ul>
<h2>Safety</h2><ul><li>Never leave a burning candle unattended.</li><li>Keep out of reach of children and pets, and away from anything that can catch fire.</li><li>Burn on a heat-resistant surface.</li></ul>
<p>Our labels follow ASTM F2058 warning-label guidance.</p>` },
  faq: { title: 'FAQ', description: 'Common questions about Kind Flames products and orders.', body: () => `
<h3>What wax do you use?</h3><p>A coconut-soy blend for scented candles; 100% soy for unscented; 100% beeswax for the Beeswax Classic.</p>
<h3>Are your fragrances safe?</h3><p>Fragrance oils are phthalate-free and paraben-free. Bath &amp; body products list full INCI ingredients on the product page and the label.</p>
<h3>How long do candles burn?</h3><p>About 45 hours for an 8 oz coconut-soy candle; 60 for beeswax. 4 oz jars burn around 20 hours.</p>
<h3>Do you offer gift wrapping?</h3><p>Yes. At checkout, choose “This is a gift” for a kraft gift box, tissue, ribbon and a printed card. Prices are hidden on the packing slip.</p>
<h3>Can I change or cancel an order?</h3><p>Email us within 12 hours of ordering and we'll do our best; after that it may already be packed.</p>
<h3>Do you do bulk or corporate orders?</h3><p>Yes, from 25 units. See <a href="/corporate">Corporate gifting</a>.</p>` },
  privacy: { title: 'Privacy Policy', description: 'How Kind Flames collects and uses your information.', body: (s) => `
<p><i>Last updated October 2026.</i> This policy describes how ${s.legalName}, doing business as Kind Flames (“we”), handles information when you use kindflames.com.</p>
<h2>What we collect</h2><ul><li><b>Order information:</b> name, email, shipping address, phone, and what you bought.</li><li><b>Account information</b> if you create an account (email, name) and, if you use Google sign-in, your Google profile name and email.</li><li><b>Payment information</b> is collected directly by Stripe or PayPal. We never see or store your full card number.</li><li><b>Usage information</b> through Google Analytics for Firebase (pages viewed, device type). You can opt out with browser settings or ad-blockers.</li><li><b>Newsletter email</b> if you subscribe.</li></ul>
<h2>How we use it</h2><p>To fulfil and ship orders, send order and shipping emails, answer support requests, prevent fraud, improve the store, and, if you opt in, send marketing emails you can unsubscribe from at any time.</p>
<h2>Who we share it with</h2><p>Service providers who help us run the store: Google Firebase (hosting, database, authentication), Stripe and PayPal (payments), our email provider, and shipping carriers (USPS, UPS). We don't sell your personal information.</p>
<h2>Your choices</h2><p>Email ${s.contactEmail} to access, correct or delete your information. California residents may exercise CCPA rights the same way.</p>
<h2>Cookies</h2><p>We use essential cookies for sign-in and your bag, and analytics cookies to understand how the site is used.</p>` },
  terms: { title: 'Terms of Service', description: 'Terms for shopping at kindflames.com.', body: (s) => `
<p><i>Last updated October 2026.</i> By placing an order with ${s.legalName}, d/b/a Kind Flames, you agree to these terms.</p>
<h2>Orders &amp; pricing</h2><p>All prices are in US dollars. Sales tax is charged where required. We may cancel an order for suspected fraud, pricing errors or stock problems; you'll be refunded in full.</p>
<h2>Shipping, returns &amp; damage</h2><p>See our <a href="/shipping-returns">Shipping &amp; Returns</a> policy, which is part of these terms.</p>
<h2>Product use</h2><p>Candles are an open flame; follow the <a href="/candle-care">care and safety guidance</a>. Bath &amp; body products are for external use; patch test first and discontinue use if irritation occurs. Our products are not intended to diagnose, treat or cure any condition.</p>
<h2>Accounts</h2><p>You are responsible for activity under your account. We may close accounts used for abuse or fraud.</p>
<h2>Liability</h2><p>To the extent permitted by law, our liability for any claim relating to an order is limited to the amount you paid for that order.</p>
<h2>Governing law</h2><p>These terms are governed by the laws of the State of New Jersey.</p>
<p>Questions: ${s.contactEmail}.</p>` },
};

export default function InfoPage() {
  const { slug = '' } = useParams();
  const page = PAGES[slug];
  const { settings } = useCatalog();
  useSeo({ title: page?.title, description: page?.description, path: `/${slug}` });
  if (!page) return <NotFound />;
  return <div className="wrap max-w-3xl py-10"><div className="eyebrow">Kind Flames</div><h1 className="mb-6 text-4xl">{page.title}</h1><div className="prose text-[15px]" dangerouslySetInnerHTML={{ __html: page.body(settings) }} /></div>;
}
