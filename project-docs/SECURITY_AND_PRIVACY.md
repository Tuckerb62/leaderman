# Security and Privacy

Leaderman is built for personal, local-first use. Its privacy posture depends on keeping user data in the browser by default, keeping API keys out of the public website build, and limiting private-server sync to the user's own Mac.

## What Stays Local

The app stores these records in browser storage:

- lesson progress
- completion and question-answer state
- session history
- reflections
- notes
- AI-generated expansion drafts
- saved items
- dismissed items
- topic follows
- item interaction history
- News stories, News expansion drafts, and topic-ledger state
- import and export state
- browser AI settings
- optional direct-browser API key

There is no app account, cloud database, server-side profile, analytics pipeline, or multi-user sync service in the current product.

## Manual Backup

The app supports manual JSON export and import. Backups may contain private reflections, notes, completion history, question-answer history, saved items, followed topics, locally generated expansion drafts, News history, and settings. Treat exported files as personal data.

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

Then save the key through the floating AI panel's Keychain setup area. The browser sends the key once to the local Mac server at `/api/save-openai-key`, and the server stores it in macOS Keychain.

`/api/save-openai-key` refuses to run when the server is bound to `0.0.0.0`, because that mode is intended for phone or iPad access over the local network.

## Direct Browser Key Risk

If the user pastes an API key into direct browser mode and chooses to remember it, the key is stored in browser `localStorage`. Any script running in that same app origin could potentially read it. This is acceptable only as a convenience fallback for the user's private personal setup.

Do not present direct browser key storage as safe for shared computers, public deployments, team use, or untrusted browser extensions.

## Public GitHub Pages Boundary

The GitHub Pages build is static. It should not contain API keys, private reflections, local backups, or generated personal data.

When the app runs from GitHub Pages:

- normal learning features work offline and local-first after loading
- user data is browser-local to that device
- `/api/openai-responses` does not exist unless the app is being served by the private local server
- `/api/sync-state` and `/api/news-refresh` do not exist unless the app is being served by the private local server
- AI requires either a direct browser endpoint and key or the Mac-hosted private server URL
- expansion drafts and News state remain in that browser's local state unless the user exports a backup or uses the Mac-hosted sync bridge

## Local Private Server Boundary

`scripts/local-ai-server.mjs` serves `dist/` and provides a local proxy to OpenAI, a News endpoint, and a minimal sync bridge. It reads the key from:

1. `OPENAI_API_KEY`
2. macOS Keychain service `leaderman-openai-key`

It does not write chat transcripts to disk. It forwards the request body to OpenAI and returns the response to the browser.

The sync bridge writes a single-user sync snapshot file on the Mac. That file is intended for the same user moving between their own devices on the same network. It is not an account system and should not be repurposed into one casually.

The request body includes the selected model, the user's question, recent chat turns, optional current-lesson or News-story context, selected expansion context, and the centralized Leaderman tutor or expansion instructions. Do not include API keys, local backups, or unrelated private files in this body.

Expansion responses are Markdown drafts. Treat them as private generated learning aids, not verified source curriculum, until authored and checked.

When run with `--host 0.0.0.0`, the server is reachable by other devices on the same local network. This is useful for personal phone and iPad use, but it should be treated as local network exposure.

## Sync Boundaries

The private sync bridge is allowed to sync user-owned state such as:

- followed topics and subtopics
- saved items
- dismissed state
- feed-driving interaction history
- completion and question state
- reading progress
- generated lesson expansions
- saved or archived News items
- generated News expansions
- lightweight profile basics when present

The private sync bridge must not sync:

- API keys
- Keychain material
- local private-server secrets
- arbitrary local files

The current sync model is deliberately small and single-user. It trades off rich conflict resolution for a simple last-write and per-slice merge approach suitable for one person's desktop and phone.

## Service Worker and PWA

The service worker in `public/sw.js` is for installability and static asset behavior. Do not cache API key material or personal backups in service worker code.

If changing the service worker, verify that the app still loads after a refresh and does not trap users on stale broken assets.

## Rules for Future Changes

- Never commit real API keys.
- Never add hidden third-party or cloud sync for notes, reflections, sessions, generated expansions, completion state, or question-answer state without explicit user approval.
- Never add analytics or telemetry without explicit user approval.
- Keep AI prompts grounded and cautious about facts.
- Never ask the model to invent current news from memory. News must come from fetched source material or show an unavailable state.
- Add source references and uncertainty notes when expanding curriculum.
- Keep generated GitHub Pages output separate from source documentation.
- Re-check this document before changing storage, AI, import/export, service worker, publishing, or desktop launcher behavior.
