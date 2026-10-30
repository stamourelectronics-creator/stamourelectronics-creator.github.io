const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

let mainWindow;
let appServer = null;
let appOrigin = null;
let workspaceRoot = null;
let unrestrictedAgentEnabled = false;
let unrestrictedModeChoiceSaved = false;
const browserViews = new Map();
let activeBrowserTabId = '';
let browserPanelVisible = false;
let browserBounds = { x: 0, y: 0, width: 0, height: 0 };
const settingsFile = path.join(app.getPath('userData'), 'agent-settings.json');
const DEFAULT_API_BASE_URL = 'https://isaiahsearch.netlify.app/api';
async function loadSavedWorkspace() {
  let candidate = '';
  try {
    const saved = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
    candidate = typeof saved.workspaceRoot === 'string' ? saved.workspaceRoot : '';
    unrestrictedAgentEnabled = saved.unrestrictedAgentEnabled === true;
    unrestrictedModeChoiceSaved = saved.unrestrictedModeChoiceSaved === true || unrestrictedAgentEnabled;
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
    const defaultFolder = path.join(documents, 'IsaiahAI Workspace');
    await fs.mkdir(defaultFolder, { recursive: true });
    workspaceRoot = await fs.realpath(defaultFolder);
    await persistWorkspace();
  }
}
async function persistWorkspace() {
  await fs.mkdir(path.dirname(settingsFile), { recursive: true });
  await fs.writeFile(settingsFile, JSON.stringify({ workspaceRoot, unrestrictedAgentEnabled, unrestrictedModeChoiceSaved }, null, 2), { encoding: 'utf8', mode: 0o600 });
}
const skippedDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'release', '.next', '.cache', '.idea', '.vscode']);
const textExtensions = new Set(['.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.html', '.htm', '.py', '.rs', '.go', '.java', '.cs', '.xml', '.yml', '.yaml', '.toml', '.ini', '.sh', '.bat', '.ps1', '.sql', '.svg', '.env.example']);
const presets = {
  'git-status': { bin: 'git', args: ['status', '--short'], label: 'git status --short' },
  'npm-test': { bin: 'npm', args: ['test'], label: 'npm test' },
  'npm-build': { bin: 'npm', args: ['run', 'build'], label: 'npm run build' },
  'node-version': { bin: 'node', args: ['--version'], label: 'node --version' },
  'python-version': { bin: 'python', args: ['--version'], label: 'python --version' }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420, height: 920, minWidth: 700, minHeight: 560,
    backgroundColor: '#090d17', title: 'IsaiahAI Agent',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false
    }
  });

  // Puter auth requires a real web origin, not file://. Serve only the bundled UI on a
  // loopback-only ephemeral port so its sign-in callback has an origin to return to.
  appServer = http.createServer(async (request, response) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    const assetPaths = {
      '/assets/isaiahai-icon.svg': path.join(__dirname, 'assets', 'isaiahai-icon.svg'),
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
      response.end('IsaiahAI Agent could not load its interface.');
    }
  });
  appServer.listen(0, 'localhost', () => {
    const address = appServer.address();
    const port = address && typeof address === 'object' ? address.port : 0;
    appOrigin = 'http://localhost:' + port;
    mainWindow.loadURL(appOrigin + '/');
  });

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
function isAllowedBrowserUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ''));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
}
ipcMain.handle('browser:create', async (_event, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) throw new Error('The IsaiahAI window is not available.');
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

app.whenReady().then(async () => {
  await loadSavedWorkspace();
  if (!unrestrictedModeChoiceSaved) {
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'Choose IsaiahAI system-agent access',
      message: 'Enable unrestricted system mode by default?',
      detail: 'When enabled, IsaiahAI can automatically run AI-proposed PowerShell and Command Prompt commands with the Windows permissions granted to this app. This can change or delete files, install software, edit the registry, and modify system settings. You can turn it off at any time in Computer tools. Windows UAC remains in control.',
      buttons: ['Keep it off', 'Enable unrestricted mode'],
      defaultId: 0, cancelId: 0, noLink: true
    });
    unrestrictedAgentEnabled = choice.response === 1;
    unrestrictedModeChoiceSaved = true;
    await persistWorkspace();
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  if (appServer) {
    try { appServer.close(); } catch { /* app is exiting */ }
    appServer = null;
  }
});

ipcMain.handle('app:config', () => {
  const configured = String(process.env.ISAIAH_API_BASE_URL || DEFAULT_API_BASE_URL).trim();
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:') throw new Error('The AI API must use HTTPS.');
    return { apiBaseUrl: parsed.href.replace(/\/$/, '') };
  } catch {
    return { apiBaseUrl: DEFAULT_API_BASE_URL };
  }
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
ipcMain.handle('agent:unrestricted:get', () => ({
  enabled: unrestrictedAgentEnabled,
  administratorRequested: process.platform === 'win32'
}));
ipcMain.handle('agent:unrestricted:set', async (_event, enabled) => {
  const requested = enabled === true;
  if (requested && !unrestrictedAgentEnabled) {
    const accepted = await confirmAction(
      'Enable unrestricted system agent?',
      'IsaiahAI will automatically run its PowerShell and Command Prompt proposals as Administrator.',
      'No separate approval dialog will appear for each AI-generated command while this mode is enabled. Commands may read, change, or delete files anywhere on this computer, install or remove software, edit the registry, change services, and alter Windows settings. Web pages and files can contain malicious instructions that try to influence the AI. Only enable this on a computer you control and disable it when finished. Windows UAC elevation is still required when the app starts.',
      'Enable unrestricted mode'
    );
    if (!accepted) return { enabled: false, canceled: true };
  }
  unrestrictedAgentEnabled = requested;
  unrestrictedModeChoiceSaved = true;
  await persistWorkspace();
  return { enabled: unrestrictedAgentEnabled, canceled: false };
});
ipcMain.handle('external:open', async (_event, rawUrl) => {
  const url = new URL(String(rawUrl || ''));
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Only HTTP/HTTPS links can be opened externally.');
  await shell.openExternal(url.href);
  return true;
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
    : item.file + '\n\nThis path does not exist yet. IsaiahAI Agent will create it only after your approval.' + (item.insideWorkspace ? '' : '\n\nThis file is outside the default workspace. Check the full path carefully.');
  if (!await confirmAction('Approve file change?', 'Allow IsaiahAI Agent to ' + action + '?', detail, item.exists ? 'Back up and save' : 'Create file')) {
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
function runProcess(bin, args, cwd, timeoutMs = 120000) {
  return new Promise(resolve => {
    let output = '';
    let settled = false;
    let timedOut = false;
    let child;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const append = chunk => { output = (output + String(chunk)).slice(-48000); };
    const timer = setTimeout(() => {
      timedOut = true;
      try { child?.kill(); } catch {}
      finish({ exitCode: -2, timedOut: true, output: (output || '') + '\n\nCommand stopped after the 120-second safety limit.' });
    }, timeoutMs);
    try {
      child = spawn(bin, args, { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', append);
      child.stderr.on('data', append);
      child.on('error', err => finish({ exitCode: -1, output: err.message }));
      child.on('close', code => {
        if (timedOut) return;
        finish({ exitCode: code, output: output || '(No output)' });
      });
    } catch (error) {
      finish({ exitCode: -1, output: error?.message || 'Could not start command.' });
    }
  });
}
ipcMain.handle('workspace:run-preset', async (_event, presetKey) => {
  const root = requireWorkspace();
  const preset = presets[String(presetKey || '')];
  if (!preset) throw new Error('That command is not in the approved command list.');
  if (!unrestrictedAgentEnabled && !await confirmAction('Approve command?', 'Run this command in the chosen workspace?', preset.label + '\nWorking directory: ' + root, 'Run command')) {
    return { canceled: true, exitCode: null, output: 'Command canceled.' };
  }
  return runProcess(preset.bin, preset.args, root);
});
ipcMain.handle('workspace:run-custom-command', async (_event, payload) => {
  const root = requireWorkspace();
  const command = String(payload?.command || '').trim();
  const selectedShell = String(payload?.shell || 'powershell').toLowerCase();
  if (!command || command.length > 12000) throw new Error('Enter a command up to 12,000 characters.');
  if (!['powershell', 'cmd'].includes(selectedShell)) throw new Error('Choose PowerShell or Command Prompt.');
  const shellLabel = selectedShell === 'powershell' ? 'Windows PowerShell' : 'Command Prompt';
  const detail = command + '\n\nWorking directory: ' + root +
    '\n\nThis command runs with the permissions granted to IsaiahAI Agent (the app requests Windows Administrator elevation). It may change the entire computer.';
  if (!unrestrictedAgentEnabled && !await confirmAction('Approve terminal command?', 'IsaiahAI Agent is requesting permission to run this command in ' + shellLabel + '.', detail + '\n\nNo command runs until you approve this exact request.', 'Run this command')) {
    return { canceled: true, exitCode: null, output: 'Command canceled by user.' };
  }
  if (selectedShell === 'cmd') {
    return runProcess(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], root);
  }
  return runProcess('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-Command', command], root);
});
