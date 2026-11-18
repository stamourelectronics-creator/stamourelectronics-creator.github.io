import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// GitHub Pages is static. Route core AI + IsaiahSearch requests to the shared
// Railway gateway; older auxiliary endpoints can continue using the legacy API
// base until their equivalents are moved. Both URLs are public endpoints only.
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
