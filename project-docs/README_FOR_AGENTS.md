# Leaderman Context for Future Agents

Leaderman is a standalone leadership microlearning web app in `/Users/jonathan/Documents/leaderman`. It is built for personal use, local-first privacy, and fast iteration. The public version can run as a static GitHub Pages site. The private version can run from the user's Mac with a small local server that keeps the OpenAI API key out of the browser.

## What the App Allows

Leaderman lets the user study leadership as a practiced discipline instead of passively reading summaries. It combines source cards, article-style lessons, historical examples, decision scenarios, reflection prompts, simple completion tracking, question accuracy, philosophy tracks, and an optional AI coach.

The current app supports these user-facing areas:

- `Feed`: default calm reading surface with unread cards, inline expansion, decision practice, reflection capture, and simple completion.
- `Learn`: one lesson at a time with the core idea, article content, source basis, historical example, scenario, decision options, reflection, notes, and a single completion action.
- `Philosophy`: schools of philosophy and philosophy lessons, with emphasis on Stoicism while also covering other traditions.
- `Library`: searchable source cards and lesson cards, including domains, tags, and user notes.
- `Progress`: percent complete, question percent right, completed card count, question record, and recent reflections.
- Floating `AI Coach`: optional conversational help grounded in the current lesson. It can use a private local proxy or a direct browser API key fallback.
- `Expand` actions in Learn: optional AI-generated private drafts that flesh out a lesson, book guide, or authored chapter/section using the same AI Coach key settings.

The app does not currently have accounts, cloud sync, payments, a backend database, PDF import, EPUB import, or multi-device merge. Seeded curriculum remains deterministic; AI expansion creates local private drafts rather than replacing source seed data automatically.

## Learning Model

The product is built around short but meaningful training loops:

1. Read a high-signal lesson.
2. Connect it to known sources, historical examples, and opposing views.
3. Make a scenario decision.
4. Reflect in the user's own words.
5. Mark the card complete.
6. Use percent complete and question accuracy as lightweight progress signals.

Lessons are intentionally more than summaries. They should teach a future leader to compare tradeoffs, detect misuse, recognize historical patterns, and practice judgment under uncertainty.

## Curriculum Shape

Seeded content lives in `src/data/seedData.js`. The current curriculum includes leadership domains such as self-command, communication, influence, judgment, teams, ethics, power, conflict, systems, technology and future, philosophy, self-help, literature, and history.

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

User progress is stored in browser `localStorage` through `src/data/storage.js`. The same local state also stores `settings.resume`, which remembers the last view, selected lesson, and last visible Feed card so the app can reopen where the user left off. AI key preferences for direct browser mode are stored by `src/data/aiSettings.js`. Session-only keys use `sessionStorage`; persisted browser keys use `localStorage`.

The sidebar includes manual JSON export and import so the user can back up progress or move it to another browser manually. Import merges seeded source and lesson records from the current build, then restores user-owned completion state, question-answer counts, sessions, notes, reflections, generated expansion drafts, and settings.

Because there is no central backend, the same GitHub Pages URL on two devices will have separate local state unless the user exports and imports a backup.

## AI Coach Modes

The floating AI Coach has two operating modes:

- Private local server mode: the frontend calls `/api/openai-responses`. `scripts/local-ai-server.mjs` reads the OpenAI key from `OPENAI_API_KEY` or macOS Keychain and proxies the request to the OpenAI Responses API. The browser never receives the key.
- Direct browser mode: the frontend can call a full HTTPS endpoint directly and attach a pasted API key in the browser. This is convenient but exposes the key to that browser environment and should remain a fallback for personal use only.

The floating AI Coach also includes a model selector. Curated options live in `AI_MODEL_OPTIONS` in `src/logic/aiClient.js`, and the default model lives in `DEFAULT_AI_SETTINGS`. Keep the custom model option available so the user can try newer or account-specific model IDs without a code change.

AI expansion uses the same key path as AI Coach. It sends the selected lesson or chapter context to the configured endpoint and stores the returned Markdown in local app state under `lessonExpansions`.

The private server also exposes:

- `GET /api/ai-health`: tells the app whether a key is configured and whether it came from environment or Keychain.
- `POST /api/openai-responses`: local proxy to OpenAI Responses API.
- `POST /api/save-openai-key`: saves a pasted key to macOS Keychain, allowed only when the server is bound to `127.0.0.1` or `localhost`.

AI prompts are assembled in `src/logic/aiClient.js`. Every request should include the Leaderman app overview, the tutor role, factuality rules, teaching style, leadership stance, and optional current-lesson context. Keep these guardrails strong if the AI feature changes.

## Install and Hosting Options

Leaderman can be used in several ways:

- Local development: `npm run dev`, usually on `http://127.0.0.1:5173/`.
- Phone testing without private AI: `npm run phone`, usually on port `5174` and reachable by LAN IP.
- Private AI on Mac: `npm run local:ai`, served from `http://127.0.0.1:4174/`.
- Private AI from phone or iPad: `npm run phone:ai`, served from the Mac on the local network.
- Desktop launcher: `npm run mac:app`, which creates `Leaderman.app` on the Desktop and opens the private local app.
- Public static site: `npm run build:pages`, committed to `docs/`, then served by GitHub Pages.
- iPhone or iPad home screen app: open the GitHub Pages URL in Safari and use Add to Home Screen.

For personal private AI from phone or iPad, the Mac must remain awake, on the same Wi-Fi, and running the private server.

## Source Documentation Location

Do not add durable source documentation under `docs/` unless the build process is changed. `docs/` is the generated static site folder for GitHub Pages and can be replaced by `npm run build:pages`.

Use `project-docs/` for maintainable source docs:

- `project-docs/README_FOR_AGENTS.md`: product and capability overview.
- `project-docs/ARCHITECTURE.md`: implementation map and data flow.
- `project-docs/OPERATIONS.md`: run, build, deploy, app install, and troubleshooting commands.
- `project-docs/SECURITY_AND_PRIVACY.md`: privacy model and key-handling rules.
