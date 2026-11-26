import { lazy, useState, type ComponentType } from 'react';

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;
export type LazyPage<P> = ComponentType<P> & { preload: () => Promise<unknown> };

/**
 * React.lazy plus a `preload()`. Once the chunk has loaded, the page renders directly instead of through
 * <Suspense>, so main.tsx can preload the current route's chunk before the first render and the prerendered
 * HTML is never swapped for a loading fallback.
 */
export function lazyPage<P extends object>(loader: Loader<P>): LazyPage<P> {
  let Loaded: ComponentType<P> | null = null;
  let pending: Promise<unknown> | null = null;
  const load = () => (pending ??= loader().then((m) => { Loaded = m.default; return m; }));
  const Lazy = lazy(() => load().then(() => ({ default: Loaded as ComponentType<P> })));
  // Pick the component once per mount: switching from <Lazy> to <Loaded> on a later render would remount the page
  // and throw away its state (e.g. a half-filled checkout form).
  const Page = ((props: P) => {
    const [C] = useState<ComponentType<P>>(() => Loaded ?? Lazy);
    return <C {...props} />;
  }) as LazyPage<P>;
  Page.preload = load;
  return Page;
}
