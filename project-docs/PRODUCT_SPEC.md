# Curiosity Product Spec

This is the forward-looking spec agreed in June 2026, and the source of truth for product intent. Milestones 1–5 have shipped; the other project docs now describe the single architecture this spec defined.

## What Curiosity Is

Curiosity is a calm nightly reading app. You open it on your phone, anywhere; if you were mid-lesson it opens straight onto the page you left off, otherwise it shows a quiet feed of what to read next. Lessons read like chapters of a book. The curriculum is shared by all users; progress, notes, and saves are per-user. The library is not fixed: it grows as users open topics that don't have lessons yet, and users can commission lessons on their own topics.

- Audience: the maintainer plus family and friends, published openly on GitHub for anyone to use or self-host.
- Cost and liability: the maintainer pays nothing beyond a free-tier Supabase project and holds no user API keys.
- Single canonical architecture. The Mac LAN server, Keychain bridge, private News fetcher, and desktop launcher are retired.

## Architecture

- **Frontend**: static Vite React build, hosted on GitHub Pages. Self-hosters build with their own `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Backend**: Supabase only, free tier. Three responsibilities:
  1. Auth (magic link).
  2. Per-user state snapshot sync (`user_profiles.app_state`, existing).
  3. Shared lesson catalog (new `generated_lessons` table, below).
- **AI**: BYOK, direct from browser. Each user pastes their own OpenAI key; it is stored in localStorage only, never synced, never sent to Supabase. The UI states this plainly. There is no AI proxy server.
- **News**: removed along with the Mac server. The News tab, `newsStorage`, and `private-news.mjs` go away.

### Retired components

`scripts/local-ai-server.mjs`, `scripts/private-sync-store.mjs`, `scripts/private-news.mjs`, `scripts/private-ai-settings-store.mjs`, `scripts/save-openai-key-to-keychain.mjs`, `scripts/create-mac-app.mjs`, the LAN sync provider in `src/logic/syncClient.js`, and all README/OPERATIONS instructions that describe them.

## Reading Experience

The lesson is the heart of the app and it should feel like reading a book, not using software.

### Lesson page

- A lesson is **one flowing essay**. No labeled sections, no "Quick version", no "Core idea" / "What it gets right" boxes. Counterpoints, historical examples, and uncertainty are woven into the prose the way a good book chapter carries them. The `quickVersion` summary is removed entirely.
- Essays are split into **pages of roughly 500–1,000 words**. No fixed page count — the text decides. Page breaks fall at natural paragraph boundaries.
- The reader shows one page at a time with a quiet page indicator ("4 of 9"). Position is remembered per lesson per user; putting the app down and coming back resumes the exact page.
- Finishing the last page is the completion moment — a single mark-complete action, nothing else. **All in-lesson interactive elements are cut**: no scenario/decision blocks, no reflection prompt, no review question. Those become tutor conversations (below).
- Typography: serif body type, generous measure and leading, adjustable text size. Two tuned themes — **warm paper** for day, **true dark** for night reading — and nothing else. No further reader settings.

### Feed

The feed survives as the between-lessons surface (open the app mid-lesson → resume reading; open it after finishing → feed). It gets the same stoic treatment as everything else:

- Cards carry a title and an opening line, and at most one quiet state marker. Status badges, domain tags, reason lines, backdrop art, and any text whose job is to explain the UI to the user are removed.
- The aggregation logic (direct interest + adjacent exploration, domain interleaving) stays; only its self-narration goes.

### UI streamlining (global)

Throughout the app, remove narration words — labels that tell the user what a thing is instead of letting it be that thing. Section headers like "Quick tour", explanatory captions, redundant button text. The bar: if deleting the words loses no information a reader couldn't infer from the content itself, delete the words. Dense, calm, modern; the Kindle home screen and an open Kindle page are the references.

### AI tutor

- The tutor is a **floating chat bubble the user can drag anywhere on screen**. Tapping it opens a small chat window; it never occupies a nav slot.
- It automatically carries the current lesson context (the lesson and page being read).
- The capabilities cut from lessons live here: ask it to quiz you, run a judgment scenario, hold a reflection conversation. **Discovery**: quiet suggestion chips surface these at natural moments — most importantly on the completion of a lesson ("test me on this", "give me a scenario", "what would I have done?") — so users learn the tutor can do these things without the UI lecturing them.
- Because review questions left the lesson flow, the old question-accuracy stat retires. Progress becomes: lessons completed, pages read, recent activity. (Tutor-run quizzes may log activity later; not required now.)

## Model Choice

- Users pick their AI model for the tutor and personal (non-canon) expansions. The existing `AI_MODEL_OPTIONS` list plus custom model ID stays user-facing in AI settings.
- **Canonical lesson generation is pinned** to a single designated strong model (configured in code, currently the best available reasoning tier). User model preference does not affect canon generation. This keeps shared-library quality consistent regardless of who clicked first.

## The Growing Library

### Slots

The curated topic tree in `src/data/topicBank.js` defines everything that *can* exist in the shared canon: every subject/subtopic node (including thin areas like emergency medicine and biopharma) is a slot. The maintainer grows the tree by editing it. A slot is either:

- **Seeded**: covered by a deterministic bundled lesson (current behavior), or
- **Empty**: visible in the Library as an openable stub, or
- **Generated**: filled by a published AI-generated lesson from the shared catalog.

### Generation flow

When a user opens an empty slot:

1. The UI explains that opening this topic will generate a lesson using **their key**, that the run is the most expensive call in the app (multi-step plus web search), and that the result becomes part of the app for all users. The user confirms.
2. The client runs the five-step pipeline (below) against OpenAI directly with the user's key and the pinned canon model. **The user watches it work**: the UI shows the stage in progress (drafting… verifying against sources… correcting… polishing…). Generation is foreground by design — the pipeline runs in the browser, and phones suspend background tabs, so a "background" run would die on screen lock and waste the user's spend. Each completed step is checkpointed to localStorage so a dropped connection resumes from the last finished step instead of restarting.
3. On success, the client inserts the lesson into `generated_lessons`. **Auto-publish: the lesson is immediately canon for all users.** There is no approval queue, moderation layer, or flagging system; this is a deliberate trade for the current trust level (family/friends scale). Revisit if a public hosted instance grows.

### The five-step pipeline

One generation run is a sequence of model calls (not one prompt), each with web search enabled where the model supports it:

1. **Draft** — write the lesson as a flowing essay from the slot's subject/subtopic context. **Depth is variable: 1–6 pages (500–1,000 words each), chosen by the weight of the topic.** A maxim gets a page; a war gets six. Anti-padding is a hard rule: the prompt explicitly instructs that omission beats filler and that the essay must never be stretched to fill a length. Counterpoints, historical examples, and uncertainty are woven into the prose, not appended as labeled sections.
2. **Verify** — a separate call re-reads the draft and checks every factual claim (names, dates, attributions, citations, historical events) against web search results. Output: a list of confirmed claims, corrected claims, and claims that could not be verified.
3. **Fix** — apply corrections; any claim that could not be verified is removed or explicitly hedged ("accounts differ", "attribution uncertain") rather than asserted.
4. **Optimize** — improve the writing: clarity, concision, concrete examples, rhythm; finalize page breaks at natural boundaries. No new factual claims may be introduced in this step.
5. **Publish** — final structural validation client-side (title present, pages non-empty and within length bounds), then insert into the shared catalog.

Honesty requirement: this pipeline reduces hallucination, it does not eliminate it. The lesson record stores enough provenance (model, generated-by, timestamp, verification notes) to audit later. Prompts must instruct the model to prefer omission over invention, never fabricate quotes/citations/dates, and keep source uncertainty visible in the essay — consistent with the existing copyright-safety rule for seeded curriculum.

### Commissioned topics (later phase)

Users can eventually type a topic that isn't in the tree ("the Bronze Age collapse") and run the same five-step pipeline on it.

- Commissioned lessons are **private by default**: they live in the commissioning user's synced state and render in the same book reader.
- A commissioned lesson can be **offered into the shared canon** with an explicit publish action. Published commissions insert into `generated_lessons` under a `custom:<slug>` slot id and the generator picks the subject shelf it lives on.
- Tree slots auto-publish; commissions are private-then-publishable. That difference is deliberate: the tree is curated territory, commissions are personal territory.

### Data model

```sql
generated_lessons (
  slot_id text primary key,      -- topic tree node id, or custom:<slug>; uniqueness is the race guard
  lesson jsonb not null,         -- { title, pages: [markdown, ...], openingLine }
  model text not null,           -- pinned canon model id used
  generated_by uuid not null,    -- auth.uid() of the generating user
  verification_notes jsonb,      -- step-2 output summary
  created_at timestamptz default now()
)
```

RLS:
- `select`: everyone (or all authenticated users; lessons are shared canon).
- `insert`: authenticated users, `generated_by = auth.uid()`, and only when the `slot_id` row does not exist.
- `update` / `delete`: nobody (immutable canon). The maintainer regenerates via direct DB access if a lesson is wrong. Immutability plus insert-only RLS is what makes auto-publish safe-ish without moderation: a user can fill an empty slot but can never alter or remove existing content.

Race handling: the primary key on `slot_id` means if two users generate the same slot concurrently, the first insert wins and the second client discards its result and loads the published row.

Client behavior: lesson catalog is fetched on load and cached locally; generated lessons flow through the same canonical-item identity/routing (`library:<slot-id>`) and Feed aggregation as seeded lessons. Personal tutor conversations and private commissioned lessons remain per-user state.

## Milestones

1. **BYOK-first AI.** ✅ Direct OpenAI as the only endpoint; key-entry UX with validate-on-save; user model picker stays.
2. **Supabase default-on.** ✅ Sign-in gate, sync always on, LAN provider deleted, RLS verified on `user_profiles`.
3. **Book reader + streamlined UI.** ✅ Paginated essay reader (paper/dark, serif, position memory), open-to-resume, bare feed cards, Quick version and labeled sections removed, draggable tutor bubble with suggestion chips, question-accuracy stat retired.
4. **Shared lesson catalog + generation pipeline.** ✅ `generated_lessons` table, curated empty slots, five-step pipeline with watch-it-work progress and checkpoint resume, auto-publish, catalog caching, Feed integration.
5. **Retire the Mac stack.** ✅ Server scripts, News, and the Keychain/desktop flows deleted; docs rewritten around the one architecture.
6. **Publish-ready.** Self-hosting instructions (in README), open-signup vs approved-emails decision for the hosted instance, free-tier caveats documented.
7. **Commissioned topics.** Custom-topic pipeline runs, private-by-default storage, publish-to-canon flow.

## Constraints carried forward

- Local-first reading: the app must remain readable offline / signed-out from cached state; sign-in adds sync and the shared catalog, it is not a wall.
- No telemetry. No synced or server-held API keys.
- UI stays dense, calm, minimal; no marketplace patterns, no self-narrating chrome.
- Refactoring App.jsx happens only where these milestones touch it (AI settings seam, sync provider seam, the lesson reader, Library slot rendering) — no wholesale restructure.
