# IsaiahAI Agent (Windows)

IsaiahAI Agent is a Windows desktop assistant built with Electron and Chromium.

## Build locally

Install Node.js 22 and run:

    npm install
    npm run dist

Files are written to the release directory.

## Browser

- The Browser tab opens on IsaiahSearch's own search screen, not DuckDuckGo.
- Results are fetched through IsaiahSearch and open inside Chromium.
- Direct URLs are validated as HTTP/HTTPS before navigation.
- Use the explicit Open outside control for pages that block embedded browser sessions.

## Chat as a computer agent

- Choose a workspace folder from the Connect computer folder control inside chat; there is no separate Computer workspace tab.
- The chat only reads a supported text/code file when you select and attach it.
- Review & save AI code writes a complete code block from the last AI answer to your selected file only after a native Windows approval prompt. A dated backup is created first under .isaiahai-backups.
- Commands require a chosen workspace folder and a native Windows approval prompt. Review exact custom commands before allowing them.
- The agent does not silently scan the whole drive or run terminal commands without explicit approval.

## AI routing, reasoning summaries, and usage

The desktop app calls the hosted IsaiahAI API over HTTPS. The server uses Gemini first, with compatible Gemini fallbacks, then OpenRouter's `openrouter/free` dynamic router. Free endpoints can be busy or rate-limited; no unlimited-usage or uninterrupted-availability guarantee is made.

The **Show reasoning summary** toggle asks the server for a short, user-facing explanation of the approach. It never requests raw private chain-of-thought. Provider API keys stay in Netlify/server environment secrets and are never embedded in the EXE, preload, or browser HTML.

There is no Puter AI sign-in or client-side Puter model fallback in the desktop chat. The API endpoint can be overridden with `ISAIAH_API_BASE_URL` at app launch; otherwise the app uses `https://isaiahsearch.netlify.app/api`.

## Workspace and terminal permissions

- The app remembers the folder you explicitly select and restores that same folder on later launches. You can remove saved access from the Local workspace controls.
- The file picker can attach up to six supported project files to one chat request. File access remains inside the selected workspace and is read-only until you explicitly use **Review & save AI code**.
- PowerShell and Command Prompt are available from the Terminal panel. Every custom command displays the exact command and working directory in a native Windows approval dialog. Commands run with your Windows user permissions and can affect files outside the selected workspace; review every command before approving it.
- File writes create a dated backup first and also require a native Windows approval. Terminal commands have a two-minute safety timeout and output is bounded.
- This is not unattended or unrestricted PC control. The selected workspace is persistent, while command execution and file writes remain explicitly approved.

## Build checks

Run `npm run check` before `npm run dist`. The check validates the Electron main/preload scripts and compiles the renderer's inline JavaScript before the Windows installer is packaged.
