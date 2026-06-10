# Architecture

Curiosity is a static Vite + React single-page app backed only by Supabase. There is no app server: the frontend is hosted on GitHub Pages (or any static host), Supabase provides auth, per-user state sync, and the shared lesson catalog, and AI calls go directly from the browser to OpenAI with the user's own key.

## Key Files

- `src/App.jsx`: application shell — auth gate, navigation, Feed, Library, Literature, Progress, Account, view routing, and state actions.
- `src/components/BookReader.jsx`: the paginated book-style reader (serif typography, paper/dark themes, text size, page indicator, completion) plus the shared `MarkdownBlock` renderer.
- `src/components/GeneratedLessonView.jsx`: shared-library lessons — renders the reader for published lessons, or the generation panel (explainer, watch-it-work stages) for empty slots.
- `src/styles.css`: full app styling.
- `src/data/seedData.js`: deterministic seeded lessons and app state factory.
- `src/data/articleCatalog.js` + `src/data/markdownCurriculumParser.js`: the markdown curriculum (subject → topic → subtopic tree) parsed from `src/data/sources/*.md`.
- `src/data/lessonSlots.js`: the curated list of empty lesson slots the shared library can grow into. Grow the library by adding entries here.
- `src/data/storage.js`: local state load/save and backup import/export.
- `src/data/syncState.js`: sync snapshot build and merge (per-slice timestamps, last-write with backfill).
- `src/data/aiSettings.js`: browser AI settings and key storage (localStorage/sessionStorage only).
- `src/logic/aiClient.js`: OpenAI Responses API client — tutor instructions, expansion prompts, payload construction, key validation (`validateApiKey`), direct-endpoint default.
- `src/logic/lessonPages.js`: pagination — splits prose into 500–1k word pages at paragraph boundaries.
- `src/logic/lessonPipeline.js`: the five-step canon generation pipeline (draft → verify → fix → optimize → publish) with the pinned `CANON_MODEL`, web-search grounding, and localStorage checkpointing.
- `src/logic/generatedLessons.js`: shared catalog client — fetch/cache `generated_lessons`, publish with race handling.
- `src/logic/supabaseAuth.js` + `src/utils/supabase.js`: auth session handling and client config.
- `src/logic/syncClient.js`: Supabase sync provider (health, pull, push).
- `src/logic/feedAggregation.js`: Feed scoring, mixing, and domain interleaving across articles, seeded lessons, and generated lessons.
- `src/logic/itemIdentity.js` + `src/logic/itemRouting.js`: canonical item keys and routing into detail views.
- `supabase/migrations/`: the database schema. Self-hosters apply these to their own project.

## Backend (Supabase)

Two tables, both under row-level security:

- `public.user_profiles` — one row per user: `app_state` jsonb snapshot, last-synced timestamps. Policies: select/insert/update own row only; `anon` has no access.
- `public.generated_lessons` — the shared library canon: `slot_id` (primary key), `lesson` jsonb (`{title, openingLine, pages[]}`), `model`, `generated_by`, `verification_notes`, `created_at`. Policies: all authenticated users can select; insert only as yourself; **no update or delete** — canon is immutable from clients, and the primary key makes the first publisher win any race. `generated_by` survives author deletion (`on delete set null`).

## Reading Experience

Lessons render through `BookReader`: one flowing essay, paginated into ~500–1k word pages, serif type, paper and dark themes, adjustable text size. Page position is saved per book key into `readingProgress` (synced), so any device resumes the exact page. Finishing the last page is the completion action. Reader theme/size live in `settings.reader` (synced). Forward page turns increment `settings.studyStats.pagesTurned`.

Three content kinds flow through the same reader:

- seeded lessons (`view: 'learn'`) — `articleParagraphs`, or the user's private AI expansion when present
- markdown articles (`view: 'article'`) — `bodyMarkdown`, or the user's private generated article
- shared-library lessons (`view: 'generated'`) — pages from the `generated_lessons` catalog

The floating tutor bubble is draggable (position in localStorage), carries the current reading context, and offers suggestion chips (quiz, scenario, reflect) when the conversation is empty.

## The Growing Library

`src/data/lessonSlots.js` declares topics the library should cover but doesn't yet. Empty slots render in the Library as "Not written yet" rows. Opening one shows the generation panel; confirming runs `runLessonPipeline` in the browser on the user's key:

1. **Draft** — flowing essay, variable depth (1–6 pages), web search enabled, anti-padding rules.
2. **Verify** — separate adversarial call checks every factual claim against web search; outputs confirmed/corrected/unverified.
3. **Fix** — applies corrections; unverified claims are removed or hedged. Skipped when verification found nothing.
4. **Optimize** — editing pass only; no new factual claims allowed.
5. **Publish** — client-side shape validation, then insert into `generated_lessons`.

Each completed step checkpoints to localStorage so a dropped connection resumes rather than re-paying. Published lessons appear in the Library, the Feed, and the reader for every user. Generation runs foreground by design: browsers suspend background tabs, and the UI shows the stage in progress.

## AI Flow

All AI goes directly from the browser to `https://api.openai.com/v1/responses` with the user's key (`DEFAULT_AI_SETTINGS.endpoint`). The key is validated against `/v1/models` before saving and stored in localStorage (or sessionStorage when "remember" is off). The tutor and private expansions use the user's chosen model (`AI_MODEL_OPTIONS` + custom ID); canon generation always uses `CANON_MODEL`.

## State and Sync

App state is created by `createInitialState()` and persisted to localStorage on every change. Signed-in devices push/pull a snapshot through `user_profiles.app_state`: debounced push on change, periodic pull, pull on visibility change. Merge is per-slice last-write with backfill for generated content (`mergeSyncSnapshot`). Synced slices include reviews, sessions, reflections, notes, reading positions (and reader settings), lesson expansions, completed/generated articles, saved/dismissed items, followed topics, and profile settings. Never synced: API keys, resume view state, the shared catalog (which lives in `generated_lessons`, cached in localStorage).

## Feed

`buildFeedItems(state, { limit, generatedLessons })` mixes three domains — markdown articles (including literature chapter groups), seeded library lessons, and shared generated lessons — scored by saved/follow/activity signals with ~80/20 direct-interest vs exploration mixing and domain interleaving. Feed cards are deliberately bare: title, opening line, one quiet state marker. Tap opens the item; swipe right completes; swipe up dismisses.

## Build Outputs

- `npm run build` → `dist/` for local preview.
- `npm run build:pages` → `docs/` for GitHub Pages (with `VITE_BASE=/leaderman/`). Generated output; replaceable.

## Testing

Vitest covers: pagination, the lesson pipeline (prompts, validation, run order, checkpoint resume), the catalog normalizer, AI client payloads and key validation, sync snapshot build/merge, storage import/export, feed aggregation and interleaving, item identity/routing, study progress, seed data integrity, and topic bank indexing.

```bash
npm test
npm run build   # after UI changes
```
