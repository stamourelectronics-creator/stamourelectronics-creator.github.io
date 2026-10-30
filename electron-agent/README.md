# IsaiahAI Agent (Windows)

IsaiahAI Agent is a Windows desktop assistant built with Electron and Chromium.

## Build locally

Install Node.js 22 and run:

    npm install
    npm run check
    npm run dist

Files are written to the release directory.

## Browser

- New tabs open `https://stamourelectronics-creator.github.io/`, the IsaiahSearch/IsaiahAI website.
- Search queries open the site with its `?q=` parameter.
- Each tab uses an isolated native Electron `WebContentsView` with its own navigation history, title and close button. The legacy `<webview>` element is no longer used.
- Webpage links that request a new tab are opened as new tabs inside IsaiahAI.

## AI models

- **IsaiahAI 7.0 SUPER** is routed to OpenRouter.
- **Breakaway 1.0** is routed to the server-side Gemini API key.
- The two model routes are separate. The server does not silently substitute one provider for the other.
- API keys remain in Netlify/server environment secrets; they are not packaged into the EXE.
- Hosted model usage and availability depend on the provider's terms, quotas and service status.

## Computer agent and unrestricted mode

- The app automatically prepares the Documents/IsaiahAI Workspace folder; no folder-picker step is required.
- On first launch, a native Windows warning asks whether to enable the **Unrestricted system agent · auto-run as Administrator** mode by default. The mode is enabled only if the user explicitly accepts; it can be switched off at any time in Computer tools. This choice is remembered.
- When enabled and Agent mode is on, a PowerShell or Command Prompt code block proposed by the selected AI model is run automatically without per-command approval. Its output is shown in the app and included as context for the next prompt.
- In unrestricted mode, command execution does not show a separate Windows approval dialog for every command. Commands run with the privileges granted to the app, which requests Windows Administrator elevation at launch.
- Windows UAC remains in control: the user must approve the UAC prompt when starting the application. IsaiahAI does not bypass UAC or other Windows security controls.
- Unrestricted commands can access the entire computer, modify or delete files, install or remove software, change registry values and services, or change system settings. Web content and downloaded files may contain malicious instructions that try to manipulate an AI agent. Enable this mode only on a computer you own and when you understand these risks. Turn it off at any time to restore the per-command review dialog.
- AI-generated file writes through the file editor still use a native confirmation dialog and create dated backups when replacing a file.

## AI routing and readiness

The desktop app calls the hosted IsaiahAI API over HTTPS. Its health endpoint reports credential readiness separately for the OpenRouter and Gemini models. The app uses a bounded health request, retries the check when a later message is sent after an offline startup, keeps the connection badge separate from the temporary thinking indicator, and displays which selected model is ready. API credentials are never embedded in the EXE, preload, or renderer HTML.

The **Show reasoning summary** setting asks for a short, user-facing description of the approach. It does not request private internal reasoning.

There is no Puter AI sign-in or client-side Puter model fallback in the desktop chat. The API endpoint can be overridden with `ISAIAH_API_BASE_URL` at app launch; otherwise the app uses `https://isaiahsearch.netlify.app/api`.

## Build checks

`npm run check` validates the Electron main/preload scripts and compiles the renderer's inline JavaScript before the Windows installer is packaged.
