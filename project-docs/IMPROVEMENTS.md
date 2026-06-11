# Improvement Plan

Ordered, actionable instructions for the issues surfaced in the June 2026 audit.
Each section is independent; do them top to bottom for best results. Every task
ends with an **acceptance check** so you know when it's done.

Working agreement for all tasks:
- Branch off `main`, one branch per section.
- `npm test` and `npm run build` must pass before opening a PR.
- Do not hand-edit files in `docs/` — it is generated output (see Section 1).

---

## 1. Build the published site in CI (stop the Supabase regression)

**Problem.** The Supabase URL and publishable key are inlined into the bundle at
build time from a local `.env`. Any rebuild of `docs/` without that `.env`
(e.g. in a fresh cloud container) compiles them out, and the live site reports
"connect Supabase." `docs/` is also a hand-committed build artifact, which is a
standing footgun.

**Goal.** GitHub Actions builds and deploys the site on every push to `main`,
with the Supabase values supplied from repo secrets. Humans stop building
`docs/` by hand.

**Steps.**
1. In GitHub → repo **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL` = `https://unfzptahxgcnyauxbnpr.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the project's publishable key
     (`sb_publishable_…`; it is public/RLS-protected, safe as an Actions secret).
2. In **Settings → Pages**, set **Source = GitHub Actions**.
3. Add `.github/workflows/deploy.yml` that, on push to `main`:
   - checks out, `npm ci`, `npm test`, then `npm run build` (output `dist/`, base
     `/leaderman/`) with the two `VITE_*` secrets passed as `env:`.
   - uploads `dist/` via `actions/upload-pages-artifact` and deploys with
     `actions/deploy-pages` (needs `permissions: { pages: write, id-token: write }`).
4. Stop committing `docs/`: delete the tracked `docs/` folder and add `docs/` to
   `.gitignore`. Keep `build:pages` only for optional local preview.
5. Update `README.md` and `project-docs/OPERATIONS.md`: deploys are automatic on
   merge to `main`; no manual build step.

**Acceptance check.** Push a trivial change to `main`; the Actions run goes green
and the live site loads with sign-in available (no "connect Supabase" notice).

---

## 2. Break `App.jsx` into logical modules

**Problem.** `src/App.jsx` is ~3,480 lines: the app shell, ~25 components, ~25
helper functions, 60 `useState` and 21 `useEffect`. It is the single hardest file
to work in.

**Goal.** A small `App.jsx` shell plus focused modules. Move code **without
changing behavior** — pure relocation + import wiring, verified by the existing
build/tests at each step.

**Target layout.**
```
src/
  App.jsx                     # shell only: providers, view routing, layout chrome
  app/
    routing.js                # queryParam, normalizePrimaryView, initialView,
                              #   initialLessonId, initialArticleKey,
                              #   initialLibrarySubjectId, viewTitle, syncStatusLabel
    useCuriosityState.js      # the big state hook (see step 5)
  lib/
    lessonText.js             # expansionKeyFor, isNovelReadingLesson,
                              #   stripMarkdownSections, readingModeExpansionMarkdown,
                              #   guideTitleFor, memoryTitleFor, displayLessonTitle,
                              #   isSummaryLesson, withResume, formatDateLine
    literatureGrouping.js     # literatureBookPathLabel, literatureChapterLabel,
                              #   groupLiteratureBooks  (export for testing — Section 4)
  components/
    common/                   # CuriosityMark, Metric, ProgressRing, InfoBlock,
                              #   InfoList, QuestionList, NoteBox, OverviewContent,
                              #   progressLabel
    auth/                     # AuthGate, AuthLoadingScreen, PasswordRecoveryScreen,
                              #   OverviewScreen
    reader/                   # ChapterReader, ExpansionButton, ExpansionSection,
                              #   GeneratedExpansion, CompactSeedDetails
                              #   (BookReader.jsx / GeneratedLessonView.jsx already live here)
    ai/                       # FloatingAiPanel (+ TUTOR_SUGGESTIONS, AI_BUBBLE_POSITION_KEY,
                              #   loadBubblePosition, clampBubblePosition), ApiKeyGuide
  views/
    FeedView.jsx              # FeedView, FeedCard
    LibraryView.jsx           # LibraryView  (uses lib/literatureGrouping.js)
    LiteratureView.jsx        # NovelsView (rename to LiteratureView)
    PhilosophyView.jsx        # PhilosophyView
    LearnView.jsx             # LearnView
    ArticleDetailView.jsx     # ArticleDetailView
    ProgressView.jsx          # ProgressView
    AccountView.jsx           # AccountView, InterestNodeList, countSelectedInterestNodes,
                              #   followLabel
```

**Order of work (each step is its own commit + green build).**
1. **Pure helpers first** (zero JSX risk): create `lib/lessonText.js`,
   `lib/literatureGrouping.js`, `app/routing.js`; move the listed functions, export
   them, and import back into `App.jsx`. Run `npm test && npm run build`.
2. **Leaf/presentational components** (`components/common/`): no app state, only
   props — `Metric`, `ProgressRing`, `InfoBlock`, `InfoList`, `QuestionList`,
   `NoteBox`, `CuriosityMark`, `OverviewContent`.
3. **Auth + reader + ai component groups.** These take props/callbacks only; move
   as-is and wire imports.
4. **Views** (`views/`): move one view per commit. Each already receives
   everything via props (`{ state, openCanonicalItem, … }`), so this is
   mechanical. Rename `NovelsView` → `LiteratureView` here.
5. **Extract state last** (the only architecturally significant step — get review
   before doing it): move the shell's state, effects, and action callbacks
   (`openCanonicalItem`, `saveReadingProgress`, `savePagePosition`, `completeLesson`,
   sync push/pull, etc.) into `app/useCuriosityState.js` returning
   `{ state, actions, syncStatus, … }`. `App.jsx` becomes: call the hook, render
   `AuthGate` or the routed view. Behavior must be identical.

**Acceptance check.** `App.jsx` is under ~300 lines; each component/helper lives in
the module above; `npm test` and `npm run build` pass; the app behaves identically
(spot-check Feed, Library book expansion, a reader, Account).

---

## 3. Code-split the bundle

**Problem.** One ~1.86 MB JS chunk (≈509 KB gzipped); Vite warns on every build.
Slow first load on phones, and the service worker caches the whole blob.

**Goal.** Smaller initial load by lazy-loading heavy, not-first-paint code.

**Steps (do after Section 2 — splitting is trivial once views are modules).**
1. In `App.jsx`, load views via `React.lazy(() => import('./views/…'))` and wrap the
   routed area in `<Suspense fallback={…}>`. Prioritize the heaviest: `AccountView`,
   `LiteratureView`, `ArticleDetailView`/`LearnView`, `FloatingAiPanel`.
2. Lazy-load the generation path: `import('./logic/lessonPipeline.js')` only when the
   user confirms generation, not at module load.
3. Re-run `npm run build` and confirm multiple chunks; the entry chunk should drop
   well below the 500 KB warning.

**Acceptance check.** Build shows several chunks; no single >500 KB warning for the
entry; app still navigates correctly with the Suspense fallback.

---

## 4. Memoize Library article work + add a grouping test

**Problem.** `LibraryView` recomputes `visibleArticles` (a filter over the whole
catalog) and the literature grouping on every render; the literature set is
thousands of chapters. The new grouping helper has no test.

**Steps.**
1. In `LibraryView`, wrap `baseArticles`/`visibleArticles`/`standardArticles`/
   `literatureBooks` in `useMemo` keyed on
   `[subjectId, topicId, subtopicId, subsubtopicId, query]` (+ `completedArticlesByKey`
   where progress is involved).
2. Add `src/lib/literatureGrouping.test.js` (vitest) covering `groupLiteratureBooks`:
   chapters collapse to one book per `hierarchyPath`; source order preserved;
   `literatureChapterLabel` strips the `"Book: "` prefix; mixed standard + literature
   input keeps standard articles out of the groups.

**Acceptance check.** New test passes; `npm test` stays green; no behavior change in
the Library.

---

## 5. Service-worker freshness

**Problem.** `public/sw.js` caches aggressively. Combined with one big bundle, a
stale service worker can strand users on an old build after a deploy.

**Steps.**
1. Audit `public/sw.js`: confirm it caches by Vite's content-hashed asset filenames
   (which change every build) and does **not** serve a stale `index.html`.
2. Adopt a cache-version constant bumped per release, deleting old caches on
   `activate`; serve `index.html` network-first (or stale-while-revalidate) so a new
   build is picked up promptly.
3. Test: deploy, confirm a hard-refresh (and ideally a normal revisit) loads the new
   bundle.

**Acceptance check.** After a deploy, a returning visitor gets the new build without
manually clearing site data.

---

## 6. Text contrast pass

**Problem.** Muted palette (e.g. `--muted: #8e877b` on the paper background) is on the
low side of WCAG AA for small text.

**Steps.**
1. Check `--muted` / `--muted-light` on `--paper` and the dark theme with a contrast
   checker; target ≥ 4.5:1 for body text, ≥ 3:1 for large text.
2. Darken the muted tokens just enough to pass, re-checking the calm look in both
   themes. Adjust tokens in `:root` (and the dark-theme block) in `src/styles.css`.

**Acceptance check.** Body/secondary text meets AA in both themes; the design still
reads calm and book-like.
