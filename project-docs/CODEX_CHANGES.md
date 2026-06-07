# Codex Changes

## 2026-06-07 Stoic Feed Rebuild

Changed:

- Made Feed the default app surface and removed Today, Review, and AI Coach from the main nav.
- Added a local feed queue that prioritizes needs-work, due, weak-domain, new, and strong cards while avoiding same-domain runs over two.
- Added inline Feed expansion, decision reveals, quiet rating feedback, rated-state card lines, and a 20-minute session note.
- Moved AI into a floating side panel with automatic lesson context and persisted local chat history.
- Simplified Progress to streak, lessons touched, mastery, weak areas, and recent reflections.
- Added streak tracking, real session minutes, a 90-day review interval cap, reset confirmation, General reflections, and a 10-session storage cap.
- Reworked the visual system toward a warmer, quieter reading surface.

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
