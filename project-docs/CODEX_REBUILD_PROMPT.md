# Codex Rebuild Prompt — Curiosity

You are working on **Curiosity**, a local-first leadership microlearning app. Read `AGENTS.md`, `project-docs/README_FOR_AGENTS.md`, `project-docs/ARCHITECTURE.md`, and `project-docs/FEED_FEATURE_SPEC.md` before making any changes. Understand the codebase fully before touching anything.

This prompt describes a significant but focused evolution of the app. These are **directions and suggestions, not rigid instructions.** You are expected to read the existing code, understand what's already working, and make judgment calls about the best way to implement each idea. If something described here conflicts with the architecture or would break existing functionality, use your best judgment and note what you changed and why.

The goal is a calmer, more focused, more minimal version of the app — one that feels like a serious personal tool, not a learning platform.

---

## The Core Feeling

Before touching any code, internalize this: the app should feel **stoic**. Not bare or broken — considered and calm. Think of a well-worn notebook, a clean terminal, a library at night. No celebration animations. No marketing language. No dashboard bloat. Every element earns its place or gets cut.

A person opening this app at 10pm should feel like they sat down with a good book, not logged into a productivity app.

---

## Design Language — Apply Across the Whole App

These are principles. Apply them to every component you touch, not as a checklist but as a filter.

**Color:** Shift the palette toward muted, low-contrast tones. Dark backgrounds with off-white text. Accent color (used sparingly) should be a single muted warm or cool tone — not bright blue, not orange. Status indicators (due, strong, new) use subtle variations of the same palette, not a rainbow. If you find yourself reaching for a new color, question whether you need it.

**Typography:** Let text do the work. Titles are large and clear. Body text is comfortable to read at night. Labels and metadata are small and muted — they recede, they don't compete. Avoid bold for decoration; use it only for genuine hierarchy.

**Spacing:** Generous vertical rhythm. Cards breathe. Nothing feels cramped. But also nothing feels padded for the sake of looking spacious — every gap has a reason.

**Borders and surfaces:** Subtle. A single 1px border at low opacity is enough to separate surfaces. Avoid heavy shadows. Prefer slight background tone differences over borders where possible.

**Interactions:** No bounce animations. No confetti. Transitions are short (150–200ms) and functional — they communicate state change, not delight. A card expanding should feel like unfolding a piece of paper, not a UI demo.

**Icons:** Use the existing Lucide set already imported. Don't add new icon libraries. Prefer text labels for primary actions; icons alone only for secondary/toolbar actions where the meaning is obvious.

**Eliminate:** Remove any element that exists for decoration, marketing feel, or to make the app look more impressive. The brand mark ("L" in a circle), the "Leadership Formation" subtitle in the sidebar, the "Local only" explanation card in the sidebar — these are noise for a personal tool. Replace with something minimal or remove entirely.

---

## Navigation

The current sidebar nav works well structurally. Refine it:

- **Feed** becomes the first item and the default view. This is the heart of the app.
- **Learn** stays — it's where you go when you want to study a specific lesson deliberately.
- **Library** stays — searchable index of all lessons and sources.
- **Progress** stays — simplified (see below).
- **Philosophy** stays — but consider whether it needs its own nav item or could live inside Library. Use your judgment based on the content volume and how the Philosophy view looks after trimming.
- **Review** — consider whether this is still needed as a standalone tab once the Feed surfaces due cards automatically. If the Feed does its job, Review may be redundant. Make a call.
- **Today** — likely redundant once Feed exists. Evaluate and cut if appropriate.
- **AI Coach** — remove as a nav item entirely. AI becomes a floating side panel (see below).

The sidebar itself should be quieter. Remove the brand subtitle. Remove the "Local only" explanation card. Keep the export/import/reset buttons but make them less prominent — a row of small icon buttons with tooltips is enough. The sidebar is navigation, not onboarding copy.

---

## Feed View — Primary Experience

Read `project-docs/FEED_FEATURE_SPEC.md` for the detailed spec. Implement it with these additional constraints and refinements:

**The feed is what you see when you open the app.** It should feel immediately useful — not a dashboard with stats up top, not a "start session" prompt. Just the first card, ready to read.

**Card design — stripped down.** In the collapsed state, show:
- Domain tag (very small, muted, top-left)
- Status badge (very small, top-right — "new", "due", "in 3 days", "strong")
- Title (clear, larger)
- Core idea (2–3 sentences max)
- Three quiet action buttons at the bottom: `Got it` · `Again` · `Skip` and a `Go deeper →` link

No lesson metadata, no difficulty rating, no minutes estimate in the collapsed card. Keep it to what you'd read in 10 seconds.

**Expanded card** unfolds inline as described in the spec. Keep the same calm aesthetic — the expansion should feel like the card breathing open, not a modal takeover. All lesson content available here: article, scenario, decision (with working option reveals), reflection textarea, sources.

**After rating**, show the spaced repetition feedback quietly: a one-line muted label on the card — "Back in 3 days" or "Back tomorrow" — for about 1.5 seconds. Then the card shrinks to a thin rated-state bar (a collapsed line showing the title and the rating) rather than disappearing. This keeps the scroll position stable and lets the user see what they've worked through in this session.

**Session timer**: count up silently. At 20 minutes, show one line of muted text above the next card: "20 minutes. Good session." Not a banner, not a modal — just a line of text in the feed that passes by like any other.

**Feed queue algorithm**: implement as described in the spec — needs-work first, due cards next, weak-domain new cards, other new cards, strong cards last. Prevent same-domain runs of more than 2. Use your judgment on edge cases (e.g. what happens when everything is strong and nothing is due).

---

## AI — Floating Side Panel

Remove the AI Coach nav tab entirely.

Add a single persistent button — small, bottom-right corner of the screen, a chat icon — that toggles a side panel open and closed. The panel slides in from the right and overlays the content without pushing the layout.

**The panel:**
- Has a simple chat thread at the top (scrollable)
- Has a text input at the bottom
- Always knows what lesson or card is currently visible (pass context automatically — don't make the user toggle "include lesson context")
- Has a small gear icon in the panel header that reveals API settings when clicked (endpoint, model, key) — collapsed by default
- Has a "Clear chat" option in the panel header
- Persists chat history to `localStorage` so it survives page refresh

**Context awareness:** when the panel opens, pre-populate the system context with whatever lesson is currently in view (in the feed, the most recently expanded card; in Learn view, the selected lesson). The user shouldn't have to think about this.

**Highlight to ask (nice to have, not required):** if implementing text selection → "Ask about this" is feasible without significant complexity, include it. If it adds meaningful complexity, skip it and note that it's a future improvement. Don't force it.

**API settings (inside the gear):** simplify significantly. Auto-detect whether the private local server is running by checking `/api/ai-health`. If it responds, use it — no user action needed. If it doesn't respond, fall back to browser key mode and show a simple password input for the key. Remove the explicit mode toggle. Remove the custom endpoint field from the default view (keep it in the gear if needed). The user should never have to understand the difference between private server and browser key mode — the app should handle it silently.

---

## Progress — Three Numbers, One Screen

Simplify the Progress view significantly. The primary display is three metrics, large and clear:

- **Streak** — consecutive days studied (add this, it doesn't exist yet)
- **Lessons touched** — total cards attempted at least once  
- **Mastery** — percentage of review attempts rated "Know it"

Below those three numbers, a quiet section: "Weak areas" — a simple list of domain names where the user has the most "Needs work" ratings, no bar charts, just text. Maybe 3–5 domains max.

Below that: recent reflections, exactly as they exist now.

Remove or collapse: the full weak domain bar chart visualization, the session history aggregation display, any metric that requires explanation to understand.

The goal is a screen you can read in 5 seconds and close. Not a dashboard you study.

**Streak implementation:** add `streakDays` and `lastStudiedDate` to `state.settings`. On session complete (when a session is saved to `state.sessions`), check: if `lastStudiedDate` was yesterday, increment `streakDays`; if today, leave it; if older or null, reset to 1. Update `lastStudiedDate` to today. Display streak prominently — it's the number that drives daily return.

---

## Bug Fixes — Bundle Into the Rewrite

Fix these as part of the overall rewrite rather than as separate patches. They're noted here so nothing gets missed:

**Decision options do nothing.** Add selected-option state to the decision step in LearnView. When the user clicks any option, reveal the reasoning. If they picked the non-preferred option, explain why the preferred option is better — the `reviewPrompt` field has useful text for this. The preferred option should not be pre-marked visually before the user makes a choice (that defeats the purpose). Show it only after they select.

**Reflections misfiled.** Today view's quick reflection textarea saves to `featured[0]?.id`. Change this to pass `null` as the lessonId. Update the Progress and reflection display to show these as "General" rather than trying to look up a lesson title.

**Review tab doesn't navigate.** ReviewView receives `setSelectedLessonId` but not `setView`. Pass `setView` and call it with `'learn'` when the user clicks a lesson title in the review queue.

**No session summary.** When a session finishes, before redirecting to Progress, show a brief summary — inline, not a modal. Something like: "Session done. 4 know · 1 needs work · 1 skip. Longest streak: 3 days." Give it 2–3 seconds or a dismiss tap before redirecting.

**Interval cap.** Add `const MAX_INTERVAL_DAYS = 90` in `reviewScheduler.js`. Clamp the computed interval to this value. Cards should never disappear for more than 3 months.

**Real session minutes.** Replace `lessonIds.length * 6` with actual elapsed time using `startedAt` and `endedAt` timestamps that are already stored on the session object.

**Reset without confirmation.** Wrap the reset button's handler in a `window.confirm` before calling `createInitialState()`.

**"Tonight's briefing" is always tonight.** Make the Today/Feed header time-aware: before noon → "Morning session", noon–5pm → "Afternoon session", after 5pm → "Evening session". Or just use the date and remove the time label entirely — simpler.

**Weak domain bar formula is wrong.** Replace `18 + item.needsWork * 18` with `Math.round((item.needsWork / Math.max(item.attempts, 1)) * 100)` to get an actual percentage of attempts that needed work.

---

## What to Cut

These things exist in the current app and should be removed or significantly reduced:

**Session history in state.** The app stores up to 120 past sessions but nothing displays them individually. Keep only the last 10 for minutes calculation. Don't store more.

**AI settings panel as a full view.** Gone. Everything moves into the gear icon inside the floating panel.

**Sidebar explanation card.** The "Local only / No account or cloud sync" card in the sidebar. Remove it. The user knows what their own app does.

**The brand subtitle.** "Leadership Formation" under the Curiosity logo. Remove. The app's purpose is self-evident.

**Fidelity panel always open.** In LearnView, the right-rail fidelity panel (Source basis, History lens, Analogy, Caution, Fidelity) competes with the lesson. Collapse it behind a "Show sources & fidelity" toggle. Closed by default.

**Philosophy hero metrics.** The "Schools: 5, Lessons: 12" stat row in the Philosophy hero. Remove. Not useful information.

**Hardcoded AI quick prompts.** The 4 static quick-prompt buttons in the current AI view. If you rebuild AI as a side panel, consider either removing these entirely or making them contextual to the current lesson (e.g. "Quiz me on this" and "Give me a historical example" dynamically referencing the lesson title).

---

## What Not to Touch

- Core spaced repetition logic in `reviewScheduler.js` — don't rewrite the algorithm, just add the interval cap
- The local-first data model — no backend, no sync, no accounts
- Export/import functionality
- The curriculum content in `seedData.js`
- The private AI server in `scripts/local-ai-server.mjs`
- Security and privacy model — read `project-docs/SECURITY_AND_PRIVACY.md` before touching anything AI-related

---

## Files You Will Likely Touch

- `src/App.jsx` — significant restructuring
- `src/styles.css` — full visual pass
- `src/logic/selectors.js` — add `feedQueue`, fix weak domain formula
- `src/logic/reviewScheduler.js` — add interval cap
- `src/data/storage.js` — trim session history limit

## Files You Should Not Need to Touch

- `src/data/seedData.js`
- `src/data/aiSettings.js` (unless you change how AI key storage works)
- `src/logic/aiClient.js` (unless auto-detect mode requires changes)
- `scripts/local-ai-server.mjs`
- `vite.config.js`

---

## Definition of Done

- Feed is the default view and feels like a calm, scrollable card experience
- Cards show status badges and post-rating feedback ("Back in 3 days")
- Expanded card has working decision reveals (no pre-marked answer)
- AI is a floating side panel, context-aware, with settings hidden behind gear
- AI chat persists across refresh
- Progress shows streak, lessons touched, mastery — nothing more by default
- Streak increments correctly on daily sessions
- All six bug fixes are in place
- Session history capped at 10
- Sidebar is clean — no explanation card, no brand subtitle
- Fidelity panel collapsed by default in LearnView
- App runs (`npm run dev`), builds (`npm run build`), and passes tests (`npm test`) with no errors
- The overall feeling is calm, minimal, and stoic — if something feels loud or cluttered, trim it

---

## A Note on Judgment

You will encounter decisions this prompt doesn't cover. Make them in the spirit of the direction above: quieter, simpler, more considered. When in doubt, do less. A missing feature is better than a noisy one. If you remove something that turns out to matter, it's easy to add back. If you add something that clutters the experience, it's harder to undo.

Leave a short note in `project-docs/CODEX_CHANGES.md` summarizing what you changed, what you cut, and any decisions you made that deviated from this prompt and why.
