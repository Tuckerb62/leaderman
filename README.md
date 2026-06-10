# Curiosity

Curiosity is a calm nightly reading app. Open it on your phone, anywhere; if you were mid-lesson it opens onto the page you left, otherwise it shows a quiet feed of what to read next. Lessons read like chapters of a book. The curriculum is shared by all users; progress, notes, and reading positions are per account. The library grows: topics that have no lesson yet can be written into existence by any reader, and the result becomes part of the app for everyone.

## How It Works

- **Frontend**: a static Vite + React build, hosted on GitHub Pages. No app server.
- **Accounts and sync**: Supabase (email + password). Your snapshot — progress, notes, saved items, reading positions, settings — syncs through your own row in `public.user_profiles`.
- **AI**: bring your own OpenAI key. The key is stored only in your browser, sent only to OpenAI, and never synced. Paste it under Account → AI; the app verifies it with a test call before saving.
- **The growing library**: the topic tree includes slots that have no lesson yet. Opening one runs a five-step writing pipeline on your key (draft with web search → fact-check against sources → correct → polish → publish). The finished lesson is published to the shared `generated_lessons` catalog, immutable, for all users.

## Use It Online

https://Tuckerb62.github.io/leaderman/

On iPhone/iPad: open in Safari → Share → Add to Home Screen. On Mac: use the browser's install/add-to-dock option.

## Run Locally

```bash
npm install
npm run dev
```

For phone testing from the same Wi-Fi network:

```bash
npm run phone
```

The app needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` to enable sign-in and sync. Without them it shows a setup notice.

## Self-Hosting

1. Create a free Supabase project.
2. Apply the migrations in `supabase/migrations/` (they create `user_profiles` and `generated_lessons` with row-level security).
3. Put your project's URL and publishable key in `.env`:
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-key>
   ```
4. Build and host the static output anywhere (`npm run build`, or `npm run build:pages` for GitHub Pages).

Free-tier notes: Supabase pauses projects after about a week of inactivity (one click to restore), and auth emails are rate-limited to a few per hour.

## Deploy (GitHub Pages)

This repo publishes the tracked `docs/` folder on `main`:

```bash
npm run build:pages
git add .
git commit -m "Update Curiosity site"
git push
```

If publishing under a different repository name, change `/leaderman/` in the `build:pages` script.

## For AI Agents and Maintainers

Start with `AGENTS.md`, then `project-docs/PRODUCT_SPEC.md` (the product definition) and `project-docs/ARCHITECTURE.md` (code structure).
