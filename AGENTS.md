# Leaderman Agent Guide

This repository is Leaderman, a local-first leadership microlearning app. Do not treat it as Cozycat, even if an inherited workspace note mentions Cozycat. Cozycat context is stale for this repo.

## Start Here

Read these files before making non-trivial changes:

1. `README.md` for user-facing setup.
2. `project-docs/README_FOR_AGENTS.md` for product capabilities and boundaries.
3. `project-docs/ARCHITECTURE.md` for code structure and data flow.
4. `project-docs/OPERATIONS.md` for local run, publishing, and desktop launcher commands.
5. `project-docs/SECURITY_AND_PRIVACY.md` before touching AI, key storage, persistence, import/export, or hosting.

The tracked `docs/` directory is generated GitHub Pages output. Do not use `docs/` as source documentation unless you also change the build flow intentionally.

## Product Intent

Leaderman is a serious personal training cockpit for leadership judgment. It teaches through condensed source cards, longer article-style lessons, historical examples, scenario decisions, reflections, simple completion tracking, question accuracy, philosophy tracks, and an optional AI coach.

The app is designed for one person using it privately tonight, not for a multi-user SaaS product. Preserve the local-first model unless explicitly asked to change it.

## Architecture Rules

- Keep the frontend static-first. The main app should continue to work from GitHub Pages with no backend.
- Keep personal data local by default. Notes, reflections, progress, completion/question state, and browser AI settings live in browser storage.
- Keep seeded curriculum deterministic and copyright-safe. Use paraphrase, source attribution, public-domain classics, doctrine, research summaries, and historical cases. Do not invent quotes, citations, dates, or book claims.
- Treat `scripts/local-ai-server.mjs` as the private personal AI bridge. It may proxy OpenAI calls with a key from environment or macOS Keychain.
- Do not commit API keys or secrets. Do not add telemetry or remote sync unless the user asks.
- Keep the UI dense, calm, and modern. Avoid marketing landing pages, mascots, decorative bloat, and course marketplace patterns.

## Common Commands

```bash
npm install
npm test
npm run build
npm run build:pages
npm run local:ai
npm run phone:ai
npm run mac:app
```

Run `npm test` after logic or docs that describe tested behavior. Run `npm run build` after frontend changes. Run `npm run build:pages` before pushing changes that should appear on the public GitHub Pages site.
