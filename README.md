# Leaderman

Leaderman is a local-first personal learning cockpit. It keeps a calm Feed surface, adds a structured Library, promotes Novels into a separate reading shelf, and supports a private News briefing plus optional sync through either the user's Mac or Supabase.

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

The public GitHub Pages build stays static-first. Your notes, progress, saved items, generated lesson drafts, and preferences stay in your browser by default. If you choose Supabase sync, those user-owned state slices can also sync through your signed-in profile.

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

## Sync and News

The working free sync path is simple:

- your Mac is the home base
- your phone opens the Mac-hosted Leaderman address on the same Wi-Fi
- the Mac keeps the OpenAI key
- both devices read and write the same synced state through the Mac

News refresh still depends on the private Mac server. The app fetches source material, stores source URLs and titles, and uses AI only for summarization and optional expansion when available.

The simple split is:

- synced through the Mac: progress, saved items, generated content, and News history
- stays only on your Mac: the OpenAI key

Important:

- the public GitHub Pages site is still useful as a static copy of the app
- but the public site is not the synced phone setup for private AI, News, or live shared state
- for the synced phone setup, use the phone address shown by the Mac-hosted app

## Install Without the App Store

Leaderman is installable as a web app, so you do not need an Apple Developer account or App Store publishing.

Mac:

Option A, Desktop launcher app:

```bash
npm run mac:app
```

This creates `Leaderman.app` on your Desktop. Double-click it to start the private local server, open Leaderman on your Mac, and make the same app reachable from your phone on the same Wi-Fi.

Option B, browser-installed app:

1. Open the app in Safari or Chrome.
2. Use the browser's install/add-to-dock option.
3. Launch it from the Dock like a normal app.

iPhone or iPad:

For the synced phone version that shares your Mac state tonight:

1. Open `Leaderman.app` on your Mac.
2. Press the in-app `Phone` button.
3. On your phone, open the shown `http://192.168.x.x:4174/` address in Safari while both devices are on the same Wi-Fi.
4. If you want a shortcut, use Share -> Add to Home Screen.

That phone address is the real synced version. It gives the phone the same saved state, News, and AI bridge as the Mac app, while the API key stays on the Mac.

The public GitHub Pages URL is still useful as the public static copy of the app:

1. Open `https://Tuckerb62.github.io/leaderman/` in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

Use that public copy when you want the static app only. Use the Mac-hosted phone address when you want live shared state, News, and private AI.

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
