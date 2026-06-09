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
