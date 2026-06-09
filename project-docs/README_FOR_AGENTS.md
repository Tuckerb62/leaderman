# Leaderman Context for Future Agents

Leaderman is a standalone personal learning cockpit in `/Users/jonathan/Documents/leaderman`. It is still local-first, single-user, and static-first where practical. The public version can run as a static GitHub Pages site. The private version can run from the user's Mac with a small local server that keeps the OpenAI API key out of the browser and also provides private News refresh plus optional local sync. The app can also sync user-owned state through Supabase when the user signs in with a magic link.

## What the App Allows

Leaderman now teaches across a curated serious subject map rather than leadership alone. It still uses source cards, article-style lessons, historical examples, decision scenarios, reflection prompts, completion tracking, question accuracy, and optional AI expansion, but the product surface is organized around canonical items and tabs instead of a leadership-only flow.

The current app supports these user-facing areas:

- `Feed`: default calm reading surface. It aggregates canonical items from Library, Novels, and News while keeping the existing Feed feel as much as possible.
- `Library`: a structured topic map with parent subjects, subtopics, deterministic seeded items, and follow controls.
- `Novels`: a separate reading shelf built from the existing book and novel lesson model, including reading progress where available.
- `News`: a private briefing room backed by the private local server. Compact story cards stay factual and source-based; deeper analysis is on demand.
- `Progress`: percent complete, question percent right, completed card count, question record, and recent reflections.
- Shared detail view: opened Feed items route to the same underlying detail experience their native tab uses.
- Floating `AI Coach`: optional conversational help grounded in the current lesson or item context. It can use a private local proxy or a direct browser API key fallback.
- `Expand` actions in detail views: optional AI-generated private drafts for lessons, book guides, authored chapter or section readers, and News expansions.

The app still does not have payments, a multi-user collaboration model, PDF import, or EPUB import. It now has an optional single-user sync profile through Supabase Auth plus a minimal `public.user_profiles` table that stores the app snapshot JSON. The app remains usable locally without that profile.

## Learning Model

The product is built around short but meaningful learning loops:

1. Read a high-signal lesson or story.
2. Connect it to known sources, historical examples, and opposing views.
3. Make a scenario decision when the item supports one.
4. Reflect in the user's own words.
5. Mark the item complete or save it.
6. Use percent complete and question accuracy as lightweight progress signals.

Lessons are intentionally more than summaries. They should teach the user to compare tradeoffs, detect misuse, recognize historical patterns, and practice judgment under uncertainty.

## Curriculum Shape

Seeded content lives in `src/data/seedData.js`. The Library topic map is built in `src/data/topicBank.js` on top of deterministic seeded lessons. The current subject set includes leadership, philosophy, psychology, history, world history, literature, novels, writing, communication, business, economics, technology, politics, health, emergency medicine, biopharm, and science or research.

Source cards represent books, public-domain classics, popular self-help books, novels, doctrine, research summaries, and historical cases. Lesson records connect to source IDs and can include:

- core idea
- article paragraphs
- what the idea gets right
- blind spots or limits
- opposing view
- historical example
- scenario
- decision options
- practice rep
- reflection prompt
- review prompt
- ethics check or misuse warning
- agent notes such as source/context, condensation, scenario, and reviewer caveats

Future curriculum expansion should keep claims grounded. If adding material from a book or historical case, paraphrase rather than copy. Include caveats when a source is contested, partial, ideological, or context-dependent.

## Local-First Behavior

User progress is stored in browser `localStorage` through `src/data/storage.js`. The same local state also stores `settings.resume`, which remembers the last view, selected lesson, selected news item, and last visible Feed item so the app can reopen where the user left off. AI key preferences for direct browser mode are stored by `src/data/aiSettings.js`. Session-only keys use `sessionStorage`; persisted browser keys use `localStorage`.

The sidebar includes manual JSON export and import so the user can back up progress or move it to another browser manually. Import merges seeded source and lesson records from the current build, then restores user-owned completion state, question-answer counts, sessions, notes, reflections, generated expansion drafts, saved items, followed topics, dismissed items, activity history, News state, and settings.

The private local server also exposes a minimal sync bridge. When both the desktop and phone open the same Mac-hosted private server URL, user-owned state can sync automatically through a file stored on the Mac. Separately, Supabase sync can store the same sync snapshot in `public.user_profiles` keyed by the signed-in user. GitHub Pages remains static and device-local unless the user manually exports or imports state, uses the Mac-hosted sync bridge, or signs in to Supabase sync.

## AI Coach Modes

The floating AI Coach has two operating modes:

- Private local server mode: the frontend calls `/api/openai-responses`. `scripts/local-ai-server.mjs` reads the OpenAI key from `OPENAI_API_KEY` or macOS Keychain and proxies the request to the OpenAI Responses API. The browser never receives the key.
- Direct browser mode: the frontend can call a full HTTPS endpoint directly and attach a pasted API key in the browser. This is convenient but exposes the key to that browser environment and should remain a fallback for personal use only.

The floating AI Coach also includes a model selector. Curated options live in `AI_MODEL_OPTIONS` in `src/logic/aiClient.js`, and the default model lives in `DEFAULT_AI_SETTINGS`. Keep the custom model option available so the user can try newer or account-specific model IDs without a code change.

AI expansion uses the same key path as AI Coach. It sends the selected lesson, chapter, or News-story context to the configured endpoint and stores the returned Markdown in local app state under `lessonExpansions` or the News expansion state.

The private server also exposes:

- `GET /api/ai-health`: tells the app whether a key is configured and whether it came from environment or Keychain.
- `POST /api/openai-responses`: local proxy to OpenAI Responses API.
- `POST /api/save-openai-key`: saves a pasted key to macOS Keychain, allowed only when the request comes from the Mac itself.
- `GET /api/sync-health`: reports whether the local sync bridge is available and where its local file lives.
- `GET /api/sync-state` and `POST /api/sync-state`: minimal single-user sync snapshot endpoints.
- `POST /api/news-refresh`: fetches source material and returns compact daily briefing items.
- `POST /api/news-expand`: expands a selected News story into a longer private briefing when a key is available.

Supabase sync is handled in the browser through `@supabase/supabase-js`, `src/logic/supabaseAuth.js`, and `src/logic/syncClient.js`. The app uses magic-link email auth and stores the same sync snapshot shape in `public.user_profiles.app_state`.

AI prompts are assembled in `src/logic/aiClient.js`. Every request should include the Leaderman app overview, the tutor role, factuality rules, teaching style, and optional current-item context. Keep these guardrails strong if the AI feature changes.

## Install and Hosting Options

Leaderman can be used in several ways:

- Local development: `npm run dev`, usually on `http://127.0.0.1:5173/`.
- Phone testing without private AI: `npm run phone`, usually on port `5174` and reachable by LAN IP.
- Private AI, private News, and sync on Mac: `npm run local:ai`, served from `http://127.0.0.1:4174/`.
- Private AI, private News, and sync from phone or iPad: `npm run phone:ai`, served from the Mac on the local network.
- Desktop launcher: `npm run mac:app`, which creates `Leaderman.app` on the Desktop, opens the private local app, and exposes a phone-ready LAN address.
- Public static site: `npm run build:pages`, committed to `docs/`, then served by GitHub Pages.
- iPhone or iPad home screen app: open the GitHub Pages URL in Safari and use Add to Home Screen.

For personal private AI, private News, and sync from phone or iPad, the Mac must remain awake, on the same Wi-Fi, and running the private server. The working free path is for the phone to open the Mac-hosted address directly, not for GitHub Pages to proxy back into the Mac.

## Source Documentation Location

Do not add durable source documentation under `docs/` unless the build process is changed. `docs/` is the generated static site folder for GitHub Pages and can be replaced by `npm run build:pages`.

Use `project-docs/` for maintainable source docs:

- `project-docs/README_FOR_AGENTS.md`: product and capability overview.
- `project-docs/ARCHITECTURE.md`: implementation map and data flow.
- `project-docs/OPERATIONS.md`: run, build, deploy, app install, and troubleshooting commands.
- `project-docs/SECURITY_AND_PRIVACY.md`: privacy model and key-handling rules.
