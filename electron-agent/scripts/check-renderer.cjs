const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!scripts.length) throw new Error('No inline renderer script was found.');
for (let index = 0; index < scripts.length; index += 1) {
  new vm.Script(scripts[index][1], { filename: 'electron-agent-renderer-' + index + '.js' });
}
for (const required of [
  'data-panel="browser"',
  "document.querySelectorAll('nav button[data-panel]')",
  'runShellCommand({shell,command})',
  'showThinkingToggle',
  'isaiahai-icon.svg',
  'value="isaiahai_7_super"',
  'value="breakaway_1_0"',
  'unrestrictedModeToggle',
  'autoRunProposal',
  'function createBrowserTab',
  'stamourelectronics-creator.github.io/'
]) {
  if (!html.includes(required)) throw new Error('Desktop renderer validation missing: ' + required);
}
if (/puter\.ai\.(chat|txt2img)|js\.puter\.com\/v2/i.test(html)) {
  throw new Error('Puter AI client routes must not be included in IsaiahAI Agent.');
}
console.log('Desktop renderer syntax and feature checks passed.');
