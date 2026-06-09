# Operations

This page is for future agents and maintainers who need to run, test, publish, sync, or troubleshoot Leaderman.

## First-Time Setup

```bash
npm install
```

## Local Development

Run the normal Vite development server:

```bash
npm run dev
```

Open the printed local URL, usually:

```text
http://127.0.0.1:5173/
```

For phone testing on the same Wi-Fi network without private AI:

```bash
npm run phone
```

Open the printed LAN URL on the phone.

## Private AI on Mac

The preferred personal AI setup keeps the OpenAI API key on the Mac and out of the browser.

Start the private app server:

```bash
npm run local:ai
```

Open:

```text
http://127.0.0.1:4174/
```

The server serves the built app from `dist/` and exposes:

- the local AI proxy at `/api/openai-responses`
- the AI health check at `/api/ai-health`
- the sync bridge at `/api/sync-health` and `/api/sync-state`
- private News refresh and expansion endpoints

## Tonight Setup for Mac and Phone

The free working setup is:

- the Mac runs Leaderman
- the Mac keeps the OpenAI key
- the phone opens the Mac-hosted Leaderman address on the same Wi-Fi
- both devices share the same saved state through the Mac

This is the setup to use when the goal is "make it work on my phone tonight" without adding a paid service or a separate internet sync backend.

## Supabase Sync Setup

Leaderman can also read and write its sync snapshot through Supabase when these environment variables are present:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The app expects the migration in `supabase/migrations/20260609155402_create_user_profiles_sync.sql`. The hosted project shape is:

```sql
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  app_state jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles enable row level security;

grant select, insert, update on table public.user_profiles to authenticated;
revoke all on table public.user_profiles from anon;

create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

If your project uses manual Data API exposure, expose `public.user_profiles` to the `authenticated` role. Without that, `supabase-js` can fail even when RLS policies exist.

In Supabase Auth, add the exact redirect URLs you plan to use with magic-link sign-in. At minimum this usually means:

- `http://127.0.0.1:5173`
- `http://127.0.0.1:4174`
- `https://tuckerb62.github.io/leaderman/`

Any other LAN or preview origin must also be added explicitly.

To apply the backend to the hosted project from this repo:

```bash
supabase link --project-ref unfzptahxgcnyauxbnpr
supabase db push
```

If you are not authenticated with the CLI, use the SQL file directly in the Supabase SQL editor instead.

## Save the OpenAI Key

Option A, save inside the app:

1. Run `npm run local:ai`.
2. Open `http://127.0.0.1:4174/`.
3. Open the floating AI button, press the gear icon, and paste the key into "Save key to Mac Keychain".
4. Press "Remember on this Mac."

Option B, save from Terminal:

```bash
npm run keychain:set
```

Option C, use an environment variable for the current server process:

```bash
OPENAI_API_KEY=sk-your-key npm run local:ai
```

Do not write real API keys into source files, docs, commits, shell history examples, or screenshots.

## Private AI and News on Phone or iPad

The simplest phone path is now the desktop app:

1. Run `npm run mac:app` once to create `Leaderman.app`.
2. Open `Leaderman.app` on the Mac.
3. In Leaderman, press the `Phone` button.
4. Open the shown phone address on the phone, usually:

```text
http://192.168.x.x:4174/
```

The command-line fallback is still:

```bash
npm run phone:ai
```

Requirements:

- Mac and phone or iPad are on the same Wi-Fi network.
- The Mac remains awake.
- If you used `npm run phone:ai`, the terminal running the private server stays open.
- The local network allows device-to-device connections.

Saving a key to Keychain must be done from the Mac itself. Open Leaderman on the Mac and save the key there. The phone can then use AI and News through that same Mac server.

When the phone uses the Mac-hosted address, it gets:

- shared progress sync
- private News refresh
- AI through the Mac-held key

## Desktop App Icon

Create or recreate the local macOS launcher:

```bash
npm run mac:app
```

This creates:

```text
/Users/jonathan/Desktop/Leaderman.app
```

Double-clicking the app starts the private local server on port `4174`, opens Leaderman on the Mac, and makes the same server reachable from the phone on the local network. Logs are written to:

```text
~/Library/Logs/Leaderman/launcher.log
```

The launcher is local and unsigned. It is not an App Store app and does not require an Apple Developer account.

## Public Website

The public site is served from GitHub Pages using the tracked `docs/` folder on `main`.

To update the published website after app changes:

```bash
npm run build:pages
git add .
git commit -m "Update Leaderman site"
git push
```

If the repository name changes, update the base path in `package.json`:

```json
"build:pages": "VITE_BASE=/leaderman/ vite build --outDir docs && touch docs/.nojekyll"
```

Use the new repository name in place of `/leaderman/`.

## Install on iPhone or iPad Without App Store

For the public static app:

1. Open `https://Tuckerb62.github.io/leaderman/` in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

This creates a home screen icon backed by the website manifest. It is the public static copy of the app.

For the synced phone setup with private AI and News, use the Mac-hosted phone address instead of the public GitHub Pages URL.

## Sync Verification

To verify the private sync bridge locally:

1. Run `npm run local:ai` or `npm run phone:ai`.
2. Open `/api/sync-health` and confirm it reports `available: true`.
3. Open the app from that same server URL on desktop and phone.
4. Make a small user-state change on one device, then confirm it appears on the other after the normal pull cycle or a visibility change.

The sync file lives outside the repo, under the user's local application-support area on the Mac.

## Verification Checklist

For docs-only changes:

```bash
npm test
```

For frontend behavior changes:

```bash
npm test
npm run build
```

For public-site changes:

```bash
npm test
npm run build:pages
```

For desktop launcher changes:

```bash
npm run mac:app
```

Then verify `/Users/jonathan/Desktop/Leaderman.app` exists and opens the app.

For changes touching the private server:

```bash
npm test
npm run build
```

Then verify:

- `/api/ai-health`
- `/api/sync-health`
- News refresh in the app
- the expected local sync status chip
- the `Phone` modal shows a phone-ready address when the server is in LAN mode

## Troubleshooting

If `http://127.0.0.1:4174/` does not open, check whether the private server is running and whether port `4174` is already in use.

If AI says no key is configured, open:

```text
http://127.0.0.1:4174/api/ai-health
```

It should report whether a key is loaded from environment, macOS Keychain, or missing.

If the app stays in `Local only`, open:

```text
http://127.0.0.1:4174/api/sync-health
```

It should report whether the sync bridge is available and where its local file lives.

The public GitHub Pages site is not the same as the Mac-hosted phone address. Browsers block a normal secure public page from quietly calling an insecure local-network API, so the working free setup is to open the Mac-hosted address directly on the phone.

If News does not refresh, confirm the app is running from the private server rather than GitHub Pages, then check whether source fetching succeeds and whether a key is available for AI summarization or only deterministic fallback.

If the phone cannot reach the Mac, confirm both devices are on the same Wi-Fi, use the printed LAN URL, keep the server terminal open, and check macOS firewall prompts.

If GitHub Pages looks stale, confirm `npm run build:pages` was run, `docs/` changes were committed, and GitHub Pages has finished deploying from `main`.
