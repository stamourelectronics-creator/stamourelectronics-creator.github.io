ISAIAHAI PAGE ASSISTANT — VERSION 1.3.1

FEATURES
- Chat directly from the Chrome toolbar popup.
- Reads readable text and links from your active website tab when you send a question.
- Captures a screenshot for visual problems when Chrome allows it.
- Tries /api/site-assist first and falls back to /api/chat for older deployments.
- Test connection checks /api/health and falls back to a chat-route test.
- No OpenRouter API key is stored in the extension.

INSTALL
1. Extract the ZIP.
2. Open chrome://extensions and enable Developer mode.
3. Click Load unpacked and select the folder containing manifest.json and popup.html.
4. Pin IsaiahAI Page Assistant and click its toolbar icon to chat.

NOTES
- Chrome internal pages and the Chrome Web Store block extension access.
- Page text and screenshots are sent only after you click Ask.
- Keep provider API keys in Netlify environment variables, never in extension files.
