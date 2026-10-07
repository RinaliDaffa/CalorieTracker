# SP0 — Rebuild on the New Stack, at Parity

**Date:** 2026-09-28
**Status:** Draft for review
**Parent:** `2026-09-28-nutrisnap-v3-master-design.md` (principles, architecture, data model)

---

## 1. Goal

Replace the plain-JavaScript app with the v3 foundation — monorepo, React PWA, v3 data model, Indonesian/English UI, CI quality gates — while doing **everything today's app does**, so every later sub-project builds on it instead of on the legacy code.

SP0 ships an app that a current user can switch to without losing data or capability, deployed to a `*.pages.dev` URL.

### Why this is its own sub-project

The master scope roughly quintuples the app. Building new features on 3,300 lines of string-templated DOM code would repeat the class of bug found in Phase 1 (D3, XSS through `innerHTML`). A parity rebuild is large enough to ship and verify alone; mixing it with the public API (SP1) would make regressions hard to attribute.

---

## 2. Scope

### In

1. Monorepo: pnpm workspaces, Turborepo, shared TypeScript config, Biome.
2. `packages/core`, `packages/ai`, `packages/platform` (web + test adapters), `apps/web`.
3. Dexie database `nutrisnap-v3` with the SP0 stores (§5).
4. Legacy data import (§6).
5. Indonesian and English UI (Paraglide).
6. Every capability in the parity checklist (§4).
7. Two principle-driven behaviour changes that are nearly free on the new data model:
   - **auto-save** of analysis results with an undo toast, replacing the explicit Save button;
   - **undo on delete** (legacy defect D9), via tombstones.
8. CI with blocking quality gates; preview deploys; production deploy to Cloudflare Pages.

### Out (later sub-projects)

`apps/api`, shared quota, Turnstile, benchmark (SP1). Food reference list, household units, capture routing, barcode, offline queue, food memory, recipes, backup/restore (SP2). Profile-computed targets, weight, Ramadan mode (SP3). Coach features (SP4). Sync, Capacitor (SP5).

---

## 3. Package responsibilities

### `packages/core` (pure TypeScript, no DOM, no I/O)

Ported from `js/core/` and pure parts of `js/utils.js` / `js/app.js`:

| Module | Contents | Origin |
|---|---|---|
| `nutrition.ts` | `validateAnalysis`, clamps, 4P+4C+9F cross-check, dropped-item warnings, `sumNutrition`, proportional count scaling | `js/core/nutrition.js`, `js/utils.js` |
| `mealtime.ts` | clock → meal type, keeping today's boundaries: 05–10 breakfast, 10–15 lunch, 15–21 dinner, otherwise snack | `js/app.js` `autoSelectMealType` |
| `dates.ts` | local-date keys, week and month grids | `js/utils.js` |
| `targets.ts` | default targets (2,000 kcal / 150 P / 250 C / 65 F / 30 fibre / 50 sugar) and "target effective on date" lookup over a target history | `js/utils.js`, new |
| `progress.ts` | progress percentages and status bands | `js/utils.js` |
| `ids.ts` | UUIDv7 from an injected clock and random source; `uuidv7At(ms)` for legacy mapping | new |

Existing tests (`nutrition`, `models`) are ported to Vitest unchanged in intent. `js/core/escape.js` is **not** ported: React escapes text by default, and the chat renderer (§4) produces React elements, never HTML strings. Its tests are replaced by renderer tests asserting that model output containing markup renders as text.

### `packages/ai`

- Prompt builders and the Gemini response schema for: photo analysis, text analysis, chat (with today's context), key validation — ported from `js/gemini.js` with the same output shape (per-item totals, `servingSize` text, health score, tip, description). The runtime guard on model output stays `core/validateAnalysis` (already tested and stricter than a shape check); Zod arrives with the API contracts in SP1.
- Model candidate list and fallback logic, ported from `js/config/models.js`. Two changes:
  - Candidate IDs are re-verified against Google's current model list at implementation time.
  - A per-model **daily quota** 429 also advances to the next candidate, because free limits are per model; a per-minute 429 does not (it retries after the stated delay).
- A `Transport` interface (`fetch`-shaped), so the same code runs in the browser now and in the Worker in SP1.
- In SP0 the only mode is **own key, called directly from the device** — identical to today.

### `packages/platform`

Interfaces plus web adapters for the capabilities SP0 needs: `Camera` (start, stop, capture), `ImageProcessor` (single compression implementation, orientation via `createImageBitmap`, EXIF stripped by canvas re-encode), `FileIO` (pick image, save CSV), `StoragePersistence` (`persist()`, `estimate()`). A **test adapter** returns fixture photos so Playwright can exercise capture on every engine, including WebKit, which has no fake-camera support.

### `apps/web`

Screens and composition only. Stack per master §9.1. Layout: bottom navigation on phones; sidebar at ≥ 1024 px. Themes: dark (default, today's palette), light, system.

---

## 4. Parity checklist

Every row is an automated Playwright test unless marked *manual*.

| Area | Capability |
|---|---|
| Onboarding | Enter Gemini key, validate it, persist it; **"Nanti saja" skip** — the app opens, AI actions show an inline "add key" prompt |
| Dashboard | Greeting by time of day; calorie ring; macro bars (protein, carbs, fat, fibre, sugar) against the current target; today's meals list; open meal detail |
| Dashboard | Manual add by text description (AI); add from favorites |
| Scan | Live camera with capture; pick from gallery; retake; analyze; "describe instead" text analysis |
| Result | Items with name, serving text, kcal and macros; totals; health score; tip; analysis warnings; meal type pre-selected from the clock, changeable in one tap |
| Result | **Auto-saved** on arrival; toast "Tersimpan · Batal"; add to favorites |
| Result | On analysis failure, the captured photo stays on screen with Retry and Describe-instead (no queue until SP2) |
| History | Month calendar with navigation and logged-day markers; selected day's meals; weekly calorie chart |
| Meal detail | Photo, items, nutrition; delete with toast "Dihapus · Batal" |
| Chat | Send and receive with today's context; quick prompts; safe markdown (bold, italics, lists) rendered as React elements; clear history |
| Settings | Language; theme; change and validate key; active model shown; edit targets (writes a `targets` record, reason `manual`); CSV export; clear chat; storage used vs quota |
| App shell | Installable; offline shell loads; "Versi baru tersedia" update prompt, applied automatically on next launch |
| Legacy | Import on first launch when a legacy database exists (§6) |
| Real device (*manual*) | iPhone Safari install and relaunch; rear camera; photo orientation; data persists across relaunch; an update reaches the installed app; budget Android phone |

---

## 5. Data (SP0 subset of master §10.1)

Stores created in SP0: `meals`, `photos`, `favorites`, `chats`, `targets`, `settings`, `meta`. Theme and UI language live in `localStorage`, because both must apply before first paint (IndexedDB is asynchronous); `profile` arrives in SP3.

- All records: UUIDv7 `id`, `updatedAt`, `deletedAt?`.
- SP0 meal items use `portion = {unit: 'serving', count: 1}`, `servingText` from the model, `nutrition` as returned (validated), `source: 'ai'`, no `per100g`.
- Deletes and auto-save undo set `deletedAt`; list queries exclude tombstones; tombstones older than 30 days are purged on launch.
- The current target is the latest `targets` record by `effectiveFrom`; with none, `core/targets` defaults apply (reason `default`).

---

## 6. Legacy import

### Same origin (automatic)

IndexedDB is scoped to the site's origin. When SP0 is served from the origin the legacy app used, on first launch:

1. If `meta.legacyImportedAt` is set, stop.
2. Open legacy database `nutrisnap` (version 1) read-only. If absent, stop.
3. Map, in one Dexie transaction:

| Legacy | v3 |
|---|---|
| `meals` (id base36-time + random, `timestamp`) | `meals` with `id = uuidv7At(timestamp)`; `date`, `mealType`, `notes → note`, `healthScore`, `aiTips → tip`; `source: 'legacy'`, `status: 'done'` |
| `meal.foodItems[]` (`name`, `servingSize`, `calories`, macros) | `FoodItem` with `servingText = servingSize`, `nutrition` from the legacy numbers, `source: 'legacy'`, `portion = {unit: 'serving', count: 1}` |
| `photos` (keyed by `mealId`) | `photos` with a new id, linked through `meal.photoId`; `thumb` generated during import |
| `goals` (`id: 'current'`) | one `targets` record, `effectiveFrom` = earliest legacy meal date (or today), reason `manual` unless equal to the defaults (`default`) |
| `settings` (`apiKey`, `activeModel`, `theme`) | `settings` (`apiKey`, `activeModel`, `onboarded: true` when a key exists) and the `localStorage` theme |
| `favorites`, `chats` | same stores, new UUIDv7 ids |

4. Set `meta.legacyImportedAt`.

The legacy database is **never modified or deleted** in SP0. A failed transaction leaves no partial v3 data and shows "Impor gagal — data lama tetap aman" with a button that downloads a JSON dump of the legacy database.

### Different origin (manual)

If SP0 is deployed at a different origin from wherever the owner's legacy data lives, the legacy app gains one small addition — **Settings → "Ekspor JSON"** — and SP0 gains **Settings → "Impor dari NutriSnap lama"**, which runs the same mapping on the file. Which path applies is confirmed with the owner at the start of implementation (the repo has no deploy remote today).

---

## 7. Repository transition

- The legacy app moves to `legacy/` and stays runnable (`pnpm legacy:serve`) until the SP0 parity checklist passes on production.
- The final SP0 task deletes `legacy/`, except the JSON-export addition if the different-origin path was used (kept until the owner confirms the import).
- The Phase 1 plan and v2 spec remain as history.

---

## 8. Quality gates (blocking in CI)

- Typecheck, Biome, Vitest (all packages).
- Playwright: Chromium, WebKit, Firefox × phone (390×844) and desktop (1280×800); AI responses from recorded fixtures; axe with zero serious violations.
- Initial-route JavaScript ≤ 150 KB gzipped (a budget script sums every script `index.html` loads eagerly).
- Lighthouse CI (mobile): performance ≥ 90, accessibility ≥ 95.
- Installability (Lighthouse no longer has a PWA category): an e2e test checks the manifest fields, icons, and service-worker registration, and that the shell loads offline.
- Secret scan: no API key patterns in the repository.

---

## 9. External setup (owner actions)

These publish or create accounts, so each needs the owner's go-ahead at implementation time:

1. Create a GitHub repository and push (CI runs on GitHub Actions' free tier).
2. Create a Cloudflare Pages project connected to the repository (free `*.pages.dev` domain).

---

## 10. Exit criteria

1. Every parity checklist row passes (automated rows in CI on all three engines; manual rows signed off on a real iPhone and a budget Android phone).
2. Legacy import verified against a fixture legacy database containing meals with and without photos, favorites, chats, custom goals and a stored key.
3. All quality gates green on `main`.
4. Production deployed to `*.pages.dev`; the owner's own data imported and checked.
