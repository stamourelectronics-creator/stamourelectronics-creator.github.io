ISAIAHAI — VERSION 1.4.0

FEATURES
- Chat directly from the Chrome toolbar popup.
- Reads readable text and links from your active website tab when you send a question.
- Captures a screenshot for visual problems when Chrome allows it.
- Tries /api/site-assist first and falls back to /api/chat for older deployments.
- Test connection checks /api/health and falls back to a chat-route test.
- No separate credential setup is required inside the extension.

INSTALL
1. Extract the downloaded ZIP into a normal folder (do not select the ZIP itself).
2. In Chrome, open chrome://extensions and turn Developer mode on.
3. Click Load unpacked and choose the extracted folder containing manifest.json, popup.html, and service_worker.js.
4. Open Chrome's puzzle-piece Extensions menu and pin IsaiahAI.
5. Open a normal website and click IsaiahAI to ask a question.

VISUAL INSTALL GUIDE
Open INSTALL_GUIDE.html from this extracted folder for illustrated steps and screenshot-style diagrams.

NOTES
- Chrome internal pages and the Chrome Web Store block extension access.
- Page text and screenshots are sent only after you click Ask.
- Chrome internal pages and the Chrome Web Store block extensions from reading page content.
