# Handoff: finish SP0 (Tasks 13–20) — for Antigravity / Gemini 3.8 Flash

**Written:** 2026-10-06 by Claude (the controller for Tasks 1–12b). **Branch:** `sp0-rebuild`. **Owner:** RinaliDaffa.

This file is the single source of truth for the work left in SP0. Where it disagrees with the plan, **this file wins**. Read the whole file once before touching code, then work task by task.

---

## 0. Read these first, in this order

1. `AGENTS.md` (repo root) — the standing rules. They apply to every command and every commit.
2. This file, completely.
3. `docs/superpowers/specs/2026-09-28-sp0-rebuild-design.md` — what SP0 must achieve (short).
4. `docs/superpowers/plans/2026-09-28-sp0-rebuild.md` — the plan. It contains the **exact code** for every remaining task. You transcribe it, applying the amendments in §4 of this file.
5. Only when a task needs it: `docs/superpowers/specs/2026-09-28-nutrisnap-v3-master-design.md` (the whole-product design).

Do **not** edit the specs or the plan. Record what you did in the ledger (§6), not in those files.

---

## 1. What you are doing, and what you are NOT doing

**You are doing:** transcribing the plan's Tasks 13–20 into working, tested, committed code, one task at a time, with every gate in §3 green after each task.

**You are NOT doing — hard boundaries:**

| Not yours | Why | What to do instead |
|---|---|---|
| Visual design, styling, layout, copy tone, animation, icons, colors, fonts, spacing, new components | The owner has reserved the UI/UX design pass for Claude after SP0 is functionally complete. | Use the plan's JSX and Tailwind classes **exactly as written**. If something looks ugly but works, leave it and note it under "UI notes for Claude" in your task report. |
| Task 21 (push, Cloudflare, real devices, merge, delete `legacy/`) | Outward-facing, and it comes **after** the UI/UX pass. | Stop after Task 20 (§7). |
| SP1–SP5 (anything in the master spec beyond SP0) | No plan exists for them yet; Claude writes each plan before it is handed off. | Do not start them. Do not create `apps/api`, `packages/fooddb`, etc. |
| Fixing the "deferred minors" in the ledger | They are batched for the final review. Fixing them now mixes unrelated changes into task commits. | Only fix what §4 tells you to fix. Add new minors you notice to your report. |
| Refactoring, renaming, upgrading dependencies, changing configs not named in the task | Keeps diffs reviewable and avoids breaking finished tasks. | If you believe a change is required, stop and write it in the report as a question. |
| Pushing, opening PRs, creating accounts, calling any external service | Needs the owner's explicit go-ahead. | Never run `git push`, `gh`, `wrangler`, or deploy commands. |

---

## 2. Where things stand (verified by Claude on 2026-10-06)

### Committed on `sp0-rebuild` (do not change these unless §4 says so)

| Task | What | Last commit |
|---|---|---|
| 1–3 | Monorepo, `packages/core` (types, nutrition, meal time, dates, targets, progress, UUIDv7) | 68adaeb |
| 4–5 | `packages/ai` (model fallback chain, quota handling, Gemini client, prompts, analysis) | 0f033fd |
| 6 | `packages/platform` (camera, image, files, storage; test camera) | eea5608 |
| 7–8 | `apps/web` scaffold, shell, router, e2e harness; Indonesian + English messages | fbe6cd7 |
| 9–10 | Dexie data layer; one-time legacy import | 416657f |
| 11 | Gemini wiring, onboarding, add-key prompt | 00dcf0f |
| 12 | Dashboard, calorie ring, macro cards, meal list, meal detail sheet | b799891 |
| 12b | Initial-JS budget script; legacy import and `sonner` moved out of the first-screen bundle (143.2 KB gzip of 150) | 2163eb4 |
| — | Lazy Toaster fallback + typecheck fix | 9c063f4 |
| — | Dashboard e2e: 15 s on first lazy-sheet open | 982a43b |
| — | This handoff, `AGENTS.md`, `GEMINI.md` | the commit after 982a43b |

### Task 13 — written, NOT committed, NOT reviewed

A previous agent wrote Task 13 and stopped before verifying or committing. The files are in the working tree:

- `apps/web/src/features/scan/save.ts` — done, includes the photo fallback (ruling R18).
- `apps/web/src/features/scan/save.test.ts` — has 1 formatting error (run `pnpm format`).
- `apps/web/src/features/common/MealTypePicker.tsx`
- `apps/web/src/features/result/ResultView.tsx`
- `apps/web/src/features/scan/ScanScreen.tsx` — replaced; includes the benign camera-cancel check and the "saved without photo" toast.
- `apps/web/tests/e2e/scan.spec.ts` — 8 tests.
- `apps/web/messages/en.json`, `id.json` — added `saved_no_photo`.

Claude's checks on that tree:
- unit tests 32/32 pass;
- typecheck passes;
- lint fails only on the formatting above;
- e2e: 129 passed, 2 skipped (the accepted WebKit photo skips), and all 8 scan tests pass on all 6 projects. The single failure was a load-related timeout in the Task 12 dashboard test. It passed 20/20 alone, and Claude fixed it in commit `982a43b` (15 s on the first lazy-sheet open). The full log is `.superpowers/sdd/2026-09-28-sp0-rebuild/task-13-e2e-controller.log`.

So Task 13 needs only: format, the full gate, a plan comparison, and the commit.

Ignore `docs/superpowers/specs/2026-09-28-nutrisnap-v3-master-design.md` showing as modified. It is a one-word typo the owner is handling. Never stage or commit it (`git add` only the paths each task names).

---

## 3. The gate — run after EVERY task, before committing

From the repo root, in this order. Every command must exit 0.

```
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @nutrisnap/web build
pnpm --filter @nutrisnap/web budget
pnpm e2e
```

- `budget` must print a total **≤ 150 KB**. Write the number in your report. If it goes over, you have pulled something into the first screen. Find the static import and make it lazy, following the existing `LazyMealDetailSheet.tsx` pattern. **Never** raise `LIMIT_BYTES`, and never lazy-load the Dashboard.
- `pnpm e2e` runs 6 Playwright projects (Chromium, WebKit, Firefox × phone, desktop) and takes several minutes. Run it in the foreground and wait. Browsers are already installed. Do not reinstall them unless a run says a browser is missing, and then install one browser at a time (`pnpm --filter @nutrisnap/web exec playwright install chromium`).
- Known, accepted skips: photo tests on WebKit, because ephemeral WebKit IndexedDB rejects Blobs. Do not add new skips without a written reason in the report.
- A test that fails, then passes on rerun, is **not** a pass. Report it as flaky, with the test name and project.
- After **two** honest fix attempts on the same failure, stop and report (§7). Do not weaken a test to make it pass: no deleted assertions, no extended skips, no timeouts above 15 s.

---

## 4. Task-by-task instructions and amendments

The plan's code is the default. These amendments override it.

### Amendment A — applies to Tasks 13–18: toasts

Every plan snippet that says `import { toast } from 'sonner';` must instead say:

```ts
import { toast } from '@/lib/toast';
```

`@/lib/toast` supports `toast(msg, opts)`, `toast.success`, `toast.error` and `toast.info`, with the same options (`action`, `duration`, …). Importing `sonner` anywhere except `src/lib/toast.ts` and `src/shell/SonnerToaster.tsx` is a bug: it pulls about 11 KB back into the first screen.

### Amendment B — applies to every task: commits

The plan's commit blocks end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Replace that line** with:

```
Assisted-by: Gemini 3.8 Flash (Antigravity)
```

(Ruling R5: the trailer names the model that actually wrote the code.) Keep the plan's subject line. Use the commit form in `AGENTS.md` §Commits.

### Task 13 — Scan, auto-save and the result view (finish it)

The code is written (§2). Do this:

1. Read the plan's Task 13 (search the plan for `### Task 13:`) and compare each file in the working tree against it. The differences you should **expect and keep**:
   - `save.ts`: the R18 try/catch photo fallback;
   - `ScanScreen.tsx`: the cancelled-camera check (`'Camera start was cancelled'` / `AbortError` is benign: no toast, no file-picker fallback) and the `photoLost` → `m.saved_no_photo()` toast;
   - `@/lib/toast` imports (Amendment A);
   - `save.test.ts`: an extra test for the photo fallback.

   Any **other** difference from the plan: make the file match the plan, unless the difference fixes a failing gate. In that case keep it and explain it in the report.
2. Run `pnpm format`, then the full gate (§3).
3. These two scan tests come from the plan's Review Focus and **must** pass on all 6 projects (WebKit may skip only the photo-blob part): `unreadable gallery file` and `double tap saves one meal`.
4. Commit only the Task 13 files listed in §2, using the plan's Task 13 commit subject.

### Task 14 — Manual add and favorites

Transcribe the plan's Steps 1, 2 and 3 with Amendment A, plus these changes:

**14-1. Lazy sheets (required; the budget breaks otherwise).** Radix Dialog is about 14 KB gzip and must not enter the first screen. **Do not** add the plan's Step 2b static imports (`import { FavoritesSheet } …`, `import { ManualAddSheet } …`) to `Dashboard.tsx`. Create `apps/web/src/features/dashboard/LazySheets.tsx`:

```tsx
import { lazy, Suspense, useState } from 'react';

// Loaded on first open so the dialog stack stays out of the initial route.
const ManualAddSheet = lazy(() =>
  import('./ManualAddSheet').then((mod) => ({ default: mod.ManualAddSheet })),
);
const FavoritesSheet = lazy(() =>
  import('./FavoritesSheet').then((mod) => ({ default: mod.FavoritesSheet })),
);

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** True from the first time `open` is true, so close animations and focus return still run. */
function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened;
}

export function LazyManualAddSheet(props: SheetProps) {
  if (!useOpenedOnce(props.open)) return null;
  return (
    <Suspense fallback={null}>
      <ManualAddSheet {...props} />
    </Suspense>
  );
}

export function LazyFavoritesSheet(props: SheetProps) {
  if (!useOpenedOnce(props.open)) return null;
  return (
    <Suspense fallback={null}>
      <FavoritesSheet {...props} />
    </Suspense>
  );
}
```

Then, in Step 2b:
- import `{ LazyFavoritesSheet, LazyManualAddSheet } from './LazySheets'`;
- render `<LazyManualAddSheet open={manualOpen} onOpenChange={setManualOpen} />` and `<LazyFavoritesSheet open={favoritesOpen} onOpenChange={setFavoritesOpen} />` next to the existing `<LazyMealDetailSheet …/>`.

The state and buttons from Step 2b are unchanged.

**14-2. Focus return (required, accessibility).** These sheets are opened by plain buttons, not `SheetTrigger`s, so Radix drops focus to `<body>` on close (ruling R17). In **both** `ManualAddSheet.tsx` and `FavoritesSheet.tsx`, copy the focus handling from `apps/web/src/features/common/MealDetailSheet.tsx`:

- `const opener = useRef<HTMLElement | null>(null);` (import `useRef` from `react`);
- on `<SheetContent>`, add exactly the `onOpenAutoFocus` and `onCloseAutoFocus` props from `MealDetailSheet.tsx` lines 48–59, without the `returnFocusTo` part. The fallback is `document.getElementById('main')`.

**14-3.** Run the gate. Check that the `budget` total did not grow by more than about 1 KB compared with Task 13. If it grew more, a sheet is still statically imported.

### Task 15 — History

Transcribe with Amendment A, plus one change. The plan imports `MealDetailSheet` directly (plan line ~7834) and renders `<MealDetailSheet …/>` (~7932). Use the shared lazy wrapper instead:

```tsx
import { LazyMealDetailSheet } from '@/features/common/LazyMealDetailSheet';
// …
<LazyMealDetailSheet mealId={openMeal} onClose={() => setOpenMeal(null)} />
```

(Ruling R17: the wrapper exists so History reuses it instead of copying it.)

### Task 16 — Chat

Transcribe with Amendment A. Hard rule: chat text (AI or user) is rendered as React text through the plan's `ChatMarkdown` / `markdown.ts` parser. `dangerouslySetInnerHTML` is forbidden: no `innerHTML`, no markdown library that emits HTML strings.

### Task 17 — Settings

Transcribe with Amendment A. Notes:
- `DataSection.tsx` imports `importLegacyDump` / `parseLegacyJson` statically. That is fine **only because** Settings is a lazy route. Do not import `@/legacy/import` or `@/legacy/json` from anything the Dashboard, shell, `router.tsx` or `main.tsx` imports. The budget check will catch it.
- The API key must never be shown in full, logged, put in a URL, or included in the CSV or JSON export. Check the export code against this before committing.
- Do not change `src/legacy/startup.ts`, `open.ts`, `read.ts`, `map.ts` or `import.ts`. The legacy database `nutrisnap` is read-only, forever.

### Task 18 — PWA

Transcribe with Amendment A, plus two changes.

**18-1. Lazy update prompt (required for the budget).** `virtual:pwa-register/react` pulls `workbox-window` into whatever imports it. Keep the plan's `UpdatePrompt.tsx` as written (with Amendment A), but **do not** import it statically into `RootLayout.tsx`. Create `apps/web/src/shell/LazyUpdatePrompt.tsx`:

```tsx
import { type ComponentType, lazy, Suspense } from 'react';

// Registers the service worker after first paint; a failed chunk only loses the update prompt.
const UpdatePrompt = lazy<ComponentType>(() =>
  import('./UpdatePrompt')
    .then((mod) => ({ default: mod.UpdatePrompt }))
    .catch(() => ({ default: () => null })),
);

export function LazyUpdatePrompt() {
  return (
    <Suspense fallback={null}>
      <UpdatePrompt />
    </Suspense>
  );
}
```

In `RootLayout.tsx`, render `<LazyUpdatePrompt />` directly after `<Toaster />`, where the plan puts `<UpdatePrompt />`.

**18-2. Icons.** The generator (`@vite-pwa/assets-generator`) needs `sharp`. If pnpm reports ignored build scripts, follow the plan's note (`onlyBuiltDependencies`). The source image `apps/web/public/icon-source.png` already exists; do not replace or redesign it.

The e2e config blocks service workers globally (`serviceWorkers: 'block'`), and the new `pwa.spec.ts` opts in with `test.use({ serviceWorkers: 'allow' })`. Keep it that way.

### Task 19 — CI quality gates

- **Skip Step 1.** `apps/web/scripts/check-bundle.mjs` and the `budget` script already exist (Task 12b), byte-identical to the plan. Do not recreate them.
- Step 2: add `@lhci/cli` and `lighthouserc.json`, and add only the `"lhci": "lhci autorun"` script.
- Step 3: create `.github/workflows/ci.yml` exactly as written. Committing the file is fine; it runs only when the owner pushes, which is not your job.
- Step 4: run the whole gate locally, including `pnpm legacy:test` and `pnpm --filter @nutrisnap/web lhci`.
  - Lighthouse needs Chrome; Playwright's Chromium works if `CHROME_PATH` is set. If lhci cannot find Chrome, report it rather than removing the step.
  - If performance < 0.90 or accessibility < 0.95, **stop and report** the scores and the top failing audits. Do not tune the UI for it; that is part of the Claude UI/UX pass.

### Task 20 — "Export JSON" in the legacy app

It **runs** (see the plan's Execution notes: the owner's data origin is unknown). Transcribe Steps 1–3 and 5 exactly. These are plain JavaScript files in `legacy/js/`; keep their existing style.
- **Skip Step 4** (deploying the legacy app). It is outward-facing.
- `pnpm legacy:test` must pass with the same count as before plus any tests the task adds.

---

## 5. Things that will trip you up (all hit by earlier tasks)

1. **Paraglide:** after adding message keys to `messages/en.json` **and** `messages/id.json` (always both, same keys, same `{params}`), run `pnpm typecheck`, which recompiles `src/paraglide`. Never edit `src/paraglide/` by hand.
2. **Every user-visible string** comes from `m.some_key()`. No hard-coded English in JSX, `aria-label`, `title` or `placeholder`.
3. **TypeScript 7** has no `baseUrl`; the `@/` alias comes from `paths`. Do not add `baseUrl`.
4. **Biome:** run `pnpm format` before `pnpm lint`. `noArrayIndexKey` may be suppressed only with `// biome-ignore lint/suspicious/noArrayIndexKey: <reason>` where items have no stable id.
5. **Cold boot under 8 e2e workers is slow.** Existing tests use up to 15 s on specific `expect(...)` calls. Use the helpers in `tests/e2e/helpers.ts` (`completeOnboarding`), `ai.ts` (`mockGemini`, fixtures) and `data.ts` (seeders); do not write new boot helpers.
6. **React Compiler** is on. Don't add `useMemo`/`useCallback` the plan doesn't have, and don't mutate props or state.
7. **Soft deletes:** delete = set `deletedAt`; undo = clear it. Never call `.delete()` on meal, favorite or chat tables from UI code.
8. **WebKit and Blobs:** photo writes can fail on WebKit. `saveAnalysis` already falls back to saving without the photo; keep using it for AI results instead of calling `addMeal` with a photo directly.
9. **Windows line endings:** git prints "LF will be replaced by CRLF" warnings. They are harmless; ignore them.

---

## 6. Reporting — after each task

Write `.superpowers/sdd/2026-09-28-sp0-rebuild/task-<N>-report.md` (that folder is git-ignored) with:

```
# Task <N> report
Status: DONE | DONE_WITH_CONCERNS | BLOCKED
Commit(s): <sha> <subject>
Gate: format ok | lint ok | typecheck ok | unit <passed>/<total> | build ok | budget <KB> KB | e2e <passed> passed, <skipped> skipped, <failed> failed
Amendments applied: <list the §4 items you applied>
Deviations from the plan: <file:line — what and why> (or "none")
Flaky tests seen: <name + project> (or "none")
New minor issues noticed (not fixed): <list> (or "none")
UI notes for Claude: <anything that works but looks or feels wrong> (or "none")
Questions for the owner/Claude: <list> (or "none")
```

Then append one line to `.superpowers/sdd/2026-09-28-sp0-rebuild/progress.md`, **just above** `<!-- ledger end -->`:

```
Task <N>: Antigravity (Gemini 3.8 Flash) <STATUS> <sha> (budget <KB> KB; e2e <passed>/<skipped> skipped) — report task-<N>-report.md
```

---

## 7. Stop conditions — stop, report, and wait for the owner

Stop immediately (finish the report with Status: BLOCKED) when any of these happen:

1. A gate fails after two honest fix attempts.
2. The budget is over 150 KB and you cannot find a static import to make lazy.
3. Lighthouse fails its thresholds (Task 19).
4. The plan's code does not compile against the current code, and the fix is more than a renamed import or a missing type annotation.
5. A step needs a push, PR, deploy, account, external URL, or anything outside this repo.
6. You are about to modify a committed file that the current task does not list, other than a lazy wrapper §4 tells you to create.
7. You find what looks like a real bug in Tasks 1–12b. Report it with a failing test or exact repro; do not fix it in a task commit.

**After Task 20 is committed: stop.** Write a final summary at `.superpowers/sdd/2026-09-28-sp0-rebuild/antigravity-summary.md` with the list of commits, the final gate numbers, and every concern, minor and UI note from your reports. The next steps belong to Claude and the owner:

1. Claude reviews Tasks 13–20 and runs the final whole-branch review (including the deferred minors in `progress.md`).
2. Claude does the UI/UX design pass.
3. With the owner's go-ahead: Task 21 (push to `https://github.com/RinaliDaffa/CalorieTracker`, Cloudflare Pages, real-device checks, import the owner's data, merge, retire `legacy/`).
4. Claude writes the SP1 spec and plan (go public: shared AI quota, accuracy benchmark), then SP2–SP5 in turn, each handed off the same way.

---

## 8. Definition of done for this handoff

- [ ] Tasks 13, 14, 15, 16, 17, 18, 19, 20 each committed separately on `sp0-rebuild`, with the plan's subject line and the Amendment B trailer.
- [ ] After the last commit: all gate commands (§3, plus `pnpm legacy:test` and `lhci`) exit 0; budget ≤ 150 KB.
- [ ] No file imports `sonner` except `src/lib/toast.ts` and `src/shell/SonnerToaster.tsx`.
- [ ] No `dangerouslySetInnerHTML` / `innerHTML` anywhere in `apps/web/src`.
- [ ] No API key value, `AIza…` string, or key in a URL anywhere in the repo or exports.
- [ ] A report per task, and `antigravity-summary.md`, exist.
- [ ] Nothing pushed; no UI redesign; the specs and plan unchanged.
