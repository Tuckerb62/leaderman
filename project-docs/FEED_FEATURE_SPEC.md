# Feed Feature Spec

This tracked spec replaces the older additive Feed spec. Feed is now the primary Leaderman experience, not a side feature.

## Purpose

Feed gives the user a calm, low-friction way to study at night. Opening the app should land on a readable card, not a dashboard, stat wall, or course menu. The Feed makes spaced review visible by naturally mixing due cards with new lessons and showing the consequence of rating a card.

## Navigation

The primary nav is:

- Feed
- Learn
- Philosophy
- Library
- Progress

Today, Review, and AI Coach are no longer standalone nav items. Feed owns casual study and due-card surfacing. AI is a floating side panel.

## Queue Rules

`feedQueue(state, limit = 40)` orders cards this way:

1. needs-work cards
2. due cards, oldest due date first
3. untouched cards from weak domains
4. other untouched cards
5. strong cards
6. remaining cards

The queue prevents runs of more than two cards from the same domain when alternatives exist.

## Card Behavior

Collapsed cards show only:

- domain tag
- status badge
- title
- core idea
- `Got it`, `Again`, `Skip`, and `Go deeper`

Expanded cards unfold inline with article paragraphs, fidelity notes, scenario, decision options, reflection capture, source cards, and a full Learn link.

Rating a card shows quiet spaced-review feedback for about 1.5 seconds, then shrinks the card to a rated-state line instead of removing it from the page.

## Study State

Meaningful study activity updates streak state:

- rating a Feed or Learn card
- completing a formal session
- saving a reflection

Progress stays intentionally minimal: streak, lessons touched, mastery, weak areas, and recent reflections.

## AI Behavior

AI is a persistent floating side panel. It uses the current lesson context automatically:

1. most recently expanded Feed card
2. selected Learn lesson

AI settings live behind a gear icon. The app tries the private local server first and falls back to browser key mode when the server is unavailable.

