import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { existsSync, readFileSync, statSync } from 'fs';

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

/** `vite preview` sends the same security headers as Firebase Hosting (firebase.json, source "**"), so the CSP
 *  can be checked locally before a deploy. */
function hostingHeaders(): Record<string, string> {
  try {
    const all = hosting().headers?.find((h) => h.source === '**')?.headers ?? [];
    // upgrade-insecure-requests and HSTS would break plain-http localhost.
    return Object.fromEntries(all.filter((h) => h.key !== 'Strict-Transport-Security' && h.key !== 'Cache-Control').map((h) => [h.key, h.key === 'Content-Security-Policy' ? h.value.replace(/;\s*upgrade-insecure-requests/, '') : h.value]));
  } catch { return {}; }
}

type HostingConfig = { headers?: { source: string; headers: { key: string; value: string }[] }[]; rewrites?: { source: string; destination?: string }[]; redirects?: { source: string; destination: string; type?: number }[] };
const hosting = (): HostingConfig => { try { return (JSON.parse(readFileSync(path.resolve(__dirname, 'firebase.json'), 'utf8')) as { hosting?: HostingConfig }).hosting ?? {}; } catch { return {}; } };
const globMatch = (glob: string, p: string) => (glob.endsWith('/**') ? p === glob.slice(0, -3) || p.startsWith(glob.slice(0, -2)) : p === glob);

/** `vite preview` resolves pages the way Firebase Hosting does with this firebase.json (cleanUrls, trailingSlash
 *  false): /shop → dist/shop/index.html, client-only routes → their rewrite (spa.html), redirects, and anything
 *  else → dist/404.html with a 404 status. Without it, preview's SPA fallback serves the home page everywhere. */
function firebaseHostingPreview(): Plugin {
  return {
    name: 'kf-firebase-hosting-preview',
    configurePreviewServer(server) {
      const dist = path.resolve(server.config.root, server.config.build.outDir);
      const cfg = hosting();
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://x');
        const p = decodeURIComponent(url.pathname);
        if ((req.method !== 'GET' && req.method !== 'HEAD') || path.extname(p)) return next();
        if (p.length > 1 && p.endsWith('/')) { res.statusCode = 301; res.setHeader('Location', p.slice(0, -1) + url.search); return res.end(); }
        const redirect = cfg.redirects?.find((r) => globMatch(r.source, p));
        if (redirect) { res.statusCode = redirect.type ?? 301; res.setHeader('Location', redirect.destination); return res.end(); }
        const file = path.join(dist, p === '/' ? 'index.html' : path.join(p, 'index.html'));
        const send = (f: string, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(readFileSync(f)); };
        if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) return send(file);
        const rewrite = cfg.rewrites?.find((r) => r.destination && globMatch(r.source, p));
        if (rewrite?.destination && existsSync(path.join(dist, rewrite.destination))) return send(path.join(dist, rewrite.destination));
        if (existsSync(path.join(dist, '404.html'))) return send(path.join(dist, '404.html'), 404);
        return next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const appEnv = (env.VITE_ENV || (mode === 'production' ? 'production' : 'development')).trim().toLowerCase();
  return {
    plugins: [react(), noindexOutsideProduction(appEnv === 'production'), firebaseHostingPreview()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    preview: { headers: hostingHeaders() },
    build: {
      rollupOptions: {
        output: {
          // Only Firebase gets a manual chunk. A PayPal manual chunk also swallowed its dependencies (React itself),
          // so every page imported and modulepreloaded "paypal"; left alone, PayPal ships with the lazy Checkout chunk.
          manualChunks(id) {
            if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return 'firebase';
            return undefined;
          },
        },
      },
    },
  };
});
