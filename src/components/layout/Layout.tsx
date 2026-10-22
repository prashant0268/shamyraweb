import { useEffect, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import WelcomePopup from './WelcomePopup';
import { useTheme } from '../../context/ThemeContext';
import { themeMeta } from '../../themes';
import { ENV_LABEL, FIREBASE_PROJECT_ID } from '../../lib/env';

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { theme, preview } = useTheme();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => { const c = params.get('code'); if (c) { try { localStorage.setItem('kf_code', c.toUpperCase()); } catch { /* ignore */ } } }, [params]);
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WelcomePopup />
      {preview && <div className="fixed bottom-4 left-4 z-[80] rounded-pill bg-ink px-3 py-1.5 text-xs font-semibold text-bg shadow-lg">Previewing theme: {themeMeta(theme).name} · <a href="?theme=reset" className="underline">exit</a></div>}
      {ENV_LABEL && <div className="fixed bottom-4 right-4 z-[80] rounded-pill bg-warn px-3 py-1.5 text-xs font-bold tracking-wide text-white shadow-lg print:hidden" role="status" title={FIREBASE_PROJECT_ID ? `Firebase project: ${FIREBASE_PROJECT_ID}` : undefined}>{ENV_LABEL}</div>}
    </div>
  );
}
