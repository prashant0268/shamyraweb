import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ROUTE_PRELOADS } from './lazyRoutes';
import { initConsent } from './lib/consent';

export const APP_VERSION = '2.0.0';
console.log(`%cKind Flames v${APP_VERSION}`, 'color:#C68A1E;font-weight:bold');
initConsent(); // Consent Mode defaults; loads the Meta Pixel only if the visitor already opted in

// When the app starts on a lazily loaded page, fetch its chunk first: the static HTML stays on screen meanwhile
// instead of flashing a loading fallback.
const route = ROUTE_PRELOADS.find(([re]) => re.test(window.location.pathname));
const ready = route ? route[1].preload().catch(() => undefined) : Promise.resolve();

ready.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
