import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const APP_VERSION = '1.0.3';
console.log(`%cKind Flames v${APP_VERSION}`, 'color: #f59e0b; font-weight: bold; font-size: 14px;');

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
