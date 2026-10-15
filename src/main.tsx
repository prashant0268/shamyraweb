import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

export const APP_VERSION = '2.0.0';
console.log(`%cKind Flames v${APP_VERSION}`, 'color:#C68A1E;font-weight:bold');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
