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

The desktop app sends chat requests to the hosted IsaiahAI API. The hosted server tries Google's Gemini reasoning model first, with compatible Gemini fallbacks, then uses OpenRouter's `openrouter/free` dynamic router if Gemini is unavailable. OpenRouter can route to different free models as availability changes; free endpoints can be busy or rate-limited, so no uptime or unlimited-usage guarantee is made.

The header toggle **Show reasoning summary** asks the server for a short, user-facing explanation of the approach. It never asks the app to display raw private chain-of-thought. API keys belong in the hosted server's secret environment variables and must never be bundled into the Windows executable or browser HTML.

There is no Puter AI sign-in or client-side Puter model fallback in the desktop chat. Browser pages continue to open in Chromium. Image generation and other server-managed tools must also keep their provider credentials server-side.
