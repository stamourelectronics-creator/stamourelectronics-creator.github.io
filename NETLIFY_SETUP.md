# IsaiahAI Acceleration — Netlify deployment

The public frontend is configured to publish to https://stamourelectronics-creator.github.io/isaiahsearch/. After the repository owner enables GitHub Pages with the GitHub Actions source, Netlify can serve a lightweight iframe wrapper while its Functions continue to provide the AI chat and web-search API.

## Build settings

The included `netlify.toml` sets the build command to `npm run build`, publishes `dist`, and uses the `netlify/functions` directory.

## Environment variables

In Netlify, open **Site configuration → Environment variables** and add these variables. Give them Functions/runtime scope and redeploy after changing them.

- `OPENROUTER_API_KEY` — required for IsaiahAI 7.0 SUPER and the OpenRouter free-model fallback for the other chat models.
- `GEMINI_API_KEY` — optional and used for the separate image-generation path. Normal text chat uses OpenRouter free models first.
- `APP_URL` — optional; set this to the full public Netlify site URL for OpenRouter request metadata.

Never put API keys in `index.html`, `src/`, or any variable beginning with `VITE_`, because those values are exposed to visitors.

## Included API behavior

- All chat personas use OpenRouter free endpoints with automatic fallbacks. The free endpoints cost $0 per token at the time this was checked, but their provider capacity and rate limits can change; no free model can guarantee unlimited use or always-fast responses. Text requests lead with `nvidia/nemotron-3-ultra-550b-a55b:free`, then try the faster `nvidia/nemotron-3.5-lightning:free` and `openrouter/free`. Requests containing images try `nvidia/nemotron-3.5-super-vl:free` first with a 15-second cap, then fall back to faster text-only models if vision inference is unavailable. The Chrome page assistant sends page text, links, and (when Chrome permits capture) a screenshot to that vision model; ordinary text questions use the long-context reasoning model first. Empty responses, busy endpoints, and failed requests trigger a fallback instead of silently returning empty output.
- Web search combines live DuckDuckGo HTML results, Bing RSS, Google News RSS, and at most two Wikipedia results per batch. It de-duplicates links and caps repeated domains in general searches, so the results should contain a wider variety of sites instead of being dominated by Wikipedia. It can show up to 24 links per batch and supports expanded results/pagination. If live indexes return too few items, clearly labelled search-engine pages are used as a fallback rather than fake article citations.
- Search Assistant summaries use returned source URLs and provide a source-based Markdown fallback when the AI provider is down. This prevents the assistant panel from appearing empty when a summary request cannot reach an AI provider.
- Search Assistant summaries are based on the returned sources and keep functioning without a Gemini key.
- `/api/search-summary-more-stream` returns a streamed text response so the existing search UI can progressively display the report.

Note: Netlify Functions do not provide WebSocket upgrades. Any realtime voice/Wisp feature that relies on `/api/live` or `/api/wisp` needs a separate WebSocket-capable service; this does not affect standard AI chat or HTTP web search.

## Chrome extension and search setup

- The launch popup downloads `public/downloads/isaiahai-chrome-extension.zip`. Extract it, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked** for the extracted folder containing `manifest.json`.
- The extension adds an **Ask IsaiahAI** button on ordinary HTTP/HTTPS pages. It sends page text, links, and a screenshot only after the user submits a question. Chrome internal pages and the Chrome Web Store are blocked by Chrome itself. The extension does not embed an API key; it calls the deployed `/api/site-assist` endpoint.
- If your deployment URL differs from the bundled default, open the extension's **Details → Extension options** and enter your exact HTTPS Netlify site URL.
- In the app's browser **Settings → Search**, copy the `/?q=%s` URL and follow the displayed Chrome instructions to add Isaiah Search as a site search engine (shortcut `@isaiah`). The site also serves `/api/opensearch.xml`.
- Search results merge DuckDuckGo, Bing RSS, Google News RSS and a small Wikipedia contribution. A fallback may add clearly labelled search-engine portals if live providers return too few direct articles; it does not fabricate article URLs.
- Clicking a result leaves the in-app proxy view and opens the actual selected URL in a new browser tab by default. The app's setting can instead navigate the current tab.

## After publishing

1. Set `OPENROUTER_API_KEY` under Netlify **Site configuration → Environment variables** with Functions/runtime scope. The site cannot call a hosted AI model without a valid provider key.
2. Optionally set `GEMINI_API_KEY` only if you want to enable the separate Gemini-based image-generation path.
3. Trigger a new deploy so the functions receive the variables.
4. Test a chat message with IsaiahAI 7.0 SUPER and another model, then run a web search and use **Show More Results** to verify the next live batch and pagination. Check the Netlify function logs if an upstream provider returns an error.

The OpenRouter API key pasted into a conversation should be rotated and replaced with a new key in Netlify. The included Chrome extension never contains the key; it calls `/api/site-assist` on the deployed IsaiahAI server. Do not paste API keys into client-side files.
