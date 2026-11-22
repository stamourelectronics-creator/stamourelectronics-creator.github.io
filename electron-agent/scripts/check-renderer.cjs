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

const markupIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
const clickBindings = [...scripts[0][1].matchAll(/\$\(['"]([^'"]+)['"]\)\.addEventListener/g)];
const missingClickTargets = [...new Set(clickBindings.map(match => match[1]).filter(id => !markupIds.has(id)))];
const directElementRefs = [...scripts[0][1].matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
const missingDirectElementRefs = [...new Set(directElementRefs.filter(id => !markupIds.has(id)))];
const duplicateMarkupIds = [...new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]).filter((id, index, all) => all.indexOf(id) !== index))];
if (missingDirectElementRefs.length || duplicateMarkupIds.length) {
  throw new Error('Renderer DOM audit failed. Missing IDs: ' + missingDirectElementRefs.join(', ') + '; duplicate IDs: ' + duplicateMarkupIds.join(', '));
}
if (missingClickTargets.length) {
  throw new Error('Renderer click handlers reference missing elements: ' + missingClickTargets.join(', '));
}
if (!html.includes('id="closeChatBtn"') || !html.includes('<span>Exit chat</span>') ||
    !html.includes('.chat-close{width:auto;') || !html.includes("$('closeChatBtn').addEventListener('click',closeChat)")) {
  throw new Error('The chat must have a visible, correctly sized, working Exit chat button.');
}
if (!html.includes('id="railChatBtn"') || !html.includes("$('railChatBtn').addEventListener('click'")) {
  throw new Error('The Chat workspace navigation button must be wired.');
}

const requiredHtml = [
  'id="panel-browser"',
  'id="panel-chat"',
  'id="browserTabs"',
  'id="browserForm"',
  'id="browserCanvas"',
  'id="browserBookmarks"',
  'id="shortcutGrid"',
  'id="homeClock"',
  'id="themeToggleBtn"',
  'id="addShortcutBtn"',
  'id="homeBookmarks"',
  'id="recentSites"',
  'id="aiChatBtn"',
  'id="closeChatBtn"',
  'id="railChatBtn"',
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
  'Agent tools enabled for every model',
  'desktopAgent:true',
  'high demand',
  'Retrying automatically',
  'SEARCH_API',
  'requestChatTurn',
  'readGatewayEventStream',
  'extractLocalCommandProposals',
  'extractSystemDiagnosticProposal',
  'system-diagnostic',
  'runSystemDiagnostic',
  'extractDesktopAppProposal',
  'extractDirectDesktopAppIntent',
  'desktop-app',
  'launchDesktopApp',
  "CODEPRO_API+'/api/agent'",
  'stream:true',
  'runWorkspaceCommand',
  'id="chooseWorkspaceBtn"',
  'id="chooseCommandFolderBtn"',
  'maxActions=500',
  'function extractBrowserProposal',
  'createBrowserView',
  'onBrowserEvent',
  'Writing your answer',
  'setBrowserViewBounds'
];
for (const item of requiredHtml) {
  if (!html.includes(item)) throw new Error('Desktop renderer feature check missing: ' + item);
}
if (html.includes("agentModeToggle').addEventListener") ||
    html.includes('Agent mode is off') ||
    !html.includes('const commandProposal=extractLocalCommandProposals(answer,desktopPlatform);') ||
    !html.includes('const browserProposal=extractBrowserProposal(answer);') ||
    !html.includes("const agentInstructions=browserAgentIntro+' '+desktopProtocol+' The current selected command working folder is '") ||
    (html.match(/desktopAgent:true/g) || []).length < 3) {
  throw new Error('Every desktop model must always receive the agent prompt and route approved local/browser tool proposals.');
}

if (/runShellCommand|runApprovedPreset|onAgentCommandOutput|unrestrictedModeToggle|terminalOutput/.test(html)) {
  throw new Error('The renderer must not expose a generic or unrestricted local command interface.');
}
if (
    !html.includes('const maxActions=500;') ||
    !html.includes("window.isaiahDesktop.runWorkspaceCommand({shell:commandProposal.shell,commands:commandProposal.commands})") ||
    !html.includes('up to one hundred separate commands') ||
    !html.includes('function extractWindowsInstallProposal') ||
    !html.includes("window.isaiahDesktop.installWindowsApp({path:windowsInstallProposal.path})") ||
    html.includes('if(actionCount>=20)') ||
    !html.includes('Choose command folder') ||
    (html.split('const browserProposal=extractBrowserProposal(answer);').length - 1) !== 1) {
  throw new Error('Local command proposals must be sent through the native approval-gated desktop bridge.');
}
if (!html.includes('writeWorkspaceFile') || !html.includes('inspectBrowserView')) {
  throw new Error('Project-file review/saving and browser-aware agent capabilities must remain available.');
}
if (!html.includes("currentPanel='browser'") ||
    !html.includes('<section id="panel-browser" class="panel active browser-panel"')) {
  throw new Error('IsaiahSearch must launch directly into its browser.');
}
if (!html.includes("createBrowserTab('',true)") || !html.includes('function toggleBrowserBookmark')) {
  throw new Error('The browser must launch to a blank new tab and include local bookmarks.');
}
if (!html.includes('class="panel chat-drawer" hidden aria-hidden="true"') ||
    !html.includes('drawer.hidden=!showChat') ||
    !html.includes('browser.hidden=showChat') ||
    !html.includes("drawer.classList.toggle('chat-open',showChat)") ||
    !html.includes("browser.classList.toggle('active',!showChat)") ||
    !html.includes('#panel-chat.chat-drawer:not([hidden])') ||
    !html.includes('#panel-chat.chat-drawer.chat-open.chat-fullscreen')) {
  throw new Error('The AI chat must explicitly reveal its full-screen panel and hide the browser while open.');
}
if (!html.includes("window.puter.auth.signIn()") ||
    !html.includes("window.puter.ai.chat(messagesForPuter,{model:puterModelId,reasoning_effort:'none',stream:true,signal:controller.signal})")) {
  throw new Error('Puter sign-in and GPT-6 Luna chat calls are missing.');
}
if (!html.includes("fetch(SEARCH_API+'/quick-search-links'") ||
    !html.includes("let API='https://codepro-gateway-production.up.railway.app/api'") ||
    !html.includes("SEARCH_API=CODEPRO_API+'/api'") || html.includes('isaiahsearch.netlify.app')) {
  throw new Error('Chat and browser-search requests must use their intended independent endpoints.');
}
if (/codeProHealth\.provider(?!Ready)/.test(html) ||
    !html.includes("selectedProvider:'IsaiahAI CodePro'")) {
  throw new Error('The CodePro interface must keep the IsaiahAI name and hide the underlying provider.');
}


const sendChatStart = html.indexOf('async function sendChat(prompt)');
const sendChatEnd = html.indexOf("$('chatForm').addEventListener('submit'", sendChatStart);
const sendChatSource = sendChatStart >= 0 && sendChatEnd > sendChatStart ? html.slice(sendChatStart, sendChatEnd) : '';
const liveDraftDeclaration = sendChatSource.indexOf("requestMessage='',liveDraft=null;");
const requestTry = sendChatSource.indexOf('await workspaceReady;');
if (!sendChatSource || liveDraftDeclaration < 0 || requestTry < 0 || liveDraftDeclaration > requestTry ||
    (sendChatSource.match(/\blet\b[^;]*\bliveDraft\s*=\s*null\s*;/g) || []).length !== 1) {
  throw new Error('liveDraft must be declared exactly once in sendChat scope before its request try/catch/finally handlers.');
}
if (!html.includes("const directDesktopApp=extractDirectDesktopAppIntent(prompt,desktopPlatform);") ||
    !html.includes("const desktopAppProposal=extractDesktopAppProposal(answer,desktopPlatform);")) {
  throw new Error('Direct app-launch intent and model desktop-app proposals must both be routed.');
}

if (!html.includes('id="googleAccountStatus"') ||
    !html.includes('id="googleAccountBtn"') ||
    !html.includes("$('googleAccountBtn').addEventListener('click',toggleGoogleAccount)") ||
    !html.includes("status.textContent=signedIn?'Signed in · '+accountName:'Not signed in'") ||
    !html.includes("else if(checking)status.textContent='Checking Google account…'")) {
  throw new Error('The browser header must visibly show the Google account state and provide a working sign-in/sign-out button.');
}
if (!html.includes('function queueGoogleBrowserStateSave()') ||
    !html.includes("$('googleSignInBtn').addEventListener('click'") ||
    !html.includes('signInWorkspace: async () =>') ||
    !html.includes("cloudDb.collection('user_chats').doc(cloudUser.uid + '_' + session.id)") ||
    !html.includes("savedTheme===null||savedTheme==='dark'") ||
    html.includes('isaiahsearch.netlify.app')) {
  throw new Error('Google sign-in, cloud browser sync, per-user chat storage, Railway search routing or dark browser defaults are missing.');
}
const signInStart = html.indexOf('signIn: async () => {');
const signInEnd = html.indexOf('signInWorkspace: async () => {', signInStart);
if (signInStart < 0 || signInEnd <= signInStart || html.slice(signInStart, signInEnd).includes('provider.addScope')) {
  throw new Error('Basic Google sign-in must not request optional Workspace API scopes.');
}
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
new vm.Script(main, { filename: 'electron-agent-main.js' });
if (!main.includes("DEFAULT_API_BASE_URL = 'https://codepro-gateway-production.up.railway.app/api'") || !main.includes("nativeTheme.themeSource = 'dark'") || main.includes('webContents.setBackgroundColor(')) {
  throw new Error('Desktop model requests must use the shared Railway /api route.');
}
if (!main.includes("ipcMain.handle('system:run-diagnostic'") ||
    !main.includes('SYSTEM_DIAGNOSTICS') ||
    !['computer-overview','hardware-overview','storage-overview','running-processes','running-services','network-adapters','recent-updates','cpu-details','gpu-details','memory-modules','motherboard-bios','physical-disks','device-drivers','usb-devices','installed-apps','defender-status','battery-status','audio-devices'].every(id => main.includes("'" + id + "'") && html.includes("'" + id + "'")) ||
    !main.includes('function runSystemDiagnostic') ||
    !main.includes('25-second time limit') ||
    !main.includes("ipcMain.handle('workspace:run-command'") ||
    !main.includes('function validateWorkspaceCommandBatch') ||
    !main.includes('function runApprovedWorkspaceCommandBatch') ||
    !main.includes('commands.length > 100') ||
    !main.includes("ipcMain.handle('windows:install-approved'") ||
    !main.includes("Start-Process -FilePath $installer -Verb RunAs -Wait -PassThru") ||
    !main.includes("Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\\\\msiexec.exe')") ||
    !main.includes('Approve command batch?') ||
    !main.includes('confirmAction(') ||
    !main.includes('between one and one hundred separate commands') ||
    !main.includes('Administrator/root elevation, credential and secret-file access') ||
    main.includes('payload && payload.unattended === true') ||
    !main.includes('stoppedOnFailure = true') ||
    !main.includes('function validateWorkspaceCommand') ||
    !main.includes('function runApprovedWorkspaceCommand') ||
    !main.includes("'Run all commands'") ||
    !main.includes('cwd: root') ||
    !main.includes('commandRoot') ||
    !main.includes("ipcMain.handle('command:choose-folder'") ||
    !main.includes('BLOCKED_PRIVILEGE_PATTERN') ||
    !main.includes('BLOCKED_SECRET_PATTERN') ||
    !main.includes('HTTP download tools such as Invoke-WebRequest, curl, and wget are enabled') ||
    !main.includes('including outside the project workspace') ||
    !main.includes('function createWorkspaceCommandEnv') ||
    !main.includes('env: createWorkspaceCommandEnv()')) {
  throw new Error('The local command runner must support a user-selected folder, explicit approval, normal user permissions, and downloads outside the project workspace.');
}
if (!main.includes('shell: false') || !main.includes('windowsHide: true') || !main.includes('300000')) {
  throw new Error('Local commands must not spawn through an implicit shell and must have a time limit.');
}
if (!main.includes("ipcMain.handle('desktop:launch-app'") ||
    !main.includes('DESKTOP_APP_CATALOG') ||
    !main.includes('function resolveWindowsApplication') ||
    !main.includes('function chooseWindowsApplication') ||
    !main.includes('BLOCKED_LAUNCH_EXECUTABLES') ||
    !main.includes("'Open app'") ||
    !main.includes('detached: true') ||
    !main.includes('shell: false')) {
  throw new Error('Desktop app launching must use a native executable picker, a blocked-system-utility list and native approval dialog.');
}
if (!main.includes("ipcMain.handle('workspace:write'") || !main.includes('confirmAction')) {
  throw new Error('Approved project-file saving must remain available.');
}
if (!main.includes('APPIMAGE') || !main.includes('checkForUpdatesAndNotify')) {
  throw new Error('Linux AppImage automatic update checks are missing.');
}
if (!main.includes('DEFAULT_LOCAL_UI_PORT = 41737') ||
    !main.includes("appServer.listen(preferredPort, 'localhost', loadLocalUi)") ||
    !main.includes("appServer.listen(0, 'localhost', loadLocalUi)")) {
  throw new Error('Puter must use a stable localhost origin with a safe temporary-port fallback.');
}

const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
new vm.Script(preload, { filename: 'electron-agent-preload.js' });
if (/runShellCommand|runApprovedPreset|onAgentCommandOutput|getUnrestrictedMode|setUnrestrictedMode|getSystemInfo/.test(preload)) {
  throw new Error('The preload must not expose unrestricted computer-agent controls.');
}
if (!preload.includes("runSystemDiagnostic: payload => ipcRenderer.invoke('system:run-diagnostic', payload)")) {
  throw new Error('The preload must expose only the fixed read-only system diagnostic request.');
}
if (!preload.includes("launchDesktopApp: payload => ipcRenderer.invoke('desktop:launch-app', payload)")) {
  throw new Error('The preload must expose only the allowlisted, approval-gated desktop app launch request.');
}
if (!preload.includes("runWorkspaceCommand: payload => ipcRenderer.invoke('workspace:run-command', payload)") ||
    !preload.includes("chooseCommandFolder: () => ipcRenderer.invoke('command:choose-folder')") ||
    !preload.includes("getCommandFolderPath: () => ipcRenderer.invoke('command:folder-path')")) {
  throw new Error('The preload must expose the approval-gated command runner and the native command-folder picker.');
}
if (!preload.includes('writeWorkspaceFile:') || !preload.includes('inspectBrowserView:')) {
  throw new Error('Approved project-file saving and browser inspection must remain available.');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.build || !pkg.build.linux || !pkg.build.win) throw new Error('Both Windows and Linux electron-builder targets must exist.');
const linuxTargets = pkg.build.linux.target.map(item => item.target);
if (!linuxTargets.includes('AppImage') || !linuxTargets.includes('deb')) {
  throw new Error('Ubuntu AppImage and Debian package targets are required.');
}
if (!pkg.homepage) throw new Error('Package homepage metadata is required for Linux Debian packaging.');
if (pkg.desktopName !== 'com.stamourelectronics.isaiahsearch' || pkg.build.linux.desktopName !== undefined) {
  throw new Error('Linux desktopName must be stored at the package root, not inside build.linux.');
}
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
if (!html.includes("$('closeChatBtn').addEventListener('click',closeChat)") ||
    !html.includes("$('railChatBtn').addEventListener('click'")) {
  throw new Error('Chat exit and Chat navigation controls must be wired before the browser UI initializes.');
}
if (html.includes("$('newWindowBtn').addEventListener")) {
  throw new Error('The renderer must not bind a missing external-browser control.');
}
console.log('IsaiahSearch Windows/Ubuntu renderer, browser-aware coding chat, approved project files, Puter, model routing, retry, and updater checks passed.');
