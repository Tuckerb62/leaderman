# Codex Changes

## 2026-06-07 Stoic Feed Rebuild

Changed:

- Made Feed the default app surface and removed Today, Review, and AI Coach from the main nav.
- Added a local feed queue for the earlier review-based model. Current behavior is documented in the 2026-06-08 note below.
- Added inline Feed expansion, decision reveals, quiet rating feedback, rated-state card lines, and a 20-minute session note.
- Moved AI into a floating side panel with automatic lesson context and persisted local chat history.
- Simplified Progress to streak, lessons touched, mastery, weak areas, and recent reflections.
- Added streak tracking, real session minutes, a 90-day review interval cap, reset confirmation, General reflections, and a 10-session storage cap.
- Reworked the visual system toward a warmer, quieter reading surface.

## 2026-06-08 Completion Tracking Simplification

Changed:

- Removed the visible `Know it`, `Review later`, and `Needs work` study controls.
- Replaced rating-based progress with percent complete, question percent right, and completed card count.
- Feed now prioritizes unread cards, shows `Mark complete`, and records completed cards without weak-area scheduling.
- Scenario decisions now record whether the preferred option was selected, feeding the local question accuracy percentage.

Cut:

- Today view.
- Review nav view.
- Full-page AI Coach view.
- Sidebar explanation card and brand subtitle.
- Always-open Learn fidelity panel.
- Philosophy hero metrics.
- Static AI quick prompts.

Decisions:

- Philosophy remains in the main nav because the philosophy curriculum is large enough to deserve direct access.
- Review navigation is removed rather than fixed as a separate screen; Feed now surfaces due reviews.
- Text-selection "Ask about this" is deferred because the floating panel already has automatic lesson context and selection support would add fragile UI complexity.

## 2026-06-08 AI Expansion Harness

Changed:

- Added `Expand` actions in Learn for lessons, book guides, and authored chapter/section readers.
- Expansion uses the same AI Coach key settings rather than adding a second API-key path.
- Generated expansion drafts are saved locally in `lessonExpansions` and included in manual backup/import.
- Novel summaries no longer receive fake chapter cards generated from whole-book bullets; books without authored retellings show a neutral chapter-retellings state and an expansion option.
- Summary source notes no longer repeat the old per-lesson copyright boilerplate.

Guardrails:

- Expansion prompts request structured Markdown learning tiers and block repeated disclaimer/fidelity filler.
- Tests now scan lesson bodies and fiction chapter data for banned boilerplate and generated skeletons.

## 2026-06-08 Learning Cockpit Refactor

Changed:

- Removed `Learn` and `Philosophy` from primary navigation while keeping the shared lesson and detail experience alive behind canonical item routing.
- Kept the existing Feed feel, but changed Feed to aggregate canonical items from `library`, `novels`, and `news`.
- Added plain-language Feed reason lines based on saved items, followed topics, interaction history, reading progress, and adjacent exploration.
- Rebuilt `Library` around a deterministic subject and subtopic map from `src/data/topicBank.js`.
- Promoted existing book and novel lessons into a separate `Novels` tab instead of keeping them buried inside Library.
- Added a private `News` tab backed by the local server, with compact source-based story cards, optional expansion, topic-ledger dedupe, and 14-day expiry for unsaved stories.
- Added new local state for topic follows, saved items, dismissed items, feed interaction history, and News persistence.
- Added a minimal private sync bridge through `scripts/local-ai-server.mjs`, `scripts/private-sync-store.mjs`, and `src/data/syncState.js` so desktop and phone can sync through the user's Mac.
- Extended import and export normalization so the new user-owned state survives backup and restore.

Decisions:

- Feed is no longer its own content type. It is an aggregator over canonical underlying items.
- GitHub Pages remains static-first and fully usable without private News refresh or sync.
- API keys and Keychain material stay local-only and never enter synced state.
- News refresh must start from fetched source material. AI is allowed to summarize and expand that material, not invent headlines from memory.

Future-facing limits kept explicit:

- Subject coverage is broader than the original leadership app, but some subjects currently have lighter deterministic seed depth than leadership, philosophy, history, or business.
- The sync bridge is intentionally single-user and minimal. It is not an account system or a generalized conflict-resolution backend.
