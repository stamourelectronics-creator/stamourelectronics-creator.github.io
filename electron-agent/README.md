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

## AI routing and usage

Hosted IsaiahAI is attempted first. If it is unavailable, the app can sign in to Puter and try free models exposed to that account, with live IsaiahSearch snippets when the search service is reachable. Puter avoids requiring an app-owned API key by using the user's model access, but model availability and provider quotas still apply. This does not bypass usage limits.
