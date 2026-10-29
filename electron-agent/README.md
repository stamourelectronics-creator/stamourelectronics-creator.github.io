# IsaiahAI Agent (Windows)

This subproject builds a Windows installer and portable executable using Electron and Chromium.

## Build locally

Install Node.js 22 and run:

    npm install
    npm run dist

Files are written to the `release` directory.

## Computer permissions

- The user explicitly chooses one workspace directory.
- The file browser supports text/code files up to 2 MB and limits the listing to 500 entries.
- File writes require a native Windows confirmation and create a dated backup in `.isaiahai-backups`.
- Preset and custom terminal commands require a native Windows approval prompt and run in the chosen workspace.
- The app does not silently scan the whole drive or run commands in the background.

## AI routing

Hosted IsaiahAI is used first. If unavailable and the user is signed in to Puter, the app can try an `openrouter/free` route using that user session. Provider limits and account policies still apply; this is not an unlimited-usage bypass.
