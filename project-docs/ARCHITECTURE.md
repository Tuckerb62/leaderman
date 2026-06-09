# Architecture

Leaderman is a Vite React single-page app with optional local Node tooling for private AI and desktop launching. The main product is intentionally static-first: it can run from GitHub Pages without a server, while the private AI version runs from the user's Mac.

## Key Files

- `src/App.jsx`: main React application, Feed, navigation, view composition, session flow, import/export controls, floating AI Coach UI, and local state updates.
- `src/styles.css`: full app styling, responsive layout, dashboard surfaces, controls, lesson cards, and mobile behavior.
- `src/data/seedData.js`: deterministic source cards, domains, philosophy schools, micro-lessons, initial progress records, and app state factory.
- `src/data/storage.js`: local state load/save, backup export, and backup import normalization.
- `src/data/aiSettings.js`: browser AI settings and optional browser-side key storage.
- `src/logic/reviewScheduler.js`: completion tracking and question-answer transitions.
- `src/logic/selectors.js`: unread lesson recommendations, source lookup, progress stats, and feed ordering.
- `src/logic/aiClient.js`: AI instructions, lesson context, Responses API payload construction, response parsing, and endpoint behavior.
- `scripts/local-ai-server.mjs`: static file server plus private OpenAI proxy and macOS Keychain saving.
- `scripts/save-openai-key-to-keychain.mjs`: terminal-based Keychain setup.
- `scripts/create-mac-app.mjs`: creates the local macOS `Leaderman.app` launcher.
- `public/manifest.webmanifest`, `public/icon.svg`, `public/sw.js`: installable web app assets.
- `docs/`: generated GitHub Pages output from `npm run build:pages`.
- `project-docs/`: maintainable source documentation.

## Data Model

The app state is created by `createInitialState()` in `src/data/seedData.js`. The effective state shape is:

```js
{
  schemaVersion: 1,
  sources: SourceCard[],
  lessons: MicroLesson[],
  reviews: Record<lessonId, LessonProgress>,
  sessions: Session[],
  reflections: Reflection[],
  notes: Record<lessonId, string>,
  lessonExpansions: Record<expansionKey, GeneratedExpansion>,
  settings: object
}
```

`SourceCard` records explain where a lesson draws from:

```js
{
  id,
  title,
  author,
  domain,
  coreArgument,
  usefulIdea,
  blindSpot,
  opposingView,
  application,
  tags
}
```

`MicroLesson` records drive the learning experience:

```js
{
  id,
  slug,
  title,
  domain,
  sourceIds,
  sourceBasis,
  article,
  coreIdea,
  getsRight,
  misses,
  opposingView,
  historicalExample,
  scenario,
  decisionOptions,
  practiceRep,
  reflectionPrompt,
  reviewPrompt,
  ethicsCheck,
  agentNotes,
  order
}
```

`LessonProgress` is produced and updated by `src/logic/reviewScheduler.js`:

```js
{
  status,
  completed,
  completedAt,
  attempts,
  questionAttempts,
  correctAnswers,
  lastQuestionAt,
  lastReviewedAt
}
```

`Session` records capture completed five-card learning sessions:

```js
{
  id,
  startedAt,
  endedAt,
  lessonIds,
  results,
  minutes
}
```

## State Flow

```mermaid
flowchart LR
  Seed["src/data/seedData.js"] --> Load["loadState()"]
  Browser["localStorage"] --> Load
  Load --> React["App state"]
  React --> Views["Feed / Learn / Philosophy / Library / Progress / Floating AI"]
  Views --> Actions["complete, answer question, note, reflection, expand, session, import"]
  Actions --> React
  React --> Save["saveState()"]
  Save --> Browser
  React --> Export["manual JSON export"]
  Import["manual JSON import"] --> Load
```

`lessonExpansions` stores local AI-generated Markdown drafts for expanded lessons, summaries, and authored chapter/section entries. These drafts are user-owned local data, not deterministic curriculum.

`loadState()` always keeps source cards and lessons from the current seed data. Imported or saved user state restores completion state, question-answer counts, notes, reflections, sessions, lesson expansion drafts, and settings. This prevents stale exported curriculum from overwriting newer built-in curriculum.

## Progress Tracker

The progress tracker is intentionally simple:

- `markLessonComplete(...)` marks a lesson complete and records a completion timestamp.
- `recordQuestionAnswer(...)` increments local question attempts and correct answers.
- `isLessonComplete(...)` treats explicit completions, and older imported touched lessons, as complete.

Feed ordering puts unread lessons first, then completed lessons. Progress displays percent complete and question percent right instead of rating status.

## AI Flow

```mermaid
flowchart LR
  UI["Floating AI panel / Expand buttons"] --> Client["src/logic/aiClient.js"]
  Client --> Endpoint{"Endpoint"}
  Endpoint -->|"default /api/openai-responses"| LocalServer["scripts/local-ai-server.mjs"]
  LocalServer --> Key{"API key source"}
  Key --> Env["OPENAI_API_KEY"]
  Key --> Keychain["macOS Keychain"]
  LocalServer --> OpenAI["OpenAI Responses API"]
  Endpoint -->|"full HTTPS URL"| Direct["Direct browser request with pasted key"]
  Direct --> OpenAI
```

The default endpoint is `/api/openai-responses`. That only works when using the private local server. On GitHub Pages, the app can still run without AI, or the user can configure a direct HTTPS endpoint and provide a key in the browser.

The selected model is stored with AI settings. Curated model choices and descriptions live in `AI_MODEL_OPTIONS`; `DEFAULT_AI_SETTINGS.model` sets the default. The UI also supports a custom model ID.

The API request body includes a centralized `instructions` prompt. It gives the AI an overview of Leaderman, defines the tutor role, requires factual caveats, asks for examples and practical drills, and includes current lesson context when enabled.

Expansion requests use the same endpoint and key settings as AI Coach. The expansion prompt asks for structured Markdown, avoids repeated boilerplate, keeps source uncertainty separate from teaching content, and stores the result only in local state.

## Build Outputs

`npm run build` creates `dist/` for local preview and private server use.

`npm run build:pages` creates `docs/` for GitHub Pages with `VITE_BASE=/leaderman/`. This folder is generated output and should be considered replaceable.

The desktop launcher does not bundle a copy of the app. It points to this repo path, runs `npm run build`, starts `scripts/local-ai-server.mjs`, and opens `http://127.0.0.1:4174/`.

## Testing

Current automated tests use Vitest and cover:

- AI settings behavior.
- AI chat persistence behavior.
- AI client payload and response parsing behavior.
- Feed queue ordering and domain interleaving.
- Completion and question-answer transitions.
- Streak and session-minute helpers.
- seed data integrity.
- storage import/export normalization.

Run:

```bash
npm test
```

For UI changes, also run a build:

```bash
npm run build
```
