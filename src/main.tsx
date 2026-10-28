import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// GitHub Pages is static, so route the app's /api requests to the existing Netlify backend.
// This is a public endpoint URL, not a credential; all API secrets stay server-side.
if (typeof window !== 'undefined') {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\\/+$/, '');
  if (apiBase) {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let target: RequestInfo | URL = input;
      try {
        const raw = input instanceof Request ? input.url : String(input);
        const url = new URL(raw, window.location.href);
        if (url.origin === window.location.origin && /^\\/api(?:\\/|$)/.test(url.pathname)) {
          const remoteUrl = apiBase + url.pathname + url.search + url.hash;
          target = input instanceof Request ? new Request(remoteUrl, input) : remoteUrl;
        }
      } catch { /* keep normal fetch behavior for other inputs */ }
      return nativeFetch(target, init);
    }) as typeof window.fetch;
  }
}
// Prevent pinch-to-zoom and gesture zooming on mobile
if (typeof window !== 'undefined') {
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
