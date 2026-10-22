import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Non-production builds (`vite build --mode test`, or any mode whose VITE_ENV is not "production") get a
 *  static <meta name="robots" content="noindex,nofollow"> so crawlers never index the test site, JS or not.
 *  Production HTML is untouched. */
function noindexOutsideProduction(isProd: boolean): Plugin {
  return {
    name: 'kf-noindex-outside-production',
    transformIndexHtml(html) {
      if (isProd) return html;
      return html.replace('<meta name="viewport"', '<meta name="robots" content="noindex,nofollow" />\n    <meta name="viewport"');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const appEnv = (env.VITE_ENV || (mode === 'production' ? 'production' : 'development')).trim().toLowerCase();
  return {
    plugins: [react(), noindexOutsideProduction(appEnv === 'production')],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage', 'firebase/analytics'],
            paypal: ['@paypal/react-paypal-js'],
          },
        },
      },
    },
  };
});
