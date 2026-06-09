# Leaderman

Leaderman is a local-first personal learning cockpit. It keeps a calm Feed surface, adds a structured Library, promotes Novels into a separate reading shelf, and supports a private News briefing plus optional local-network sync through the user's Mac.

## For AI Agents and Maintainers

Start with `AGENTS.md`, then read `project-docs/README_FOR_AGENTS.md`.

Source documentation lives in `project-docs/`. The tracked `docs/` folder is generated GitHub Pages output and can be replaced by `npm run build:pages`.

## What It Includes

- `Feed`: the default surface. It aggregates canonical items from Library, Novels, and News without becoming its own content type.
- `Library`: a structured topic map with deterministic seeded learning items.
- `Novels`: a separate reading shelf for book- and novel-driven study items.
- `News`: a private briefing tab powered by the local server when available.
- `Progress`: completion, question accuracy, and recent study history.
- Shared detail view: items opened from Feed route to the same underlying detail experience used by their native tab.
- Floating AI: optional private expansion and coaching, only on explicit user action.

## Use It Online

After GitHub Pages finishes deploying, open:

https://Tuckerb62.github.io/leaderman/

The public GitHub Pages build stays static-first. It has no account system and no cloud backend. Your notes, progress, saved items, generated lesson drafts, and preferences are stored in your browser on the device you use unless you choose the private Mac sync bridge described below.

## Run Locally

```bash
npm install
npm run dev
```

For phone testing from the same Wi-Fi network:

```bash
npm run phone
```

## Private AI Setup

For personal use, the safest setup is to keep your OpenAI API key on your Mac and let Leaderman call a local private server. The browser never receives the key.

Option A: save your key inside the app:

```bash
npm run local:ai
```

Open:

```text
http://127.0.0.1:4174/
```

Open the floating AI button, use the gear icon, paste your key into "Save key to Mac Keychain," and press "Remember on this Mac."

Option B: save your key from the terminal:

```bash
npm run keychain:set
```

Then run Leaderman with private AI on your Mac:

```bash
npm run local:ai
```

Open:

```text
http://127.0.0.1:4174/
```

To use it from your phone on the same Wi-Fi network:

```bash
npm run phone:ai
```

The terminal will print a phone URL like:

```text
http://192.168.x.x:4174/
```

Keep that terminal window open while using the app. If Keychain is not available, you can also start the server with:

```bash
OPENAI_API_KEY=sk-your-key npm run local:ai
```

## Private Sync and News

Leaderman supports optional single-user sync between desktop and phone when both devices connect to the Mac-hosted private server URL.

- The private server keeps the synced state file on the Mac.
- The app remains usable locally if the server is unavailable.
- API keys and Keychain material never enter synced state.
- The public GitHub Pages site still works without sync or News refresh.

News refresh also depends on the private server. The app fetches source material, stores source URLs and titles, and uses AI only for summarization and optional expansion when available.

## Install Without the App Store

Leaderman is installable as a web app, so you do not need an Apple Developer account or App Store publishing.

Mac:

Option A, Desktop launcher app:

```bash
npm run mac:app
```

This creates `Leaderman.app` on your Desktop. Double-click it to start the private local server and open Leaderman.

Option B, browser-installed app:

1. Open the app in Safari or Chrome.
2. Use the browser's install/add-to-dock option.
3. Launch it from the Dock like a normal app.

iPhone or iPad:

1. Open `https://Tuckerb62.github.io/leaderman/` in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

For private AI, News refresh, and local sync on phone or iPad, run this on your Mac first:

```bash
npm run phone:ai
```

Then open the printed `http://192.168.x.x:4174/` URL on your phone or iPad while both devices are on the same Wi-Fi. Using that LAN URL is what enables the private sync bridge and News refresh on the phone.

## Deploy

This repo deploys to GitHub Pages from the tracked `docs/` folder on `main`.

To update the published site after code changes:

```bash
npm run build:pages
git add .
git commit -m "Update Leaderman site"
git push
```

If publishing under a different GitHub repository name, update `build:pages` in `package.json` from `/leaderman/` to `/<repo-name>/`.
