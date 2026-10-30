const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

let mainWindow;
let appServer = null;
let appOrigin = null;
let workspaceRoot = null;
const settingsFile = path.join(app.getPath('userData'), 'agent-settings.json');
const DEFAULT_API_BASE_URL = 'https://isaiahsearch.netlify.app/api';
async function loadSavedWorkspace() {
  try {
    const saved = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
    const candidate = typeof saved.workspaceRoot === 'string' ? saved.workspaceRoot : '';
    if (!candidate) return;
    const real = await fs.realpath(candidate);
    const stat = await fs.stat(real);
    if (stat.isDirectory()) workspaceRoot = real;
  } catch {
    workspaceRoot = null;
  }
}
async function persistWorkspace() {
  await fs.mkdir(path.dirname(settingsFile), { recursive: true });
  await fs.writeFile(settingsFile, JSON.stringify({ workspaceRoot }, null, 2), { encoding: 'utf8', mode: 0o600 });
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
      contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: true
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
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Treat remote pages as untrusted content and remove any path to Node/preload APIs.
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webviewTag = false;
    if (!/^https?:\/\//i.test(String(params.src || ''))) event.preventDefault();
  });
  mainWindow.webContents.on('did-attach-webview', (_event, guestContents) => {
    // Browser sites get camera/location/clipboard access only after an explicit native prompt.
    guestContents.session.setPermissionRequestHandler((requestingContents, permission, callback, details) => {
      let origin = 'this website';
      try { origin = new URL(details.requestingUrl || requestingContents.getURL()).origin; } catch {}
      dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Website permission request',
        message: 'Allow this website to access ' + permission + '?',
        detail: origin + '\n\nOnly approve permissions you expect the website to need.',
        buttons: ['Block', 'Allow once'], defaultId: 0, cancelId: 0, noLink: true
      }).then(result => callback(result.response === 1)).catch(() => callback(false));
    });
    guestContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    });
  });
}
app.whenReady().then(async () => {
  await loadSavedWorkspace();
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
  if (!workspaceRoot) throw new Error('Choose a workspace folder first.');
  return workspaceRoot;
}
async function safeWorkspaceFile(relativePath) {
  const root = await fs.realpath(requireWorkspace());
  const candidate = path.resolve(root, String(relativePath || ''));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) throw new Error('That path is outside the selected workspace.');
  const real = await fs.realpath(candidate);
  if (real !== root && !real.startsWith(root + path.sep)) throw new Error('Links outside the selected workspace are blocked.');
  const stat = await fs.stat(real);
  if (!stat.isFile()) throw new Error('Only files can be opened.');
  if (!textExtensions.has(path.extname(real).toLowerCase())) throw new Error('This file type is not enabled for text editing.');
  if (stat.size > 2000000) throw new Error('Files over 2 MB are not opened in the editor.');
  return { root, file: real };
}
async function confirmAction(title, message, detail, confirmLabel) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning', title, message, detail,
    buttons: ['Cancel', confirmLabel], defaultId: 0, cancelId: 0, noLink: true
  });
  return result.response === 1;
}
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
  const item = await safeWorkspaceFile(relativePath);
  if (!await confirmAction('Approve file change?', 'Allow IsaiahAI Agent to replace this file?', item.file + '\n\nA dated backup will be saved inside .isaiahai-backups first.', 'Back up and save')) {
    return { saved: false, canceled: true };
  }
  const backupDir = path.join(item.root, '.isaiahai-backups');
  await fs.mkdir(backupDir, { recursive: true });
  const backupName = path.basename(item.file) + '.' + new Date().toISOString().replace(/[:.]/g, '-') + '.bak';
  await fs.copyFile(item.file, path.join(backupDir, backupName));
  await fs.writeFile(item.file, content, 'utf8');
  return { saved: true, backup: path.join('.isaiahai-backups', backupName) };
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
  if (!await confirmAction('Approve command?', 'Run this command in the chosen workspace?', preset.label + '\nWorking directory: ' + root, 'Run command')) {
    return { canceled: true, exitCode: null, output: 'Command canceled.' };
  }
  return runProcess(preset.bin, preset.args, root);
});
ipcMain.handle('workspace:run-custom-command', async (_event, payload) => {
  const root = requireWorkspace();
  const command = String(payload?.command || '').trim();
  const selectedShell = String(payload?.shell || 'powershell').toLowerCase();
  if (!command || command.length > 2000) throw new Error('Enter a command up to 2,000 characters.');
  if (!['powershell', 'cmd'].includes(selectedShell)) throw new Error('Choose PowerShell or Command Prompt.');
  const shellLabel = selectedShell === 'powershell' ? 'Windows PowerShell' : 'Command Prompt';
  const preview = command.length > 1200 ? command.slice(0, 1200) + '\n…(truncated in approval dialog)' : command;
  const detail = preview + '\n\nWorking directory: ' + root +
    '\n\nThis command runs with your Windows user permissions and may access files outside the selected folder. Review it carefully. No command runs until you approve this exact request.';
  if (!await confirmAction('Approve terminal command?', 'IsaiahAI Agent is requesting permission to run this command in ' + shellLabel + '.', detail, 'Run this command')) {
    return { canceled: true, exitCode: null, output: 'Command canceled by user.' };
  }
  if (selectedShell === 'cmd') {
    return runProcess(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], root);
  }
  return runProcess('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-Command', command], root);
});
