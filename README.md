# Leaderman

Leaderman is a local-first leadership microlearning app: short lessons, scenario decisions, spaced review, source cards, and private reflections.

## Use It Online

After GitHub Pages finishes deploying, open:

https://Tuckerb62.github.io/leaderman/

The app has no backend and no account system. Your notes and progress are stored in your browser on the device you use.

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
http://127.0.0.1:4174/?view=ai
```

Paste your key into "Save key to Mac Keychain" and press "Remember on this Mac."

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
http://127.0.0.1:4174/?view=ai
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

## Install Without the App Store

Leaderman is installable as a web app, so you do not need an Apple Developer account or App Store publishing.

Mac:

1. Open the app in Safari or Chrome.
2. Use the browser's install/add-to-dock option.
3. Launch it from the Dock like a normal app.

iPhone or iPad:

1. Open `https://Tuckerb62.github.io/leaderman/` in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

For private AI on phone or iPad, run this on your Mac first:

```bash
npm run phone:ai
```

Then open the printed `http://192.168.x.x:4174/` URL on your phone or iPad while both devices are on the same Wi-Fi.

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
