# IsaiahSearch Browser for Windows

IsaiahSearch is a browser-first Windows desktop browser built with Electron and native Chromium WebContentsView. The browser is the main app; the AI agent is integrated into it as an optional slide-over panel.

## Browser interface
- Starts directly in a browser new-tab page without an app-level banner or separate Chat/Browser navigation.
- Firefox-inspired tab strip, address/search bar, navigation controls, bookmark toolbar, top-site shortcuts, a local clock/date widget, and bookmark/recent-site widgets.
- Websites open as native Chromium pages and fill the browser window.
- The AI button opens the IsaiahSearch Agent drawer over the active page.
- Bookmarks and recently visited sites are stored locally on this Windows device.
- Shortcuts: Ctrl+T new tab, Ctrl+L address bar, Ctrl+D bookmark, Ctrl+W close tab, Ctrl+Shift+A open AI chat, Esc close chat.

The new-tab search box uses the IsaiahSearch website search route when a query is submitted. The desktop application itself is a full browser; search is one of its start-page functions.

## Integrated IsaiahSearch Agent
- Agent mode is on by default inside the browser.
- The agent can open websites in new native tabs, inspect the current tab when asked about a page, and use IsaiahSearch search context.
- Page inspection is read-only and bounded to URL, title, meta description, visible text, and a limited list of links. Page text is treated as untrusted source material.
- Attach images, PDFs, and supported text/source files in chat.
- The agent can make several approved actions in one request. When user-approved unrestricted system mode is enabled, it can stream PowerShell/CMD output, inspect exit codes, diagnose errors, retry corrective commands, and verify the result (up to six actions).
- System commands retain the Windows first-run warning, UAC, workspace protections, write confirmations/backups, and per-command approval when unrestricted mode is off.

## Launch from another browser
The installed app registers isaiahsearch: and web+isaiahsearch: URL schemes. Examples:
- Home: isaiahsearch://home
- Open a page: isaiahsearch://open?url=https%3A%2F%2Fexample.com
- Search: isaiahsearch://search?q=browser%20privacy

A website may ask the user to confirm opening an external app. The URL scheme launches IsaiahSearch or focuses its existing window; it does not silently replace the default HTTP/HTTPS browser.

## Build on Windows
Install Node.js 22 or newer, then run npm install, npm run check, and npm run dist from this folder. The Windows x64 installer and portable EXE are written to release/. GitHub Actions performs the same build and publishes the Windows assets.

## AI API and privacy
The hosted AI API is reached over HTTPS at https://isaiahsearch.netlify.app/api. API credentials are not embedded in the application. Model availability and usage depend on the configured server-side providers.
