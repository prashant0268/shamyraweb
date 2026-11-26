import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { error: Error | null }

/**
 * Root error boundary: a render error anywhere shows a friendly page instead of a blank screen.
 * Deliberately self-contained (no router, context or theme-dependent components) so it still renders when
 * whatever crashed was one of those. A stale chunk after a deploy is the usual cause, so "Reload" is the fix.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Uncaught render error', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-center text-ink" role="alert">
        <div className="max-w-md">
          <img src="/img/logo-lockup.png" alt="Kind Flames" width="120" height="82" className="mx-auto h-12 w-auto" />
          <h1 className="mt-6 text-3xl">Something flickered out.</h1>
          <p className="mt-2 text-muted">This page hit a snag on our side. Your bag is saved. Reloading usually fixes it; if it doesn't, email hello@kindflames.com and we'll help.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="nav-link rounded-btn bg-pine px-5 py-2.5 font-bold text-pine-ink">Reload</button>
            <a href="/" className="nav-link rounded-btn border border-line px-5 py-2.5 font-bold">Go home</a>
          </div>
        </div>
      </main>
    );
  }
}
