'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) {
  throw new Error('The desktop renderer must have exactly one inline application script; found ' + scripts.length + '.');
}
new vm.Script(scripts[0][1], { filename: 'isaiahai-chat-renderer.js' });

const requiredHtml = [
  'id="panel-browser"',
  'id="panel-chat"',
  'id="browserTabs"',
  'id="browserForm"',
  'id="browserCanvas"',
  'id="browserBookmarks"',
  'id="shortcutGrid"',
  'id="homeClock"',
  'id="homeBookmarks"',
  'id="recentSites"',
  'id="aiChatBtn"',
  'id="closeChatBtn"',
  'id="puterAccessPanel"',
  'id="puterSignInBtn"',
  'id="puterSignOutBtn"',
  'id="puterSelectModelBtn"',
  'id="puterModelDetails"',
  'value="isaiah_5_3"',
  'value="isaiah_max_6_0"',
  'value="isaiahai_7_super"',
  'value="isaiah_codepro"',
  'value="breakaway_1_0"',
  'value="open_isaiah"',
  'value="puter_gpt6_luna"',
  'IsaiahAI 26 Thinking',
  'reasoning_effort:',
  'reasoning_effort:\'none\'',
  'openai/gpt-6-luna',
  'Puter account allowance',
  '1,050,000 tokens',
  '128,000 tokens',
  'function withAutomaticRetries',
  'high demand',
  'Retrying automatically',
  'SEARCH_API',
  'requestChatTurn',
  'maxActions=10',
  'onAgentCommandOutput',
  'function extractCommandProposal',
  'bash|sh|zsh',
  'createBrowserView',
  'onBrowserEvent',
  'Writing your answer',
  'setBrowserViewBounds'
];
for (const item of requiredHtml) {
  if (!html.includes(item)) throw new Error('Desktop renderer feature check missing: ' + item);
}
if (!html.includes("currentPanel='browser'") ||
    !html.includes('<section id="panel-browser" class="panel active browser-panel"')) {
  throw new Error('IsaiahSearch must launch directly into its browser.');
}
if (!html.includes("createBrowserTab('',true)") || !html.includes('function toggleBrowserBookmark')) {
  throw new Error('The browser must launch to a blank new tab and include local bookmarks.');
}
if (!html.includes("classList.add('chat-open','chat-fullscreen')") ||
    !html.includes("currentPanel=name==='chat'?'chat':'browser'")) {
  throw new Error('The AI chat must open full-screen and suspend the browser panel.');
}
if (!html.includes("window.puter.auth.signIn()") ||
    !html.includes("window.puter.ai.chat(messagesForPuter,{model:puterModelId,reasoning_effort:'none',stream:true,signal:controller.signal})")) {
  throw new Error('Puter sign-in and GPT-6 Luna chat calls are missing.');
}
if (!html.includes("fetch(SEARCH_API+'/quick-search-links'") ||
    !html.includes("let API='https://codepro-gateway-production.up.railway.app/api'")) {
  throw new Error('Chat and browser-search requests must use their intended independent endpoints.');
}
if (/codeProHealth\\.provider(?!Ready)/.test(html) ||
    !html.includes("selectedProvider:'IsaiahAI CodePro'")) {
  throw new Error('The CodePro interface must keep the IsaiahAI name and hide the underlying provider.');
}

const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
new vm.Script(main, { filename: 'electron-agent-main.js' });
if (!main.includes("DEFAULT_API_BASE_URL = 'https://codepro-gateway-production.up.railway.app/api'")) {
  throw new Error('Desktop model requests must use the shared Railway /api route.');
}
if (!main.includes("if (selectedShell === 'bash')") || !main.includes("process.platform === 'linux'")) {
  throw new Error('Ubuntu Bash shell bridge is missing.');
}
if (!main.includes("sudo|doas|pkexec") || !main.includes("find\\b[^\\n]*\\s-delete")) {
  throw new Error('Ubuntu privilege and destructive-command safeguards are missing.');
}
if (!main.includes('APPIMAGE') || !main.includes('checkForUpdatesAndNotify')) {
  throw new Error('Linux AppImage automatic update checks are missing.');
}
if (!main.includes("ipcMain.handle('app:system-info'")) {
  throw new Error('The platform information IPC method is missing.');
}
if (!main.includes('DEFAULT_LOCAL_UI_PORT = 41737') ||
    !main.includes("appServer.listen(preferredPort, 'localhost', loadLocalUi)") ||
    !main.includes("appServer.listen(0, 'localhost', loadLocalUi)")) {
  throw new Error('Puter must use a stable localhost origin with a safe temporary-port fallback.');
}

const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
new vm.Script(preload, { filename: 'electron-agent-preload.js' });
if (!preload.includes('getSystemInfo:')) throw new Error('The system info bridge is missing.');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.build || !pkg.build.linux || !pkg.build.win) throw new Error('Both Windows and Linux electron-builder targets must exist.');
const linuxTargets = pkg.build.linux.target.map(item => item.target);
if (!linuxTargets.includes('AppImage') || !linuxTargets.includes('deb')) {
  throw new Error('Ubuntu AppImage and Debian package targets are required.');
}
if (!pkg.homepage) throw new Error('Package homepage metadata is required for Linux Debian packaging.');
const updateManifestSource = fs.readFileSync(path.join(root, 'scripts', 'write-update-manifest.cjs'), 'utf8');
if (!updateManifestSource.includes("'-x86_64.AppImage'")) {
  throw new Error('The Ubuntu updater manifest must target the x86_64 AppImage artifact.');
}
if (!pkg.scripts['dist:linux'] || !pkg.scripts['dist:win']) {
  throw new Error('Both platform build scripts are required.');
}
new vm.Script(fs.readFileSync(path.join(root, 'scripts', 'write-update-manifest.cjs'), 'utf8'), {
  filename: 'write-update-manifest.js'
});
console.log('IsaiahSearch Windows/Ubuntu renderer, Puter, model routing, retry, and updater checks passed.');
