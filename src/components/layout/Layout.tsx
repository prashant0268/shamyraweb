import { useEffect, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import { useCatalog } from '../../context/CatalogContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { settings } = useCatalog();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => { const c = params.get('code'); if (c) { try { localStorage.setItem('kf_code', c.toUpperCase()); } catch { /* ignore */ } } }, [params]);
  return (
    <div className="flex min-h-screen flex-col">
      {settings.announcement?.visible && settings.announcement.text && (
        <div className="bg-pine px-4 py-1.5 text-center text-xs font-medium text-pine-ink sm:text-sm">{settings.announcement.text}</div>
      )}
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
