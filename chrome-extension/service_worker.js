'use strict';

// The API key stays on the deployed IsaiahAI server. This extension sends only
// page context the user explicitly asks about to the server-side /api/site-assist route.
const DEFAULT_API_BASES = [
  'https://isaiah-ai-acel.netlify.app',
  'https://isaiahai.netlify.app'
];

async function getApiBases() {
  const stored = await chrome.storage.local.get(['isaiahAiApiBase']);
  const custom = String(stored.isaiahAiApiBase || '').trim().replace(/\/$/, '');
  const bases = custom ? [custom, ...DEFAULT_API_BASES] : DEFAULT_API_BASES;
  return [...new Set(bases.filter(value => /^https:\/\//i.test(value)))];
}

function captureVisiblePage(windowId) {
  return new Promise(resolve => {
    try {
      chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 48 }, dataUrl => {
        if (chrome.runtime.lastError || typeof dataUrl !== 'string') return resolve(null);
        resolve(dataUrl);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

async function askIsaiahAI(message, sender) {
  const tab = sender && sender.tab;
  if (!tab || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error('Open a regular website tab first. Chrome internal pages and the Chrome Web Store do not allow page assistants.');
  }

  // Capture only after the user clicks Ask. If screenshot capture is blocked,
  // the assistant can still use the page text and links gathered by the content script.
  const screenshot = await captureVisiblePage(tab.windowId);
  const requestBody = {
    question: String(message.question || '').slice(0, 6000),
    pageTitle: String(message.pageTitle || tab.title || '').slice(0, 300),
    pageUrl: tab.url,
    pageText: String(message.pageText || '').slice(0, 26000),
    links: Array.isArray(message.links) ? message.links.slice(0, 70) : [],
    history: Array.isArray(message.history) ? message.history.slice(-8) : [],
    includeWeb: true,
    images: screenshot ? [{ data: screenshot, mimeType: 'image/jpeg' }] : []
  };

  let lastError;
  for (const base of await getApiBases()) {
    try {
      const response = await fetch(`${base}/api/site-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(52000)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data.content !== 'string') {
        throw new Error(data && (data.error || data.message) || `IsaiahAI server returned HTTP ${response.status}`);
      }
      return { ...data, screenshotUsed: Boolean(screenshot), apiBase: base };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`${lastError && lastError.message ? lastError.message : 'Could not reach IsaiahAI.'} Check that the IsaiahAI Netlify site is deployed and OPENROUTER_API_KEY is set on that site.`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'ISAIAHAI_PAGE_ASSIST') return;
  askIsaiahAI(message, sender)
    .then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error && error.message ? error.message : String(error) }));
  return true;
});
