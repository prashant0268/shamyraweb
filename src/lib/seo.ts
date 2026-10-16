import { useEffect } from 'react';

export const SITE = 'https://kindflames.com';
export const absUrl = (u: string) => (u.startsWith('http') ? u : SITE + u);
const DEFAULT_IMAGE = `${SITE}/img/og.jpg`;

export function useSeo(opts: { title?: string; description?: string; image?: string; path?: string; noindex?: boolean }) {
  useEffect(() => {
    const title = opts.title ? `${opts.title} · Kind Flames` : 'Kind Flames — Hand-poured candles & small-batch bath and body';
    const description = opts.description || 'Hand-poured coconut-soy candles, body scrubs, lotions and bath salts made in New Jersey. Scents built to pair.';
    const url = SITE + (opts.path ?? window.location.pathname);
    const image = opts.image ? absUrl(opts.image) : DEFAULT_IMAGE;
    document.title = title;
    const set = (sel: string, attr: string, val: string) => {
      let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(sel);
      if (!el) { el = document.createElement(sel.startsWith('link') ? 'link' : 'meta'); const [k, v] = sel.match(/\[(.+?)="(.+?)"\]/)!.slice(1); el.setAttribute(k!, v!); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    set('meta[name="description"]', 'content', description);
    set('meta[property="og:title"]', 'content', title);
    set('meta[property="og:description"]', 'content', description);
    set('meta[property="og:url"]', 'content', url);
    set('meta[property="og:image"]', 'content', image);
    set('meta[name="twitter:card"]', 'content', 'summary_large_image');
    set('meta[name="robots"]', 'content', opts.noindex ? 'noindex,nofollow' : 'index,follow');
    set('link[rel="canonical"]', 'href', url);
  }, [opts.title, opts.description, opts.image, opts.path, opts.noindex]);
}

/** Keeps one <script type="application/ld+json" id=…> in <head> in sync with `data`; removed when `data` is null or on unmount. */
export function useJsonLd(id: string, data: object | null) {
  const json = data ? JSON.stringify(data) : null;
  useEffect(() => {
    document.getElementById(id)?.remove();
    if (!json) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json'; el.id = id; el.textContent = json;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [id, json]);
}
