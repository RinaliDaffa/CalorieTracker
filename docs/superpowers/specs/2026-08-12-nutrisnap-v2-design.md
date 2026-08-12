# NutriSnap v2 — Design

**Date:** 2026-08-12
**Status:** Approved for planning
**Author:** Design session with rinali

---

## 1. Governing principle

> **Take a photo. It knows what you ate. It counts it.**

Two taps from launch to logged. Every feature in this document either serves that flow or stays out of it. When a feature and this principle conflict, the principle wins.

Concretely, this means:

- The app **auto-saves** a scan result. It does not ask for confirmation.
- Meal type (breakfast/lunch/dinner/snack) is **inferred from the clock**, never asked.
- Corrections are **available but never required** — one tap, after the fact.
- Setup is **skippable**. The app works on first launch with defaults.

---

## 2. Goals and non-goals

### Goals

- Log a meal from a photo in under 10 seconds and 2 taps
- Accurate calorie and macro counts for **Indonesian and Western food**
- Runs on iPhone as an installed PWA, entirely free, no backend
- All data stays on-device, exportable and restorable by the user
- An AI assistant that can answer questions about the user's own diet

### Non-goals

- Multi-user, accounts, or social features
- Apple HealthKit integration — **technically impossible from a PWA**. No auto weight import, no calorie export to Apple Health. Documented so it is not attempted.
- Real-time sync across devices (manual JSON backup/restore covers this)
- Medical or clinical advice

---

## 3. Current state

A working PWA exists at ~5,100 lines. Verified running: boots clean, IndexedDB initializes, service worker registers, dashboard renders.

**Present and working:** photo scan via Gemini vision with structured JSON output, dashboard with progress rings, AI chat with today's context, history with calendar, favorites, manual text entry, CSV export, dark/light themes, offline shell.

**File layout:**

```
index.html, manifest.json, sw.js
css/  index.css (410)  components.css (1333)  animations.css (233)
js/   app.js (727)  ui.js (886)  db.js (347)  gemini.js (285)
      utils.js (274)  charts.js (249)  camera.js (121)  config.js (8)
```

---

## 4. Defects found in the current build

These were confirmed by reading the code, not inferred. Phase 1 fixes all of them.

### D1 — Updates never reach the device (critical)

`sw.js:6` pins `CACHE_NAME = 'nutrisnap-v1'` and `sw.js:80` serves cache-first for all app assets. Once the iPhone caches a version, it serves those files indefinitely. No subsequent work would be visible on the device.

**Fix:** network-first with cache fallback for HTML/JS/CSS; cache-first retained only for icons and fonts. Cache name carries a build version. `skipWaiting` + `clients.claim` already present and correct.

### D2 — Removing `config.js` breaks the service worker (critical)

`sw.js:15` lists `./js/config.js` in `ASSETS_TO_CACHE`. `cache.addAll` is atomic — a single 404 rejects the entire install.

This already affects the current deploy: `config.js` is in `.gitignore`, so on any hosted copy the file is absent, `addAll` rejects, and offline support silently never activates.

**Fix:** delete `config.js`, remove its `ASSETS_TO_CACHE` entry, and remove its import. The API key comes from onboarding into IndexedDB — a path that already exists and works.

### D3 — XSS reachable through a food photo (critical)

`ui.js:528-535` (`formatChatContent`) applies regex markdown to raw content and returns an HTML string with no escaping. `ui.js:547` assigns it via `innerHTML`. AI-generated food item names reach `innerHTML` on the same path.

A photo containing adversarial text (menu, label, sticker) can induce the model to emit markup that executes with access to all IndexedDB health data and the stored API key.

**Fix:** escape HTML entities first, then apply the markdown transform to the escaped string. Applies to all AI-derived and user-derived strings rendered as HTML.

### D4 — No validation of AI numbers (critical)

Model output is written to storage unchecked. A hallucinated 47,000 kcal entry silently corrupts every total, average and trend downstream.

**Fix:** validate and clamp on ingest — per-item calories 0–5,000; per-macro grams 0–500; total meal calories 0–10,000; reject non-finite values. Out-of-range results prompt a retry rather than saving.

Separately, cross-check stated calories against `4P + 4C + 9F`. A mismatch beyond 30% is a **soft warning only** — the meal still saves, with a "check this" marker on the item. Fibre and alcohol make the identity inexact, so a mismatch indicates low confidence, not invalid data, and must not block the save (governing principle).

### D5 — Hardcoded model ID

`gemini.js:23` pins `gemini-2.0-flash`. Google retires model IDs on a regular cadence; when it happens the app fails with an opaque error.

**Fix:** configurable model with an ordered fallback chain. On a 404/400 model error, try the next candidate and persist the working one.

### D6 — Offline scan loses the photo

`sw.js:57-61` returns early for cross-origin requests, so the Gemini call bypasses the service worker entirely. Offline, the fetch rejects and the captured photo is discarded.

**Fix:** persist the photo and a `pending` meal record before calling the API. Retry on reconnect. The pending item is visible in the log as "analyzing".

### D7–D10 — Smaller defects

| ID | Defect | Location |
|----|--------|----------|
| D7 | Nav buttons lack accessible names; scan button label is an empty `<span>` | `index.html:80-83` |
| D8 | `user-scalable=no, maximum-scale=1.0` blocks pinch-zoom | `index.html:5` |
| D9 | Meal deletion has no undo | `app.js:658` |
| D10 | Image compression duplicated | `utils.js:173`, `camera.js:79` |

### Verified as already correct

- **EXIF/GPS is stripped.** All photo paths pass through a canvas re-encode, which discards metadata. Location never leaves the device.
- **Safe-area insets** are correctly defined (`index.css:115-118`) for notch and home indicator.

---

## 5. Architecture

### Module boundaries

Current `ui.js` (886) and `app.js` (727) will not absorb this scope. Split by responsibility, keeping calculation logic free of the DOM so it is testable without a browser.

```
js/
  app.js            Controller, routing, wiring only
  config/
    models.js       Model candidates + fallback order
  core/                          ← pure functions, no DOM, unit-tested
    nutrition.js    Macro math, portion scaling, validation/clamping
    profile.js      BMR (Mifflin-St Jeor), TDEE, macro targets
    insights.js     Moving average, adaptive TDEE, streaks, trends
    mealtime.js     Clock → meal type inference
  data/
    db.js           IndexedDB access
    backup.js       JSON export/import
    foodmemory.js   Learned corrections lookup
  services/
    gemini.js       API calls, retry, fallback chain
    camera.js       Capture + compression (single implementation)
    queue.js        Offline scan queue
  views/
    dashboard.js  scan.js  history.js  chat.js  settings.js  progress.js
  ui/
    render.js       Shared helpers, HTML escaping
    charts.js       Canvas drawing
```

**Rule:** everything under `core/` is a pure function — same input, same output, no DOM, no I/O. This is where a silent bug does the most damage (a wrong calorie target misdirects the diet for months), so it is the code that gets tests.

### Data model — IndexedDB v1 → v2

Existing stores retained: `meals`, `photos`, `goals`, `settings`, `favorites`, `chats`.

New stores:

```
weights     { id, date, weightKg, bodyFatPct?, waistCm?, note?, timestamp }
water       { date, glasses, updatedAt }              keyPath: date
recipes     { id, name, servings, totalNutrition, foodItems, createdAt }
foodMemory  { id, nameKey, displayName, servingSize, nutrition,
              correctionCount, lastUsed }             index: nameKey
queue       { id, photoBlob, contextNote, createdAt, attempts, status }
```

`settings` gains a `profile` record:

```
profile = { heightCm, weightKg, birthYear, sex, activityLevel,
            goal: 'lose'|'maintain'|'gain', rateKgPerWeek,
            locale: 'id-ID', weekStartsOn: 1 }
```

Migration runs in `onupgradeneeded`, creating new stores only. No existing record is altered, so the upgrade cannot lose data.

---

## 6. Phase 1 — Foundation

Nothing built later reaches the phone until D1 is fixed. This phase ships first and alone.

1. Service worker: network-first for code, versioned cache name (**D1**)
2. Delete `config.js`, its SW entry and its import; key comes from onboarding (**D2**)
3. HTML escaping on every AI- and user-derived string (**D3**)
4. Validation and clamping of model output on ingest (**D4**)
5. Model fallback chain, configurable in settings (**D5**)
6. Accessible names on nav buttons; restore pinch-zoom (**D7, D8**)
7. Deduplicate image compression into `services/camera.js` (**D10**)
8. Create `core/` and `config/` with the pure modules this phase needs, plus the unit-test harness

**Amended during planning:** the full `views/` split of `ui.js` and `app.js` moves to **Phase 2**. Splitting an 886-line file with no regression tests, in the same phase as four critical fixes, risks shipping a broken app while claiming the defects are fixed. Phase 2 modifies those files anyway (profile view, progress view), which is the cheaper and safer moment. The directory structure and test harness are still established here.

### API key handling

The key lives in IndexedDB, entered once via the existing onboarding screen, changeable in Settings.

**Rejected alternative:** committing `config.js` to the repo. A static site cannot hold a secret — anything shipped to the browser is readable by anyone who loads the page. Making the repo private does not help, because the deployed JavaScript is still public.

**Deferred alternative:** a Cloudflare Worker proxy holding the key server-side, adding rate limiting. More secure, but a second deployment to maintain. Revisit only if the app is ever shared.

---

## 7. Phase 2 — Make it personal

### 7.1 Profile and real calorie targets

Replace the arbitrary constants (2000 kcal / 150 g / 250 g / 65 g) with a computed target.

- **BMR** — Mifflin-St Jeor
  - male: `10w + 6.25h − 5a + 5`
  - female: `10w + 6.25h − 5a − 161`
- **TDEE** = BMR × activity factor (1.2 sedentary → 1.9 very active)
- **Target** = TDEE ± deficit/surplus from `rateKgPerWeek` (7,700 kcal ≈ 1 kg)
- **Macros** — protein 1.6–2.2 g/kg by goal; fat 25% of calories; carbs remainder

Guard rails: never target below 1,200 kcal (female) / 1,500 kcal (male); cap rate at 1 kg/week. Out-of-range input shows a warning, not a silent clamp.

**Friction rule:** onboarding is skippable. Defaults apply until a profile exists. A dismissible dashboard prompt offers setup.

### 7.2 Locale-aware analysis

The current prompt says "typical serving sizes" with no locale, so the model defaults to US portions. This degrades every scan of Indonesian food.

- Prompt states the user's region and that dishes may be Indonesian
- Names dishes in local vocabulary (nasi goreng, rendang, gado-gado, sate, soto, pecel, gudeg, martabak, ketoprak)
- Requests gram-based portions against local norms (one *porsi*, not one US "serving")
- Model asks for an explicit **confidence** per item; low confidence surfaces a "check this" hint
- Chat replies in whichever language the user writes in

UI stays English. Localizing the interface is deferred — it is work with little benefit for a single English-writing user.

### 7.3 Backup and restore

iOS Safari can evict IndexedDB during inactivity. CSV export is one-way and cannot restore.

- **JSON export** — meals, goals, profile, favorites, weights, water, recipes, food memory. Photos excluded by default (size); optional inclusion as base64.
- **JSON import** — merge (skip duplicate IDs) or replace, with an explicit confirmation on replace
- On iPhone the download goes through the share sheet, so it can be saved to **iCloud Drive** — free off-device backup with no backend
- A dismissible reminder if no backup in 7 days

### 7.4 Storage management

Photo blobs accumulate to hundreds of MB over a year against a device quota. `getStorageEstimate()` exists but nothing calls it.

- Settings shows usage against quota
- Retention policy: keep full-resolution photos N days (default 30), then downscale to thumbnail
- Manual "free up space" action
- Warn above 80% of quota

---

## 8. Phase 3 — Make it accurate

### 8.1 Learned food memory

**The highest-value feature in this document.** When a scan is corrected, the correction is remembered.

- On save, normalize the item name to a `nameKey` — lowercased, trimmed, punctuation removed, whitespace collapsed, portion words stripped (`porsi`, `serving`, `plate`, `bowl`, `piece`, `slice`, and leading quantities)
- Matching is **exact on the normalized key only**. No fuzzy or semantic matching: a wrong match silently logs the wrong food, which is worse than re-estimating. Predictability beats recall here.
- A match **suggests** the stored values with a visible "your usual" marker and a one-tap dismiss to the fresh AI estimate. It does not silently overwrite.
- Only user-*corrected* items are written to memory. Accepting an AI estimate unchanged does not create an entry, or the store fills with unverified guesses.
- Repeated corrections raise `correctionCount`; the most recent correction supplies the values
- Settings lists learned foods for review and deletion

This compounds. After a month the user's regular meals are near-exact, cost zero API calls, and resolve offline — while genuinely new food still gets full AI analysis. It addresses Indonesian-food accuracy and rate limits with one mechanism.

### 8.2 Portion adjustment and editing

- After analysis: `0.5× / 1× / 1.5× / 2×` and custom grams per item, recalculating macros proportionally
- Any logged meal is editable afterwards; edits feed food memory
- **Optional, never blocking** — the result is already saved

### 8.3 Frictionless capture

- Meal type inferred from clock: `<10:30` breakfast, `10:30–15:00` lunch, `15:00–18:00` snack, `≥18:00` dinner. Changeable in one tap.
- Result auto-saves; a toast offers undo
- Optional one-line context note ("large plate", "fried in oil") measurably improves estimates
- "Repeat yesterday's *meal*" one-tap action

### 8.4 Reliability

- Offline scan queue (**D6**) — photo persisted before the API call, retried on reconnect
- Failed analysis preserves the photo and offers retry — the capture is never lost
- 429 handled with exponential backoff and a clear message
- Undo on delete (**D9**)

---

## 9. Phase 4 — Make it useful over time

### 9.1 Weight and progress

- Log weight with optional body fat and waist
- Trend chart uses a **7-day moving average** — raw daily weight is mostly water noise and reads as random
- **Adaptive TDEE:** after ~3 weeks, compare logged intake against actual weight change to derive true maintenance calories, and offer to update the target. This measures the user rather than a population average, and is more accurate than any formula.

### 9.2 Habit and insight

- Logging streak and days-on-target
- **Weekly AI review** — a Sunday summary reading the week's data and proposing one or two concrete changes
- Water tracking (increment/decrement)
- Recipe builder — define once with servings, log by serving
- History search
- Micronutrients: sodium, saturated fat, potassium (model-estimated, flagged as estimates)

### 9.3 Reminders

iOS 16.4+ supports web push, but **only for Home-Screen-installed PWAs**. Configurable meal-time reminders, off by default, with an explicit note about the install requirement.

### 9.4 Barcode scanning (stretch)

`BarcodeDetector` where supported, falling back to a library, resolving against **OpenFoodFacts** — free, no API key, good Indonesian packaged-goods coverage.

Deliberately last: it is a second capture flow with new dependencies, and food memory already covers repeat packaged items. It is only worth building if photo scanning proves insufficient for packaged food in practice.

---

## 10. Error handling

| Condition | Behavior |
|-----------|----------|
| No API key | Onboarding prompt; manual entry still works |
| Invalid key | Clear message pointing to Settings |
| Rate limited (429) | Exponential backoff, "try again in a moment", photo preserved |
| Model ID retired | Automatic fallback to next candidate, persist the working one |
| Offline during scan | Queue with a `pending` entry, retry on reconnect |
| Malformed model JSON | One retry, then offer manual entry with the photo attached |
| Values out of range | Reject, show what looked wrong, offer retry or manual entry |
| Storage quota exceeded | Warn, offer photo cleanup, keep meal data (photos are the bulk) |
| DB upgrade failure | Fail safe — do not destroy existing data; surface an export option |

---

## 11. Testing

Unit tests cover everything under `core/`:

- `nutrition.js` — portion scaling, macro sums, validation boundaries, `4P+4C+9F` cross-check
- `profile.js` — BMR/TDEE against published reference values, guard rails, edge inputs
- `insights.js` — moving average, adaptive TDEE, streak counting across gaps
- `mealtime.js` — meal-type boundaries including midnight

Manual verification on a real iPhone, since these cannot be tested on desktop: Home Screen install, camera capture with a rear camera, photo orientation after canvas re-encode (a known iOS pitfall), safe-area rendering, storage persistence across relaunch, and that a new deploy actually reaches the installed app (the D1 regression check).

---

## 12. Deployment

**Cloudflare Pages or GitHub Pages** — static, free, HTTPS, which the PWA requires.

With `config.js` removed, no secret exists in the repo, so it may be public.

**On iPhone:** open in **Safari** (not Chrome — only Safari can install to the Home Screen), Share → Add to Home Screen. Launching from the Home Screen icon gives fullscreen, more durable storage, and is a prerequisite for push notifications.

---

## 13. Decisions taken

| Decision | Rationale |
|----------|-----------|
| UI stays English; prompting is locale-aware | Accuracy is a prompt problem, not a UI problem. Translation is effort without benefit here. |
| Barcode scanning deferred to last | Second capture flow, new dependencies. Food memory covers repeat items. |
| Auto-save scan results | The governing principle. Undo is cheaper than a confirmation step on every meal. |
| Meal type inferred, not asked | Removes one decision from every single log. |
| No backend | Free, private, no maintenance. Cost: manual backup, no cross-device sync. |
| Key in IndexedDB, not in the repo | A static site cannot hold a secret. |
| Photos excluded from JSON backup by default | Size. Nutrition data is what matters; photos are a memory aid. |

## 14. Known limitations

- **Apple Health cannot be integrated.** PWAs have no HealthKit access, in either direction.
- **Free-tier data use.** Google may use free-tier API inputs to improve their products. Food photos and diet questions are that input. Accepted knowingly in exchange for zero cost.
- **Rate limits.** Roughly 10 requests/minute and 500/day on the free tier — ample for personal use (~20/day), and food memory reduces it further over time.
- **Portion estimates from photographs are inherently approximate.** Correction plus food memory is the mitigation, not model accuracy alone.
- **No cross-device sync.** Manual JSON backup/restore only.
