# Operations

This page is for future agents and maintainers who need to run, test, publish, or troubleshoot Leaderman.

## First-Time Setup

```bash
npm install
```

## Local Development

Run the normal Vite development server:

```bash
npm run dev
```

Open the printed local URL, usually:

```text
http://127.0.0.1:5173/
```

For phone testing on the same Wi-Fi network without private AI:

```bash
npm run phone
```

Open the printed LAN URL on the phone.

## Private AI on Mac

The preferred personal AI setup keeps the OpenAI API key on the Mac and out of the browser.

Start the private app server:

```bash
npm run local:ai
```

Open:

```text
http://127.0.0.1:4174/
```

The server serves the built app from `dist/` and exposes the local AI proxy at `/api/openai-responses`.

## Save the OpenAI Key

Option A, save inside the app:

1. Run `npm run local:ai`.
2. Open `http://127.0.0.1:4174/`.
3. Open the floating AI button, press the gear icon, and paste the key into "Save key to Mac Keychain".
4. Press "Remember on this Mac."

Option B, save from Terminal:

```bash
npm run keychain:set
```

Option C, use an environment variable for the current server process:

```bash
OPENAI_API_KEY=sk-your-key npm run local:ai
```

Do not write real API keys into source files, docs, commits, shell history examples, or screenshots.

## Private AI on Phone or iPad

Run this on the Mac:

```bash
npm run phone:ai
```

Open the printed URL, usually like:

```text
http://192.168.x.x:4174/
```

Requirements:

- Mac and phone or iPad are on the same Wi-Fi network.
- The Mac remains awake.
- The terminal running the private server stays open.
- The local network allows device-to-device connections.

Saving a key to Keychain from the app is only allowed on the Mac-only server bound to `127.0.0.1` or `localhost`. Use `npm run local:ai` for that setup step, then use `npm run phone:ai`.

## Desktop App Icon

Create or recreate the local macOS launcher:

```bash
npm run mac:app
```

This creates:

```text
/Users/jonathan/Desktop/Leaderman.app
```

Double-clicking the app starts the private local server on port `4174` if it is not already running, then opens Leaderman. Logs are written to:

```text
~/Library/Logs/Leaderman/launcher.log
```

The launcher is local and unsigned. It is not an App Store app and does not require an Apple Developer account.

## Public Website

The public site is served from GitHub Pages using the tracked `docs/` folder on `main`.

To update the published website after app changes:

```bash
npm run build:pages
git add .
git commit -m "Update Leaderman site"
git push
```

If the repository name changes, update the base path in `package.json`:

```json
"build:pages": "VITE_BASE=/leaderman/ vite build --outDir docs && touch docs/.nojekyll"
```

Use the new repository name in place of `/leaderman/`.

## Install on iPhone or iPad Without App Store

For the public static app:

1. Open `https://Tuckerb62.github.io/leaderman/` in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

This creates a home screen icon backed by the website manifest. It does not provide private local AI unless the phone is opening the Mac's `phone:ai` LAN URL.

## Verification Checklist

For docs-only changes:

```bash
npm test
```

For frontend behavior changes:

```bash
npm test
npm run build
```

For public-site changes:

```bash
npm test
npm run build:pages
```

For desktop launcher changes:

```bash
npm run mac:app
```

Then verify `/Users/jonathan/Desktop/Leaderman.app` exists and opens the app.

## Troubleshooting

If `http://127.0.0.1:4174/` does not open, check whether the private server is running and whether port `4174` is already in use.

If AI says no key is configured, open:

```text
http://127.0.0.1:4174/api/ai-health
```

It should report whether a key is loaded from environment, macOS Keychain, or missing.

If the phone cannot reach the Mac, confirm both devices are on the same Wi-Fi, use the printed LAN URL, keep the server terminal open, and check macOS firewall prompts.

If GitHub Pages looks stale, confirm `npm run build:pages` was run, `docs/` changes were committed, and GitHub Pages has finished deploying from `main`.
