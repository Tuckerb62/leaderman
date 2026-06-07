# Security and Privacy

Leaderman is built for personal, local-first use. Its current privacy posture depends on keeping user data in the browser and keeping API keys out of the public website build.

## What Stays Local

The app stores these records in browser storage:

- lesson progress
- review state
- session history
- reflections
- notes
- import/export state
- browser AI settings
- optional direct-browser API key

There is no app account, cloud database, server-side profile, analytics pipeline, or automatic sync in the current product.

## Manual Backup

The app supports manual JSON export and import. Backups may contain private reflections, notes, review history, and settings. Treat exported files as personal data.

Import uses the current build's seeded `sources` and `lessons`, then restores user-owned state. This avoids replacing current curriculum with stale backup curriculum.

## API Key Handling

There are three key-handling paths:

1. macOS Keychain through the private local server. This is the preferred personal setup.
2. `OPENAI_API_KEY` environment variable for the private local server process.
3. Direct browser storage for a pasted key. This is the least private option and should stay a personal fallback.

The safest app flow is:

```bash
npm run local:ai
```

Then save the key through the AI Coach Keychain setup area. The browser sends the key once to the local Mac server at `/api/save-openai-key`, and the server stores it in macOS Keychain.

`/api/save-openai-key` refuses to run when the server is bound to `0.0.0.0`, because that mode is intended for phone or iPad access over the local network.

## Direct Browser Key Risk

If the user pastes an API key into direct browser mode and chooses to remember it, the key is stored in browser `localStorage`. Any script running in that same app origin could potentially read it. This is acceptable only as a convenience fallback for the user's private personal setup.

Do not present direct browser key storage as safe for shared computers, public deployments, team use, or untrusted browser extensions.

## Public GitHub Pages Boundary

The GitHub Pages build is static. It should not contain API keys, private reflections, local backups, or generated personal data.

When the app runs from GitHub Pages:

- normal learning features work offline/local-first after loading.
- user data is browser-local to that device.
- `/api/openai-responses` does not exist unless the app is being served by the private local server.
- AI requires either a direct browser endpoint/key or the Mac-hosted private server URL.

## Local Private Server Boundary

`scripts/local-ai-server.mjs` serves `dist/` and provides a local proxy to OpenAI. It reads the key from:

1. `OPENAI_API_KEY`
2. macOS Keychain service `leaderman-openai-key`

It does not write chat transcripts to disk. It forwards the request body to OpenAI and returns the response to the browser.

When run with `--host 0.0.0.0`, the server is reachable by other devices on the same local network. This is useful for personal phone and iPad use, but it should be treated as local network exposure.

## Service Worker and PWA

The service worker in `public/sw.js` is for installability and static asset behavior. Do not cache API key material or personal backups in service worker code.

If changing the service worker, verify that the app still loads after a refresh and does not trap users on stale broken assets.

## Rules for Future Changes

- Never commit real API keys.
- Never add hidden network sync for notes, reflections, sessions, or reviews.
- Never add analytics or telemetry without explicit user approval.
- Keep AI prompts grounded and cautious about facts.
- Add source references and uncertainty notes when expanding curriculum.
- Keep generated GitHub Pages output separate from source documentation.
- Re-check this document before changing storage, AI, import/export, service worker, publishing, or desktop launcher behavior.

