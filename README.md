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
