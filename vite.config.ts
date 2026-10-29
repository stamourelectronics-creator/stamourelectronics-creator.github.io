import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const netlifyIframeWrapper = process.env.VITE_NETLIFY_IFRAME_WRAPPER === 'true';
const pagesUrl = 'https://stamourelectronics-creator.github.io/';

const netlifyWrapperHtml = `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#101114" />
<title>IsaiahAI</title>
<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101114}iframe{display:block;border:0;width:100%;height:100%;min-height:100dvh;background:#101114}.loading{position:fixed;inset:0;display:grid;place-items:center;color:#fbbf24;font:600 13px system-ui;pointer-events:none}</style>
</head><body>
<div class="loading" id="loading">Opening IsaiahAI…</div>
<iframe title="IsaiahAI" src="${pagesUrl}" allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen; display-capture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
<script>document.querySelector('iframe').addEventListener('load',()=>{const el=document.getElementById('loading');if(el)el.remove()});</script>
</body></html>`;

export default defineConfig(() => ({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    { name: 'isaiahai-netlify-iframe-wrapper', transformIndexHtml() { return netlifyIframeWrapper ? netlifyWrapperHtml : undefined; } },
  ],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
