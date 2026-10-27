'use strict';
const messages = document.getElementById('messages');
const form = document.getElementById('composer');
const questionBox = document.getElementById('question');
const sendButton = document.getElementById('send');
const testButton = document.getElementById('test');
const statusBar = document.getElementById('status');
const statusText = document.getElementById('statusText');
const tabTitle = document.getElementById('tabTitle');
let history = [];
let busy = false;

function setStatus(text, kind) {
  statusText.textContent = text;
  statusBar.className = 'statusbar' + (kind ? ' ' + kind : '');
}
function addBubble(text, role) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + role;
  bubble.textContent = String(text || '');
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}
function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  testButton.disabled = value;
  sendButton.textContent = value ? 'Working…' : 'Ask IsaiahAI';
}
function sendRuntime(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response || !response.ok) return reject(new Error(response && response.error ? response.error : 'No answer was returned.'));
      resolve(response.data || {});
    });
  });
}
async function showActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs && tabs[0];
    tabTitle.textContent = tab && tab.title ? tab.title : 'Current tab';
  } catch (_) { tabTitle.textContent = 'Current tab'; }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = questionBox.value.trim();
  if (!text || busy) return;
  addBubble(text, 'user');
  questionBox.value = '';
  setBusy(true);
  setStatus('Reading this page and searching the web…');
  const pending = addBubble('Reading the visible page and preparing an answer…', 'assistant');
  try {
    const data = await sendRuntime({ type: 'ISAIAHAI_POPUP_ASK', question: text, history: history.slice(-8) });
    pending.textContent = String(data.content || 'I did not receive an answer.');
    setStatus('Answered by ' + data.apiBase + (data.apiRoute || '') + (data.screenshotUsed ? ' · screenshot included' : ' · text context used'), 'good');
    history.push({ role: 'user', content: text }, { role: 'assistant', content: String(data.content || '') });
    history = history.slice(-10);
    if (Array.isArray(data.sources) && data.sources.length) {
      const list = document.createElement('div');
      list.className = 'sources';
      data.sources.slice(0, 8).forEach(source => {
        const url = String(source.uri || source.url || '');
        if (!/^https?:\/\//i.test(url)) return;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = String(source.title || url);
        list.appendChild(link);
      });
      if (list.childElementCount) pending.appendChild(list);
    }
  } catch (error) {
    pending.textContent = 'Unable to reach IsaiahAI: ' + (error.message || String(error));
    setStatus('API connection failed · open Settings or Test connection', 'error');
  } finally { setBusy(false); }
});
testButton.addEventListener('click', async () => {
  if (busy) return;
  setBusy(true);
  setStatus('Checking configured IsaiahAI endpoints…');
  try {
    const data = await sendRuntime({ type: 'ISAIAHAI_TEST_CONNECTION' });
    setStatus(data.message || 'Connection succeeded.', 'good');
  } catch (error) { setStatus(error.message || String(error), 'error'); }
  finally { setBusy(false); }
});
document.getElementById('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
questionBox.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') form.requestSubmit();
});
showActiveTab();
questionBox.focus();
