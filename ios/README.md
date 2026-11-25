# IsaiahSearch for iOS

This is a separate native SwiftUI iOS app. It does not embed the website or load the Windows app UI in a frame. The Windows Electron project is untouched.

## Current native features
- Native SwiftUI chat interface with IsaiahSearch styling.
- Model selection for the backend's currently implemented models: IsaiahAI 7.0 SUPER, Breakaway 1.0, and IsaiahAI CodePro.
- Calls the shared Railway `POST /api/chat` endpoint. Existing saved Netlify API settings are migrated automatically.
- Supports up to four photo attachments per message with preview, compression, and bounded image context for follow-up questions.
- Native Safari browser sheet for opening websites.
- Local API endpoint setting.

## Account sign-in status
The native SwiftUI target does not yet include Firebase/Google account sign-in. The supplied config is the Firebase **web app** config used by the website, mobile PWA, and Windows app; native Google sign-in additionally needs the iOS OAuth client ID / reversed client URL scheme from the `isaiahsi` Firebase project. This is separate from the web project's Authorized Domains setting.

## Important capability notes
The existing backend currently accepts exactly three model IDs: `isaiahai_7_super`, `breakaway_1_0`, and `isaiah_codepro`. This app exposes those exact server-supported models rather than pretending unsupported models are available. If "Breakaway 1.0" is a different app-only model than the Gemini-backed model configured in the backend, its backend must be implemented before it can work here.

iOS does not allow an app to freely control other apps or the whole device like a desktop computer agent. This native app can use its own chat, server-side web search, and Safari handoff. More device-level automation requires Apple-approved APIs and user permissions.

## Build
Open `IsaiahSearch.xcodeproj` in Xcode on macOS, select an iPhone simulator or device, and build. To distribute to an iPhone, sign with an Apple Developer team and use TestFlight or an appropriately signed distribution build. A `.mobileconfig` is not an app installer.

The GitHub Actions workflow builds a simulator target for validation. A signed device download requires Apple signing credentials configured as GitHub Actions secrets.
