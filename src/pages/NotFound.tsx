import Button from '../components/ui/Button';
import { useSeo } from '../lib/seo';
export default function NotFound() {
  useSeo({ title: 'Page not found', noindex: true });
  return <div className="wrap py-24 text-center"><div className="eyebrow">404</div><h1 className="mt-2 text-3xl">That page has burned out.</h1><p className="mt-2 text-muted">Try the shop, or head home.</p><div className="mt-5 flex justify-center gap-3"><Button to="/shop">Shop</Button><Button variant="ghost" to="/">Home</Button></div></div>;
}
