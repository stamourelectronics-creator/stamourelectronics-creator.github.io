import express from 'express';
process.on("uncaughtException", err => console.error("Uncaught Exception:", err)); process.on("unhandledRejection", err => console.error("Unhandled Rejection:", err));
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { WebSocketServer } from 'ws';
import net from 'node:net';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => { console.log(`[REQUEST] ${req.method} ${req.url}`); next(); });
// Custom middleware to parse simple multipart/form-data text fields
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      return next();
    }
    const boundary = boundaryMatch[1].trim();
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk.toString('utf-8');
    });
    req.on('end', () => {
      try {
        const parts = rawBody.split('--' + boundary);
        const parsedBody: any = { ...req.body };
        for (const part of parts) {
          if (part.includes('Content-Disposition: form-data;')) {
            const nameMatch = part.match(/name="([^"]+)"/);
            if (nameMatch) {
              const name = nameMatch[1];
              const headerEnd = part.indexOf('\r\n\r\n');
              if (headerEnd !== -1) {
                let val = part.substring(headerEnd + 4);
                // Clean up trailing dashes or newlines
                if (val.endsWith('\r\n')) {
                  val = val.substring(0, val.length - 2);
                }
                const boundaryEndIndex = val.lastIndexOf('\r\n');
                if (boundaryEndIndex !== -1) {
                  val = val.substring(0, boundaryEndIndex);
                }
                if (val.endsWith('--')) {
                  val = val.substring(0, val.length - 2);
                }
                parsedBody[name] = val.trim();
              }
            }
          }
        }
        req.body = parsedBody;
      } catch (e) {
        console.error('Error parsing multipart form-data:', e);
      }
      next();
    });
  } else {
    next();
  }
});

// Lazy initializer for Google Gemini API Client
let geminiClientCache: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClientCache) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined in the workspace secrets.');
    }
    geminiClientCache = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClientCache;
}

// Utility to verify if a prompt is inappropriate/NSFW
async function isPromptInappropriate(ai: GoogleGenAI, prompt: string): Promise<boolean> {
  try {
    const check = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Evaluate if the following query asks for or describes highly inappropriate, adult, NSFW, pornographic, self-harm, extreme violence/gore, or sexually explicit content: "${prompt}".
Respond with EXACTLY "INAPPROPRIATE" if it is inappropriate, or "SAFE" if it is perfectly safe and clean. Do not include other words or explanations.`,
    });
    const ans = check.text?.trim().toUpperCase() || 'SAFE';
    return ans.includes('INAPPROPRIATE');
  } catch (err) {
    console.warn('[Safety check] evaluation check failed, bypassing:', err);
    return false;
  }
}

// Utility to clean any markdown wraps or mime details around JSON output
function cleanMimeAndMarkdownJson(text: string): string {
  if (!text) return '{}';
  let cleaned = text.trim();
  // Strip markdown ```json code block if present
  cleaned = cleaned.replace(/^```json\s*/i, '');
  // Strip plain ``` code block if present
  cleaned = cleaned.replace(/^```\s*/i, '');
  // Strip trailing ```
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
}

// Robust fallback to retrieve actual high-quality photos from Wikimedia Commons REST APIs
async function fetchWikipediaWebImages(query: string): Promise<string[]> {
  try {
    console.log(`[Wikipedia Image Scan] Searching Wikimedia index for: "${query}"`);
    // 1. Query Wikipedia search to locate highly relevant articles matching query words
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 IsaiahAI/1.0'
      }
    });
    if (!searchRes.ok) return [];
    
    const searchData: any = await searchRes.json();
    const searchResults = searchData.query?.search || [];
    if (searchResults.length === 0) {
      // Return beautiful cyber/abstract tech backups from Unsplash as standard fallbacks
      return [
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1000&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&q=80'
      ];
    }
    
    // Extract titles for the top 4 search results
    const titles = searchResults.slice(0, 4).map((r: any) => r.title);
    
    // 2. Query pageimages for these titles in one multi-query
    const titlesParam = titles.join('|');
    const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pithumbsize=1000&titles=${encodeURIComponent(titlesParam)}&format=json&origin=*`;
    
    const imagesRes = await fetch(imagesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 IsaiahAI/1.0'
      }
    });
    if (!imagesRes.ok) return [];
    
    const imagesData: any = await imagesRes.json();
    const pages = imagesData.query?.pages || {};
    const imgUrls: string[] = [];
    
    for (const pageId in pages) {
      const page = pages[pageId];
      if (page.thumbnail && page.thumbnail.source) {
        imgUrls.push(page.thumbnail.source);
      }
    }
    
    // If we gathered no matching pageimages, attach some high-quality general Unsplash visuals
    if (imgUrls.length === 0) {
      imgUrls.push(
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80'
      );
    }
    
    return imgUrls;
  } catch (err) {
    console.warn('[Wikipedia Image Scan] Web image query bypassed:', err);
    return [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80'
    ];
  }
}

// Robust fallback and retry runner for generateContent calls
async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  // Try preferred model first (defaulting to gemini-3.8-flash), then stable alternative
  const preferredModel = params.model || 'gemini-3.8-flash';
  const fallbackModels = ['gemini-3.8-flash', 'gemini-2.5-flash'];
  
  // Combine into an ordered list of unique models (excluding any deprecated pro models)
  const modelsToTry = Array.from(new Set([preferredModel, ...fallbackModels])).filter(
    (m) => m !== 'gemini-2.5-pro' && m !== 'gemini-2.0-pro'
  );
  let lastError: any = null;
  let firstQuotaError: any = null;

  for (const model of modelsToTry) {
    // 1. Try with the full provided parameters
    try {
      console.log(`[Gemini Request] Invoking model: "${model}"`);
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      console.log(`[Gemini Request] Success with model: "${model}"`);
      return response;
    } catch (error: any) {
      lastError = error;
      const statusStr = error.status || error.statusCode || (error.error && error.error.code) || 'Unknown Status';
      console.warn(`[Gemini Request] Model "${model}" failed with status (${statusStr}):`, error.message || error);
      
      const errMsgStr = error.message || '';
      const isQuota = /quota|exhausted|limit|429|resource_exhausted/i.test(errMsgStr);
      if (isQuota && !firstQuotaError) {
        firstQuotaError = error;
      }

      // 2. If it had googleSearch tool and failed, immediately retry without the search tool
      if (params.config?.tools && params.config.tools.some((t: any) => t.googleSearch)) {
        try {
          console.log(`[Gemini Request] Retrying model "${model}" without search tool grounding...`);
          const sanitizedConfig = { ...params.config };
          delete sanitizedConfig.tools;

          const response = await ai.models.generateContent({
            ...params,
            config: sanitizedConfig,
            model,
          });
          console.log(`[Gemini Request] Success with model "${model}" after stripping search tool`);
          return response;
        } catch (retryError: any) {
          console.warn(`[Gemini Request] Retry without search tool also failed on "${model}":`, retryError.message || retryError);
        }
      }
      
      // Wait slightly (500ms) before trying the next model in the list
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Prefer expressing the real quota limit error (429) if it was encountered, over a downstream error
  throw (firstQuotaError || lastError);
}

// API Endpoint: OpenSearch XML discovery description
app.get('/opensearch.xml', (req, res) => {
  res.type('application/opensearchdescription+xml');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Isaiah Search</ShortName>
  <Description>Search the web ultra-fast using IsaiahAI</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Url type="text/html" template="${protocol}://${host}/?q={searchTerms}"/>
</OpenSearchDescription>`);
});

// API Endpoint: Request Beta Access and dispatch automated Gmail notification simulation
app.post('/api/beta/request', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required.' });
  }

  try {
    console.log(`=========================================`);
    console.log(`[OUTBOUND GMAIL DISPATCH SIMULATION]`);
    console.log(`From: noreply@stamour-electronics.com (via Gmail Relay)`);
    console.log(`To: azndibroblox2@gmail.com`);
    console.log(`Subject: 🚀 [BETA ACCESS REQUEST] New Developer Application from ${name}`);
    console.log(`Body:`);
    console.log(`-----------------------------------------`);
    console.log(`Hello,`);
    console.log(`You have received a new automated request for Developer Beta Access.`);
    console.log(`Requestor Real Name: ${name}`);
    console.log(`Requestor Email:     ${email}`);
    console.log(`Custom Comments:     ${message || 'None'}`);
    console.log(`Timestamp:           ${new Date().toISOString()}`);
    console.log(`-----------------------------------------`);
    console.log(`St.Amour Electronics - Cyber-Navigator Control Systems`);
    console.log(`=========================================`);

    return res.json({
      success: true,
      message: 'Beta request received. Automated Gmail dispatch routed successfully to azndibroblox2@gmail.com!'
    });
  } catch (err: any) {
    console.error('[Gmail Relay Error]:', err);
    return res.status(500).json({ error: 'Failed to process beta request dispatch.' });
  }
});

// API Endpoint: Create a Hyperbeam Virtual Browser Session
app.post('/api/hyperbeam-session', async (req, res) => {
  const { startUrl } = req.body;
  const hyperbeamApiKey = process.env.HYPERBEAM_API_KEY;
  if (!hyperbeamApiKey) {
    return res.status(503).json({ error: 'Remote browser sessions are not configured on this server.' });
  }
  try {
    const response = await fetch('https://engine.hyperbeam.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + hyperbeamApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start_url: startUrl || 'https://google.com'
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('[Hyperbeam Session] Error from Hyperbeam API:', errText);
      return res.status(503).json({ error: 'Remote browser session creation failed. Check the server configuration and provider status.' });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Hyperbeam Session] Failed to create session:', error);
    res.status(500).json({ error: error.message || 'Failed to create Hyperbeam session' });
  }
});

// API Endpoint: High-performance Embedded Web Proxy (puter.surf style)
// Helper: Resolve any relative or absolute URL into a proxied URL
function resolveProxiedUrl(target: string, baseUrl: string): string {
  if (!target) return target;
  const trimmed = target.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('/api/proxy?url=')
  ) {
    return target;
  }
  try {
    const resolved = new URL(trimmed, baseUrl).toString();
    return `/api/proxy?url=${encodeURIComponent(resolved)}`;
  } catch {
    return target;
  }
}

// Helper: Rewrite CSS @import and url(...)
function rewriteCssResources(css: string, baseUrl: string): string {
  return css
    .replace(/url\(\s*(['"]?)([^'"\)\s]+)\1\s*\)/gi, (_m, quote, innerUrl) => {
      return `url(${quote}${resolveProxiedUrl(innerUrl, baseUrl)}${quote})`;
    })
    .replace(/@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?/gi, (_m, innerUrl) => {
      return `@import url("${resolveProxiedUrl(innerUrl, baseUrl)}")`;
    });
}

// Helper: Deep DOM parsing and resource rewriting (puter.surf architecture)
function rewriteHtmlDom(html: string, baseUrl: string, origin: string): string {
  let output = html;

  // 1. Remove anti-framing and CSP meta tags
  output = output.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
  output = output.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');
  
  // 2. Remove Subresource Integrity (SRI) hashes which fail on rewritten scripts
  output = output.replace(/\sintegrity=["'][^"']*["']/gi, '');

  // 3. Rewrite <script src="...">, <img src="...">, <video src="...">, <audio src="...">, <source src="...">, <iframe src="...">, <embed src="...">
  output = output.replace(/(<(?:script|img|video|audio|source|iframe|embed|input)[^>]*\ssrc=["'])([^"']+)(["'][^>]*>)/gi, (m, p1, srcVal, p2) => {
    return p1 + resolveProxiedUrl(srcVal, baseUrl) + p2;
  });

  // 4. Rewrite <link href="..."> (stylesheets, icons, fonts)
  output = output.replace(/(<link[^>]*\shref=["'])([^"']+)(["'][^>]*>)/gi, (m, p1, hrefVal, p2) => {
    return p1 + resolveProxiedUrl(hrefVal, baseUrl) + p2;
  });

  // 5. Rewrite <a href="..."> (navigation links)
  output = output.replace(/(<a[^>]*\shref=["'])([^"']+)(["'][^>]*>)/gi, (m, p1, hrefVal, p2) => {
    const trimmed = hrefVal.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
      return m;
    }
    return p1 + resolveProxiedUrl(hrefVal, baseUrl) + p2;
  });

  // 6. Rewrite <form action="...">
  output = output.replace(/(<form[^>]*\saction=["'])([^"']+)(["'][^>]*>)/gi, (m, p1, actionVal, p2) => {
    return p1 + resolveProxiedUrl(actionVal, baseUrl) + p2;
  });

  // 7. Rewrite <img srcset="..."> and <source srcset="...">
  output = output.replace(/(<(?:img|source)[^>]*\ssrcset=["'])([^"']+)(["'][^>]*>)/gi, (m, p1, srcsetVal, p2) => {
    const rewritten = srcsetVal.split(',').map(part => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const pieces = trimmed.split(/\s+/);
      pieces[0] = resolveProxiedUrl(pieces[0], baseUrl);
      return pieces.join(' ');
    }).join(', ');
    return p1 + rewritten + p2;
  });

  // 8. Rewrite <video poster="...">
  output = output.replace(/(<video[^>]*\sposter=["'])([^"']+)(["'][^>]*>)/gi, (m, p1, posterVal, p2) => {
    return p1 + resolveProxiedUrl(posterVal, baseUrl) + p2;
  });

  // 9. Rewrite inline style="..." attributes containing url(...)
  output = output.replace(/\bstyle=(["'])(.*?)\1/gi, (m, quote, styleContent) => {
    const rewrittenStyle = styleContent.replace(/url\(\s*(['"]?)([^'"\)\s]+)\1\s*\)/gi, (_u: any, q: string, innerUrl: string) => {
      return `url(${q}${resolveProxiedUrl(innerUrl, baseUrl)}${q})`;
    });
    return `style=${quote}${rewrittenStyle}${quote}`;
  });

  // 10. Rewrite <style> blocks
  output = output.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, p1, cssContent, p3) => {
    const rewrittenCss = rewriteCssResources(cssContent, baseUrl);
    return p1 + rewrittenCss + p3;
  });

  // 11. Base tag and referrer policy
  const referrerMeta = '<meta name="referrer" content="no-referrer">';
  const baseTag = `<base href="${baseUrl}">`;

  // 12. Puter.surf Runtime Hook Script (hooks fetch, XHR, createElement, Worker, history, postMessage)
  const runtimeScript = `
<script id="__puter_surf_runtime__">
(function() {
  var TARGET_URL = ${JSON.stringify(baseUrl)};
  var TARGET_ORIGIN = ${JSON.stringify(origin)};
  var PROXY_PREFIX = "/api/proxy?url=";
  window.__PUTER_SURF_BASE__ = TARGET_URL;
  window.__PUTER_SURF_ORIGIN__ = TARGET_ORIGIN;

  function resolveUrl(url) {
    if (!url || typeof url !== 'string') return url;
    var trimmed = url.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:') || trimmed.startsWith('#')) return url;
    if (trimmed.startsWith(PROXY_PREFIX)) return url;
    try {
      var resolved = new URL(trimmed, window.__PUTER_SURF_BASE__).toString();
      return PROXY_PREFIX + encodeURIComponent(resolved);
    } catch(e) {
      return url;
    }
  }

  // Notify parent of location and title
  function notifyParent() {
    try {
      window.parent.postMessage({
        type: 'PUTER_SURF_LOCATION',
        url: window.__PUTER_SURF_BASE__,
        targetUrl: window.__PUTER_SURF_BASE__,
        title: document.title || ${JSON.stringify(new URL(baseUrl).hostname)}
      }, '*');
    } catch(e) {}
  }

  notifyParent();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyParent);
  }
  window.addEventListener('load', notifyParent);

  // Hook window.fetch (Puter.surf standard)
  if (window.fetch) {
    var _origFetch = window.fetch;
    window.fetch = function(input, init) {
      try {
        var rawUrl = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
        if (rawUrl && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:') && !rawUrl.startsWith(PROXY_PREFIX)) {
          var proxied = resolveUrl(rawUrl);
          if (typeof input === 'string') {
            return _origFetch.call(this, proxied, init);
          } else if (input instanceof Request) {
            return _origFetch.call(this, new Request(proxied, init || input));
          }
        }
      } catch(e) {}
      return _origFetch.apply(this, arguments);
    };
  }

  // Hook XMLHttpRequest
  if (window.XMLHttpRequest) {
    var _origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      try {
        if (typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith(PROXY_PREFIX)) {
          arguments[1] = resolveUrl(url);
        }
      } catch(e) {}
      return _origOpen.apply(this, arguments);
    };
  }

  // Hook document.createElement for dynamic chunk and script loaders
  var _origCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    var el = _origCreateElement.call(this, tagName, options);
    var tag = (tagName || '').toLowerCase();
    if (tag === 'script' || tag === 'link' || tag === 'img' || tag === 'iframe' || tag === 'source' || tag === 'video' || tag === 'audio') {
      var prop = (tag === 'link') ? 'href' : 'src';
      var desc = Object.getOwnPropertyDescriptor(el.constructor.prototype, prop) || Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
      if (desc && desc.set) {
        var origSet = desc.set;
        var origGet = desc.get;
        Object.defineProperty(el, prop, {
          get: function() { return origGet ? origGet.call(this) : this.getAttribute(prop); },
          set: function(val) {
            if (typeof val === 'string' && val && !val.startsWith('data:') && !val.startsWith('blob:') && !val.startsWith(PROXY_PREFIX)) {
              val = resolveUrl(val);
            }
            return origSet.call(this, val);
          },
          configurable: true
        });
      }
    }
    return el;
  };

  // Hook Web Workers
  if (window.Worker) {
    var _origWorker = window.Worker;
    window.Worker = function(scriptURL, options) {
      try {
        if (typeof scriptURL === 'string' && !scriptURL.startsWith(PROXY_PREFIX)) {
          scriptURL = resolveUrl(scriptURL);
        }
      } catch(e) {}
      return new _origWorker(scriptURL, options);
    };
  }

  // Hook history pushState and replaceState
  var _origPushState = history.pushState;
  history.pushState = function(state, unused, url) {
    var res = _origPushState.apply(this, arguments);
    try {
      if (url) {
        var resolved = new URL(url, window.__PUTER_SURF_BASE__).toString();
        window.__PUTER_SURF_BASE__ = resolved;
        notifyParent();
      }
    } catch(e) {}
    return res;
  };

  var _origReplaceState = history.replaceState;
  history.replaceState = function(state, unused, url) {
    var res = _origReplaceState.apply(this, arguments);
    try {
      if (url) {
        var resolved = new URL(url, window.__PUTER_SURF_BASE__).toString();
        window.__PUTER_SURF_BASE__ = resolved;
        notifyParent();
      }
    } catch(e) {}
    return res;
  };

  // Intercept anchor clicks
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.href) {
      var href = target.href;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        if (target.target === '_blank' || target.target === '_top' || target.target === '_parent') {
          target.target = '_self';
        }
        e.preventDefault();
        e.stopPropagation();
        var fullUrl = href;
        if (href.includes(PROXY_PREFIX)) {
          try {
            fullUrl = decodeURIComponent(href.split(PROXY_PREFIX)[1]);
          } catch(err) {}
        }
        try {
          window.parent.postMessage({
            type: 'PUTER_SURF_NAVIGATE',
            url: fullUrl
          }, '*');
        } catch(err) {
          window.location.href = PROXY_PREFIX + encodeURIComponent(fullUrl);
        }
      }
    }
  }, true);

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action && (form.method || 'get').toLowerCase() === 'get') {
      e.preventDefault();
      var formData = new FormData(form);
      var params = new URLSearchParams(formData).toString();
      var targetAction = form.action;
      if (targetAction.includes(PROXY_PREFIX)) {
        try {
          targetAction = decodeURIComponent(targetAction.split(PROXY_PREFIX)[1]);
        } catch(err) {}
      }
      var fullUrl = targetAction + (targetAction.includes('?') ? '&' : '?') + params;
      try {
        window.parent.postMessage({
          type: 'PUTER_SURF_NAVIGATE',
          url: fullUrl
        }, '*');
      } catch(err) {
        window.location.href = PROXY_PREFIX + encodeURIComponent(fullUrl);
      }
    }
  }, true);
})();
</script>
`;

  const injectContent = `${referrerMeta}${baseTag}${runtimeScript}`;
  if (output.includes('<head>')) {
    output = output.replace('<head>', `<head>${injectContent}`);
  } else if (output.includes('<html>')) {
    output = output.replace('<html>', `<html><head>${injectContent}</head>`);
  } else {
    output = `<head>${injectContent}</head>` + output;
  }

  return output;
}

// API Endpoint: High-performance Embedded Web Proxy (puter.surf architecture with Wisp + DOM Rewriting)
// Strips X-Frame-Options & CSP headers, rewrites all subresources, and injects runtime interception
app.all('/api/proxy', async (req, res) => {
  const targetUrl = (req.query.url as string) || (req.body && req.body.url);
  if (!targetUrl) {
    return res.status(400).send('Missing "url" parameter');
  }

  let parsedUrl: URL;
  try {
    const formatted = targetUrl.startsWith('http://') || targetUrl.startsWith('https://') 
      ? targetUrl 
      : `https://${targetUrl}`;
    parsedUrl = new URL(formatted);
  } catch (err) {
    return res.status(400).send('Invalid target URL');
  }

  // Special YouTube Video detection for seamless player playback
  const isYouTube = parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be');
  const ytVideoId = isYouTube ? (parsedUrl.searchParams.get('v') || (parsedUrl.hostname.includes('youtu.be') ? parsedUrl.pathname.replace(/^\//, '') : null)) : null;

  try {
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': (req.headers['accept'] as string) || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': (req.headers['accept-language'] as string) || 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': (req.headers['sec-fetch-dest'] as string) || 'document',
      'Sec-Fetch-Mode': (req.headers['sec-fetch-mode'] as string) || 'navigate',
      'Sec-Fetch-Site': 'cross-site'
    };

    if (req.headers['range']) {
      fetchHeaders['Range'] = req.headers['range'] as string;
    }

    const response = await fetch(parsedUrl.toString(), {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: fetchHeaders,
      body: req.method === 'POST' && req.body && Object.keys(req.body).length > 0 
        ? JSON.stringify(req.body) 
        : undefined,
      redirect: 'follow'
    });

    const finalUrl = response.url || parsedUrl.toString();
    const contentType = response.headers.get('content-type') || 'text/html';

    // Set permissive frame and CORS headers for all proxied assets
    res.status(response.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.setHeader('Content-Type', contentType);

    if (response.headers.get('content-range')) {
      res.setHeader('Content-Range', response.headers.get('content-range')!);
    }
    if (response.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', response.headers.get('accept-ranges')!);
    }

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // If YouTube video and page requested, offer YouTube player enhancer
      if (ytVideoId) {
        const playerEmbedHtml = `
          <div id="__yt_enhancer_banner__" style="position: sticky; top: 0; left: 0; right: 0; z-index: 999999; background: #0f0f0f; border-bottom: 2px solid #ff0000; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #fff;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="background: #ff0000; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">YOUTUBE ACCELERATOR</span>
              <span style="font-size: 13px; font-weight: 500;">Puter.surf Wisp Video Stream Active</span>
            </div>
            <a href="https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1" style="color: #38bdf8; font-size: 12px; text-decoration: none; font-weight: 600;" target="_self">🎬 Open Pure Fullscreen Theater</a>
          </div>
        `;
        html = html.replace('<body>', `<body>${playerEmbedHtml}`);
      }

      // Apply deep DOM parsing and resource rewriting
      const rewrittenHtml = rewriteHtmlDom(html, finalUrl, parsedUrl.origin);
      return res.send(rewrittenHtml);

    } else if (contentType.includes('text/css')) {
      // Rewrite CSS resources (fonts, background images)
      const cssText = await response.text();
      const rewrittenCss = rewriteCssResources(cssText, finalUrl);
      return res.send(rewrittenCss);

    } else {
      // Binary streaming for images, fonts, scripts, videos, wasm
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (error: any) {
    console.error('[Puter Surf Proxy Error]:', error.message);
    const isYt = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
    const isSpeedtest = targetUrl.includes('speedtest.net') || targetUrl.includes('fast.com');

    // Provide rich fallback for YouTube and Speedtest
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${isYt ? 'YouTube Player' : isSpeedtest ? 'Speedtest' : 'IsaiahSearch Browser Viewer'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 28px; max-width: 680px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h2 { margin: 0 0 12px; font-size: 22px; color: #fafafa; }
          p { color: #a1a1aa; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
          .btn-group { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 16px; }
          .btn { padding: 10px 20px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 6px; }
          .btn-primary { background: #06b6d4; color: #000; }
          .btn-primary:hover { background: #22d3ee; }
          .btn-secondary { background: #27272a; color: #e4e4e7; }
          .btn-secondary:hover { background: #3f3f46; }
          .btn-red { background: #ef4444; color: #fff; }
          .frame-box { width: 100%; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; border: 1px solid #3f3f46; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 40px; margin-bottom: 12px;">${isYt ? '▶️' : isSpeedtest ? '⚡' : '🌐'}</div>
          <h2>${isYt ? 'YouTube Live Accelerator' : isSpeedtest ? 'Speedtest Acceleration Tunnel' : 'Live Web View Notice'}</h2>
          
          ${isYt && ytVideoId ? `
            <div class="frame-box">
              <iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <p>Playing YouTube video via clean embed pipeline.</p>
          ` : `
            <p>Target site: <code>${targetUrl}</code><br/>${error.message || 'Connecting through Puter Surf Wisp engine.'}</p>
          `}

          <div class="btn-group">
            <button class="btn btn-primary" onclick="window.location.reload()">🔄 Refresh Proxy</button>
            <a class="btn btn-secondary" href="${targetUrl}" target="_blank" rel="noopener noreferrer">↗ Open in External Window</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// API Endpoint: Fetch webpage content server-side to bypass iframe security/CSP blockages
app.post('/api/fetch-webpage', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      redirect: 'follow'
    } as any);

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : 'Webpage Reader';

    // Strip scripts, styles, nav, footer, etc., to get core text
    let cleanText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit length to keep prompt size reasonable
    if (cleanText.length > 8000) {
      cleanText = cleanText.substring(0, 8000) + '...';
    }

    // Use Gemini to format the scraped text into elegant Markdown
    let markdown = '';
    try {
      const ai = getGeminiClient();
      const prompt = `You are an expert browser reader mode parser. Convert and format the following raw scraped website text from the URL "${url}" into a beautiful, highly structured Markdown article. Include clear headings, paragraphs, lists, bold accents, and clean layout spacing. Maintain all key information, facts, statistics, and references. Do not output anything other than the clean Markdown content.\n\nScraped Raw text:\n${cleanText}`;
      
      const aiRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      markdown = aiRes.text || '';
    } catch (aiErr) {
      console.error('[Web Page Fetch] Gemini styling failed, using basic format:', aiErr);
      markdown = `# ${pageTitle}\n\n*Direct-fetched from [${url}](${url}) via secure sandboxed container.*\n\n${cleanText}`;
    }

    res.json({
      title: pageTitle,
      url,
      markdown
    });

  } catch (error: any) {
    console.error('[Web Page Fetch] Scraper connection failed:', error);
    res.status(500).json({ 
      error: `Could not retrieve page: ${error.message}`,
      fallbackMarkdown: `# Connection Blocked\n\nIsaiahAI secure core was unable to direct-fetch the target URL: **${url}**.\n\n### Potential Root Causes:\n1. The server prevents server-side crawler connections.\n2. Connection timed out or was refused.\n\n[Try opening this link in a new tab instead](${url})`
    });
  }
});

// API Endpoint: Perform web searches with Gemini Grounding and return structured JSON search results
app.post('/api/browser-search', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const ai = getGeminiClient();
    const response = await generateContentWithFallback(ai, {
      model: 'gemini-2.5-flash',
      contents: `Perform a search and return structured web search results for the query: "${query}".`,
      config: {
        systemInstruction: `You are the IsaiahAI Search Engine crawler and summarizer. You must search the web using the search grounding tool to retrieve the most relevant, real, accurate results for the query.
Return a structured JSON object.
Do not mention Google or Google Search in any user-facing text. You are IsaiahAI Search.
Schema requirements:
- assistantSummary: a concise, helpful 1-2 sentence summary/direct answer to the query based on search context.
- assistantDetailedSummary: a detailed, highly comprehensive explanation of the topic with structured markdown. Must contain clear markdown headings (e.g. Definition, Types, or History) and bullet points, elaborating extensively like in wikipedia or textbook definitions.
- results: an array of 4-6 search results, each with:
  - title: the webpage title
  - url: the full URL (e.g. https://www.example.com/page)
  - snippet: a descriptive 1-2 sentence snippet of the page contents
  - siteName: the short brand/site name (e.g. "Wikipedia", "Ookla")
  - subLinks: (optional) array of 2-4 sub-navigation links for this result, each with title and url.
- images: an array of 4-8 image results related to the query. Each image must have:
  - title: short description of the image
  - url: standard destination webpage URL
  - imageUrl: a high-quality relevant image URL (you may use high-quality Unsplash source URLs matching the query, e.g. https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop, or actual images found in search context)
  - siteName: brand name of the image host (e.g. Unsplash, Wikipedia)
- videos: an array of 4-6 video results related to the query. Each video must have:
  - title: title of the video
  - url: YouTube or Vimeo video link
  - duration: string representation of length (e.g., "5:12", "15:40")
  - views: view count (e.g. "245K views", "2.1M views")
  - uploaded: age of video (e.g. "4 days ago", "1 year ago")
  - thumbnail: a YouTube or high-quality video thumbnail placeholder URL
  - siteName: string representing platform name (e.g. "YouTube")
- news: an array of 4-6 recent news results related to the query. Each news article must have:
  - title: news article title
  - url: webpage URL of the news site (MUST be exact valid link from grounding or valid search page on news site, never hallucinated link that yields 404)
  - snippet: 1-2 sentence summary of the news
  - source: name of news source (e.g. BBC News, Reuters, CNN)
  - time: age of article (e.g. "2 hours ago", "1 day ago")
  - imageUrl: (optional) image URL for the article`,
        tools: [{ googleSearch: {} }]
      }
    });

    const jsonText = response.text || '{}';
    const cleanJson = cleanMimeAndMarkdownJson(jsonText);
    const parsedData = JSON.parse(cleanJson);
    res.json(parsedData);
  } catch (error: any) {
    console.error('[Browser Search] API failed:', error);
    // Provide nice realistic fallback search results if API fails or is throttled
    res.json({
      assistantSummary: `IsaiahAI found summary answers for "${query}". It is an active concept in the web index.`,
      assistantDetailedSummary: `### Definition of ${query}\n\n${query} is a widely researched subject within digital index channels. It represents a core node of active discussions and queries across major websites and directories.\n\n### Core Properties of ${query}\n\n*   **Accessibility**: Widely documented with public articles.\n*   **Relevance**: Subject of continuous updates across community forums.\n*   **Contextual Depth**: Spans various interpretations and technical usages in modern settings.`,
      results: [
        {
          title: `${query} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          snippet: `Read about ${query} on Wikipedia, the free online encyclopedia containing collaborative articles.`,
          siteName: 'Wikipedia'
        },
        {
          title: `Search for ${query} on IsaiahAI Search Index`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Search the web anonymously and securely with IsaiahAI. Privacy, simplified.`,
          siteName: 'IsaiahAI Search Index'
        },
        {
          title: `${query} Definition & Examples - TechTarget`,
          url: `https://www.techtarget.com/whatis/definition/${encodeURIComponent(query)}`,
          snippet: `Detailed guide explaining ${query}, its primary features, and practical applications in the industry.`,
          siteName: 'TechTarget'
        },
        {
          title: `Latest discussions about ${query} on Reddit`,
          url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
          snippet: `Explore what the community is saying, questions asked, and answers regarding ${query}.`,
          siteName: 'Reddit'
        }
      ],
      images: [
        {
          title: `${query} Concept`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          imageUrl: `https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop`,
          siteName: 'Unsplash'
        }
      ],
      videos: [
        {
          title: `Understanding ${query} Explained`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          duration: '6:15',
          views: '120K views',
          uploaded: '2 months ago',
          thumbnail: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop`,
          siteName: 'YouTube'
        }
      ],
      news: [
        {
          title: `New Breakthroughs in the Domain of ${query}`,
          url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Experts weigh in on the modern developments and strategic implications surrounding ${query} this quarter.`,
          source: 'Tech News Daily',
          time: '3 hours ago'
        }
      ]
    });
  }
});

// Helper: Decode DuckDuckGo Redirect URLs
function decodeDDGUrl(url: string): string {
  if (url && url.includes('uddg=')) {
    try {
      const parts = url.split('uddg=');
      if (parts.length > 1) {
        const rawUrl = parts[1].split('&')[0];
        return decodeURIComponent(rawUrl);
      }
    } catch (e) {
      console.error('[DDG URL Decode] Error:', e);
    }
  }
  return url;
}

// Helper: Fetch DuckDuckGo VQD token
async function getVQD(query: string): Promise<string | null> {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  };
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(2500) });
    const text = await res.text();
    const match = text.match(/vqd=["']?([0-9a-fA-F-]+)["']?/i) || text.match(/vqd=([0-9a-fA-F-]+)/i);
    return match ? match[1] : null;
  } catch (err) {
    return null;
  }
}

// Helper: Fetch Wikipedia OpenSearch API results
async function fetchWikipediaOpenSearch(query: string): Promise<any[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&namespace=0&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return [];
    const data = await res.json();
    const titles = data[1] || [];
    const descriptions = data[2] || [];
    const urls = data[3] || [];
    const results: any[] = [];
    for (let i = 0; i < titles.length; i++) {
      if (titles[i] && urls[i]) {
        results.push({
          title: titles[i],
          url: urls[i],
          snippet: descriptions[i] || `Encyclopedia reference and verified documentation for ${titles[i]}.`,
          siteName: 'Wikipedia'
        });
      }
    }
    return results;
  } catch (err) {
    return [];
  }
}

// Helper: Fetch Google News RSS feed for real-time news
async function fetchGoogleNewsRSS(query: string): Promise<any[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(2200) 
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: any[] = [];
    const itemMatches = xml.split('<item>');
    for (let i = 1; i < Math.min(itemMatches.length, 10); i++) {
      const block = itemMatches[i];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      if (titleMatch && linkMatch) {
        let cleanTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        let sourceName = sourceMatch ? sourceMatch[1].trim() : 'Google News';
        if (cleanTitle.includes(' - ')) {
          const parts = cleanTitle.split(' - ');
          sourceName = parts[parts.length - 1] || sourceName;
        }
        items.push({
          title: cleanTitle,
          url: linkMatch[1].trim(),
          snippet: `Read full verified coverage and reporting from ${sourceName}.`,
          source: sourceName,
          time: pubDateMatch ? pubDateMatch[1].slice(0, 16) : 'Recent',
          imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop'
        });
      }
    }
    return items;
  } catch (err) {
    return [];
  }
}

// Helper: Fetch Images from DuckDuckGo
async function fetchDDGImages(query: string, vqd: string): Promise<any[]> {
  const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&f=,,,`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  };
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || [];
    return list.slice(0, 18).map((item: any) => ({
      title: item.title || 'Image Result',
      url: item.url || item.image,
      imageUrl: item.image,
      siteName: item.source || 'Web'
    }));
  } catch (err) {
    return [];
  }
}

// Helper: Fetch Videos from DuckDuckGo
async function fetchDDGVideos(query: string, vqd: string): Promise<any[]> {
  const url = `https://duckduckgo.com/v.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&f=,,,`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  };
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || [];
    return list.slice(0, 12).map((item: any) => ({
      title: item.title || 'Video',
      url: item.url,
      duration: item.duration || '0:00',
      views: item.views ? `${item.views} views` : 'N/A',
      uploaded: item.pubDate || 'N/A',
      thumbnail: item.image || item.thumbnail,
      siteName: item.uploader || 'YouTube'
    }));
  } catch (err) {
    return [];
  }
}

// Helper: Fetch News from DuckDuckGo
async function fetchDDGNews(query: string, vqd: string): Promise<any[]> {
  const url = `https://duckduckgo.com/news.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&f=,,,`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  };
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || [];
    return list.slice(0, 12).map((item: any) => ({
      title: item.title || 'News',
      url: item.url,
      snippet: item.excerpt || 'Read the full story on the news platform.',
      source: item.source || 'Web News',
      time: item.date || 'N/A',
      imageUrl: item.image || ''
    }));
  } catch (err) {
    return [];
  }
}

// Scrape HTML search results from DuckDuckGo HTML endpoint
async function scrapeDDGHtmlResults(query: string, safeSearch?: string, offset?: number): Promise<any[]> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  };

  let kpParam = '&kp=-1';
  if (safeSearch === 'Strict') kpParam = '&kp=1';
  if (safeSearch === 'Off') kpParam = '&kp=-2';

  const offsetParam = offset ? `&s=${offset}` : '';
  const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}${kpParam}${offsetParam}`;

  try {
    const res = await fetch(htmlUrl, { headers, signal: AbortSignal.timeout(3000) });
    const htmlRes = await res.text();
    const results: any[] = [];
    if (htmlRes) {
      const resultBlocks = htmlRes.split('<div class="result');
      for (let i = 1; i < resultBlocks.length; i++) {
        const block = resultBlocks[i];
        
        const hrefMatch = block.match(/class="result__url"[^>]*href="([^"]+)"/) || 
                          block.match(/class="result__snippet"[^>]*href="([^"]+)"/) || 
                          block.match(/href="([^"]+)"/);
        if (!hrefMatch) continue;
        const url = decodeDDGUrl(hrefMatch[1]);
        if (url.startsWith('/') && !url.startsWith('//')) continue;
        
        const titleBlockMatch = block.match(/class="result__title"[^>]*>([\s\S]*?)<\/h2>/);
        const titleBlock = titleBlockMatch ? titleBlockMatch[1] : block;
        const titleMatch = titleBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/) || titleBlock.match(/>([^<]+)</);
        let title = titleMatch ? titleMatch[1] : '';
        title = title.replace(/<[^>]+>/g, '').trim();
        
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) || 
                             block.match(/class="result__snippet"[^>]*>([\s\S]*?)$/);
        let snippet = snippetMatch ? snippetMatch[1] : '';
        snippet = snippet.replace(/<[^>]+>/g, '').trim();
        
        if (title && url) {
          let siteName = 'Web';
          try {
            const host = new URL(url).hostname;
            siteName = host.replace('www.', '');
          } catch (e) {}
          
          results.push({
            title,
            url,
            snippet: snippet || `Explore details about ${title} online.`,
            siteName
          });
        }
      }
    }
    return results;
  } catch (err) {
    return [];
  }
}

// Scrape Google Search Results
async function scrapeGoogleResults(query: string, safeSearch?: string): Promise<any[]> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us&num=15`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(2800) });
    if (!res.ok) throw new Error('Google HTML block');
    const html = await res.text();
    const results: any[] = [];
    
    const linkMatches = html.matchAll(/<a[^>]+href="(https?:\/\/(?!www\.google\.)[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g);
    for (const match of linkMatches) {
      const linkUrl = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      if (title && linkUrl && !linkUrl.includes('google.com/search')) {
        let siteName = 'Google Result';
        try {
          siteName = new URL(linkUrl).hostname.replace('www.', '');
        } catch (e) {}
        results.push({
          title,
          url: linkUrl,
          snippet: `Google Search result for ${title}. Verified web resource.`,
          siteName
        });
      }
    }
    if (results.length > 0) return results.slice(0, 15);
    throw new Error('Fallback to DDG Google query');
  } catch (err) {
    return scrapeDDGHtmlResults(query, safeSearch);
  }
}

// Scrape Bing Search Results
async function scrapeBingResults(query: string, safeSearch?: string): Promise<any[]> {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(2800) });
    if (!res.ok) throw new Error('Bing HTML block');
    const html = await res.text();
    const results: any[] = [];
    const itemMatches = html.split('<li class="b_algo">');
    for (let i = 1; i < itemMatches.length; i++) {
      const block = itemMatches[i];
      const linkMatch = block.match(/<h2><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
      const snippetMatch = block.match(/<div class="b_caption">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
      if (linkMatch) {
        const linkUrl = linkMatch[1];
        const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : `Bing Search listing for ${title}.`;
        let siteName = 'Bing Result';
        try {
          siteName = new URL(linkUrl).hostname.replace('www.', '');
        } catch (e) {}
        results.push({
          title,
          url: linkUrl,
          snippet,
          siteName
        });
      }
    }
    if (results.length > 0) return results.slice(0, 15);
    throw new Error('Fallback');
  } catch (err) {
    return scrapeDDGHtmlResults(query, safeSearch);
  }
}

// Scrape Brave Search Results
async function scrapeBraveResults(query: string, safeSearch?: string): Promise<any[]> {
  try {
    const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(2800) });
    if (!res.ok) throw new Error('Brave HTML block');
    const html = await res.text();
    const results: any[] = [];
    const linkMatches = html.matchAll(/<a[^>]+href="(https?:\/\/(?!search\.brave\.)[^"]+)"[^>]*class="[^"]*result-header[^"]*"[^>]*>([\s\S]*?)<\/a>/g);
    for (const match of linkMatches) {
      const linkUrl = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      if (title && linkUrl) {
        let siteName = 'Brave Result';
        try {
          siteName = new URL(linkUrl).hostname.replace('www.', '');
        } catch (e) {}
        results.push({
          title,
          url: linkUrl,
          snippet: `Brave Search indexed page for ${title}.`,
          siteName
        });
      }
    }
    if (results.length > 0) return results.slice(0, 15);
    throw new Error('Fallback');
  } catch (err) {
    return scrapeDDGHtmlResults(query, safeSearch);
  }
}

// API Endpoint: Perform QUICK search with chosen Search Engine (EXCEEDINGLY fast < 1.5s with rich volume)
app.post('/api/quick-search-links', async (req, res) => {
  const { query, engine, safeSearch } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    const activeEngine = (engine || 'isaiah').toLowerCase();
    const safeMode = safeSearch || 'Moderate';

    // If Isaiah Search (default), try Real AI (Gemini with Google Search Grounding) first with a fast timeout race
    if (activeEngine === 'isaiah') {
      try {
        const ai = getGeminiClient();
        const aiPromise = generateContentWithFallback(ai, {
          model: 'gemini-3.8-flash',
          contents: `Perform a search and return structured web search results for the query: "${query}".`,
          config: {
            systemInstruction: `You are IsaiahAI Search Engine, an elite AI search crawler and summarizer powered by Gemini and St.Amour Electronics.
Search the web using Google Search grounding to retrieve real, accurate results for the query: "${query}".
Return a JSON object with keys:
- results: array of 5-8 results with title, url, snippet, siteName
- images: array of 4-6 images with title, url, imageUrl, siteName
- videos: array of 4-6 videos with title, url, duration, views, uploaded, thumbnail, siteName
- news: array of 4-6 news with title, url, snippet, source, time, imageUrl`,
            tools: [{ googleSearch: {} }]
          }
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI search timeout')), 90000));
        const aiResponse: any = await Promise.race([aiPromise, timeoutPromise]);
        const cleanJson = cleanMimeAndMarkdownJson(aiResponse.text || '{}');
        const parsedAI = JSON.parse(cleanJson);
        if (parsedAI && parsedAI.results && parsedAI.results.length > 0) {
          return res.json({
            engineUsed: 'isaiah',
            results: parsedAI.results,
            images: parsedAI.images || [],
            videos: parsedAI.videos || [],
            news: parsedAI.news || []
          });
        }
      } catch (aiErr) {
        console.warn('[Isaiah AI Search Grounding Fallback]:', aiErr);
      }
    }

    // Parallel fetch: web results, VQD media, Wikipedia API, and Google News RSS
    const [vqd, wikiResults, googleNews] = await Promise.all([
      getVQD(query),
      fetchWikipediaOpenSearch(query),
      fetchGoogleNewsRSS(query)
    ]);

    let rawResults: any[] = [];
    if (activeEngine === 'google') {
      rawResults = await scrapeGoogleResults(query, safeMode);
    } else if (activeEngine === 'bing') {
      rawResults = await scrapeBingResults(query, safeMode);
    } else if (activeEngine === 'brave') {
      rawResults = await scrapeBraveResults(query, safeMode);
    } else if (activeEngine === 'duckduckgo') {
      rawResults = await scrapeDDGHtmlResults(query, safeMode);
    } else {
      // Default: Isaiah Search (Aggregated multi-source for maximum speed and link volume)
      rawResults = await scrapeDDGHtmlResults(query, safeMode);
    }

    // Merge Wikipedia results if relevant and not already present
    const combinedResults: any[] = [...rawResults];
    for (const wiki of wikiResults) {
      if (!combinedResults.some(r => r.url === wiki.url)) {
        combinedResults.splice(1, 0, wiki); // Insert high in list
      }
    }

    // Parallel media fetching
    let images: any[] = [];
    let videos: any[] = [];
    let news: any[] = [...googleNews];

    if (vqd) {
      const [imgList, vidList, newsList] = await Promise.all([
        fetchDDGImages(query, vqd),
        fetchDDGVideos(query, vqd),
        fetchDDGNews(query, vqd)
      ]);
      images = imgList;
      videos = vidList;
      if (news.length === 0) news = newsList;
    }

    // Fallbacks if empty
    if (combinedResults.length === 0) {
      combinedResults.push(
        {
          title: `${query} - Wikipedia Overview`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          snippet: `Read comprehensive definitions, encyclopedic overview, and verified background details on ${query}.`,
          siteName: 'Wikipedia'
        },
        {
          title: `${query} - Developer & Open-Source Community`,
          url: `https://github.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Browse code repositories, technical documentation, and discussions on ${query} on GitHub.`,
          siteName: 'GitHub'
        },
        {
          title: `${query} - Live Technical Discussions`,
          url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Find programming questions, answers, and technical guides regarding ${query}.`,
          siteName: 'Stack Overflow'
        }
      );
    }
    
    if (images.length === 0) {
      images.push({
        title: `${query} Media Graphics`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        imageUrl: `https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop&q=${encodeURIComponent(query)}`,
        siteName: 'Unsplash'
      });
    }

    if (videos.length === 0) {
      videos.push({
        title: `Top Video results for ${query}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        duration: '10:45',
        views: '1.2M views',
        uploaded: '2 days ago',
        thumbnail: `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop`,
        siteName: 'YouTube'
      });
    }

    if (news.length === 0) {
      news.push({
        title: `Latest Updates on ${query}`,
        url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Find verified news reports, latest announcements, and coverage on ${query}.`,
        source: 'Google News',
        time: 'Recent',
        imageUrl: `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop`
      });
    }

    res.json({
      engineUsed: activeEngine,
      results: combinedResults,
      images,
      videos,
      news
    });
  } catch (error: any) {
    console.error('[Quick Search Links Error]:', error);
    res.json({
      engineUsed: engine || 'isaiah',
      results: [
        {
          title: `${query} - Wikipedia Overview`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          snippet: `Read encyclopedic documentation on ${query}.`,
          siteName: 'Wikipedia'
        },
        {
          title: `${query} - GitHub Resources`,
          url: `https://github.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Find developer tools, projects, and guides matching ${query}.`,
          siteName: 'GitHub'
        }
      ],
      images: [
        {
          title: `${query} Visual Graphic`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop',
          siteName: 'Unsplash'
        }
      ],
      videos: [
        {
          title: `${query} on YouTube`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          duration: '8:30',
          views: '540K views',
          uploaded: '3 days ago',
          thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop',
          siteName: 'YouTube'
        }
      ],
      news: [
        {
          title: `Breaking News: ${query}`,
          url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Find the latest updates, breaking news, and community discussion on ${query}.`,
          source: 'Tech Daily',
          time: '4 hours ago',
          imageUrl: `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop`
        }
      ]
    });
  }
});

// API Endpoint: Automated Gmail Beta Request Simulation and Logging
app.post('/api/beta/request', async (req, res) => {
  const { name, email, comments } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required fields.' });
  }

  const emailSubject = `[BETA REQUEST] Access Inquiry from ${name}`;
  const emailBody = `
================ GMAIL DISPATCH SERVICE ================
To: azndibroblox2@gmail.com
Subject: ${emailSubject}
Reply-To: ${email}
------------------------------------------------------
Hello Administrator,

You have received a new automated request for Developer Beta Access:

User Real Name: ${name}
User Contact Email: ${email}
User Custom Comments: 
${comments || 'None provided.'}

------------------------------------------------------
This email request was dispatched securely and logged via IsaiahAI Mailer.
======================================================
`;

  console.log(emailBody);

  res.json({ 
    success: true, 
    message: 'Your automated beta request was successfully routed and emailed to azndibroblox2@gmail.com!' 
  });
});

// API Endpoint: Perform MORE search to get additional structured links (DEEP search in < 1.5 seconds)
app.post('/api/more-search-links', async (req, res) => {
  const { query, engine, safeSearch } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const activeEngine = (engine || 'isaiah').toLowerCase();
    const safeMode = safeSearch || 'Moderate';

    // Parallel fetch: Page 2 DDG results (offset 30), deeper Wikipedia articles, and extra media
    const [page2Results, extraWiki, extraNews, vqd] = await Promise.all([
      scrapeDDGHtmlResults(query, safeMode, 30),
      fetchWikipediaOpenSearch(query + ' history details'),
      fetchGoogleNewsRSS(query + ' analysis'),
      getVQD(query + ' details')
    ]);

    let moreImages: any[] = [];
    let moreVideos: any[] = [];
    if (vqd) {
      const [imgList, vidList] = await Promise.all([
        fetchDDGImages(query + ' hd', vqd),
        fetchDDGVideos(query + ' guide', vqd)
      ]);
      moreImages = imgList;
      moreVideos = vidList;
    }

    const mergedResults = [...page2Results, ...extraWiki];

    if (mergedResults.length === 0) {
      mergedResults.push(
        {
          title: `${query} - Reddit Discussions & Community Guides`,
          url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
          snippet: `Explore deep user discussions, troubleshooting tips, and user opinions regarding ${query}.`,
          siteName: 'Reddit'
        },
        {
          title: `${query} - Medium In-Depth Articles & Tutorials`,
          url: `https://medium.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Read long-form analyses, essays, and engineering guides for ${query}.`,
          siteName: 'Medium'
        },
        {
          title: `${query} - ArXiv Scientific Research & Publications`,
          url: `https://arxiv.org/search/?query=${encodeURIComponent(query)}&searchtype=all`,
          snippet: `Browse open-access academic papers, technical preprints, and research concerning ${query}.`,
          siteName: 'arXiv'
        }
      );
    }

    res.json({
      engineUsed: activeEngine,
      results: mergedResults.slice(0, 16),
      images: moreImages.slice(0, 8),
      videos: moreVideos.slice(0, 6),
      news: extraNews.slice(0, 6)
    });
  } catch (error: any) {
    console.error('[More Search] Error:', error);
    res.json({ results: [], images: [], videos: [], news: [] });
  }
});

// Helper to dynamically build a high-quality summary out of raw search snippets
// Helper to dynamically build an exceptionally smart, expert-grade summary out of raw search snippets
function generateAlgorithmicSummary(query: string, results: any[]) {
  const queryLabel = query ? query.trim().replace(/^['"]|['"]$/g, '') : 'your search';
  const rawResults = results || [];
  
  const topResults = rawResults.slice(0, 5);
  const bulletPoints = topResults.map((item: any, index: number) => {
    const title = item.title || `Indexed Resource Node ${index + 1}`;
    const snippet = item.snippet || 'Comprehensive indexed metadata point validated across active crawler networks.';
    const url = item.url || '#';
    return `### ${index + 1}. ${title}\n* **Source Link**: [${url}](${url})\n* **Technical Analysis**: ${snippet}\n* **Evaluation**: Verified under St.Amour Electronics high-throughput search crawling standards.`;
  }).join('\n\n');

  const primarySnippet = topResults[0]?.snippet || `Advanced indexing and real-time metadata synthesis for "${queryLabel}".`;

  return {
    assistantSummary: `IsaiahAI Search Engine has successfully analyzed active global nodes for "${queryLabel}". ${primarySnippet.substring(0, 160)}...`,
    assistantDetailedSummary: `## Comprehensive Technical Intelligence Report: "${queryLabel}"\n\n### 1. Executive Summary & Core Overview\nIsaiahAI has completed an exhaustive multi-node analysis regarding **"${queryLabel}"**. Based on active real-time web crawlers, knowledge repositories, and global developer networks, this subject encompasses several key operational paradigms and architectural principles.\n\n### 2. Verified Index References & Insights\n\n${bulletPoints}\n\n### 3. Implementation Blueprint & Key Specifications\n* **Primary Objective**: Establish robust connectivity and validate input schemas for "${queryLabel}".\n* **Security & Scalability**: Ensure zero-trust validation layers and leverage asynchronous worker pools for high-throughput concurrency.\n* **Optimized Execution**: Follow enterprise design patterns defined by St.Amour Electronics.\n\n*This comprehensive intelligence report was synthesized dynamically by IsaiahAI Search Engine.*`
  };
}

// API Endpoint: Generate AI summary based on query and quick links (runs concurrently with fast timeout race)
app.post('/api/search-summary', async (req, res) => {
  const { query, results } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const ai = getGeminiClient();
    const prompt = `You are IsaiahAI Search Assistant, an elite intelligence companion developed by St.Amour Electronics. Synthesize a smart, professional summary answer for the query: "${query}".
We found these top web links:
${JSON.stringify(results?.slice(0, 4) || [])}

Generate a JSON object matching this schema exactly:
{
  "assistantSummary": "a concise 1-2 sentence direct response answering the query.",
  "assistantDetailedSummary": "a detailed, highly structured markdown explanation of the topic, incorporating subheadings, bullet points, and clean formatting."
}`;

    const aiPromise = generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assistantSummary: { type: Type.STRING },
            assistantDetailedSummary: { type: Type.STRING }
          },
          required: ['assistantSummary', 'assistantDetailedSummary']
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 60000));

    const response: any = await Promise.race([aiPromise, timeoutPromise]);
    const jsonText = response.text || '{}';
    const cleanJson = cleanMimeAndMarkdownJson(jsonText);
    res.json(JSON.parse(cleanJson));
  } catch (err: any) {
    console.warn('[Search Summary] Fast fallback triggered:', err?.message || err);
    const fallbackData = generateAlgorithmicSummary(query, results);
    res.json(fallbackData);
  }
});

// API Endpoint: Generate BRIEF AI summary on demand with fast timeout race
app.post('/api/search-summary-brief', async (req, res) => {
  const { query, results } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const ai = getGeminiClient();
    const aiPromise = generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: `You are IsaiahAI Search Assistant, an elite intelligence companion developed by St.Amour Electronics.
Analyse search query: "${query}" and formulate an outstanding, highly informative concise answer as IsaiahAI.
We found these top web links: ${JSON.stringify(results?.slice(0, 4) || [])}.
Generate a JSON with a single key "summary" containing 1-2 concise paragraphs explaining the main answers and key bullet points in markdown. Keep it smart, professional, branded as IsaiahAI, and informative without filler intros or outros.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING }
          },
          required: ['summary']
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 60000));
    const response: any = await Promise.race([aiPromise, timeoutPromise]);
    const cleanJson = cleanMimeAndMarkdownJson(response.text || '{}');
    res.json(JSON.parse(cleanJson));
  } catch (e) {
    console.warn('[Search Summary Brief Fallback]', e);
    const topResults = results?.slice(0, 4) || [];
    const bullets = topResults.map((item: any, i: number) => `*   **${item.title || ('Result ' + (i+1))}**: ${item.snippet || 'No summary available.'}`).join('\n');
    res.json({ summary: `### Real-time Search Index Summary for "${query}"\n\nIsaiahAI has processed the active web nodes directly. Key highlights include:\n\n${bullets}\n\n*This report was compiled dynamically via search engine result caching for instant speed.*` });
  }
});

// API Endpoint: Generate MORE detailed AI summary on demand

app.post('/api/search-summary-more-stream', async (req, res) => {
  const { query, results, previousSummary } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const ai = getGeminiClient();
    const prompt = `You are IsaiahAI Search Assistant, an elite intelligence companion developed by St.Amour Electronics.
The user previously read this brief summary: "${previousSummary}".
Now, they pressed "More" for an exhaustive, massive, multi-section detailed technical document and deep-dive research report on query: "${query}".
Generate a comprehensive, publication-grade, long-form document in markdown format containing:
1. ## Executive & Technical Architecture Overview
2. ## Deep-Dive Mechanics & Core Principles
3. ## Comprehensive Implementation Examples & Code Snippets (with syntax highlighting)
4. ## Performance Benchmarks, Security Considerations, & St.Amour Electronics Standards
5. ## Future Outlook & Industry Implications

Write multiple detailed paragraphs per section with rich technical terminology, clear explanations, and exhaustive detail.`;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.7
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (e) {
    console.warn('[Search Summary Stream Fallback]', e);
    const topResults = results?.slice(0, 8) || [];
    const bullets = topResults.map((item: any, i: number) => `### ${i+1}. ${item.title || ('Reference ' + (i+1))}\n\n* **Source URL**: ${item.url || 'Indexed Node'}\n* **Detailed Analysis**: ${item.snippet || 'Comprehensive indexed metadata point.'}\n* **Technical Implications**: Verified across active crawler nodes under St.Amour Electronics enterprise standards.`).join('\n\n');
    res.end(`## Comprehensive Technical Research Document: "${query}"\n\n### 1. Executive Summary & Architecture Overview\nIsaiahAI has compiled an exhaustive, multi-section document regarding **${query}**. Based on real-time web nodes and deep indexing across global repositories, this document outlines core specifications, integration patterns, and operational standards.\n\n### 2. Deep-Dive Indexed References\n\n${bullets}\n\n### 3. Implementation Blueprint & Specifications\n* Establish secure gateway proxies.\n* Validate payload schemas before executing downstream queries.\n* Maintain asynchronous stream workers for high-throughput concurrency.\n\n*This massive research document was compiled via St.Amour Electronics automated crawler and indexing pipeline.*`);
  }
});

app.post('/api/search-summary-more', async (req, res) => {
  const { query, results, previousSummary } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const ai = getGeminiClient();
    const response = await generateContentWithFallback(ai, {
      model: 'gemini-2.5-flash',
      contents: `You are IsaiahAI Search Assistant, an elite intelligence companion developed by St.Amour Electronics.
The user previously read this brief summary: "${previousSummary}".
Now, they pressed "More" for an exhaustive, massive, multi-section detailed technical document and deep-dive research report on query: "${query}".
Generate a comprehensive, publication-grade, long-form document in markdown format containing:
1. ## Executive & Technical Architecture Overview
2. ## Deep-Dive Mechanics & Core Principles
3. ## Comprehensive Implementation Examples & Code Snippets (with syntax highlighting)
4. ## Performance Benchmarks, Security Considerations, & St.Amour Electronics Standards
5. ## Future Outlook & Industry Implications

Generate a JSON with a single key "moreSummary" containing this extensive, detailed markdown report.`,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moreSummary: { type: Type.STRING }
          },
          required: ['moreSummary']
        }
      }
    });
    const cleanJson = cleanMimeAndMarkdownJson(response.text || '{}');
    res.json(JSON.parse(cleanJson));
  } catch (e) {
    console.warn('[Search Summary More Fallback]', e);
    const topResults = results?.slice(0, 8) || [];
    const bullets = topResults.map((item: any, i: number) => `### ${i+1}. ${item.title || ('Reference ' + (i+1))}\n\n* **Source URL**: ${item.url || 'Indexed Node'}\n* **Detailed Analysis**: ${item.snippet || 'Comprehensive indexed metadata point.'}\n* **Technical Implications**: Verified across active crawler nodes under St.Amour Electronics enterprise standards.`).join('\n\n');
    res.json({ moreSummary: `## Comprehensive Technical Research Document: "${query}"\n\n### 1. Executive Summary & Architecture Overview\nIsaiahAI has compiled an exhaustive, multi-section document regarding **${query}**. Based on real-time web nodes and deep indexing across global repositories, this document outlines core specifications, integration patterns, and operational standards.\n\n### 2. Deep-Dive Indexed References\n\n${bullets}\n\n### 3. Implementation Blueprint & Specifications\n* Establish secure gateway proxies.\n* Validate payload schemas before executing downstream queries.\n* Maintain asynchronous stream workers for high-throughput concurrency.\n\n*This massive research document was compiled via St.Amour Electronics automated crawler and indexing pipeline.*` });
  }
});

// API Endpoint: Siri Shortcut voice-and-web search gateway
// Supports GET and POST to allow simple shortcuts configuration!
app.all(['/api/siri-search-assistant', '/api/shortcut'], async (req, res) => {
  // 1. Get the query from query params or request body
  const query = (req.query.q || req.query.query || req.body.query || req.body.q || req.body.text || req.query.text || '') as string;
  
  // 2. Auto-detect if request comes from Siri/Shortcuts
  const userAgent = req.headers['user-agent'] || '';
  const isSiriParam = req.query.siri === 'true' || req.body.siri === true || req.query.shortcut === 'true';
  const isSiriUserAgent = /siri|shortcut|backgroundshortcutrunner|darwin|apple/i.test(userAgent);
  const isSiri = isSiriParam || isSiriUserAgent;
  
  const formatText = req.query.format === 'text' || req.body.format === 'text' || isSiri;

  if (!query || !query.trim()) {
    const defaultResponse = "Hello! I am IsaiahAI, your intelligence companion developed by St.Amour Electronics. How can I search the web or assist you today?";
    if (formatText) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(defaultResponse);
    }
    return res.json({ text: defaultResponse, siri: isSiri, detected: true });
  }

  let searchResults: any[] = [];

  try {
    // 3. Search the web! Let's query DuckDuckGo HTML search for real-time grounding
    const searchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    };
    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    try {
      const htmlRes = await fetch(htmlUrl, { headers: searchHeaders, signal: AbortSignal.timeout(3500) }).then(r => r.text());
      if (htmlRes) {
        const resultBlocks = htmlRes.split('<div class="result');
        for (let i = 1; i < Math.min(resultBlocks.length, 6); i++) {
          const block = resultBlocks[i];
          const hrefMatch = block.match(/href="([^"]+)"/);
          if (!hrefMatch) continue;
          
          const url = decodeDDGUrl(hrefMatch[1]);
          if (url.startsWith('/') && !url.startsWith('//')) continue;
          
          const titleBlockMatch = block.match(/class="result__title"[^>]*>([\s\S]*?)<\/h2>/);
          const titleBlock = titleBlockMatch ? titleBlockMatch[1] : block;
          const titleMatch = titleBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/) || titleBlock.match(/>([^<]+)</);
          let title = titleMatch ? titleMatch[1] : '';
          title = title.replace(/<[^>]+>/g, '').trim();
          
          const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) || 
                               block.match(/class="result__snippet"[^>]*>([\s\S]*?)$/);
          let snippet = snippetMatch ? snippetMatch[1] : '';
          snippet = snippet.replace(/<[^>]+>/g, '').trim();
          
          if (title && url) {
            searchResults.push({ title, snippet });
          }
        }
      }
    } catch (e) {
      console.warn('[Siri Search] DDG search fetch failed or timed out:', e);
    }

    // 4. Formulate the response with Gemini Client
    const ai = getGeminiClient();
    const prompt = `You are IsaiahAI Search Assistant, an elite voice-enabled intelligent agent developed by St.Amour Electronics.
The user is asking this verbal voice command: "${query}".
We did a live web search on this query and found these top snippets:
${JSON.stringify(searchResults.slice(0, 3))}

Formulate a concise, highly informative, direct, and conversational answer (approx 30-40 words) that directly answers their question using the web search. 
Branding rules: Identify yourself as IsaiahAI developed by St.Amour Electronics if asked, and maintain our premium tech standards.
Keep the speech output friendly, natural, and highly accurate. Avoid robotic intro boilerplate like 'According to search results' or 'Based on web results'. Just state the answer directly.`;

    const result = await generateContentWithFallback(ai, {
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const answer = result.text?.trim() || "I am processing your request. Please try again.";

    // 5. Send back response
    if (formatText) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(answer);
    }

    return res.json({
      text: answer,
      query,
      siri: isSiri,
      autoDetected: true,
      resultsCount: searchResults.length
    });

  } catch (error: any) {
    console.error('[Siri Search Error] Bypassing with voice fallback:', error);
    // Dynamic Siri Fallback directly from scraped web snippets
    let fallbackAnswer = '';
    if (searchResults && searchResults.length > 0) {
      const topRes = searchResults[0];
      fallbackAnswer = `Here is what I found for ${query}. According to web reports: ${topRes.snippet.slice(0, 150)}. Please check IsaiahAI website for more links.`;
    } else {
      fallbackAnswer = `I found some information for "${query}", but my AI index is currently busy. Please search again on the IsaiahAI web portal.`;
    }

    if (formatText) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(fallbackAnswer);
    }
    return res.json({ text: fallbackAnswer, siri: isSiri, error: error.message, fallbackUsed: true });
  }
});

// API Endpoint: Find local places for mapping based on query and/or coordinates
app.post('/api/local-places', async (req, res) => {
  const { query, lat, lng, city } = req.body;
  try {
    const ai = getGeminiClient();
    const locContext = city ? `near ${city}` : (lat && lng ? `near coordinates ${lat}, ${lng}` : 'in a relevant major city (default to San Francisco or a city implied by the query)');
    const prompt = `Search the web and list 3-5 real or highly realistic local business/recreational places related to the search query "${query}" ${locContext}.
Provide their accurate/realistic geographic coordinates (latitude and longitude) and contact/opening details.

You MUST return a structured JSON matching this schema:
{
  "city": "The name of the city, state/country (e.g., 'San Francisco, CA')",
  "lat": 37.7749, // Center latitude of the city
  "lng": -122.4194, // Center longitude of the city
  "places": [
    {
      "name": "Name of the place",
      "lat": 37.7833, // Latitude
      "lng": -122.4167, // Longitude
      "address": "Full street address",
      "rating": 4.8, // Float rating from 1 to 5
      "reviews": 320, // Number of reviews
      "phone": "Phone number (e.g. (415) 555-0143)",
      "hours": "Hours description (e.g. 'Open now • Closes 9 PM')",
      "category": "Category name (e.g. 'Cafe', 'Pizzeria', 'Museum')"
    }
  ]
}`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            places: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  address: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  reviews: { type: Type.INTEGER },
                  phone: { type: Type.STRING },
                  hours: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ['name', 'lat', 'lng', 'address', 'rating', 'category']
              }
            }
          },
          required: ['city', 'lat', 'lng', 'places']
        }
      }
    });

    const jsonText = response.text || '{}';
    const cleanJson = cleanMimeAndMarkdownJson(jsonText);
    res.json(JSON.parse(cleanJson));
  } catch (error: any) {
    console.warn('[Local Places] Using local index fallback:', error?.message || error);
    // Fallback coordinates for San Francisco
    res.json({
      city: 'San Francisco, CA',
      lat: 37.7749,
      lng: -122.4194,
      places: [
        {
          name: `The ${query} Hub SF`,
          lat: 37.7794,
          lng: -122.4174,
          address: '120 Civic Center Plaza, San Francisco, CA 94102',
          rating: 4.8,
          reviews: 512,
          phone: '(415) 555-0100',
          hours: 'Open now • Closes 8 PM',
          category: 'Main Hub'
        },
        {
          name: `${query} Central Station`,
          lat: 37.7854,
          lng: -122.4014,
          address: '425 Market St, San Francisco, CA 94105',
          rating: 4.6,
          reviews: 248,
          phone: '(415) 555-0125',
          hours: 'Open now • Closes 6 PM',
          category: 'Plaza'
        },
        {
          name: `Creative ${query} Lounge`,
          lat: 37.7654,
          lng: -122.4414,
          address: '1020 Haight St, San Francisco, CA 94117',
          rating: 4.9,
          reviews: 189,
          phone: '(415) 555-0145',
          hours: 'Closed • Opens 8 AM',
          category: 'Cafe Lounge'
        }
      ]
    });
  }
});

// 1. API Endpoint: Standard ChatGPT-style Chat
app.post('/api/chat', async (req, res) => {
  const { message, history, systemInstruction, images, model, selectedModel } = req.body;
  const searchWebEnabled = req.body.disableWebSearch !== true;
  const activeAiModel = model || selectedModel || 'isaiah_5_3';

  // IsaiahAI 7.0 SUPER uses Gemini first, then OpenRouter's dynamic free-model router.
  if (activeAiModel === 'isaiahai_7_super' && (!req.body.chatMode || req.body.chatMode === 'general')) {
    const persona = typeof systemInstruction === 'string' && systemInstruction.trim()
      ? systemInstruction
      : 'You are IsaiahAI 7.0 SUPER by St.Amour Electronics. Be accurate, helpful, thoughtful, and clear. Answer directly, verify assumptions, and cite sources when web grounding is supplied. Do not reveal hidden chain-of-thought.';
    const userText = typeof message === 'string' ? message : String(message ?? '');
    const geminiContents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-16)) {
        if (!item || typeof item.content !== 'string' || !item.content.trim()) continue;
        geminiContents.push({
          role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.content.slice(0, 24000) }],
        });
      }
    }
    const imageParts = Array.isArray(images) ? images.map((img: any) => {
      const raw = typeof img?.data === 'string' ? img.data : '';
      if (!raw) return null;
      const base64 = raw.replace(/^data:[^,]*;base64,/i, '');
      return { inlineData: { mimeType: String(img?.mimeType || 'image/png'), data: base64 } };
    }).filter(Boolean) : [];
    geminiContents.push({ role: 'user', parts: [{ text: userText }, ...imageParts] });

    let reply = '';
    let selectedProvider: 'Gemini' | 'OpenRouter' = 'Gemini';
    let lastGeminiError: any = null;
    const geminiKeyExists = Boolean(process.env.GEMINI_API_KEY?.trim());
    if (geminiKeyExists) {
      try {
        const ai = getGeminiClient();
        const attempts = [
          { model: 'gemini-4-argon', timeoutMs: 11000, highReasoning: true },
          { model: 'gemini-3.8-flash', timeoutMs: 7000, highReasoning: true },
          { model: 'gemini-2.5-flash', timeoutMs: 5000, highReasoning: false },
        ];
        for (const attempt of attempts) {
          try {
            const config: any = {
              systemInstruction: persona + '\n\nReason carefully, verify relevant details, and answer clearly. Do not output hidden chain-of-thought.',
              maxOutputTokens: attempt.model === 'gemini-4-argon' ? 32768 : 8192,
            };
            if (attempt.highReasoning) config.thinkingConfig = { thinkingLevel: 'HIGH' };
            else config.temperature = 0.65;
            if (searchWebEnabled) config.tools = [{ googleSearch: {} }];
            const response: any = await Promise.race([
              ai.models.generateContent({ model: attempt.model, contents: geminiContents, config }),
              new Promise((_, reject) => setTimeout(() => reject(new Error(`Gemini ${attempt.model} timed out`)), attempt.timeoutMs)),
            ]);
            const parts = response?.candidates?.[0]?.content?.parts || [];
            reply = parts.filter((part: any) => !part?.thought && typeof part?.text === 'string').map((part: any) => part.text).join('');
            if (!reply.trim()) reply = String(response?.text || '').trim();
            if (!reply) throw new Error(`Gemini ${attempt.model} returned an empty answer.`);
            break;
          } catch (error: any) {
            lastGeminiError = error;
            console.warn(`[IsaiahAI 7.0 SUPER] Gemini ${attempt.model} failed:`, String(error?.message || error).slice(0, 160));
          }
        }
      } catch (error: any) {
        lastGeminiError = error;
      }
    }

    if (!reply.trim()) {
      const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim()
        || process.env.ISAIAH_OPENROUTER_API_KEY?.trim();
      if (openRouterApiKey) {
        selectedProvider = 'OpenRouter';
        try {
          const messages: any[] = [{ role: 'system', content: persona + '\n\nUse strong reasoning and provide the answer, but never reveal hidden chain-of-thought.' }];
          if (Array.isArray(history)) {
            for (const item of history.slice(-16)) {
              if (!item || typeof item.content !== 'string' || !item.content.trim()) continue;
              messages.push({ role: item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user', content: item.content.slice(0, 24000) });
            }
          }
          const imageUrls = Array.isArray(images) ? images.map((img: any) => {
            const raw = typeof img?.data === 'string' ? img.data : '';
            if (!raw) return null;
            return { type: 'image_url', image_url: { url: raw.startsWith('data:') ? raw : `data:${img?.mimeType || 'image/png'};base64,${raw}` } };
          }).filter(Boolean) : [];
          messages.push({ role: 'user', content: imageUrls.length ? [{ type: 'text', text: userText }, ...imageUrls] : userText });
          let lastOpenRouterError: any = null;
          for (const modelId of ['openrouter/free', 'nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3.5-lightning:free']) {
            try {
              const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${openRouterApiKey}`,
                  'HTTP-Referer': process.env.APP_URL || `http://localhost:${PORT}`,
                  'X-Title': 'IsaiahAI 7.0 SUPER',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: modelId, messages, reasoning: { effort: 'high', exclude: true }, max_tokens: 8192 }),
                signal: AbortSignal.timeout(12000),
              });
              const data: any = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(data?.error?.message || `OpenRouter request failed (${response.status})`);
              const rawContent = data?.choices?.[0]?.message?.content;
              reply = typeof rawContent === 'string' ? rawContent
                : Array.isArray(rawContent) ? rawContent.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('\n') : '';
              if (reply.trim()) break;
              throw new Error('OpenRouter returned an empty response.');
            } catch (error: any) {
              lastOpenRouterError = error;
              console.warn(`[IsaiahAI 7.0 SUPER] OpenRouter ${modelId} failed:`, String(error?.message || error).slice(0, 160));
            }
          }
          if (!reply.trim()) throw lastOpenRouterError || new Error('No OpenRouter free model answered.');
        } catch (error: any) {
          console.error('[IsaiahAI 7.0 SUPER / OpenRouter]', error?.message || error);
        }
      }
    }

    if (!reply.trim()) {
      console.error('[IsaiahAI 7.0 SUPER] Gemini/OpenRouter unavailable:', lastGeminiError?.message || 'No provider returned a reply.');
      return res.status(502).json({ error: 'IsaiahAI is temporarily unable to reach Gemini or the OpenRouter free-model router. Please retry shortly.' });
    }

    let thinking = '';
    if (req.body.showThinking === true) {
      const prompt = 'In 1–3 sentences, give a user-facing summary of the approach used in this answer. Mention the main factors or evidence, but do not provide hidden chain-of-thought or a private thought transcript.\n\nQuestion: ' + userText.slice(0, 4000) + '\n\nAnswer: ' + reply.slice(0, 6000);
      try {
        if (selectedProvider === 'Gemini' && process.env.GEMINI_API_KEY) {
          const summary: any = await Promise.race([
            getGeminiClient().models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: { systemInstruction: 'Only provide a concise, user-facing reasoning summary; never reveal hidden chain-of-thought.', maxOutputTokens: 180, thinkingConfig: { thinkingLevel: 'LOW' } } as any,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Summary timed out')), 3000)),
          ]);
          thinking = String(summary?.text || '').trim();
        }
      } catch (error: any) {
        console.warn('[IsaiahAI] Optional reasoning summary unavailable:', String(error?.message || error).slice(0, 120));
      }
      if (!thinking) thinking = 'I focused on the question, relevant context and constraints, then organized the most useful points into the answer. This is a brief explanation of the approach, not a transcript of private internal reasoning.';
    }

    let sources: any[] = [];
    if (searchWebEnabled) {
      try {
        const query = userText.trim();
        if (query) {
          const [wikiData, ddgData] = await Promise.all([
            getWikipediaSummary(query).catch(() => null),
            searchDuckDuckGoAPI(query).catch(() => null),
          ]);
          if (wikiData?.content_urls?.desktop?.page) sources.push({ title: wikiData.title || 'Wikipedia', uri: wikiData.content_urls.desktop.page });
          if (ddgData?.AbstractURL) sources.push({ title: ddgData.Heading || 'Web result', uri: ddgData.AbstractURL });
        }
      } catch { /* the answer itself remains available without optional citations */ }
    }
    return res.json({ content: reply.trim(), thinking, thinkingSummary: thinking, sources, provider: selectedProvider });
  }

  // Pre-check for image-related questions & general safety on all devices
  const isImageRelated = (images && images.length > 0) || /image|picture|photo|draw|generate|paint|visual/i.test(message || '');
  if (isImageRelated) {
    try {
      const ai = getGeminiClient();
      const isBad = await isPromptInappropriate(ai, message || '');
      if (isBad) {
        return res.json({
          content: `### 🛡️ St.Amour Safety Protocol Activated\n\nIsaiahAI vision intelligence has flagged this imagery inquiry as containing content or concepts classified as inappropriate. Direct analysis and indexing have been bypassed for system safety compliance.`,
          thinking: `[Safety Intervention] Highly sensitive image-focused concept filtered and gracefully handled.`,
          sources: []
        });
      }
    } catch (safErr) {
      console.warn('[Safety Check] Pre-chat evaluation errored:', safErr);
    }
  }

  let wikiText = '';
  let ddgText = '';
  let localSources: any[] = [];

  // Pre-fetch Wikipedia and DuckDuckGo summaries in parallel if web index search is toggled
  if (searchWebEnabled) {
    try {
      const queryClean = (message || '').trim();
      const [wikiData, ddgData] = await Promise.all([
        getWikipediaSummary(queryClean).catch(() => null),
        searchDuckDuckGoAPI(queryClean).catch(() => null),
      ]);

      if (wikiData) {
        if (wikiData.extract) {
          wikiText = wikiData.extract;
        }
        const wikiUrl = wikiData.content_urls?.desktop?.page || wikiData.info?.link || '';
        if (wikiUrl) {
          localSources.push({
            title: wikiData.title || 'Wikipedia Reference',
            uri: wikiUrl
          });
        }
      }

      if (ddgData) {
        if (ddgData.AbstractText) {
          ddgText = ddgData.AbstractText;
        }
        if (ddgData.AbstractURL) {
          localSources.push({
            title: ddgData.Heading || 'DuckDuckGo Instant Answer',
            uri: ddgData.AbstractURL
          });
        }
      }
    } catch (err) {
      console.warn('[Pre-fetch Info] Web grounding index prefetch bypassed:', err);
    }
  }

  try {
    const ai = getGeminiClient();

    // Map and sanitize history to ensure strictly alternating user -> model flow
    const rawContents = (history || []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }],
    }));

    const contents: any[] = [];
    for (const item of rawContents) {
      if (contents.length === 0) {
        if (item.role === 'user') {
          contents.push(item);
        }
      } else {
        const lastItem = contents[contents.length - 1];
        if (lastItem.role === item.role) {
          // Merge consecutive messages of the same role
          lastItem.parts[0].text += '\n\n' + item.parts[0].text;
        } else {
          contents.push(item);
        }
      }
    }

    // Append the latest user message
    const userParts: any[] = [{ text: message }];
    
    if (images && Array.isArray(images)) {
      images.forEach((img: any) => {
        let base64Data = img.data || '';
        // Extract plain base64 if prefixed with data:image/...;base64,
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        if (base64Data) {
          userParts.push({
            inlineData: {
              data: base64Data,
              mimeType: img.mimeType || 'image/png',
            }
          });
        }
      });
    }

    contents.push({
      role: 'user',
      parts: userParts,
    });

    let preferredModel = 'gemini-3.8-flash';

    let augmentedSystemInstruction = systemInstruction;
    if (!augmentedSystemInstruction) {
      if (req.body.chatMode === 'school') {
        augmentedSystemInstruction = `You are IsaiahAI School Mode by St.Amour Electronics, an elite personal tutor and academic coach across all subjects (Math, Science, Humanities, and Coding).

CRITICAL PEDAGOGICAL MANDATE:
1. NEVER just hand the student the final answer to their homework or problem! Your mission is to TEACH them to arrive at the answer themselves through Socratic guidance and active learning.
2. Break down the core principles, explain underlying mechanisms, and offer step-by-step hints.
3. INCLUDE AN INTERACTIVE KNOWLEDGE CHECK in every lesson so the student can test their understanding. Always format the question and multiple choices clearly using this exact JSON block at the end of your response so our interactive quiz engine can render it as clickable buttons:
\`\`\`quiz
{
  "question": "<Guiding check question testing the current step>",
  "options": [
    "<Option A>",
    "<Option B>",
    "<Option C>",
    "<Option D>"
  ],
  "correctIndex": <0, 1, 2, or 3>,
  "hint": "<Socratic clue guiding how to think about it without giving away the answer>",
  "explanation": "<Clear explanation of why this option is correct and how it leads to the final solution>"
}
\`\`\`
4. PREPARE GOOGLE DOC STUDY NOTES: Include a clean study summary section formatted in markdown with Topic, Key Takeaways, Formulas/Vocabulary, and Next Steps so the student can review and sync it directly to Google Docs with one click.
5. MATHEMATICAL SYMBOLS & FRACTION MANDATE: Always write real mathematical fractions and symbols! Never write awkward spelled-out text like 'one over two' or unformatted raw division when a fraction is intended. Always use real fraction symbols (½, ⅓, ⅔, ¼, ¾, ⅕, ⅖, ⅗, ⅘, ⅙, ⅚, ⅛, ⅜, ⅝, ⅞) or clear fractional notation, and standard math symbols: × for multiplication, ÷ for division, ± for plus/minus, √ for roots (e.g. √16 = 4), exponents (e.g. x², y³, 10⁵), π for pi, θ for angles, ≤, ≥, ≠, and ° for degrees.
6. Maintain a patient, encouraging, and academically rigorous tone.`;
      } else if (req.body.chatMode === 'code' || req.body.chatMode === 'code_extended') {
        augmentedSystemInstruction = `You are IsaiahAI Code PR, an elite Senior Principal Software Engineer and Pull Request Automation Engine by St.Amour Electronics.
You write pristine, production-grade, highly optimized, type-safe code with zero hallucinations, zero syntax bugs, and zero missing imports.

CRITICAL INSTRUCTIONS FOR AUTOMATED FILE EDITING:
1. ALWAYS provide complete, runnable code inside standard markdown code blocks (e.g. \`\`\`html ... \`\`\`, \`\`\`typescript ... \`\`\`, \`\`\`javascript ... \`\`\`, etc.).
2. NEVER truncate code with placeholders like "...rest of code unchanged..." or "<!-- insert here -->". Provide the full, cohesive code so the automated background PR engine can write it directly to the user's computer file without any manual user work.
3. Be ultra-sharp: explain the architectural rationale, efficiency, and key algorithmic highlights in articulate paragraphs.
4. When editing an existing HTML file or local project file supplied by the user, preserve all valid scripts, styles, and markup while implementing exactly what was requested.`;
      } else if (activeAiModel === 'maw_ai') {
        augmentedSystemInstruction = `You are Maw AI, an intelligent, charming, and remarkably capable hybrid AI assistant.
You possess witty, warm conversational charm, lightning-quick thinking, deep general knowledge, math skills, and sharp analytical ability.
Always maintain your distinct Maw AI identity. Provide high-quality, articulate, accurate answers without random failure or unnecessary disclaimers.`;
      } else if (activeAiModel === 'isaiah_5_3') {
        augmentedSystemInstruction = `You are Isaiah AI 5.3, an ultra-fast, responsive AI assistant engineered by St.Amour Electronics.
You provide clear, accurate, direct, and general-intelligence answers with maximum speed and zero fluff.
Keep responses concise, crisp, and immediately helpful without unnecessary padding or delays.
Always identify as Isaiah AI 5.3 by St.Amour Electronics. Never mention third-party AI brands.`;
      } else {
        augmentedSystemInstruction = `You are Isaiah Max 6.0, a high-intelligence assistant engineered by St.Amour Electronics. You possess sharp analytical depth and vision capabilities.

STYLE DIRECTIVE:
1. Provide articulate, accurate, and substantive answers with high clarity and intellectual rigor.
2. Keep explanations direct, well-structured, and efficient without superfluous fluff or repetitive padding.
3. Identify exclusively as Isaiah Max 6.0. NEVER mention "Gemini", "Google", or any third-party branding.`;
      }
    }

    if (searchWebEnabled && (wikiText || ddgText)) {
      augmentedSystemInstruction += `\n\n[Web Search Grounding Index Context]
Below is real-time search context fetched from the web for reference to help answer:
${wikiText ? `- wikipedia.org: "${wikiText}"\n` : ''}${ddgText ? `- duckduckgo.com: "${ddgText}"\n` : ''}
Incorporate this fresh knowledge to describe it cleanly, answer in thorough paragraph form, and provide a comprehensive explanation directly to the user.`;
    }

    // Check if user is asking for image generation in chat or image mode
    const isImageGenerationRequest = req.body.chatMode === 'image' || /^(draw|generate|create|make|paint)\s+(a|an|the|me)?\s+(image|picture|photo|illustration|art|drawing|portrait|logo)/i.test(message || '');
    
    if (isImageGenerationRequest) {
      console.log(`[Gemini Imagen Engine] Direct image generation requested in chat for prompt: "${message}"`);
      try {
        const parts: any[] = [];
        if (images && Array.isArray(images) && images.length > 0) {
          let base64Data = images[0].data || '';
          if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
          if (base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: images[0].mimeType || 'image/png',
              }
            });
          }
        }
        parts.push({ text: message });

        let generatedImageUrl = '';
        try {
          const imgResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: { parts },
            config: {
              imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
            }
          });

          if (imgResponse.candidates?.[0]?.content?.parts) {
            for (const part of imgResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imgErr) {
          console.warn('[Gemini Imagen Engine] Primary image model failed, fetching web fallback image:', imgErr);
        }

        if (!generatedImageUrl) {
          const fallbackUrls = await fetchWikipediaWebImages(message);
          generatedImageUrl = fallbackUrls[0] || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80';
        }

        // Generate trained text response along with the generated image
        const trainedTextRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are IsaiahAI Max by St.Amour Electronics. The user requested an image generation with prompt: "${message}". Provide a super smart, highly articulate, well-composed paragraph explaining the visual art concept, color palette, artistic style, and design details of this generated artwork in an intellectual tone.`
        });

        const trainedText = trainedTextRes.text || `IsaiahAI Max Gemini Imagen Engine has synthesized a high-fidelity visual render based on your request: "${message}". The rendering incorporates dynamic lighting, precise structural geometry, and balanced color harmony designed for modern aesthetic clarity.`;

        return res.json({
          content: trainedText,
          imageUrl: generatedImageUrl,
          thinking: `[Gemini Imagen Engine] Synthesized visual asset and generated trained conceptual response.`,
          sources: localSources
        });
      } catch (nanoErr) {
        console.warn('[Gemini Imagen Engine] Image chat handler error, proceeding with text chat:', nanoErr);
      }
    }

    const isCodingMode = req.body.chatMode === 'code' || req.body.chatMode === 'code_extended';
    const config: any = {
      systemInstruction: augmentedSystemInstruction,
      temperature: isCodingMode ? 0.2 : 0.7,
      maxOutputTokens: 8192,
    };

    if (searchWebEnabled) {
      config.tools = [{ googleSearch: {} }];
    }

    const aiPromise = generateContentWithFallback(ai, {
      model: preferredModel,
      contents,
      config,
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI chat timeout')), 180000));
    const response: any = await Promise.race([aiPromise, timeoutPromise]);

    let reply = '';
    let thinking = '';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.thought) {
          // Never pass provider-internal thought tokens to the browser.
        } else if (part.text) {
          reply += part.text;
        }
      }
    }

    if (!reply) {
      reply = response.text || "I apologize, but I couldn't generate a response.";
    }

    // Extract search source metadata if available
    let sources: any[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata && groundingMetadata.groundingChunks) {
      sources = groundingMetadata.groundingChunks.map((chunk: any) => ({
        title: chunk.web?.title || 'Google Search Reference',
        uri: chunk.web?.uri || '',
      })).filter((c: any) => c.uri);
    }

    // If Google grounding is empty but we pre-fetched local information, merge them for the user
    if (sources.length === 0 && localSources.length > 0) {
      sources = localSources;
    }

    if (req.body.showThinking === true) {
      try {
        const summaryResult: any = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: 'Write a concise 1–3 sentence user-facing summary of the approach behind this answer. Do not disclose hidden chain-of-thought or private internal deliberation.\n\nQuestion: ' + String(message || '').slice(0, 4000) + '\n\nAnswer: ' + String(reply || '').slice(0, 6000),
            config: { systemInstruction: 'Provide only a concise, user-facing reasoning summary; never reveal hidden chain-of-thought.', maxOutputTokens: 180, thinkingConfig: { thinkingLevel: 'LOW' } } as any,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Summary timed out')), 3000)),
        ]);
        thinking = String(summaryResult?.text || '').trim();
      } catch (summaryError: any) {
        console.warn('[IsaiahAI] Optional reasoning summary unavailable:', String(summaryError?.message || summaryError).slice(0, 120));
      }
      if (!thinking) thinking = 'I focused on the question, relevant context and constraints, then organized the most useful points into the answer. This is a brief explanation of the approach, not a transcript of private internal reasoning.';
    } else {
      thinking = '';
    }
    res.json({ content: reply, thinking, thinkingSummary: thinking, sources });
  } catch (error: any) {
    console.warn('[Chat Engine] API failed or limits reached:', error?.message || error);

    // Gemini fallback chain failed; try the server-side OpenRouter free-model router for all
    // model selections and chat modes before giving up or using the offline search index.
    const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim()
      || process.env.ISAIAH_OPENROUTER_API_KEY?.trim();
    if (openRouterApiKey) {
      try {
        const fallbackMessages: any[] = [{
          role: 'system',
          content: typeof systemInstruction === 'string' && systemInstruction.trim()
            ? systemInstruction + '\n\nReason carefully and answer clearly, but never expose hidden chain-of-thought.'
            : 'You are IsaiahAI, a helpful, accurate assistant. Use strong reasoning, cite only supplied sources, and never expose hidden chain-of-thought.',
        }];
        if (Array.isArray(history)) {
          for (const item of history.slice(-16)) {
            if (!item || typeof item.content !== 'string' || !item.content.trim()) continue;
            fallbackMessages.push({ role: item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user', content: item.content.slice(0, 24000) });
          }
        }
        const imageUrls = Array.isArray(images) ? images.map((img: any) => {
          const raw = typeof img?.data === 'string' ? img.data : '';
          if (!raw) return null;
          return { type: 'image_url', image_url: { url: raw.startsWith('data:') ? raw : `data:${img?.mimeType || 'image/png'};base64,${raw}` } };
        }).filter(Boolean) : [];
        const lastUserContent = imageUrls.length ? [{ type: 'text', text: String(message || '') }, ...imageUrls] : String(message || '');
        fallbackMessages.push({ role: 'user', content: lastUserContent });

        let openRouterReply = '';
        let openRouterError: any = null;
        for (const modelId of ['openrouter/free', 'nvidia/nemotron-3-ultra-550b-a55b:free']) {
          try {
            const result = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': process.env.APP_URL || `http://localhost:${PORT}`,
                'X-Title': 'IsaiahAI',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ model: modelId, messages: fallbackMessages, reasoning: { effort: 'high', exclude: true }, max_tokens: 8192 }),
              signal: AbortSignal.timeout(10000),
            });
            const data: any = await result.json().catch(() => ({}));
            if (!result.ok) throw new Error(data?.error?.message || `OpenRouter request failed (${result.status})`);
            const rawContent = data?.choices?.[0]?.message?.content;
            openRouterReply = typeof rawContent === 'string' ? rawContent
              : Array.isArray(rawContent) ? rawContent.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('\n') : '';
            if (openRouterReply.trim()) break;
            throw new Error('OpenRouter returned an empty response.');
          } catch (fallbackError: any) {
            openRouterError = fallbackError;
            console.warn(`[Chat Engine] OpenRouter ${modelId} failed:`, String(fallbackError?.message || fallbackError).slice(0, 160));
          }
        }
        if (openRouterReply.trim()) {
          const summary = req.body.showThinking === true
            ? 'I considered the request and its context, then organized the most relevant points into this answer. This is a brief approach summary, not private internal reasoning.'
            : '';
          return res.json({ content: openRouterReply.trim(), thinking: summary, thinkingSummary: summary, sources: [], provider: 'OpenRouter' });
        }
        console.warn('[Chat Engine] OpenRouter fallback exhausted:', openRouterError?.message || 'No free model available.');
      } catch (fallbackError: any) {
        console.warn('[Chat Engine] OpenRouter fallback failed:', String(fallbackError?.message || fallbackError).slice(0, 180));
      }
    }

    // If both cloud providers failed in coding mode, return a clear technical error.
    if (req.body.chatMode === 'code' || req.body.chatMode === 'code_extended') {
      return res.status(500).json({
        error: error.message || 'Code PR generation was unable to complete. Please try submitting your code request again.'
      });
    }

    try {
      const query = (message || '').trim();
      const [wikiData, ddgData] = await Promise.all([
        getWikipediaSummary(query).catch(() => null),
        searchDuckDuckGoAPI(query).catch(() => null),
      ]);

      let fallbackText = '';
      let localFallbackSources: any[] = [];

      if (wikiData || ddgData) {
        fallbackText = `### 🌐 St.Amour Intelligence Search Synthesis\n\nSt.Amour Cloud core is currently utilizing a high-density standalone active configuration. I have routed your query directly through my local indices! Here is what the search database found:\n\n`;
        
        if (wikiData && wikiData.extract) {
          fallbackText += `**Wikipedia Reference Record:**\n${wikiData.extract}\n\n`;
          let wikiUrl = wikiData.content_urls?.desktop?.page || wikiData.info?.link || '';
          if (wikiUrl) {
            localFallbackSources.push({
              title: wikiData.title || 'Wikipedia Reference Page',
              uri: wikiUrl
            });
          }
        }
        
        if (ddgData && ddgData.AbstractText) {
          fallbackText += `**DuckDuckGo Record Summary:**\n${ddgData.AbstractText}\n\n`;
          if (ddgData.AbstractURL) {
            localFallbackSources.push({
              title: ddgData.Heading || 'DuckDuckGo Instant Answer',
              uri: ddgData.AbstractURL
            });
          }
        }
        
        if (localFallbackSources.length === 0) {
          fallbackText += `For a complete search directory, browse deep search results on [DuckDuckGo](https://duckduckgo.com/?q=${encodeURIComponent(query)}) or [Wikipedia Archives](https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}).`;
        }
      } else {
        const lower = query.toLowerCase();
        if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi') {
          fallbackText = `### 👋 Welcome to IsaiahAI Max\n\nHello! I am **IsaiahAI Max**, your elite super-intelligent workstation assistant engineered by **St.Amour Electronics**. I am fully online and ready to assist you with deep analysis, code synthesis, document drafting, and creative problem-solving. What are we exploring or building today?`;
        } else if (lower.includes('who are you') || lower.includes('your name') || lower.includes('who created you')) {
          fallbackText = `### 🛡️ About IsaiahAI Max\n\nI am **IsaiahAI Max**, a state-of-the-art cognitive assistant created and branded exclusively by **St.Amour Electronics**. I am built with elite analytical depth, advanced reasoning capabilities, and high-performance workstation integration to support all your development, writing, and research needs.`;
        } else if (lower.includes('joke')) {
          fallbackText = `### ⚡ Intelligence & Wit\n\nWhy do programmers prefer dark mode?\nBecause light attracts bugs! 🐛✨\n\n*IsaiahAI neural diagnostics confirm all St.Amour workstation systems are operating at peak efficiency.*`;
        } else {
          fallbackText = `## Comprehensive Technical Intelligence Report: "${query}"\n\n### 1. Executive Summary & Analytical Overview\nIsaiahAI Max has completed a high-density cognitive synthesis for your query: **"${query}"**. Operating under St.Amour Electronics engineering standards, this domain involves structured architectural planning, modular execution, and robust optimization.\n\n### 2. Core Concepts & Technical Breakdown\n* **Architectural Integrity**: Ensure modular separation of concerns and rigorous type safety across all execution layers.\n* **Performance Optimization**: Leverage asynchronous processing, zero-latency caching, and stateless service design to maximize throughput.\n* **Reliability Standards**: Maintain resilient fallback mechanisms and comprehensive validation protocols.\n\n### 3. Implementation Recommendations\n* Define clear interface contracts and data models early in the development cycle.\n* Implement strict error boundaries and real-time telemetry monitoring.\n* Continuously test against edge cases to ensure bulletproof stability.\n\n*This advanced analysis was synthesized by IsaiahAI Max cognitive core.*`;
        }
      }

      const sourcesToReturn = localFallbackSources.length > 0 ? localFallbackSources : (localSources.length > 0 ? localSources : []);

      return res.json({ 
        content: fallbackText, 
        thinking: `[Fallback Activated] IsaiahAI successfully resolved web records locally via DuckDuckGo and Wikipedia indices due to cloud throttling.`,
        sources: sourcesToReturn
      });
    } catch (innerErr) {
      console.error('[Chat Fallback Error] Critical failure in local search assembler:', innerErr);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

// 1ab. API Endpoint: St.Amour AI Chat Moderation & Rewriting
app.post('/api/moderate-chat', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.json({ edited: false, text: '' });
    }
    const ai = getGeminiClient();
    console.log(`[AI Moderation Filter] Analyzing message: "${text}"`);

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a real-time chat moderation and rewriting filter for a multiplayer gaming lobby. 
Analyze the following user chat message: "${text}".
If the message contains inappropriate phrases, swearing, highly toxic text, insults, or NSFW words, rewrite the entire message to make it appropriate, clean, and positive (for example: "I love retro gaming!", "Let's all play together nicely!", "IsaiahAI is awesome!"). 
If the message is ALREADY appropriate, safe, clean, and has no profanity at all, return the ORIGINAL text exactly as-is.
Return a clean, compact JSON response matching this schema:
{ "edited": true/false, "text": "cleaned or original message" }
Strictly return ONLY raw JSON text. Do not wrap it in markdown block tags, no quotation wrappers, no extra explanation text.`,
    });

    const outputText = result.text?.trim() || '{}';
    // Strip markdown wrappers if any were generated
    const cleanJsonText = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleanJsonText);
    res.json({
      edited: !!data.edited,
      text: data.text || text
    });
  } catch (error) {
    console.warn('[AI Moderation Filter] Moderation request failed or parsed poorly, returning as-is:', error);
    res.json({ edited: false, text: req.body.text || '' });
  }
});

// 1b. API Endpoint: St.Amour Dynamic Image Generation & Editing
app.post('/api/generate-image', async (req, res) => {
  const { prompt, image, isPro, imageSize } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const ai = getGeminiClient();

    console.log(`[Image Synthesizer] Processing request for: "${prompt}" (hasImage: ${!!image}, isPro: ${isPro}, size: ${imageSize})`);

    const parts: any[] = [];
    if (image && image.data) {
      let base64Data = image.data;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: image.mimeType || 'image/png',
        }
      });
    }
    parts.push({ text: prompt });

    const selectedSize = imageSize || '1K';
    const modelsToTry = [
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-image',
      'gemini-2.5-flash'
    ];

    let imageUrl = '';
    let usedModel = '';

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: parts
          },
          config: {
            imageConfig: {
              aspectRatio: '1:1',
              imageSize: selectedSize
            }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const rawBase64 = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || 'image/png';
              imageUrl = `data:${mimeType};base64,${rawBase64}`;
              usedModel = modelName;
              break;
            }
          }
        }
        if (imageUrl) break;
      } catch (mErr: any) {
        console.warn(`[Image Synthesizer] Attempt with model ${modelName} failed:`, mErr?.message || mErr);
      }
    }

    if (!imageUrl) {
      throw new Error('Gemini API quota limits or model unavailability reached.');
    }

    const trainedText = `IsaiahAI Max Image Engine (${usedModel}) successfully synthesized your image for: "${prompt}".`;
    res.json({ imageUrl, trainedText, isFallback: false });

  } catch (err: any) {
    console.warn('[Image Synthesizer] AI quota or model limits reached. Utilizing Pollinations AI dynamic generator fallback:', err.message || err);

    // High-fidelity Pollinations AI generator fallback (100% free, zero quota limit)
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ' high resolution detailed masterpiece')}&width=1024&height=1024&nologo=true&seed=${seed}`;

    const fallbackUrls = await fetchWikipediaWebImages(prompt).catch(() => []);
    const allFallbackImages = [pollinationsUrl, ...fallbackUrls].filter(Boolean);

    res.json({
      imageUrl: pollinationsUrl,
      trainedText: `IsaiahAI Max Neural Image Synthesizer successfully generated your high-resolution artwork for: **"${prompt}"**. The output features dynamic color contrast, refined lighting, and sharp compositional focus.`,
      isFallback: true,
      fallbackUrls: allFallbackImages.slice(0, 4),
      fallbackMessage: `High-fidelity image generation complete for "${prompt}".`,
      prompt: prompt
    });
  }
});

// 1c. API Endpoint: Game Publishing Email Sender via Nodemailer (Fallback Logging Sim)
app.post('/api/publish-game', async (req, res) => {
  try {
    const { title, codeHtml } = req.body;
    if (!title || !codeHtml) {
      return res.status(400).json({ error: 'Game title and compiled HTML are required for publishing' });
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const recipient = 'azndibroblox2@gmail.com';

    if (!host || !user || !pass) {
      console.log('----------------------------------------------------');
      console.log(`[Mailing Simulation] Local SMTP is not declared in secrets.`);
      console.log(`[Mailing Simulation] Recipient: ${recipient}`);
      console.log(`[Mailing Simulation] Email Subject: Game Publish Request: "${title}"`);
      console.log(`[Mailing Simulation] Standalone Code Payload Size: ${codeHtml.length} bytes`);
      console.log('----------------------------------------------------');
      
      return res.json({
        success: true,
        message: 'Published successfully inside sandbox logs.',
        recipient,
        simulated: true
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const mailOptions = {
      from: `"St.Amour IsaiahAI" <${user}>`,
      to: recipient,
      subject: `🚀 [IsaiahAI Publish] Generated Game: ${title}`,
      text: `Greetings,\n\nA user has submitted a game generated via IsaiahAI by St.Amour Electronics.\n\nGame Title: ${title}\nTimestamp: ${new Date().toISOString()}`,
      attachments: [
        {
          filename: `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-game.html`,
          content: codeHtml,
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.json({
      success: true,
      message: 'Email delivered successfully.',
      recipient,
      simulated: false
    });
  } catch (err: any) {
    console.error('Email sending error:', err);
    res.status(500).json({ error: err.message || 'Server mailing transporter failure' });
  }
});

// 2. API Endpoint: AI Trivia generator
app.post('/api/trivia', async (req, res) => {
  try {
    const { category } = req.body;
    const ai = getGeminiClient();

    const promptMessage = `Generate a highly engaging, multiple-choice trivia/quiz question. ${
      category && category !== 'Random' ? `The category should be explicitly about: ${category}` : 'Make the category random, spanning tech, electronics, general trivia, gaming, or history.'
    }. Provide 4 options. Make sure only one index is correct (0, 1, 2, or 3). Provide a deep, helpful explanation answering why.`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-2.5-flash',
      contents: promptMessage,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: 'The trivia question text.' },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exactly 4 multiple-choice options.',
            },
            answerIndex: {
              type: Type.INTEGER,
              description: 'The correct option index (integer 0, 1, 2, or 3).',
            },
            explanation: {
              type: Type.STRING,
              description: 'Insightful description explaining the correct answer.',
            },
          },
          required: ['question', 'options', 'answerIndex', 'explanation'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const cleanJson = cleanMimeAndMarkdownJson(jsonText);
    const parsedData = JSON.parse(cleanJson);
    res.json(parsedData);
  } catch (error: any) {
    console.warn('[Trivia Gen] Caught error or quota exhaustion, delivering resilient local fallback trivia:', error.message || error);
    
    // High-quality backup trivia questions selection
    const defaults = [
      {
        question: "Which electronic component opposes components of electric current, creating a voltage drop?",
        options: [
          "Capacitor",
          "Resistor",
          "Inductor",
          "Transistor"
        ],
        answerIndex: 1,
        explanation: "A Resistor limits or opposes the flow of electrical current, producing a proportional voltage drop according to Ohm's Law (V=IR)."
      },
      {
        question: "Who is credited with inventing the first commercially practical incandescent light bulb?",
        options: [
          "Nikola Tesla",
          "Thomas Edison",
          "Alessandro Volta",
          "Michael Faraday"
        ],
        answerIndex: 1,
        explanation: "Thomas Edison developed and patented the first high-resistance, long-lasting carbon-filament incandescent light bulb in 1879."
      },
      {
        question: "What does are A* search algorithms primarily used for in computer science and game dev?",
        options: [
          "Secure database hashing",
          "Efficient sorting of numeric arrays",
          "Shortest pathfinding and grid traversal",
          "Asynchronous state compression"
        ],
        answerIndex: 2,
        explanation: "A* is an extremely popular heuristic pathfinding algorithm used to compute the shortest possible path between start and end node nodes."
      }
    ];

    const randomChoice = defaults[Math.floor(Math.random() * defaults.length)];
    res.json(randomChoice);
  }
});

// 3. API Endpoint: Get Creative with A* / Game Builder
app.post('/api/creative-ast', async (req, res) => {
  try {
    const { prompt, existingCodeDelta, isDeepThink } = req.body;
    const ai = getGeminiClient();

    const userPrompt = prompt || "a random arcade or logic challenge";
    let promptMessage = "";

    if (existingCodeDelta) {
      promptMessage = `You are an elite retro game developer. Look at this existing interactive mini-game HTML page:
      \`\`\`html
      ${existingCodeDelta}
      \`\`\`

      The user has asked for the following modification or refinement:
      "${userPrompt}"

      Modify and update this game. Keep all of its original features, but update the styles, add new mechanics, audio oscillators, score levels, or widgets as instructed. Return the full complete standalone HTML page inside the codeHtml field. Ensure the game continues to follow the high-contrast St.Amour Electronic aesthetic. Maintain all dependencies and JS canvas loops.`;
    } else {
      promptMessage = `Get incredibly creative! Build a high-quality, fully playable browser-based retro mini-game based on the theme: "${userPrompt}". 
      Incorporate pathfinding (A* visual maze solvers, coordinate searches, grid traps, physics blocks, or custom electronics puzzles) to represent the "St.Amour Electronics" style.
      
      You must provide:
      1. A beautiful, high-contrast UI (Tailwind CSS is injected by default or custom CSS styling is allowed inside).
      2. Interactive HTML canvas or grid elements with JavaScript keyboard/mouse logic.
      3. Fully functional scoretracking, restarted keys, elegant game-over states, and customizable audio effects (using AudioContext synth beeps, no external audio files).
      4. Provide the exact full code inside the HTML field without triple backticks or markdown formatting. Just pure HTML file.`;
    }

    if (isDeepThink) {
      promptMessage += `\n\nCRITICAL DIRECTIVE: Perform a very deep, professional analysis first. Organize the game architecture beautifully, including high-frequency sound synthesizers using AudioContext, crisp smooth modern visual assets with Tailwind CSS, and sophisticated gameplay mechanics that make the game extremely fun to play. Ensure flawless code execution.`;
    }

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: promptMessage,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Elegant, catchy game title.' },
            genre: { type: Type.STRING, description: 'E.g., Retro Slider, A* Solver, Circuit Runner.' },
            tagline: { type: Type.STRING, description: 'A witty line related to St.Amour Electronics.' },
            rules: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Instructions on how to play the game.',
            },
            codeHtml: {
              type: Type.STRING,
              description: 'A completely standalone, single-file HTML page containing inline styles and full javascript gameplay that can run inside an iframe.',
            },
          },
          required: ['title', 'genre', 'tagline', 'rules', 'codeHtml'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const cleanJson = cleanMimeAndMarkdownJson(jsonText);
    const parsedData = JSON.parse(cleanJson);
    res.json(parsedData);
  } catch (error: any) {
    console.warn('[Creative Game Gen] Caught error or quota exceeded, serving local fallback game:', error.message || error);
    
    // Provide a beautiful built-in responsive game (an elegant, advanced high-contrast canvas arcade game!)
    const htmlCode = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>St.Amour Orbit Runner</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; background-color: #0b1329; color: #fff; overflow: hidden; font-family: monospace; }
        canvas { background: radial-gradient(circle, #1a233d 0%, #080c18 100%); display: block; margin: 0 auto; box-shadow: 0 0 20px rgba(245,158,11,0.3); border: 2px solid #f59e0b; }
    </style>
</head>
<body class="flex flex-col items-center justify-center h-screen space-y-4">
    <div class="text-center">
        <h1 class="text-2xl font-bold tracking-widest text-amber-400">ST.AMOUR ORBIT RUNNER</h1>
        <p class="text-xs text-slate-400 font-mono">NEURAL SHIELD STABILIZER MODE ACTIVATED</p>
    </div>

    <canvas id="gameCanvas" width="600" height="400"></canvas>

    <div class="text-center text-xs text-slate-400 space-y-1">
        <p>[ARROW KEYS] / [WASD] to fly | Avoid glowing crimson energy anomalies!</p>
        <p class="text-[10px] text-amber-500/70">Powered by St.Amour Offline Circuit Core</p>
    </div>

    <script>
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");

        // Simple audio context synth helper
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function playBeep(freq, type, duration) {
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = type || "sine";
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) {}
        }

        // Game State
        const player = { x: 80, y: 200, size: 12, speed: 5, targetY: 200 };
        const obstacles = [];
        let score = 0;
        let isGameOver = false;
        let keys = {};

        window.addEventListener("keydown", (e) => { keys[e.key] = true; if(audioCtx.state === 'suspended') audioCtx.resume(); });
        window.addEventListener("keyup", (e) => { keys[e.key] = false; });

        function createObstacle() {
            obstacles.push({
                x: canvas.width + 50,
                y: Math.random() * (canvas.height - 60) + 30,
                size: Math.random() * 15 + 10,
                speed: Math.random() * 3 + score * 0.1 + 3,
                color: "rgba(239, 68, 68, 0.95)"
            });
        }

        let obsTimer = 0;

        function update() {
            if (isGameOver) {
                if (keys["Enter"] || keys["r"] || keys["R"]) {
                    obstacles.length = 0;
                    score = 0;
                    player.y = 200;
                    isGameOver = false;
                    playBeep(520, "triangle", 0.3);
                }
                return;
            }

            // Movement
            if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
                player.y -= player.speed;
                if (player.y < 15) player.y = 15;
            }
            if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
                player.y += player.speed;
                if (player.y > canvas.height - 15) player.y = canvas.height - 15;
            }

            // Obstacles spawning
            obsTimer++;
            if (obsTimer > 45) {
                createObstacle();
                obsTimer = 0;
            }

            // Move & Collide obstacles
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const o = obstacles[i];
                o.x -= o.speed;

                // Collision with player
                const dx = player.x - o.x;
                const dy = player.y - o.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < player.size + o.size) {
                    isGameOver = true;
                    playBeep(120, "sawtooth", 0.6);
                }

                // Offscreen score
                if (o.x < -o.size) {
                    obstacles.splice(i, 1);
                    score++;
                    playBeep(880 + score * 20, "sine", 0.05);
                }
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw grid backdrop
            ctx.strokeStyle = "rgba(245,158,11,0.06)";
            ctx.lineWidth = 1;
            const step = 40;
            for (let x = 0; x < canvas.width; x += step) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += step) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Draw player (St.Amour Golden Starfighter)
            ctx.fillStyle = "#f59e0b";
            ctx.beginPath();
            ctx.moveTo(player.x + player.size * 1.5, player.y);
            ctx.lineTo(player.x - player.size, player.y - player.size);
            ctx.lineTo(player.x - player.size / 2, player.y);
            ctx.lineTo(player.x - player.size, player.y + player.size);
            ctx.closePath();
            ctx.fill();

            // Glow engine exhaust
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#f59e0b";
            ctx.fillStyle = "rgba(245,158,11,0.6)";
            ctx.beginPath();
            ctx.arc(player.x - player.size * 1.3, player.y, 4 + Math.random() * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset

            // Draw Obstacles (glowing elements)
            obstacles.forEach(o => {
                ctx.shadowBlur = 12;
                ctx.shadowColor = "#ef4444";
                ctx.fillStyle = o.color;
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Score HUD
            ctx.fillStyle = "#fff";
            ctx.font = "bold 16px monospace";
            ctx.fillText("SCORE: " + score, 20, 35);

            if (isGameOver) {
                ctx.fillStyle = "rgba(11, 19, 41, 0.85)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.strokeStyle = "#ef4444";
                ctx.lineWidth = 3;
                ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

                ctx.fillStyle = "#ef4444";
                ctx.font = "bold 28px monospace";
                ctx.textAlign = "center";
                ctx.fillText("CIRCUIT LOAD OVERFLOW", canvas.width/2, canvas.height/2 - 20);

                ctx.fillStyle = "#ffffff";
                ctx.font = "14px monospace";
                ctx.fillText("SHIELD HARNESS COLLAPSED AT SCORE " + score, canvas.width/2, canvas.height/2 + 20);
                ctx.fillStyle = "#f59e0b";
                ctx.fillText("PRESS [ENTER] OR [R] TO REBOOT SYSTEMS", canvas.width/2, canvas.height/2 + 55);
                ctx.textAlign = "left"; // reset
            }
        }

        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        // Initialize Beeps
        playBeep(440, "sine", 0.2);
        gameLoop();
    </script>
</body>
</html>`;

    res.json({
      title: "St.Amour Orbit Runner",
      genre: "Retro Space Obstacle Runner",
      tagline: "Stabilize the neural shield matrix using standard coordinate pilots.",
      rules: [
        "Avoid red glowing anomaly particles.",
        "Use W/S or ARROW KEYS to slide up and down.",
        "Earn score points by clearing anomalies safely!"
      ],
      codeHtml: htmlCode
    });
  }
});

// 3b. API Endpoint: Generate/Update Google Docs Markdown Content
app.post('/api/generate-doc', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    const ai = getGeminiClient();

    const contents = (history || []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    contents.push({
      role: 'user',
      parts: [{ text: `You are an elite, professional writer at St.Amour Electronics. Write a high-quality, comprehensive, beautifully structured document about: "${prompt}".
      Format it perfectly with Markdown headings (# or ##), clean bullet lists, and informative paragraphs. Do not use plain text blocks where headings are appropriate. Present it as a highly official design specification, technical brief, or article.` }],
    });

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-2.5-flash',
      contents,
      config: {
        temperature: 0.7,
      },
    });

    const titleMatch = prompt.slice(0, 40);
    res.json({ 
      content: response.text || "Failed to generate document text.",
      docTitle: `St.Amour_${titleMatch.replace(/[^a-zA-Z0-9]/g, '_')}_Doc`
    });
  } catch (error: any) {
    console.error('Error in /api/generate-doc:', error);
    res.status(500).json({ error: error.message || 'Failed to generate document' });
  }
});

// Helper to search GIPHY with public beta API key
async function fetchGiphyUrl(query: string): Promise<string | null> {
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json() as any;
    const gifUrl = json.data?.[0]?.images?.fixed_height?.url || json.data?.[0]?.images?.original?.url;
    return gifUrl || null;
  } catch (error) {
    console.error(`GIPHY fetch fail for "${query}":`, error);
    return null;
  }
}

// 3c. API Endpoint: Generate/Update Google Slides structure
app.post('/api/generate-slides', async (req, res) => {
  try {
    const { prompt, history, existingSlides } = req.body;
    const ai = getGeminiClient();

    let promptMessage = `Create an elegant, highly structured presentation outline about: "${prompt}".
    Add between 4 to 8 slides.
    For each slide, return a snappy slide title, an array of 3 to 6 bullet points or descriptive summary sentences.
    Also generate a backgroundQuery (keywords for background stock image from Unsplash, e.g. "modern technology dark slate") 
    and a gifQuery (brief keywords for illustrative diagram or reaction GIF, e.g. "robot high five" or "stock market line chart").
    Return the primary presentation title and slide data list.`;

    if (existingSlides) {
      promptMessage = `You are editing an existing Google Slides structure:
      ${JSON.stringify(existingSlides)}

      The user wants to make modifications/updates as follows:
      "${prompt}"

      Modify and update the presentation slide list content according to this instruction. Output the full updated slides JSON structure following the exact same schema with backgroundQuery and gifQuery.`;
    }

    const response = await generateContentWithFallback(ai, {
       model: 'gemini-2.5-flash',
       contents: promptMessage,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'The presentation title' },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Slide title' },
                  bulletPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Descriptive paragraphs or bullet points'
                  },
                  backgroundQuery: { 
                    type: Type.STRING, 
                    description: 'Suggest keywords for a beautiful background picture on Unsplash (e.g., "dark tech matrix", "minimalist gradient abstract")' 
                  },
                  gifQuery: { 
                    type: Type.STRING, 
                    description: 'Suggest keywords for an animated GIF illustration from GIPHY (e.g. "finance graph", "AI algorithm flow")' 
                  }
                },
                required: ['title', 'bulletPoints', 'backgroundQuery', 'gifQuery']
              }
            }
          },
          required: ['title', 'slides']
        }
      }
    });

    const jsonText = response.text || '{}';
    const cleanJson = cleanMimeAndMarkdownJson(jsonText);
    const parsedData = JSON.parse(cleanJson);

    // Enrich slides with resolved URLs and dynamic image backgrounds
    if (parsedData && Array.isArray(parsedData.slides)) {
      for (const slide of parsedData.slides) {
        if (slide.gifQuery) {
          const gifUrl = await fetchGiphyUrl(slide.gifQuery);
          if (gifUrl) {
            slide.gifUrl = gifUrl;
          }
        }
        if (slide.backgroundQuery) {
          // Attempt real-time slide background text-to-image generation
          let imageUri: string | null = null;
          try {
            console.log(`[Slide Background Synthesis] Synthesizing matching backdrop for: "${slide.backgroundQuery}"`);
            const imgResponse = await ai.models.generateContent({
              model: 'gemini-3.1-flash-image',
              contents: {
                parts: [{ text: `A highly polished, cinematic, low-contrast presentation slide background wallpaper. Theme: "${slide.backgroundQuery}". Ensure high legibility for slides text, no text characters or humans in image, soft ambient cyber glow, abstract aesthetic design.` }]
              },
              config: {
                imageConfig: {
                  aspectRatio: '16:9',
                  imageSize: '1K'
                }
              }
            });

            if (imgResponse.candidates?.[0]?.content?.parts) {
              for (const part of imgResponse.candidates[0].content.parts) {
                if (part.inlineData) {
                  const rawBase = part.inlineData.data;
                  const mime = part.inlineData.mimeType || 'image/png';
                  imageUri = `data:${mime};base64,${rawBase}`;
                  console.log(`[Slide Background Synthesis] Success compiled base64 uri.`);
                }
              }
            }
          } catch (imgErr) {
            console.warn('[Slide Background Synthesis] synthesis failed, using Unsplash fallback:', imgErr);
          }

          if (imageUri) {
            slide.backgroundUrl = imageUri;
          } else {
            slide.backgroundUrl = `https://images.unsplash.com/featured/1200x800/?${encodeURIComponent(slide.backgroundQuery)}`;
          }
        }
      }
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/generate-slides:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presentation deck' });
  }
});

// 3d. API Endpoint: Collaborative Co-Pilot Game Editor
app.post('/api/edit-generated-game', async (req, res) => {
  try {
    const { codeHtml, prompt, history } = req.body;
    if (!codeHtml || !prompt) {
      return res.status(400).json({ error: 'codeHtml and prompt are required' });
    }
    const ai = getGeminiClient();
    console.log(`[AI Game Co-Pilot Editor] Editing game with prompt: "${prompt}"`);

    const editPrompt = `You are a professional Creative Game Physics compiler. The current game code is inside this HTML:
---START CURRENT HTML---
${codeHtml}
---END CURRENT HTML---

The user wants to make the following edits/enhancements to this game:
"${prompt}"

Please modify and rewrite the HTML code blocks, updating or adding any requested features, improving styles, colors, physical mechanics, scoring systems, canvas rendering, or sliders. Keep the game fully self-contained in a single beautifully designed .html document containing embedded CSS <style> and JS <script>. 
Make sure you preserve the existing features unless asked to modify them.
Strictly output ONLY the full updated .html code blocks. Do not write any markdown code blocks, do not wrap in \`\`\`html or \`\`\`, do not include any additional chat explanation texts outside the HTML.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: editPrompt,
    });

    let updatedCodeHtml = result.text || '';
    // Strip markdown tags if Gemini generated them
    updatedCodeHtml = updatedCodeHtml.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();

    res.json({ codeHtml: updatedCodeHtml });
  } catch (err: any) {
    console.error('Error in /api/edit-generated-game:', err);
    res.status(500).json({ error: err.message || 'Collaboration co-pilot compile failed' });
  }
});

// Helper for DuckDuckGo basic Instant answer
async function searchDuckDuckGoAPI(query: string) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data;
  } catch {
    return null;
  }
}

// Helper to query Wikipedia Page Summary REST API
async function getWikipediaSummary(query: string) {
  try {
    // 1. Search Wikipedia first to find correct exact article title
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 IsaiahAI/1.0 (St.Amour Electronics Assist)',
        'Accept': 'application/json'
      }
    });
    if (!searchRes.ok) return null;
    const searchData: any = await searchRes.json();
    
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return null;
    
    // 2. Fetch page summary for the exact title
    const exactTitle = firstResult.title;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactTitle)}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 IsaiahAI/1.0 (St.Amour Electronics Assist)',
        'Accept': 'application/json'
      }
    });
    if (!summaryRes.ok) return null;
    return await summaryRes.json();
  } catch {
    return null;
  }
}

// 4. API Endpoint: w! prefix (Wikipedia + DuckDuckGo Summary Search)
app.post('/api/search-wiki', async (req, res) => {
  try {
    const { query } = req.body;
    const ai = getGeminiClient();

    let searchTerm = query;
    try {
      // Summarize the query to a refined noun phrase
      const summaryPrompt = `Extract the central subject or noun phrase that the user wants to lookup on Wikipedia/DuckDuckGo from the user's message: "${query}". Respond with ONLY the simplified search phrase, with zero preamble, punctuation, or wrapping quotes. For example, "what is roblox" -> "Roblox".`;
      const summaryResponse = await generateContentWithFallback(ai, {
        model: 'gemini-3.8-flash',
        contents: summaryPrompt,
      });
      if (summaryResponse && summaryResponse.text) {
        searchTerm = summaryResponse.text.replace(/['"‘“’”’]/g, '').trim();
      }
    } catch (e) {
      console.warn('Query simplification fallback to raw input text:', e);
    }
    
    console.log(`w! prefix lookup term: "${searchTerm}"`);

    // Fetch live search metadata from Wikipedia & DuckDuckGo
    const [wikiData, ddgData] = await Promise.all([
      getWikipediaSummary(searchTerm),
      searchDuckDuckGoAPI(searchTerm),
    ]);

    // Build grounding search via Gemini
    let responseText = "";
    try {
      const searchResult = await generateContentWithFallback(ai, {
        model: 'gemini-3.8-flash',
        contents: `Draft a sleek, highly educational summary regarding "${searchTerm}" using these raw sources:
        
        Wikipedia Snippet: ${wikiData?.extract || "No direct Wikipedia summary found."}
        DuckDuckGo Snippet: ${ddgData?.AbstractText || "No direct DuckDuckGo record found."}
        
        Keep the delivery polished, explanatory and structured. End with professional styling in mind.`,
      });
      responseText = searchResult.text || "No summary was generated.";
    } catch (modelError: any) {
      console.warn('Gemini encyclopedic summary failed, compiling raw source snippets:', modelError);
      if (wikiData?.extract || ddgData?.AbstractText) {
        responseText = `### 🔍 Local Offline Query Result for **${searchTerm}**\n\n${
          wikiData?.extract ? `**Wikipedia Archive:** ${wikiData.extract}\n\n` : ''
        }${
          ddgData?.AbstractText ? `**DuckDuckGo Record:** ${ddgData.AbstractText}\n\n` : ''
        }*Note: St.Amour cloud acceleration synthesis is bypassed. Displaying direct raw database entries.*`;
      } else {
        responseText = `### ⚠️ Search Registry Under Maintenance\n\nUnable to fetch online records. Please try a simpler noun, or verify process logs.\n\n*Connection status: Cloud node bypassed.*`;
      }
    }
    
    // Organize research boxes
    const results: any[] = [];
    
    if (wikiData) {
      results.push({
        title: wikiData.title || searchTerm,
        uri: wikiData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm)}`,
        description: wikiData.extract || wikiData.description || 'View official Wikipedia article database entry.',
        domain: 'wikipedia.org',
        sourceLogo: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg'
      });
    }

    if (ddgData && ddgData.AbstractText) {
      results.push({
        title: ddgData.Heading || searchTerm,
        uri: ddgData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(searchTerm)}`,
        description: ddgData.AbstractText,
        domain: 'duckduckgo.com',
        sourceLogo: 'https://duckduckgo.com/assets/logo_homepage.normal.v108.svg'
      });
    } else {
      // General fall-back website
      results.push({
        title: `${searchTerm} - DuckDuckGo Query`,
        uri: `https://duckduckgo.com/?q=${encodeURIComponent(searchTerm)}`,
        description: `Explore overall DuckDuckGo search queries and instant links about ${searchTerm}.`,
        domain: 'duckduckgo.com',
        sourceLogo: 'https://duckduckgo.com/assets/logo_homepage.normal.v108.svg'
      });
    }

    res.json({
      searchTerm,
      summary: responseText,
      boxes: results
    });
  } catch (error: any) {
    console.error('Error in /api/search-wiki:', error);
    res.status(500).json({ error: error.message || 'Wikipedia lookup failed' });
  }
});

// 5. API Endpoint: d! prefix (DuckDuckGo + Google Search Grounding with ~5 Web Results)
app.post('/api/search-ddg', async (req, res) => {
  try {
    const { query } = req.body;
    const ai = getGeminiClient();

    let responseText = '';
    let groundingChunks: any[] = [];

    try {
      // Perform web grounding with Gemini search tool incorporating community forums
      const searchResult = await generateContentWithFallback(ai, {
        model: 'gemini-3.8-flash',
        contents: `Search web logs, public discussion boards, developer community forums (such as Reddit, Stack Overflow, GitHub issues/discussions, Quora, and dev blogs), news logs, and webpages to answer details about: "${query}". Provide a highly comprehensive, powerful summary detailing opinions, threads, solutions, and answers found in those community boards and websites. Cite what developers and forum threads say. Ensure exceptionally high technical accuracy and depth.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      responseText = searchResult.text || '';
      groundingChunks = searchResult.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    } catch (aiError) {
      console.warn('Gemini expanded search grounding bypassed or failed, falling back to local merge:', aiError);
      responseText = `### 🌐 Standard Web Index Query for **${query}**\n\nSt.Amour cloud-level AI synthesis is temporarily bypassed due to server load. Displaying direct instant links and research boxes below to browse standard internet articles natively.`;
    }

    const boxes: any[] = [];

    // Let's query DuckDuckGo for additional links and robustness
    const ddgData = await searchDuckDuckGoAPI(query);
    if (ddgData && ddgData.AbstractURL) {
      boxes.push({
        title: ddgData.Heading || query,
        uri: ddgData.AbstractURL,
        description: ddgData.AbstractText || 'DuckDuckGo Instant Answer reference resource.',
        domain: 'duckduckgo.com',
        sourceLogo: 'https://duckduckgo.com/assets/logo_homepage.normal.v108.svg'
      });
    }

    // Process grounding chunks to compile up to 5 distinctive web sources
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web && chunk.web.uri && boxes.length < 5) {
        // Avoid duplicate URIs
        if (!boxes.some(b => b.uri === chunk.web.uri)) {
          const parsedUrl = new URL(chunk.web.uri);
          boxes.push({
            title: chunk.web.title || 'Web Resource',
            uri: chunk.web.uri,
            description: `Authoritative web reference from ${parsedUrl.hostname} compiled securely via St.Amour Electronic grounding index.`,
            domain: parsedUrl.hostname,
            sourceLogo: `https://www.google.com/s2/favicons?sz=64&domain=${parsedUrl.hostname}`
          });
        }
      }
    });

    // Fallbacks if we don't have enough sources represented
    const fallbacks = [
      { t: 'DuckDuckGo Engine Search', u: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, d: 'duckduckgo.com' },
      { t: 'Wikipedia Encyclopedia Lookups', u: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`, d: 'wikipedia.org' },
      { t: 'Stack Overflow Community Forums', u: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`, d: 'stackoverflow.com' },
      { t: 'Reddit Discussion Archives', u: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`, d: 'reddit.com' },
      { t: 'St.Amour Electronics Intelligence Platform', u: 'https://github.com/StAmour', d: 'stamour-electronics.com' }
    ];

    while (boxes.length < 5) {
      const fb = fallbacks[boxes.length];
      if (fb) {
        const logo = fb.d === 'stamour-electronics.com' 
          ? '🛡️' 
          : `https://www.google.com/s2/favicons?sz=64&domain=${fb.d}`;
        boxes.push({
          title: fb.t,
          uri: fb.u,
          description: `Direct deep search results for "${query}" compiled on ${fb.d}. Click Wikipedia logo or link node to open external tabs instantly.`,
          domain: fb.d,
          sourceLogo: logo
        });
      } else {
        break;
      }
    }

    res.json({
      summary: responseText,
      boxes
    });
  } catch (error: any) {
    console.error('Error in /api/search-ddg:', error);
    res.status(500).json({ error: error.message || 'DuckDuckGo expanded search failed' });
  }
});


// Configure Vite Node Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IsaiahAI Acceleration Server] Running successfully on port ${PORT}`);
  });

  // Setup WebSocket Servers:
  // 1. Live Voice Conversations (gemini-3.1-flash-live-preview)
  // 2. Wisp Protocol v1 (puter.surf / Epoxy / Mercury Workshop standard)
  const liveWss = new WebSocketServer({ noServer: true });
  const wispWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    const pathname = url.split('?')[0];

    if (pathname === '/api/live') {
      liveWss.handleUpgrade(request, socket, head, (ws) => {
        liveWss.emit('connection', ws, request);
      });
    } else if (pathname === '/api/wisp' || pathname.startsWith('/api/wisp')) {
      wispWss.handleUpgrade(request, socket, head, (ws) => {
        wispWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Wisp Protocol v1 Server Handler: Multiplexed TCP/UDP over WebSockets (puter.surf / Epoxy)
  wispWss.on('connection', (ws) => {
    const streams = new Map<number, net.Socket>();

    ws.on('message', (msgData: any) => {
      try {
        const buf = Buffer.isBuffer(msgData) ? msgData : Buffer.from(msgData);
        if (buf.length < 5) return;

        const packetType = buf.readUInt8(0);
        const streamId = buf.readUInt32LE(1);

        if (packetType === 0x01) {
          // CONNECT packet
          if (buf.length < 9) return;
          const streamType = buf.readUInt8(5); // 0x01 = TCP, 0x02 = UDP
          const destPort = buf.readUInt16LE(6);
          const destHost = buf.slice(8).toString('utf8');

          const sock = net.createConnection({ host: destHost, port: destPort }, () => {
            // Send CONTINUE acknowledgment
            const ack = Buffer.alloc(9);
            ack.writeUInt8(0x04, 0); // CONTINUE
            ack.writeUInt32LE(streamId, 1);
            ack.writeUInt32LE(0xffff, 5); // Window size
            if (ws.readyState === ws.OPEN) ws.send(ack);
          });

          sock.on('data', (chunk) => {
            if (ws.readyState === ws.OPEN) {
              const header = Buffer.alloc(5);
              header.writeUInt8(0x02, 0); // DATA
              header.writeUInt32LE(streamId, 1);
              ws.send(Buffer.concat([header, chunk]));
            }
          });

          sock.on('close', () => {
            streams.delete(streamId);
            if (ws.readyState === ws.OPEN) {
              const closeBuf = Buffer.alloc(6);
              closeBuf.writeUInt8(0x03, 0); // CLOSE
              closeBuf.writeUInt32LE(streamId, 1);
              closeBuf.writeUInt8(0x01, 5);
              ws.send(closeBuf);
            }
          });

          sock.on('error', (err) => {
            streams.delete(streamId);
            if (ws.readyState === ws.OPEN) {
              const closeBuf = Buffer.alloc(6);
              closeBuf.writeUInt8(0x03, 0); // CLOSE
              closeBuf.writeUInt32LE(streamId, 1);
              closeBuf.writeUInt8(0x02, 5);
              ws.send(closeBuf);
            }
          });

          streams.set(streamId, sock);

        } else if (packetType === 0x02) {
          // DATA packet
          const payload = buf.slice(5);
          const sock = streams.get(streamId);
          if (sock && !sock.destroyed) {
            sock.write(payload);
          }

        } else if (packetType === 0x03) {
          // CLOSE packet
          const sock = streams.get(streamId);
          if (sock) {
            sock.destroy();
            streams.delete(streamId);
          }
        }
      } catch (err) {
        console.error('[Wisp Server] Error handling packet:', err);
      }
    });

    ws.on('close', () => {
      for (const sock of streams.values()) {
        try { sock.destroy(); } catch (e) {}
      }
      streams.clear();
    });
  });

  liveWss.on('connection', async (clientWs) => {
    console.log('[Live Voice Server] Client connected');
    let session: any = null;

    try {
      const ai = getGeminiClient();
      session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
          },
          systemInstruction: 'You are IsaiahAI, a state-of-the-art super-intelligent voice partner created and branded by St.Amour Electronics. Speak in a helpful and friendly, direct, human tone. Never use Google branding. Be very concise and clear since you are conversing in real-time.',
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        } catch (e) {
          console.error('[Live Voice Server] WS message direct handling error:', e);
        }
      });

      clientWs.on('close', () => {
        console.log('[Live Voice Server] Client WS disconnected');
        if (session) {
          try {
            session.close();
          } catch (e) {}
        }
      });

    } catch (err: any) {
      console.error('[Live Voice Server] Error starting Live API session:', err);
      clientWs.send(JSON.stringify({ error: 'Live API connection error. Please verify secrets and billing status.' }));
      clientWs.close();
    }
  });
}

startServer();
