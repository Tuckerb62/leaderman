# Operations

Run, test, publish, and troubleshoot Curiosity. The app is a static frontend plus a Supabase project; there is nothing else to operate.

## Setup

```bash
npm install
```

`.env` needs the Supabase browser config:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

## Develop

```bash
npm run dev        # http://127.0.0.1:5173
npm run phone      # same dev server reachable from devices on your Wi-Fi (port 5174)
npm test           # vitest
npm run build      # production build to dist/
```

## Publish (GitHub Pages)

```bash
npm run build:pages
git add .
git commit -m "Update Curiosity site"
git push
```

Pages serves the tracked `docs/` folder on `main`. If the repo is renamed, update `/leaderman/` in the `build:pages` script.

## Database

Schema lives in `supabase/migrations/`. Apply migrations to the linked project with the Supabase CLI (`supabase db push`) or by running each file in the SQL editor. Current tables:

- `user_profiles` — per-user sync snapshots (RLS: own row only)
- `generated_lessons` — shared library canon (RLS: read all, insert own, immutable)

## Troubleshooting

- **"Cloud sign-in is not configured"**: `.env` is missing or the build was made without the `VITE_SUPABASE_*` vars.
- **Signed in but sync errors**: the migrations have not been applied to the Supabase project — `user_profiles` is missing or blocked by RLS.
- **AI errors everywhere**: the user has no saved key, or the key was revoked. Account → AI → "Check and save key" verifies it against OpenAI.
- **Lesson generation fails mid-run**: progress is checkpointed per step in localStorage; reopening the slot offers "Resume writing this lesson" and only re-runs from the failed step.
- **Supabase project paused**: free-tier projects pause after ~a week of inactivity; restore from the Supabase dashboard.
- **A published lesson is wrong**: clients cannot edit canon. Delete or replace the row in `generated_lessons` with direct DB access, then a user can regenerate the slot.
