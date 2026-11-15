# IsaiahSearch Desktop

## Desktop 1.5.1

- Fixed a renderer startup exception that prevented later browser and chat controls from initializing on Windows and Ubuntu.
- Added a visible **Back to browser** button to exit the full-screen IsaiahAI chat.
- Wired the Chat navigation button before optional browser controls initialize.
- Kept browser navigation inside IsaiahSearch tabs; removed the stale default-browser launch handler.
- Routed desktop web search through the shared IsaiahAI gateway.

IsaiahSearch Desktop is the Windows and Ubuntu version of the IsaiahSearch browser with an integrated IsaiahAI coding workspace.

## Downloads

The GitHub Releases workflow publishes:

- Windows x64: NSIS installer and portable executable.
- Ubuntu x64: AppImage and Debian `.deb` package.

The Ubuntu AppImage is the recommended Linux download because `electron-updater` can automatically download and apply GitHub release updates to AppImage installations. The `.deb` is provided for conventional package installation; update it by installing the next released `.deb`.

## IsaiahAI models

The desktop app routes the regular IsaiahAI models through the shared Railway gateway. Provider credentials stay on the hosted server and are never included in the installer.

IsaiahAI CodePro and Breakaway 1.0 use the dedicated gateway. Transient overload, rate-limit, service-busy, and network failures are retried automatically with bounded backoff. CodePro is presented under its IsaiahAI name; the app does not display the underlying provider.

## IsaiahAI 26 Thinking

The separate Puter Models section stays locked until the user signs in with Puter. After sign-in, IsaiahAI 26 Thinking becomes selectable and uses the `openai/gpt-6-luna` model with `reasoning_effort: "none"`. Its identity, instructions, and chat labels remain IsaiahAI-branded.

Puter owns its account authentication and usage allowance. Users pay for or consume their own eligible Puter account resources; model limits and current account allowance are shown in the app. The application does not bundle a Puter credential or provider API key.

## Local coding workspace

The local workspace is saved under the user's Documents folder by default:

- Windows: `Documents/IsaiahSearch Workspace`
- Ubuntu: `~/Documents/IsaiahSearch Workspace`

The local agent runs as the current signed-in user. Windows supports PowerShell and Command Prompt; Ubuntu uses Bash. The bridge does not silently elevate to Administrator/root; Ubuntu commands containing sudo, doas, or pkexec are blocked. High-impact disk, boot, registry, security, shutdown, deletion, and similar operations require a separate confirmation. Ubuntu shell execution blocks `sudo`.

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

The release workflow runs the renderer syntax/feature checks plus JavaScript syntax checks on both runner platforms before producing release assets. Model/provider availability and Puter account quotas remain subject to their respective hosted services.
