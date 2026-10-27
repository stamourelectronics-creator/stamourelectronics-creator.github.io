'use strict';
const input = document.getElementById('apiBase');
const status = document.getElementById('status');
chrome.storage.local.get(['isaiahAiApiBase']).then(({ isaiahAiApiBase }) => {
  input.value = isaiahAiApiBase || 'https://isaiah-ai-acel.netlify.app';
});
document.getElementById('save').addEventListener('click', async () => {
  try {
    const parsed = new URL(input.value.trim());
    if (parsed.protocol !== 'https:') throw new Error('Use an https:// website URL.');
    await chrome.storage.local.set({ isaiahAiApiBase: parsed.origin });
    status.textContent = 'Saved. Reload a webpage to use this server.';
  } catch (error) {
    status.textContent = error.message || 'Enter a valid https:// URL.';
  }
});
