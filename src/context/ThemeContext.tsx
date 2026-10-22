import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useCatalog } from './CatalogContext';
import { DEFAULT_THEME, isThemeId, themeMeta, type ThemeId } from '../themes';

/**
 * Resolves the storefront theme and applies it to <html data-theme>.
 * Order: `?theme=` in the URL (kept for the session so you can preview a theme by link)
 *      → the theme saved in Admin → Appearance → the default.
 * The admin area always renders in the default theme so its screens stay readable.
 */
const Ctx = createContext<{ theme: ThemeId; preview: boolean }>({ theme: DEFAULT_THEME, preview: false });
export const useTheme = () => useContext(Ctx);

const PREVIEW_KEY = 'kf_theme_preview';
const CACHE_KEY = 'kf_theme';
const read = (store: Storage, k: string) => { try { return store.getItem(k); } catch { return null; } };
const write = (store: Storage, k: string, v: string | null) => { try { if (v === null) store.removeItem(k); else store.setItem(k, v); } catch { /* ignore */ } };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useCatalog();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const urlTheme = params.get('theme');

  useEffect(() => {
    if (urlTheme === 'reset' || urlTheme === 'off') write(sessionStorage, PREVIEW_KEY, null);
    else if (isThemeId(urlTheme)) write(sessionStorage, PREVIEW_KEY, urlTheme);
  }, [urlTheme]);

  const previewTheme = isThemeId(urlTheme) ? urlTheme : (read(sessionStorage, PREVIEW_KEY) as ThemeId | null);
  const saved = isThemeId(settings.theme) ? settings.theme : DEFAULT_THEME;
  const preview = !!previewTheme && previewTheme !== saved;
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/internal');
  const theme: ThemeId = isAdmin ? DEFAULT_THEME : previewTheme && isThemeId(previewTheme) ? previewTheme : saved;

  useEffect(() => {
    const html = document.documentElement;
    if (theme === DEFAULT_THEME) html.removeAttribute('data-theme'); else html.setAttribute('data-theme', theme);
    if (!isAdmin && !preview) write(localStorage, CACHE_KEY, theme); // lets index.html apply it before React mounts next visit
    const meta = themeMeta(theme);
    let link = document.getElementById('theme-fonts') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.id = 'theme-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
    if (link.href !== meta.fonts.href) link.href = meta.fonts.href;
    const tc = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (tc) tc.content = meta.swatches[1];
  }, [theme, isAdmin, preview]);

  const value = useMemo(() => ({ theme, preview }), [theme, preview]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
