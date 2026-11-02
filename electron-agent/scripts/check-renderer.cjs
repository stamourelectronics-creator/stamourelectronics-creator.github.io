const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!scripts.length) throw new Error('No inline renderer script was found.');
for (let index = 0; index < scripts.length; index += 1) {
  new vm.Script(scripts[index][1], { filename: 'electron-agent-renderer-' + index + '.js' });
}
for (const required of [
  'id="panel-browser"',
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
  'runShellCommand({shell:proposal.shell,command:proposal.command,executionId:executionId})',
  'showThinkingToggle',
  'isaiahai-icon.svg',
  'ISAIAHSEARCH BROWSER · AGENT · RESEARCH',
  'value="isaiahai_7_super"',
  'value="breakaway_1_0"',
  'unrestrictedModeToggle',
  'function createBrowserTab',
  'attachmentInput',
  'attachmentTray',
  'prepareAttachment',
  'requestChatTurn',
  'maxActions=6',
  'onAgentCommandOutput',
  'setAgentProgress',
  'createBrowserView',
  'onBrowserEvent',
  'browserCanvas',
  'Writing your answer',
  'setBrowserViewBounds',
  'stamourelectronics-creator.github.io/'
]) {
  if (!html.includes(required)) throw new Error('Desktop renderer validation missing: ' + required);
}
if (!html.includes("currentPanel='browser'") || !html.includes('<section id="panel-browser" class="panel active browser-panel"')) {
  throw new Error('IsaiahSearch must launch directly into its browser.');
}
if (!html.includes("createBrowserTab('',true)") || !html.includes("function toggleBrowserBookmark")) {
  throw new Error('IsaiahSearch must launch to a blank new tab and include local bookmarks.');
}
if (!html.includes("function extractBrowserProposal") || !html.includes("inspectBrowserView") || !html.includes("You are IsaiahSearch Agent")) {
  throw new Error('The integrated browser agent must be able to inspect the current page and open browser tabs.');
}
if (!html.includes("BOOKMARK_KEY") || !html.includes("RECENT_KEY") || !html.includes("id=\"shortcutGrid\"")) {
  throw new Error('The browser home page must include bookmarks, recent-site, and top-site widgets.');
}
if (!html.includes("classList.add('chat-open')") && !html.includes('classList.add("chat-open")')) {
  throw new Error('The integrated AI chat must open as a slide-over browser panel.');
}
if (!html.includes("dataTransfer") || !html.includes("application/pdf")) {
  throw new Error('Chat attachments and drag/drop support are missing.');
}
const mainSource = fs.readFileSync(require('node:path').join(__dirname, '..', 'main.cjs'), 'utf8');
if (!html.includes('main{height:100%;width:100%;min-height:0;flex:1;display:flex;margin:0;padding:0}')) {
  throw new Error('The browser renderer must fill the full application viewport.');
}
if (!mainSource.includes('fullscreen: true') || !mainSource.includes('toggleFullscreenShortcut') || !mainSource.includes("'f11'")) {
  throw new Error('The browser must launch full-screen and support the F11 toggle.');
}
if (!mainSource.includes('WebContentsView')) {
  throw new Error('Desktop browser must use Electron WebContentsView.');
}
if (/<webview\b/i.test(html) || /webviewTag:\s*true/.test(mainSource)) {
  throw new Error('IsaiahAI Agent must use native WebContentsView rather than the legacy webview tag.');
}
if (/puter\.ai\.(chat|txt2img)|js\.puter\.com\/v2/i.test(html)) {
  throw new Error('Puter AI client routes must not be included in IsaiahAI Agent.');
}
console.log('IsaiahSearch browser renderer syntax and feature checks passed.');
