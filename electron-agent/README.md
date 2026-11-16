# IsaiahSearch Desktop

## Desktop 1.6.0

- Rebuilt the new-tab home to match the IsaiahSearch light purple-to-cyan visual identity, including the updated orbital-search logo, clock/date, appearance toggle, Top Sites, Add Site, bookmarks, recent pages, and IsaiahSearch Agent card.
- Made IsaiahAI Chat a real full-window workspace on Windows and Ubuntu, with an always-visible **Exit chat** control and working Chat, Workspace, Terminal, Limits, and Puter navigation.
- Fixed the renderer's search endpoint so desktop web search no longer targets the CodePro chat-only gateway.
- Added persistent custom Top Sites shortcuts and a light/dark new-tab appearance preference.
- Kept the same desktop code path for Windows and Ubuntu so the shared UI fixes apply to both builds.

IsaiahSearch Desktop is the Windows and Ubuntu version of the IsaiahSearch browser with an integrated IsaiahAI coding workspace.

## Downloads

The GitHub Releases workflow publishes:

- Windows x64: NSIS installer and portable executable.
- Ubuntu x64: AppImage and Debian `.deb` package.

The Ubuntu AppImage is the recommended Linux download because `electron-updater` can automatically download and apply GitHub release updates to AppImage installations. The `.deb` is provided for conventional package installation; update it by installing the next released `.deb`.

## IsaiahAI models

The desktop app routes IsaiahAI model requests through the shared hosted gateway. Provider credentials stay on the server and are never included in the installer or exposed in the renderer.

IsaiahAI CodePro and Breakaway 1.0 use the dedicated gateway. Transient overload, rate-limit, service-busy, and network failures are retried automatically with bounded backoff. Visible model labels and assistant identity remain IsaiahAI-branded.

## IsaiahAI 26 Thinking

The separate Puter Models section stays locked until the user signs in with Puter. After sign-in, IsaiahAI 26 Thinking becomes selectable and uses the `openai/gpt-6-luna` model with `reasoning_effort: "none"`. Its identity, instructions, and chat labels remain IsaiahAI-branded.

Puter owns its account authentication and usage allowance. The app displays usage when the user's account exposes it; it does not bundle a Puter credential or provider API key.

## Local coding workspace

The local workspace is saved under the user's Documents folder by default:

- Windows: `Documents/IsaiahSearch Workspace`
- Ubuntu: `~/Documents/IsaiahSearch Workspace`

The local agent runs as the current signed-in user. Windows supports PowerShell and Command Prompt; Ubuntu uses Bash. The bridge does not silently elevate to Administrator/root; Ubuntu commands containing sudo, doas, or pkexec are blocked. High-impact operations require separate confirmation.

## Building from source

Requires Node.js 22 or later.

### Windows

```powershell
cd electron-agent
npm install
npm run check
npm run dist:win
```

### Ubuntu

Install the SVG icon converter once:

```bash
sudo apt-get update
sudo apt-get install -y librsvg2-bin
```

Then build:

```bash
cd electron-agent
npm install
npm run check
npm run dist:linux
```

The Ubuntu build outputs an AppImage and a Debian package in `electron-agent/release`. The AppImage is the automatic-update channel.

## Verification notes

The release workflow runs the renderer syntax/feature checks plus JavaScript syntax checks on both runner platforms before producing release assets. Model/provider availability and Puter account quotas remain subject to their respective hosted services. Automated CI builds are not a substitute for manually testing each installer on a physical Windows and Ubuntu computer.
