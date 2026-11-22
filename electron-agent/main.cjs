const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

let mainWindow;
let appServer = null;
let appOrigin = null;
let workspaceRoot = null;
let defaultBrowserPrompted = false;
let updateCheckTimer = null;
const browserViews = new Map();
let activeBrowserTabId = '';
let browserPanelVisible = false;
let browserBounds = { x: 0, y: 0, width: 0, height: 0 };
const settingsFile = path.join(app.getPath('userData'), 'agent-settings.json');
function isAppProtocolUrl(value) {
  try { return ['isaiahsearch:', 'web+isaiahsearch:', 'http:', 'https:'].includes(new URL(String(value || '')).protocol); }
  catch { return false; }
}
let pendingProtocolUrls = (process.argv || []).filter(isAppProtocolUrl);
function sendProtocolUrl(rawUrl) {
  if (!isAppProtocolUrl(rawUrl)) return;
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) mainWindow.webContents.send('app:open-url', { url: String(rawUrl) });
  else pendingProtocolUrls.push(String(rawUrl));
}
function flushProtocolUrls() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) return;
  const queued = pendingProtocolUrls.splice(0);
  for (const item of queued) mainWindow.webContents.send('app:open-url', { url: item });
}
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient('isaiahsearch', process.execPath, [path.resolve(process.argv[1])]);
  app.setAsDefaultProtocolClient('web+isaiahsearch', process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient('isaiahsearch');
  app.setAsDefaultProtocolClient('web+isaiahsearch');
}
app.on('open-url', (event, url) => { event.preventDefault(); sendProtocolUrl(url); });
app.on('second-instance', (_event, argv) => {
  const url = (argv || []).find(isAppProtocolUrl);
  if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
  if (url) sendProtocolUrl(url);
});
const DEFAULT_LOCAL_UI_PORT = 41737;
const DEFAULT_API_BASE_URL = 'https://codepro-gateway-production.up.railway.app/api';
const DEFAULT_CODEPRO_API_BASE_URL = 'https://codepro-gateway-production.up.railway.app';
async function loadSavedWorkspace() {
  let candidate = '';
  try {
    const saved = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
    candidate = typeof saved.workspaceRoot === 'string' ? saved.workspaceRoot : '';
    defaultBrowserPrompted = saved.defaultBrowserPrompted === true;
  } catch { /* first launch or reset: use the private default workspace */ }
  if (candidate) {
    try {
      const real = await fs.realpath(candidate);
      const stat = await fs.stat(real);
      if (stat.isDirectory()) workspaceRoot = real;
    } catch { /* fall through to the default workspace */ }
  }
  if (!workspaceRoot) {
    const documents = app.getPath('documents') || app.getPath('home');
    const defaultFolder = path.join(documents, 'IsaiahSearch Workspace');
    await fs.mkdir(defaultFolder, { recursive: true });
    workspaceRoot = await fs.realpath(defaultFolder);
    await persistWorkspace();
  }
}
async function persistWorkspace() {
  await fs.mkdir(path.dirname(settingsFile), { recursive: true });
  await fs.writeFile(settingsFile, JSON.stringify({ workspaceRoot, defaultBrowserPrompted }, null, 2), { encoding: 'utf8', mode: 0o600 });
}
const skippedDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'release', '.next', '.cache', '.idea', '.vscode']);
const textExtensions = new Set(['.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.html', '.htm', '.py', '.rs', '.go', '.java', '.cs', '.xml', '.yml', '.yaml', '.toml', '.ini', '.sh', '.bat', '.ps1', '.sql', '.svg', '.env.example']);
function toggleFullscreenShortcut(event, input) {
  if (input?.type !== 'keyDown' || String(input.key).toLowerCase() !== 'f11') return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  event.preventDefault();
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420, height: 920, minWidth: 700, minHeight: 560,
    backgroundColor: '#0b1020', title: 'IsaiahSearch', autoHideMenuBar: true, fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false
    }
  });

  // Puter auth is stored per web origin. Keep a stable loopback origin across restarts
  // so users do not need to sign in again every time IsaiahSearch opens.
  appServer = http.createServer(async (request, response) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    const assetPaths = {
      '/assets/isaiahai-icon.svg': path.join(__dirname, 'assets', 'isaiahai-icon.svg'),
      '/assets/isaiahsearch-icon.svg': path.join(__dirname, 'assets', 'isaiahsearch-icon.svg'),
    };
    try {
      if (assetPaths[pathname]) {
        const asset = await fs.readFile(assetPaths[pathname]);
        response.writeHead(200, {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff'
        });
        response.end(asset);
        return;
      }
      if (pathname !== '/' && pathname !== '/index.html') {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      const page = await fs.readFile(path.join(__dirname, 'index.html'));
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      response.end(page);
    } catch {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('IsaiahSearch could not load its interface.');
    }
  });
  mainWindow.webContents.once('did-finish-load', flushProtocolUrls);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.on('before-input-event', toggleFullscreenShortcut);
  const configuredPort = Number(process.env.ISAIAHSEARCH_LOCAL_PORT || DEFAULT_LOCAL_UI_PORT);
  const preferredPort = Number.isInteger(configuredPort) && configuredPort >= 1024 && configuredPort <= 65535
    ? configuredPort
    : DEFAULT_LOCAL_UI_PORT;
  const loadLocalUi = () => {
    const address = appServer.address();
    const port = address && typeof address === 'object' ? address.port : 0;
    appOrigin = 'http://localhost:' + port;
    if (port !== preferredPort) {
      console.warn('[IsaiahSearch] The stable localhost port is busy; using a temporary port. Puter may ask you to sign in again next launch.');
    }
    mainWindow.loadURL(appOrigin + '/').catch(error => {
      console.error('[IsaiahSearch] The local interface could not be opened:', error?.message || error);
      dialog.showErrorBox('IsaiahSearch could not start', 'The local interface could not be opened. Restart IsaiahSearch and try again.');
      app.quit();
    });
  };
  let usedFallbackPort = false;
  const onLocalServerError = error => {
    if (error?.code === 'EADDRINUSE' && !usedFallbackPort) {
      usedFallbackPort = true;
      appServer.removeListener('error', onLocalServerError);
      console.warn('[IsaiahSearch] Port ' + preferredPort + ' is already in use; falling back to a temporary localhost port.');
      appServer.once('error', fallbackError => {
        console.error('[IsaiahSearch] The fallback local server failed:', fallbackError?.message || fallbackError);
        dialog.showErrorBox('IsaiahSearch could not start', 'The local interface server could not bind to localhost. Close conflicting apps and restart IsaiahSearch.');
        app.quit();
      });
      appServer.listen(0, 'localhost', loadLocalUi);
      return;
    }
    console.error('[IsaiahSearch] The local interface server failed:', error?.message || error);
    dialog.showErrorBox('IsaiahSearch could not start', 'The local interface server could not start. Restart IsaiahSearch and try again.');
    app.quit();
  };
  appServer.on('error', onLocalServerError);
  appServer.listen(preferredPort, 'localhost', loadLocalUi);

  // Keep the app's local UI local. A sandboxed popup is allowed for OAuth flows;
  // ordinary website popups from the Browser tab are handled separately below.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 620, height: 780, parent: mainWindow, autoHideMenuBar: true,
          webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webviewTag: false }
        }
      };
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!appOrigin || !(url === appOrigin || url.startsWith(appOrigin + '/'))) event.preventDefault();
  });
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('browser:bounds-refresh');
  });
  mainWindow.on('closed', () => {
    for (const view of browserViews.values()) {
      try { view.webContents.close(); } catch {}
    }
    browserViews.clear();
    mainWindow = null;
  });
}

function sendBrowserEvent(tabId, type, extra = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('browser:event', { tabId, type, ...extra });
  }
}
function getBrowserView(tabId) {
  return browserViews.get(String(tabId || '')) || null;
}
function applyBrowserViewState() {
  for (const [tabId, view] of browserViews) {
    const visible = browserPanelVisible && tabId === activeBrowserTabId && browserBounds.width > 1 && browserBounds.height > 1;
    view.setBounds(browserBounds);
    view.setVisible(visible);
  }
}

const HOME_NEWS_CACHE_MS = 10 * 60 * 1000;
let homeNewsCache = { fetchedAt: 0, items: [] };

function decodeNewsEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function newsXmlTag(xml, name) {
  const match = String(xml || '').match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return match ? match[1] : '';
}

function newsAttribute(tag, name) {
  const match = String(tag || '').match(new RegExp('\\b' + name + '\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]', 'i'));
  return match ? decodeNewsEntities(match[1]) : '';
}

function safeNewsImageUrl(rawUrl, baseUrl) {
  try {
    const parsed = new URL(String(rawUrl || ''), baseUrl || undefined);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}

function findNewsMetaImage(html) {
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = (newsAttribute(tag, 'property') || newsAttribute(tag, 'name')).toLowerCase();
    if (key === 'og:image' || key === 'og:image:url' || key === 'twitter:image' || key === 'twitter:image:src') {
      const value = newsAttribute(tag, 'content');
      if (value) return value;
    }
  }
  const imageSource = String(html || '').match(/<link\b[^>]*rel=["\x27]image_src["\x27][^>]*>/i);
  return imageSource ? newsAttribute(imageSource[0], 'href') : '';
}

async function fetchNewsArticlePreview(item) {
  try {
    const response = await fetch(item.url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IsaiahSearch/1.4; +https://github.com/stamourelectronics-creator/stamourelectronics-creator.github.io)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'
      },
      signal: AbortSignal.timeout(5000)
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;
    const html = (await response.text()).slice(0, 500000);
    const finalUrl = response.url || item.url;
    const imageUrl = safeNewsImageUrl(findNewsMetaImage(html), finalUrl);
    const siteNameTag = (html.match(/<meta\b[^>]*>/gi) || []).find(tag => (newsAttribute(tag, 'property') || newsAttribute(tag, 'name')).toLowerCase() === 'og:site_name');
    const siteName = siteNameTag ? newsAttribute(siteNameTag, 'content') : '';
    let faviconUrl = '';
    try {
      const host = new URL(finalUrl).hostname.replace(/^www\./, '');
      faviconUrl = 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(host);
    } catch {}
    return { imageUrl, siteName, faviconUrl };
  } catch {
    return null;
  }
}

async function fetchHomeNews() {
  if (homeNewsCache.items.length && Date.now() - homeNewsCache.fetchedAt < HOME_NEWS_CACHE_MS) {
    return homeNewsCache.items;
  }

  const feedUrl = 'https://news.google.com/rss/search?' + new URLSearchParams({
    q: 'Canada OR world OR technology latest news',
    hl: 'en-CA',
    gl: 'CA',
    ceid: 'CA:en'
  }).toString();
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; IsaiahSearch/1.4)',
      'Accept': 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.5'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('The news feed returned HTTP ' + response.status + '.');
  const xml = (await response.text()).slice(0, 1500000);
  const itemMatches = Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)).slice(0, 8);
  const items = itemMatches.map(match => {
    const itemXml = match[1];
    const title = decodeNewsEntities(newsXmlTag(itemXml, 'title'));
    const url = safeNewsImageUrl(newsXmlTag(itemXml, 'link').replace(/<!\[CDATA\[|\]\]>/g, '').trim());
    const source = decodeNewsEntities(newsXmlTag(itemXml, 'source')) || 'News';
    const time = decodeNewsEntities(newsXmlTag(itemXml, 'pubDate'));
    const imageTag = (itemXml.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/i) || [])[0] || '';
    let imageUrl = safeNewsImageUrl(newsAttribute(imageTag, 'url'));
    if (!imageUrl) {
      const description = String(newsXmlTag(itemXml, 'description')).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
      const imageMatch = description.match(/<img\b[^>]*src=["\x27]([^"\x27]+)/i);
      if (imageMatch) imageUrl = safeNewsImageUrl(imageMatch[1]);
    }
    return { title, url, source, time, imageUrl };
  }).filter(item => item.title && item.url);

  if (!items.length) throw new Error('The news feed did not contain any current headlines.');

  await Promise.all(items.slice(0, 6).map(async item => {
    let preview = null;
    if (!item.imageUrl) preview = await fetchNewsArticlePreview(item);
    if (preview) {
      if (preview.imageUrl) item.imageUrl = preview.imageUrl;
      if (preview.siteName) item.source = preview.siteName;
      item.faviconUrl = preview.faviconUrl || '';
    }
    if (!item.imageUrl) {
      try {
        const host = new URL(item.url).hostname.replace(/^www\./, '');
        item.imageUrl = 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(host);
      } catch {}
    }
  }));

  for (const item of items) {
    if (!item.imageUrl) {
      try {
        const host = new URL(item.url).hostname.replace(/^www\./, '');
        item.imageUrl = 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(host);
      } catch {}
    }
  }

  homeNewsCache = { fetchedAt: Date.now(), items };
  return items;
}

ipcMain.handle('news:load-home', async () => {
  try {
    const items = await fetchHomeNews();
    return { items, fetchedAt: homeNewsCache.fetchedAt };
  } catch (error) {
    return { items: [], error: String(error?.message || 'News could not be loaded.') };
  }
});

function isAllowedBrowserUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ''));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
}
ipcMain.handle('browser:create', async (_event, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) throw new Error('The IsaiahSearch window is not available.');
  const tabId = String(payload?.tabId || '').slice(0, 100);
  if (!tabId) throw new Error('A browser tab ID is required.');
  const existing = browserViews.get(tabId);
  if (existing) {
    try { mainWindow.contentView.removeChildView(existing); } catch {}
    try { existing.webContents.close(); } catch {}
    browserViews.delete(tabId);
  }
  const view = new WebContentsView({
    webPreferences: {
      partition: 'persist:isaiahai-browser',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  view.webContents.on('before-input-event', toggleFullscreenShortcut);
  // A new WebContentsView must start hidden; the renderer explicitly activates it after navigation is ready.
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  view.setVisible(false);
  mainWindow.contentView.addChildView(view);
  browserViews.set(tabId, view);
  const userAgent = view.webContents.getUserAgent().replace(/\sElectron\/[^\s]+/g, '');
  view.webContents.setUserAgent(userAgent);
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedBrowserUrl(url)) sendBrowserEvent(tabId, 'new-tab', { url });
    return { action: 'deny' };
  });
  view.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedBrowserUrl(url)) event.preventDefault();
  });
  view.webContents.on('did-navigate', (_event, url) => {
    sendBrowserEvent(tabId, 'navigate', {
      url, canGoBack: view.webContents.canGoBack(), canGoForward: view.webContents.canGoForward()
    });
  });
  view.webContents.on('did-navigate-in-page', (_event, url) => {
    sendBrowserEvent(tabId, 'navigate', {
      url, canGoBack: view.webContents.canGoBack(), canGoForward: view.webContents.canGoForward()
    });
  });
  view.webContents.on('page-title-updated', (_event, title) => {
    sendBrowserEvent(tabId, 'title', { title: String(title || '').slice(0, 100) });
  });
  view.webContents.on('did-start-loading', () => sendBrowserEvent(tabId, 'loading', { loading: true }));
  view.webContents.on('did-stop-loading', () => sendBrowserEvent(tabId, 'loading', { loading: false }));
  view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      sendBrowserEvent(tabId, 'error', {
        errorCode, errorDescription: String(errorDescription || 'Chromium could not load this page.'),
        url: validatedURL || ''
      });
    }
  });
  view.webContents.on('render-process-gone', (_event, details) => {
    sendBrowserEvent(tabId, 'error', { errorDescription: 'Chromium renderer stopped: ' + String(details?.reason || 'unknown reason') });
  });
  view.webContents.session.setPermissionRequestHandler((requestingContents, permission, callback, details) => {
    let origin = 'this website';
    try { origin = new URL(details?.requestingUrl || requestingContents.getURL()).origin; } catch {}
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Website permission request',
      message: 'Allow this website to access ' + permission + '?',
      detail: origin + '\n\nOnly approve permissions you expect the website to need.',
      buttons: ['Block', 'Allow once'], defaultId: 0, cancelId: 0, noLink: true
    }).then(result => callback(result.response === 1)).catch(() => callback(false));
  });
  applyBrowserViewState();
  return { created: true };
});
ipcMain.handle('browser:navigate', async (_event, payload) => {
  const tabId = String(payload?.tabId || '');
  const url = String(payload?.url || '');
  const view = getBrowserView(tabId);
  if (!view) throw new Error('That browser tab is no longer open.');
  if (!isAllowedBrowserUrl(url)) throw new Error('Only HTTP and HTTPS websites can be opened.');
  try {
    await view.webContents.loadURL(url);
    return { ok: true };
  } catch (error) {
    sendBrowserEvent(tabId, 'error', { errorDescription: error?.message || 'Chromium could not load this page.', url });
    throw error;
  }
});
ipcMain.handle('browser:set-active', (_event, payload) => {
  activeBrowserTabId = String(payload?.tabId || '');
  browserPanelVisible = payload?.visible === true;
  applyBrowserViewState();
  return { ok: true };
});
ipcMain.on('browser:set-bounds', (_event, bounds) => {
  const next = bounds || {};
  browserBounds = {
    x: Math.max(0, Math.round(Number(next.x) || 0)),
    y: Math.max(0, Math.round(Number(next.y) || 0)),
    width: Math.max(0, Math.round(Number(next.width) || 0)),
    height: Math.max(0, Math.round(Number(next.height) || 0))
  };
  applyBrowserViewState();
});
ipcMain.handle('browser:back', (_event, tabId) => {
  const view = getBrowserView(tabId);
  if (view?.webContents.canGoBack()) view.webContents.goBack();
  return { canGoBack: !!view?.webContents.canGoBack() };
});
ipcMain.handle('browser:forward', (_event, tabId) => {
  const view = getBrowserView(tabId);
  if (view?.webContents.canGoForward()) view.webContents.goForward();
  return { canGoForward: !!view?.webContents.canGoForward() };
});
ipcMain.handle('browser:inspect', async (_event, tabId) => {
  const view = getBrowserView(tabId);
  if (!view || view.webContents.isDestroyed()) throw new Error('That browser tab is no longer open.');
  const script = '(()=>{const description=document.querySelector("meta[name=description]")?.content||"";const links=Array.from(document.querySelectorAll("a[href]")).slice(0,35).map(a=>({title:(a.innerText||a.getAttribute("aria-label")||a.href).trim().slice(0,160),url:a.href})).filter(a=>/^https?:/i.test(a.url));return {title:document.title||"",url:location.href,description:String(description).slice(0,500),text:String(document.body?.innerText||"").slice(0,12000),links};})()';
  return await view.webContents.executeJavaScript(script, true);
});
ipcMain.handle('browser:reload', (_event, tabId) => {
  const view = getBrowserView(tabId);
  if (view) view.webContents.reload();
  return { ok: !!view };
});
ipcMain.handle('browser:close', (_event, tabId) => {
  const view = getBrowserView(String(tabId || ''));
  if (view) {
    browserViews.delete(String(tabId || ''));
    try { mainWindow?.contentView.removeChildView(view); } catch {}
    try { view.webContents.close(); } catch {}
  }
  applyBrowserViewState();
  return { ok: true };
});

function beginUpdateChecks() {
  if (!app.isPackaged) return;
  // electron-updater can update Linux AppImage builds. Debian packages remain
  // installable, but automatic replacement is only supported for AppImage.
  if (process.platform === 'linux' && !process.env.APPIMAGE) {
    console.info('[IsaiahSearch updater] Linux auto-updates are enabled for the AppImage build.');
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('error', error => console.warn('[IsaiahSearch updater]', error?.message || error));
  autoUpdater.on('update-downloaded', async info => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'IsaiahSearch update ready',
      message: 'IsaiahSearch ' + String(info?.version || 'new version') + ' has been downloaded.',
      detail: 'Restart IsaiahSearch to install the update. You can also choose Later and it will install when you next close the app.',
      buttons: ['Restart and install', 'Later'],
      defaultId: 0, cancelId: 1
    });
    if (choice.response === 0) autoUpdater.quitAndInstall();
  });
  const check = () => autoUpdater.checkForUpdatesAndNotify().catch(error => console.warn('[IsaiahSearch updater]', error?.message || error));
  setTimeout(check, 5000);
  updateCheckTimer = setInterval(check, 4 * 60 * 60 * 1000);
}
async function askDefaultBrowserPreference() {
  if (process.platform !== 'win32' || defaultBrowserPrompted) return;
  const choice = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Make IsaiahSearch your default browser?',
    message: 'Would you like to choose IsaiahSearch as your default browser?',
    detail: 'Windows requires you to confirm this in Default apps. Choose IsaiahSearch for web links (HTTP and HTTPS) if it is listed.',
    buttons: ['Not now', 'Open Default Apps'],
    defaultId: 0, cancelId: 0, noLink: true
  });
  defaultBrowserPrompted = true;
  await persistWorkspace();
  if (choice.response === 1) {
    app.setAsDefaultProtocolClient('http');
    app.setAsDefaultProtocolClient('https');
    try { await shell.openExternal('ms-settings:defaultapps'); } catch (error) { console.warn('[IsaiahSearch] Could not open Default Apps:', error?.message || error); }
  }
}
app.whenReady().then(async () => {
  await loadSavedWorkspace();
  createWindow();
  await askDefaultBrowserPreference();
  beginUpdateChecks();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  if (updateCheckTimer) { clearInterval(updateCheckTimer); updateCheckTimer = null; }
  if (appServer) {
    try { appServer.close(); } catch { /* app is exiting */ }
    appServer = null;
  }
});

ipcMain.handle('app:config', () => {
  const configured = String(process.env.ISAIAH_API_BASE_URL || DEFAULT_API_BASE_URL).trim();
  let apiBaseUrl = DEFAULT_API_BASE_URL;
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:') throw new Error('The AI API must use HTTPS.');
    apiBaseUrl = parsed.href.replace(/\/$/, '');
  } catch { /* use the default hosted API */ }
  const codeProConfigured = String(process.env.ISAIAH_CODEPRO_API_BASE_URL || DEFAULT_CODEPRO_API_BASE_URL).trim();
  let codeProApiBaseUrl = DEFAULT_CODEPRO_API_BASE_URL;
  try {
    const parsed = new URL(codeProConfigured);
    if (parsed.protocol !== 'https:') throw new Error('The CodePro API must use HTTPS.');
    codeProApiBaseUrl = parsed.href.replace(/\/$/, '');
  } catch { /* use the default Railway CodePro API */ }
  return { apiBaseUrl, codeProApiBaseUrl, platform: process.platform };
});

function requireWorkspace() {
  if (!workspaceRoot) throw new Error('The automatic IsaiahAI workspace has not finished initializing. Restart the app and try again.');
  return workspaceRoot;
}
function isInsideWorkspace(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
async function safeWorkspaceFile(relativePath, options = {}) {
  const root = await fs.realpath(requireWorkspace());
  const requested = String(relativePath || '').trim();
  if (!requested) throw new Error('Enter a file path.');
  const absolute = path.isAbsolute(requested);
  if (absolute && !options.allowOutsideWorkspace) throw new Error('Use a relative path inside the automatic workspace.');
  const candidate = absolute ? path.resolve(requested) : path.resolve(root, requested);
  const insideWorkspace = isInsideWorkspace(root, candidate);
  if (!insideWorkspace && !(absolute && options.allowOutsideWorkspace)) throw new Error('That path is outside the automatic workspace.');
  if (!textExtensions.has(path.extname(candidate).toLowerCase())) throw new Error('This file type is not enabled for text editing.');
  try {
    const real = await fs.realpath(candidate);
    if (insideWorkspace && !isInsideWorkspace(root, real)) throw new Error('Links outside the automatic workspace are blocked.');
    const stat = await fs.stat(real);
    if (!stat.isFile()) throw new Error('Only files can be opened.');
    if (stat.size > 2000000) throw new Error('Files over 2 MB are not opened in the editor.');
    return { root, file: real, exists: true, insideWorkspace };
  } catch (error) {
    if (error.code !== 'ENOENT' || !options.allowCreate) throw error;
    const parent = await fs.realpath(path.dirname(candidate));
    if (insideWorkspace && parent !== root && !isInsideWorkspace(root, parent)) throw new Error('The destination folder is outside the automatic workspace.');
    return { root, file: path.join(parent, path.basename(candidate)), exists: false, insideWorkspace };
  }
}
async function confirmAction(title, message, detail, confirmLabel) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning', title, message, detail,
    buttons: ['Cancel', confirmLabel], defaultId: 0, cancelId: 0, noLink: true
  });
  return result.response === 1;
}

const DESKTOP_APP_CATALOG = Object.freeze({
  notepad: { label: 'Notepad', executable: 'notepad.exe' },
  calculator: { label: 'Calculator', executable: 'calc.exe' },
  paint: { label: 'Paint', executable: 'mspaint.exe' },
  'file-explorer': { label: 'File Explorer', executable: 'explorer.exe' },
  'task-manager': { label: 'Task Manager', executable: 'taskmgr.exe' }
});

const BLOCKED_LAUNCH_EXECUTABLES = new Set([
  'powershell.exe','pwsh.exe','cmd.exe','conhost.exe','wscript.exe','cscript.exe',
  'mshta.exe','rundll32.exe','regsvr32.exe','regedit.exe','taskkill.exe','shutdown.exe',
  'diskpart.exe','wmic.exe','bcdedit.exe','netsh.exe','ssh.exe','scp.exe','sftp.exe',
  'ftp.exe','curl.exe','wget.exe','python.exe','pythonw.exe','node.exe','wsl.exe'
]);

async function chooseWindowsApplication(appLabel) {
  const selected = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose ' + appLabel + ' to launch',
    buttonLabel: 'Select application',
    properties: ['openFile'],
    filters: [{ name: 'Windows applications', extensions: ['exe'] }]
  });
  if (selected.canceled || !selected.filePaths[0]) return null;
  const executable = await fs.realpath(selected.filePaths[0]);
  const stat = await fs.stat(executable);
  if (!stat.isFile() || path.extname(executable).toLowerCase() !== '.exe') {
    throw new Error('Choose a Windows .exe application file.');
  }
  const executableName = path.basename(executable).toLowerCase();
  if (BLOCKED_LAUNCH_EXECUTABLES.has(executableName)) {
    throw new Error('That command interpreter or system utility is not available through the app launcher.');
  }
  return { executable, label: path.basename(executable, path.extname(executable)) };
}

async function launchWindowsExecutable(appId, definition) {
  await fs.access(definition.executable);
  return await new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(definition.executable, [], {
      cwd: app.getPath('home'),
      detached: true,
      windowsHide: false,
      shell: false,
      stdio: 'ignore'
    });
    child.once('error', error => {
      if (settled) return;
      settled = true;
      reject(new Error('Windows could not start ' + definition.label + ': ' + String(error && error.message || error)));
    });
    child.once('spawn', () => {
      if (settled) return;
      settled = true;
      child.unref();
      resolve({ app: String(appId), label: definition.label, executable: definition.executable });
    });
  });
}

async function resolveWindowsApplication(appId) {
  const known = DESKTOP_APP_CATALOG[appId];
  if (known) {
    const systemRoot = String(process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows');
    const system32 = path.resolve(systemRoot, 'System32');
    const executable = path.resolve(system32, known.executable);
    if (!executable.toLowerCase().startsWith(system32.toLowerCase() + path.sep)) {
      throw new Error('The requested app path failed its Windows system-folder check.');
    }
    return { executable, label: known.label };
  }
  const requestedLabel = String(appId || 'application')
    .split('-').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').slice(0, 60);
  return await chooseWindowsApplication(requestedLabel || 'application');
}

ipcMain.handle('desktop:launch-app', async (_event, payload) => {
  if (process.platform !== 'win32') throw new Error('Windows application launching is supported on Windows only.');
  const appId = String(payload && payload.app || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!appId) throw new Error('Choose an application name first.');
  const definition = await resolveWindowsApplication(appId);
  if (!definition) return { approved: false, canceled: true, app: appId };
  const approved = await confirmAction(
    'Approve app launch?',
    'Allow IsaiahAI to open ' + definition.label + '?',
    'Application: ' + definition.executable + '\n\nThe app will start as your current Windows user, without administrator elevation. The agent will not receive unrestricted control of this app or your desktop.',
    'Open app'
  );
  if (!approved) return { approved: false, canceled: true, app: appId, label: definition.label };
  const launched = await launchWindowsExecutable(appId, definition);
  return { approved: true, ...launched };
});

const SYSTEM_DIAGNOSTICS = Object.freeze({
  'computer-overview': {
    label: 'Operating system overview',
    script: "Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture, LastBootUpTime | Format-List"
  },
  'hardware-overview': {
    label: 'Hardware overview',
    script: "Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, NumberOfProcessors, NumberOfLogicalProcessors, @{Name='RAM_GB';Expression={[math]::Round($_.TotalPhysicalMemory / 1GB, 1)}} | Format-List"
  },
  'storage-overview': {
    label: 'Disk capacity',
    script: "Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\" | Select-Object DeviceID, VolumeName, @{Name='Size_GB';Expression={[math]::Round($_.Size / 1GB, 1)}}, @{Name='Free_GB';Expression={[math]::Round($_.FreeSpace / 1GB, 1)}} | Format-Table -AutoSize"
  },
  'running-processes': {
    label: 'Running processes',
    script: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 25 ProcessName, Id, CPU, @{Name='Memory_MB';Expression={[math]::Round($_.WorkingSet64 / 1MB, 1)}} | Format-Table -AutoSize"
  },
  'running-services': {
    label: 'Running services',
    script: "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 40 Name, DisplayName, Status | Format-Table -AutoSize"
  },
  'network-adapters': {
    label: 'Network adapters',
    script: "Get-CimInstance Win32_NetworkAdapter | Where-Object {$_.NetEnabled -eq $true} | Select-Object NetConnectionID, Name, Manufacturer, NetConnectionStatus | Format-Table -AutoSize"
  },
  'recent-updates': {
    label: 'Recently installed Windows updates',
    script: "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 20 HotFixId, Description, InstalledOn | Format-Table -AutoSize"
  },
'cpu-details': {
    label: 'CPU details',
    script: "Get-CimInstance Win32_Processor | Select-Object Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, CurrentClockSpeed | Format-List"
  },
  'gpu-details': {
    label: 'Graphics adapters',
    script: "Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, VideoModeDescription, Status | Format-Table -AutoSize"
  },
  'memory-modules': {
    label: 'Installed memory modules',
    script: "Get-CimInstance Win32_PhysicalMemory | Select-Object Manufacturer, @{Name='Capacity_GB';Expression={[math]::Round($_.Capacity / 1GB, 1)}}, Speed, ConfiguredClockSpeed, SMBIOSMemoryType | Format-Table -AutoSize"
  },
  'motherboard-bios': {
    label: 'Motherboard and firmware',
    script: "Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product, Version | Format-List; Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate | Format-List"
  },
  'physical-disks': {
    label: 'Physical disk inventory',
    script: "Get-CimInstance Win32_DiskDrive | Select-Object Model, MediaType, InterfaceType, @{Name='Size_GB';Expression={[math]::Round($_.Size / 1GB, 1)}}, Status | Format-Table -AutoSize"
  },
  'device-drivers': {
    label: 'Signed device drivers',
    script: "Get-CimInstance Win32_PnPSignedDriver | Select-Object -First 45 DeviceName, DriverVersion, DriverDate, DriverProviderName | Format-Table -AutoSize"
  },
  'usb-devices': {
    label: 'Connected USB devices',
    script: "Get-CimInstance Win32_PnPEntity | Where-Object {$_.PNPDeviceID -like 'USB*' -and $_.ConfigManagerErrorCode -eq 0} | Select-Object -First 35 Name, Manufacturer, Status | Format-Table -AutoSize"
  },
  'installed-apps': {
    label: 'Installed application inventory',
    script: "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName} | Sort-Object DisplayName | Select-Object -First 70 DisplayName, DisplayVersion, Publisher | Format-Table -AutoSize"
  },
  'defender-status': {
    label: 'Microsoft Defender status',
    script: "$available = Get-Command Get-MpComputerStatus -ErrorAction SilentlyContinue; if ($available) { Get-MpComputerStatus | Select-Object AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled, BehaviorMonitorEnabled, IoavProtectionEnabled, NISEnabled, AntivirusSignatureVersion, AntivirusSignatureLastUpdated | Format-List } else { 'Microsoft Defender status cmdlet is not available on this Windows installation.' }"
  },
  'battery-status': {
    label: 'Battery status',
    script: "$battery = Get-CimInstance Win32_Battery; if ($battery) { $battery | Select-Object Name, BatteryStatus, EstimatedChargeRemaining, DesignVoltage | Format-List } else { 'No battery was reported by Windows.' }"
  },
  'audio-devices': {
    label: 'Audio devices',
    script: "Get-CimInstance Win32_SoundDevice | Select-Object Name, Manufacturer, ProductName, Status | Format-Table -AutoSize"
  }
});

function runSystemDiagnostic(diagnosticId) {
  const definition = SYSTEM_DIAGNOSTICS[diagnosticId];
  if (!definition) throw new Error('That system diagnostic is not on the fixed read-only list.');
  const systemRoot = String(process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows');
  const executable = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference='Stop'; " + definition.script];
  return new Promise((resolve, reject) => {
    let settled = false;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const maxOutput = 12000;
    const append = (current, chunk) => {
      const next = current + String(chunk || '');
      return next.length > maxOutput ? next.slice(0, maxOutput) : next;
    };
    let child;
    try {
      child = spawn(executable, args, {
        cwd: app.getPath('home'),
        windowsHide: true,
        shell: false,
        env: createWorkspaceCommandEnv(),
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      reject(new Error('The Windows diagnostic could not start: ' + String(error && error.message || error)));
      return;
    }
    const timeout = setTimeout(() => {
      timedOut = true;
      try { child.kill(); } catch {}
    }, 25000);
    child.stdout.on('data', chunk => { stdout = append(stdout, chunk); });
    child.stderr.on('data', chunk => { stderr = append(stderr, chunk); });
    child.once('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error('The Windows diagnostic process failed: ' + String(error && error.message || error)));
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      let output = stdout.trim();
      if (stderr.trim()) output += (output ? '\n\n' : '') + '[stderr]\n' + stderr.trim();
      if (timedOut) output += (output ? '\n\n' : '') + 'The diagnostic stopped after the 25-second time limit.';
      if (!output) output = signal ? 'Process ended with signal ' + signal + '.' : '(no output)';
      const exitCode = Number.isInteger(code) ? code : (timedOut ? 124 : 1);
      resolve({ ok: exitCode === 0 && !timedOut, diagnosticId, label: definition.label, exitCode, timedOut, output });
    });
  });
}

ipcMain.handle('system:run-diagnostic', async (_event, payload) => {
  if (process.platform !== 'win32') throw new Error('Whole-machine read-only diagnostics are currently available on Windows only.');
  const diagnosticId = String(payload && payload.diagnostic || '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SYSTEM_DIAGNOSTICS, diagnosticId)) {
    throw new Error('Choose one of the predefined read-only Windows diagnostics.');
  }
  return await runSystemDiagnostic(diagnosticId);
});

ipcMain.handle('workspace:choose', async () => {
  const picked = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (picked.canceled || !picked.filePaths[0]) return { canceled: true };
  workspaceRoot = await fs.realpath(picked.filePaths[0]);
  await persistWorkspace();
  return { canceled: false, path: workspaceRoot };
});
ipcMain.handle('workspace:clear', async () => {
  workspaceRoot = null;
  try { await fs.unlink(settingsFile); } catch {}
  return { cleared: true };
});
ipcMain.handle('workspace:path', () => workspaceRoot);
ipcMain.handle('workspace:list', async () => {
  const root = requireWorkspace();
  const output = [];
  async function walk(folder, relative, depth) {
    if (output.length >= 1200 || depth > 16) return;
    let entries;
    try { entries = await fs.readdir(folder, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (output.length >= 1200) break;
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      if (entry.isDirectory()) {
        if (!skippedDirs.has(entry.name)) await walk(path.join(folder, entry.name), relative ? path.join(relative, entry.name) : entry.name, depth + 1);
      } else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
        const rel = relative ? path.join(relative, entry.name) : entry.name;
        try {
          const stat = await fs.stat(path.join(root, rel));
          if (stat.size <= 2000000) output.push({ path: rel.replace(/\\/g, '/'), size: stat.size, modified: stat.mtime.toISOString() });
        } catch {}
      }
    }
  }
  await walk(root, '', 0);
  return output;
});
ipcMain.handle('workspace:read', async (_event, relativePath) => {
  const item = await safeWorkspaceFile(relativePath);
  return { path: String(relativePath), content: await fs.readFile(item.file, 'utf8') };
});
ipcMain.handle('workspace:write', async (_event, payload) => {
  const relativePath = String(payload && payload.path || '');
  const content = String(payload && payload.content !== undefined ? payload.content : '');
  const item = await safeWorkspaceFile(relativePath, { allowCreate: true, allowOutsideWorkspace: true });
  const action = item.exists ? 'replace this file' : 'create this file';
  const detail = item.exists
    ? item.file + '\n\nA dated backup will be saved inside .isaiahai-backups first.' + (item.insideWorkspace ? '' : '\n\nThis file is outside the default workspace. Check the full path carefully.')
    : item.file + '\n\nThis path does not exist yet. IsaiahSearch Agent will create it only after your approval.' + (item.insideWorkspace ? '' : '\n\nThis file is outside the default workspace. Check the full path carefully.');
  if (!await confirmAction('Approve file change?', 'Allow IsaiahSearch Agent to ' + action + '?', detail, item.exists ? 'Back up and save' : 'Create file')) {
    return { saved: false, canceled: true };
  }
  if (item.exists) {
    const backupDir = path.join(item.root, '.isaiahai-backups');
    await fs.mkdir(backupDir, { recursive: true });
    const backupName = path.basename(item.file) + '.' + new Date().toISOString().replace(/[:.]/g, '-') + '.bak';
    await fs.copyFile(item.file, path.join(backupDir, backupName));
    await fs.writeFile(item.file, content, 'utf8');
    return { saved: true, created: false, backup: path.join('.isaiahai-backups', backupName) };
  }
  await fs.writeFile(item.file, content, { encoding: 'utf8', flag: 'wx' });
  return { saved: true, created: true, backup: null };
});


const LOCAL_COMMAND_ALLOWLIST = new Set([
  'npm','npx','pnpm','yarn','bun','node','python','python3','py','pytest','uv','ruff','black',
  'dotnet','cargo','rustc','go','java','javac','mvn','gradle','cmake','ctest','make',
  'gcc','g++','clang','clang++','git',
  'get-childitem','get-content','get-location','get-item','get-process','get-service','get-date','get-computerinfo','test-path','resolve-path',
  'select-string','write-output','write-host','measure-object','compare-object',
  'pwd','ls','dir','cat','type','where.exe','findstr','echo','systeminfo','tasklist','whoami','ps','uname','df','free','uptime','lscpu'
]);
const BLOCKED_COMMAND_PATTERN = /\b(?:sudo|runas|start-process|invoke-expression|iex|invoke-command|start-job|remove-item|del|erase|rmdir|rd|format|diskpart|shutdown|restart-computer|stop-computer|clear-disk|reg(?:\.exe)?|set-executionpolicy|taskkill|wmic|netsh|schtasks|bcdedit|takeown|icacls|get-credential|curl|wget|invoke-webrequest|invoke-restmethod|ssh|scp|sftp|ftp|telnet|powershell|pwsh|cmd(?:\.exe)?|bash|sh|wsl)\b/i;
const BLOCKED_SECRET_PATTERN = /(?:\.env(?:\.[a-z0-9_-]+)?|secrets?|credentials?|password|api[_-]?key|access[_-]?token|authorization|private[_-]?key|id_rsa|id_ed25519|\.ssh|\.aws|\.azure|appdata|localappdata)/i;

function validateWorkspaceCommand(payload) {
  const requestedShell = String(payload && payload.shell || '').trim().toLowerCase();
  const expectedShell = process.platform === 'win32' ? 'powershell' : process.platform === 'linux' ? 'bash' : '';
  if (!expectedShell) throw new Error('Approved local commands are supported on Windows and Ubuntu only.');
  if (requestedShell !== expectedShell && !(expectedShell === 'powershell' && requestedShell === 'pwsh')) {
    throw new Error('The requested command shell does not match this operating system.');
  }
  const command = String(payload && payload.command || '').trim();
  if (!command || command.length > 1800) throw new Error('The command is empty or exceeds the 1,800-character limit.');
  if (/[\r\n\x00-\x1f]/.test(command)) throw new Error('Run one command at a time. Multi-line commands are blocked.');
  if (/[;&|<>$()\\]/.test(command) || command.includes(String.fromCharCode(96))) {
    throw new Error('This command contains shell operators or expansion syntax that the local safety check blocks.');
  }
  if (BLOCKED_COMMAND_PATTERN.test(command) || BLOCKED_SECRET_PATTERN.test(command)) {
    throw new Error('This command includes a blocked system, network, or credential operation.');
  }
  if (/(^|[\s"'=])(?:[a-z]:[\\/]|\\\\|\/|~[\\/])/i.test(command) || /(^|[\/\s"'=])\.\.([\\/]|$)/.test(command)) {
    throw new Error('Absolute paths and parent-directory traversal are blocked. Commands must stay in the selected project folder.');
  }
  const executable = String(command.match(/^[a-z0-9_.-]+/i)?.[0] || '').toLowerCase();
  if (!LOCAL_COMMAND_ALLOWLIST.has(executable)) throw new Error('That executable is not on the approved project-command list.');
  const argsText = command.slice(executable.length).trim();
  if (executable === 'git') {
    const subcommand = String(argsText.match(/^[a-z-]+/i)?.[0] || '').toLowerCase();
    if (!['status','diff','log','show','branch','rev-parse','ls-files','check-ignore'].includes(subcommand)) {
      throw new Error('Only read-only Git inspection commands are enabled.');
    }
  }
  if (['npm','pnpm','yarn','bun'].includes(executable)) {
    const subcommand = String(argsText.match(/^[a-z-]+/i)?.[0] || '').toLowerCase();
    if (!['install','ci','test','run','build','start','lint','check','list','outdated','audit','typecheck','format'].includes(subcommand)) {
      throw new Error('That package-manager operation is not on the approved project task list.');
    }
  }
  return { shell: expectedShell, command };
}


function createWorkspaceCommandEnv() {
  const windows = process.platform === 'win32';
  const names = windows
    ? ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ProgramData','ProgramFiles','ProgramFiles(x86)','HOMEDRIVE','HOMEPATH','PATHEXT','ComSpec','SystemDrive','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE']
    : ['PATH','HOME','TMPDIR','USER','LOGNAME','LANG','LC_ALL','TERM','SHELL','XDG_CACHE_HOME'];
  const safe = {};
  for (const name of names) {
    if (typeof process.env[name] === 'string') safe[name] = process.env[name];
  }
  if (!safe.PATH && safe.Path) safe.PATH = safe.Path;
  return safe;
}

function runApprovedWorkspaceCommand(command) {
  const root = path.resolve(requireWorkspace());
  const windows = process.platform === 'win32';
  const executable = windows
    ? (process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe') : 'powershell.exe')
    : '/bin/bash';
  const args = windows
    ? ['-NoLogo','-NoProfile','-NonInteractive','-Command', "$ErrorActionPreference='Stop'\n" + command + "\nif ($LASTEXITCODE -is [int]) { exit $LASTEXITCODE }"]
    : ['--noprofile','--norc','-lc','set -e\n' + command];

  return new Promise((resolve,reject) => {
    let settled = false;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const MAX_OUTPUT_CHARS = 18000;
    const append = (current, chunk) => {
      const next = current + String(chunk || '');
      return next.length > MAX_OUTPUT_CHARS ? next.slice(-MAX_OUTPUT_CHARS) : next;
    };
    let child;
    try {
      child = spawn(executable, args, {
        cwd: root,
        windowsHide: true,
        shell: false,
        env: createWorkspaceCommandEnv(),
        stdio: ['ignore','pipe','pipe']
      });
    } catch (error) {
      reject(new Error('The local command could not be started: ' + String(error && error.message || error)));
      return;
    }
    const timeout = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGTERM'); } catch {}
      const forceStop = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 2500);
      forceStop.unref?.();
    }, 120000);
    child.stdout.on('data', chunk => { stdout = append(stdout, chunk); });
    child.stderr.on('data', chunk => { stderr = append(stderr, chunk); });
    child.once('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error('The local command process failed: ' + String(error && error.message || error)));
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      let output = stdout.trim();
      if (stderr.trim()) output += (output ? '\n\n' : '') + '[stderr]\n' + stderr.trim();
      if (timedOut) output += (output ? '\n\n' : '') + 'Command stopped after the 120-second time limit.';
      if (!output) output = signal ? 'Process ended with signal ' + signal + '.' : '(no output)';
      resolve({ approved: true, cwd: root, exitCode: Number.isInteger(code) ? code : (timedOut ? 124 : 1), timedOut, output });
    });
  });
}

let workspaceCommandInProgress = false;
ipcMain.handle('workspace:run-command', async (_event, payload) => {
  if (workspaceCommandInProgress) throw new Error('A local command is already running. Wait for it to finish first.');
  const root = await fs.realpath(requireWorkspace());
  const validated = validateWorkspaceCommand(payload);
  const detail = [
    'Working folder: ' + root,
    '',
    'Command:',
    validated.command,
    '',
    'This runs locally in the selected project folder, without Administrator privileges.',
    'A project script may create or change project files or install dependencies. Only approve commands and project scripts you trust.',
    'System commands, network transfer tools, credential access, and absolute/out-of-folder paths are blocked.'
  ].join('\n');
  const approved = await confirmAction('Approve local command?', 'Allow IsaiahAI to run this command on this computer?', detail, 'Run command');
  if (!approved) return { approved: false, canceled: true, cwd: root };
  workspaceCommandInProgress = true;
  try { return await runApprovedWorkspaceCommand(validated.command); }
  finally { workspaceCommandInProgress = false; }
});

