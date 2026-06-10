# Security and Privacy

Curiosity's posture in one sentence: user data lives in the user's browser and their own Supabase row, API keys never leave the user's device except to OpenAI, and the only shared surface — the lesson catalog — is insert-only and immutable.

## API Keys (BYOK)

- Each user pastes their own OpenAI key under Account → AI. It is stored in `localStorage` (or `sessionStorage` when "remember" is off) on that device only.
- The key is sent only to `api.openai.com`, as a bearer header on direct requests. It is never written to app state, never synced, never sent to Supabase, never proxied through any server.
- The UI states this plainly and warns that anyone with access to the browser profile could read the key — users should use a key they can revoke.
- Saving validates the key against OpenAI's `/v1/models` endpoint so a typo fails loudly rather than at first use.

## Per-User Data

The synced snapshot (progress, notes, reflections, saved items, reading positions, reader settings, private AI expansions, profile) lives in browser storage and, when signed in, in the user's own row of `public.user_profiles`. Row-level security restricts select/insert/update to `auth.uid() = user_id`; the `anon` role has no access. Manual JSON export/import remains available for backups.

## The Shared Catalog

`public.generated_lessons` is readable by all authenticated users. Inserts are allowed only as yourself (`generated_by = auth.uid()`) and only into empty slots (primary-key conflict otherwise). There are **no client update or delete paths** — published canon is immutable, which is what makes auto-publish tolerable without a moderation layer at the current trust level (family and friends). Provenance (model, author, verification notes, timestamp) is stored per lesson. Lessons survive author account deletion with attribution cleared.

## Generation Honesty

The lesson pipeline reduces hallucination — web-search-grounded drafting, an adversarial fact-check pass, removal or hedging of unverified claims — but does not eliminate it. Prompts forbid fabricated quotes, citations, dates, and findings, and prefer omission over invention. The same fidelity rules apply to seeded curriculum.

## What Does Not Exist

- No telemetry or analytics.
- No server-held or synced API keys.
- No third-party services beyond Supabase and OpenAI (both chosen and configured by the deployer).
- No moderation queue — revisit if a public hosted instance grows beyond the current trust level.

## Auth

Email + password via Supabase Auth with email confirmation. Recommended dashboard setting: enable leaked-password protection (Auth → Passwords) so users cannot pick known-compromised passwords.
