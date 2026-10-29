const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

let mainWindow;
let workspaceRoot = null;
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
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

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
  return { canceled: false, path: workspaceRoot };
});
ipcMain.handle('workspace:path', () => workspaceRoot);
ipcMain.handle('workspace:list', async () => {
  const root = requireWorkspace();
  const output = [];
  async function walk(folder, relative, depth) {
    if (output.length >= 500 || depth > 12) return;
    let entries;
    try { entries = await fs.readdir(folder, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (output.length >= 500) break;
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
function runProcess(bin, args, cwd) {
  return new Promise(resolve => {
    const child = spawn(bin, args, { cwd, shell: false, windowsHide: true });
    let output = '';
    const append = chunk => { output = (output + String(chunk)).slice(-24000); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', err => resolve({ exitCode: -1, output: err.message }));
    child.on('close', code => resolve({ exitCode: code, output: output || '(No output)' }));
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
ipcMain.handle('workspace:run-custom-command', async (_event, rawCommand) => {
  const root = requireWorkspace();
  const command = String(rawCommand || '').trim();
  if (!command || command.length > 1600) throw new Error('Enter a command up to 1,600 characters.');
  if (!await confirmAction('Approve custom command?', 'IsaiahAI Agent is requesting permission to run this exact command.', command + '\nWorking directory: ' + root + '\n\nOnly approve commands you understand. Commands can change or delete data.', 'Run this command')) {
    return { canceled: true, exitCode: null, output: 'Command canceled.' };
  }
  return runProcess(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], root);
});
