import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class IsaiahAppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[IsaiahAI] application render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-red-900/60 bg-zinc-900 p-6 shadow-2xl">
            <h1 className="text-lg font-bold text-white">IsaiahAI could not finish loading</h1>
            <p className="mt-2 text-sm text-zinc-400">
              The application started, but a component failed during startup. Your data has not been deleted.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950"
            >
              Reload IsaiahAI
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// GitHub Pages is static. Route core AI + IsaiahSearch requests to the shared
// Railway gateway; older auxiliary endpoints can continue using the legacy API
// base until their equivalents are moved.
if (typeof window !== 'undefined') {
  const legacyApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const gatewayApiBase = String(import.meta.env.VITE_GATEWAY_API_BASE_URL || 'https://codepro-gateway-production.up.railway.app').trim().replace(/\/+$/, '');
  const gatewayPaths = /^\/api\/(?:chat|breakaway|quick-search-links|more-search-links|search-summary-brief|search-summary|search-summary-more|search-summary-more-stream|health)$/;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let target: RequestInfo | URL = input;
    try {
      const raw = input instanceof Request ? input.url : String(input);
      const url = new URL(raw, window.location.href);
      if (url.origin === window.location.origin && /^\/api(?:\/|$)/.test(url.pathname)) {
        const apiBase = gatewayPaths.test(url.pathname) ? gatewayApiBase : legacyApiBase;
        if (apiBase) {
          const remoteUrl = apiBase + url.pathname + url.search + url.hash;
          target = input instanceof Request ? new Request(remoteUrl, input) : remoteUrl;
        }
      }
    } catch { /* keep normal fetch behavior for other inputs */ }
    return nativeFetch(target, init);
  }) as typeof window.fetch;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('IsaiahAI root element is missing.');

createRoot(rootElement).render(
  <StrictMode>
    <IsaiahAppErrorBoundary>
      <App />
    </IsaiahAppErrorBoundary>
  </StrictMode>,
);

// Remove the static boot screen once React has mounted.
requestAnimationFrame(() => {
  document.getElementById('boot-screen')?.remove();
});
