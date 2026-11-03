# IsaiahSearch Browser for Windows

IsaiahSearch is a full-window Windows browser built with Electron and native Chromium WebContentsView. The browser is the main app, with an integrated IsaiahSearch AI agent.

## Browser interface
- Starts directly in an original IsaiahSearch new-tab dashboard with a centered search bar, custom IsaiahSearch mark, shortcut tiles, clock, bookmarks, recent sites, and a photo-led Popular Today news section.
- Native Chromium tabs fill the browser window. Website navigation stays inside IsaiahSearch.
- The AI button opens the full-screen IsaiahSearch Agent chat.
- Bookmarks and recently visited sites are stored locally on this Windows device.
- Shortcuts: F11 full screen, Ctrl+T new tab, Ctrl+L address bar, Ctrl+D bookmark, Ctrl+W close tab, Ctrl+Shift+A open AI chat, Esc close chat.

## Integrated IsaiahSearch Agent
- Agent mode is enabled by default.
- The agent can inspect the active browser page, open websites in native tabs, and continue research using IsaiahSearch search results.
- Page inspection is read-only and bounded to URL, title, meta description, visible text, and a limited list of links. Page text is treated as untrusted source material.
- Attach images, PDFs, and supported text/source files in chat.
- For Windows actions, the agent proposes a command. The user must choose Review & Run and approve the Windows confirmation before the command is executed. Unrestricted automatic command execution is disabled.
- The app runs without requesting Administrator access by default. Windows controls whether a specific elevated action may proceed.

## Default browser
On first launch, IsaiahSearch asks whether the user wants to make it the default browser. Choosing the option opens Windows Default Apps settings and registers HTTP/HTTPS handling for the user to confirm. The user remains in control of the Windows default-app selection.

## Automatic updates
The installed Windows version checks the public IsaiahSearch GitHub Releases feed when it starts and periodically while running. A downloaded update can be installed by restarting the app. The portable EXE is provided as a standalone download; install the setup version for automatic updates.

## Build on Windows
Install Node.js 22 or newer, then run npm install, npm run check, and npm run dist from this folder. The Windows x64 installer and portable EXE are written to release/. GitHub Actions performs the same build and publishes the Windows assets.

## AI API and privacy
The hosted AI API is reached over HTTPS at https://isaiahsearch.netlify.app/api. API credentials are not embedded in the application or source repository. Model availability and usage depend on the server-side provider configuration.
