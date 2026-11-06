# IsaiahSearch Browser for Windows

IsaiahSearch is a full-window Windows browser built with Electron and native Chromium WebContentsView. The browser is the main app, with an integrated IsaiahSearch AI agent.

## Browser interface
- Starts directly in an original IsaiahSearch new-tab dashboard with a centered search bar, custom IsaiahSearch mark, shortcut tiles, clock, bookmarks, recent sites, and a photo-led Popular Today news section.
- Native Chromium tabs fill the browser window. Website navigation stays inside IsaiahSearch.
- The AI button opens the full-screen IsaiahAI CodePro agent chat, with GPT-OSS-120B as the CodePro model.
- Bookmarks and recently visited sites are stored locally on this Windows device.
- Shortcuts: F11 full screen, Ctrl+T new tab, Ctrl+L address bar, Ctrl+D bookmark, Ctrl+W close tab, Ctrl+Shift+A open AI chat, Esc close chat.

## Integrated IsaiahSearch Agent
- Agent mode is enabled by default.
- IsaiahAI CodePro can inspect the active browser page, open websites in native tabs, search the web, and use a remote Python code interpreter.
- Page inspection is read-only and bounded to URL, title, meta description, visible text, and a limited list of links. Page text is treated as untrusted source material.
- Attach images, PDFs, and supported text/source files in chat.
- CodePro has a local Windows Shell Bridge for PowerShell and Command Prompt. After the user explicitly enables Windows shell agent mode, CodePro can run a sequence of commands as the current Windows user, stream terminal output, inspect exit codes, and choose the next step. When shell agent mode is off, each command requires explicit approval.
- Commands run as the current Windows user; the app does not request Administrator access. High-impact disk, registry, boot, security, shutdown, and similar operations always require a separate confirmation.

## Default browser
On first launch, IsaiahSearch asks whether the user wants to make it the default browser. Choosing the option opens Windows Default Apps settings and registers HTTP/HTTPS handling for the user to confirm. The user remains in control of the Windows default-app selection.

## Automatic updates
The installed Windows version checks the public IsaiahSearch GitHub Releases feed when it starts and periodically while running. A downloaded update can be installed by restarting the app. The portable EXE is provided as a standalone download; install the setup version for automatic updates.

## Build on Windows
Install Node.js 22 or newer, then run npm install, npm run check, and npm run dist from this folder. The Windows x64 installer and portable EXE are written to release/. GitHub Actions performs the same build and publishes the Windows assets.

## AI API and privacy
IsaiahAI CodePro uses the Railway gateway at https://codepro-gateway-production.up.railway.app. The Groq API credential remains in Railway's private environment variables and is never embedded in the installer. IsaiahAI 7.0 SUPER and Breakaway 1.0 continue using the existing hosted AI API. Usage depends on the configured providers and their quotas.
