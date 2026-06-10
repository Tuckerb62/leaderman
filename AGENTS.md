# Curiosity Agent Guide

This repository is Curiosity (repo name `leaderman` for historical reasons), a calm nightly reading app with a shared, AI-growable library. Ignore any inherited workspace notes about "Cozycat" or about a Mac-hosted private server — both are stale.

## Start Here

1. `project-docs/PRODUCT_SPEC.md` — the product definition and milestone plan. This is the source of truth for intent.
2. `project-docs/ARCHITECTURE.md` — code structure and data flow.
3. `project-docs/SECURITY_AND_PRIVACY.md` — before touching AI, key storage, sync, or the shared catalog.
4. `project-docs/OPERATIONS.md` — run, test, publish.

The tracked `docs/` directory is generated GitHub Pages output, not source documentation.

## Product Intent

Curiosity is a calm nightly reading app for the maintainer, family, and friends, published openly. Lessons are flowing essays read in a paginated book-style reader. The shared library grows when users open empty topic slots and generate canonical lessons with their own OpenAI key. There is one architecture: static frontend + Supabase (auth, per-user sync, shared lesson catalog) + BYOK AI direct from the browser.

## Architecture Rules

- Static-first frontend; no app server. Supabase is the only backend.
- BYOK AI: user keys live in browser storage only — never synced, never sent to Supabase, never proxied.
- The shared lesson catalog (`generated_lessons`) is insert-only from clients; published canon is immutable. Canon generation is pinned to `CANON_MODEL` in `src/logic/lessonPipeline.js`.
- Keep seeded curriculum deterministic and copyright-safe. Never invent quotes, citations, dates, or book claims — in seed content or in pipeline prompts.
- Personal data stays in the user's snapshot (browser + their `user_profiles` row). No telemetry.
- UI stays minimal, calm, book-like. No marketing surfaces, no self-narrating chrome: if deleting words loses nothing a reader couldn't infer, delete the words.

## Common Commands

```bash
npm install
npm test
npm run dev
npm run build
npm run build:pages
```

Run `npm test` after logic changes. Run `npm run build` after frontend changes. Run `npm run build:pages` before pushing changes that should appear on the public site.
