# NutriSnap v3 — Product & Architecture (Master Design)

**Date:** 2026-09-28
**Status:** Draft for review
**Supersedes:** `2026-08-12-nutrisnap-v2-design.md` (single-user, single-iPhone scope)
**Sub-project specs:** SP0 → `2026-09-28-sp0-rebuild-design.md`. SP1–SP5 each get their own spec before planning.

---

## 1. Intent

### What the owner asked for

- A calorie tracker that is **fully usable on any device** — iOS, Android, desktop.
- **Fully free** — for users and to operate.
- **Useful for anyone**, not only the owner, and **impressive** as a finished product.
- Above everything else: **the prediction and the information must be correct, believable, and easy to use.** Users do not want to read about data or accuracy; they want to use it straight away, and the results must make sense without raising questions.

### Assumptions (confirmed during design)

- Audience is the general public, Indonesia first, with zero setup: open the link and it works.
- "Free" means no paid servers, no paid APIs, no paid store accounts. Optional paid upgrades (a $25 Play listing) are allowed later only if the product earns them.
- The owner delegates technical choices to the design; the owner chose **React** over the Svelte recommendation.

### Success criteria

1. A first-time visitor logs a meal from a photo within ~10 seconds of opening the link, with no sign-up and no API key.
2. The number shown for a meal looks right to an ordinary user, and the same meal photographed twice gives the same answer (measured — §7.8).
3. The app remains fully usable with zero AI quota left (barcode, search, memory, recipes, manual).
4. Runs installed on iPhone (Safari Home Screen), Android (Chrome WebAPK), and desktop — from one codebase, at $0.
5. Publishes its own measured accuracy.

---

## 2. Governing principles

Ordered. When two conflict, the higher one wins.

1. **Correct, believable, easy to fix.** Every number is grounded, plausible, consistent across repeats, and correctable in one tap.
2. **Answer first. Nothing to read. Nothing asks.** The app guesses sensibly and shows a plain result. Accuracy machinery runs invisibly; detail exists only behind a tap.
3. **Works fully without AI; AI makes it faster.** AI quota is the scarcest resource in the system. Every feature is either *free-path* (on-device, zero quota) or *quota-path*, and free paths are always offered.
4. **Free on every device.** The web is the universal free channel. Nothing requires an app store.
5. **Private by default.** Meal data lives on the device. The server stores no photos, no meals, no profile, no account.
6. **Two taps from launch to logged.** Auto-save; meal type from the clock; corrections after the fact.

---

## 3. Positioning

> **Snap-to-log calorie tracking that actually knows Indonesian food. Free, no sign-up, private, works offline.**

| Competitor | Gap NutriSnap fills |
|---|---|
| MyFitnessPal | Barcode scanning moved to Premium; weak Indonesian food coverage |
| Cal AI and similar photo trackers | Subscription-only; opaque accuracy |
| MacroFactor | Adaptive TDEE is its headline feature — and it is a paid subscription |
| FatSecret | Free, decent Indonesian database, no photo AI |

**Difference factors** (each is specified below): household-unit portions (§7.2), one camera for plate/label/menu/barcode/delivery screenshot (§7.3), invisible accuracy with consistency guarantees (§7.5–7.6), adaptive target (§6 SP3), Ramadan mode (§6 SP3), encrypted sync without accounts (§6 SP5), published accuracy benchmark (§7.8).

---

## 4. Verified constraints (as of September 2026)

These shape the architecture. Free tiers change without notice; each value is read from configuration, never hard-coded, and re-verified at the start of every sub-project.

| Resource | Free allowance | Consequence |
|---|---|---|
| Gemini API (shared key) | ~500 req/day on Flash-Lite, ~20/day on Flash; **per project**, not per key | Shared photo capacity is ~500 analyses/day **for all users combined** → per-device daily quota; Flash-Lite for the shared pool |
| Gemini API terms | Free tier may not be offered to users in the EEA, UK, Switzerland | Shared pool disabled for those countries; own-key mode still available |
| Groq | ~1,000 req/day per model; **text-only** models | Text features (chat, type-to-log, weekly review) route here |
| Cloudflare Workers AI | 10,000 neurons/day | Backup vision provider (~200 analyses/day, lower quality) |
| Cloudflare Workers | Free plan; KV writes limited to 1,000/day | Quota counters live in D1, not KV |
| OpenFoodFacts | Free, no key; ODbL | Barcode source; attribution required; cache kept private |
| USDA FoodData Central | CC0 public domain | Reference values for non-Indonesian foods |
| TKPI (Indonesian composition table) | ~1,146 foods available as CSV; **redistribution licence unverified** | See §15 decision rule |
| Nutrition5k | CC BY 4.0; ~5k weighed plates | Accuracy benchmark (attribution required) |
| Apple App Store | $99/year | No native iOS app; PWA only |
| Google Play | $25 once; new personal accounts need a 14-day, 12-tester closed test | Deferred to SP5, optional |
| Android sideloading in Indonesia | From 2026-09-30, sideloaded apps must come from verified developers | No APK distribution; PWA (WebAPK) is the Android install path |
| iOS web | No HealthKit, no WebXR depth, no Web Share Target, no `BarcodeDetector`; web push only for Home-Screen installs (16.4+) | Platform adapter layer; zxing-wasm fallback; gallery-pick instead of share-target on iOS |

---

## 5. Platform & distribution

- **Now ($0):** one React PWA for every device.
  - iPhone: Safari → Add to Home Screen, guided by an animated in-app walkthrough (Safari never prompts on its own).
  - Android/desktop: custom "Install app" button driven by `beforeinstallprompt`; Chrome on Android mints a WebAPK that appears in the app drawer like a native app.
  - The install nudge appears **after the third logged meal**, never on first launch.
- **Later (SP5, $25 once, only with traction):** wrap the same code with Capacitor for Google Play, unlocking Health Connect (weight/steps import), ML Kit barcode, native notifications.
- **iOS store app:** only if someone funds $99/year. The platform layer keeps the code ready.

The `packages/platform` interface (§9.3) is what makes the native wrap a swap of one package rather than a rewrite.

---

## 6. Product scope by sub-project

Each sub-project ships something usable on its own and has its own spec → plan → implementation cycle.

### SP0 — Rebuild on the new stack, at parity

New monorepo, React app, new data model, legacy data import, Indonesian/English UI, CI with quality gates. Feature parity with today's app plus auto-save and undo. Details in the SP0 spec.

### SP1 — Go public

- `apps/api` Worker: AI router (§9.5), device quota (§9.6), Turnstile, EEA/UK/CH gating.
- Own-key mode calls Google directly from the device (key never reaches our server).
- Guided "get your free AI key" flow (optional, offered only when shared quota runs out or from Settings).
- Accuracy benchmark tool `tools/bench` (§7.8) — its first run selects the provider/prompt.
- Landing page, privacy page (ID/EN), "How accurate is this?" page, data attributions.
- Error monitoring (Sentry free tier, PII scrubbed), Cloudflare Web Analytics.
- Exit: a stranger on a fresh phone logs a photo meal with no key; quotas enforce; benchmark baseline published.

### SP2 — Log anything, without limits

- **One camera, many inputs** (§7.3): on-device barcode + quality check → single AI call that classifies plate / drink / packaged front / nutrition label / menu / delivery screenshot / ingredients / not-food.
- Barcode → OpenFoodFacts via `apps/api` (cached).
- `packages/fooddb`: reference list (~400 portion-table entries with household units) + searchable Indonesian foods list, shipped as a versioned static file.
- Offline food search; type-to-log (text, via Groq; keyboard dictation makes it voice logging).
- Receipt-style result screen with household units, eaten fraction, shared-by-N, variants in names (§8.1).
- Food memory, personal portion factors, recipes, favorites, "repeat yesterday", quick-add.
- Offline scan queue, "analyze tomorrow morning" when quota is exhausted.
- JSON backup/restore, weekly backup reminder, photo retention (full-size → thumbnail after 30 days).

### SP3 — Personal & progress

- Profile → computed targets (Mifflin-St Jeor BMR, activity factor, goal rate; floors 1,200 kcal female / 1,500 kcal male; rate cap 1 kg/week), stored as a **target history** (§10.1).
- Weight log with 7-day moving average trend.
- **Adaptive TDEE**: after ≥21 days of logs and ≥2 weigh-ins per week, derive maintenance from intake vs trend-weight change and offer to update the target. Doubles as the safety net that absorbs systematic estimation bias.
- Water, streaks, days-on-target.
- **Sugar & salt watch** (optional): WHO limits — free sugars < 10% of energy, sodium < 2 g/day. Values are model estimates, labelled as such in Detail.
- **Ramadan mode**: suggested automatically when the `islamic-umalqura` calendar reports Ramadan; meal types become *sahur / buka / malam*; imsak and maghrib times computed on-device from a user-chosen city (no GPS) with a prayer-time library; water tracked between buka and sahur.

### SP4 — Coach

- Chat about your own data (Groq text, aggregated context — never raw photos).
- Weekly review (Sunday): one or two concrete changes, from aggregated stats.
- **"What should I eat?"**: menu photo → dishes that fit the remaining budget (AI); without a photo, suggestions from the user's own history + reference list (no AI).
- Dashboard translates the remaining budget into familiar food from the user's history ("Sisa 820 kcal — masih cukup untuk nasi goreng + es teh").
- Share cards (daily/weekly summary image, rendered on-device, shared via the Web Share API).
- Smart reminders via Web Push: the device computes the user's usual logging times locally and registers only times with the server; the server stores no meal data.

### SP5 — Everywhere

- **End-to-end encrypted sync without accounts**: pair devices by QR (sync-space id + AES-GCM key); the server stores ciphertext only (R2 blobs, D1 metadata); per-record last-writer-wins on `updatedAt`, ties broken by device id; tombstones propagate deletes.
- Capacitor Android build and Google Play listing (optional $25).
- Telegram bot, then WhatsApp (service conversations only), sharing one bot core.

### Cut

Apple Health / Health Connect from the PWA (impossible), social feeds, native iOS apps, on-device food-recognition models (too inaccurate for Indonesian food), depth sensing (not available on iOS web).

---

## 7. Accuracy & believability system

### 7.1 Where error comes from

In a 2025 evaluation, leading multimodal models missed **weight** by ~36–37% and **energy** by ~36% from photos — nearly identical figures, meaning the error is almost entirely **portion size**, not nutrient density. Trained nutrition professionals miss portions from images by ~40–48%. Adding context about the meal sharply improves model estimates. The design therefore spends most of its effort on portions and on hidden calories (oil, santan, sugar, fillings).

No system — human or AI — gets exact calories from a photograph. The promise is: **honest, consistent, better than your own guess, and improving with use.**

### 7.2 Portion system (highest impact)

| # | Mechanism | Behaviour |
|---|---|---|
| P1 | Scale cues | The prompt requires the model to size items against visible references (plate, bowl, spoon, cup, hand) and report which it used. The camera shows a subtle hint ("sertakan sendokmu"). Optional one-time "my usual plate" size in Settings. |
| P2 | Household units (URT) | The model answers in whole household units from the reference list — *centong, potong, mangkok, sendok makan, gelas, buah, bungkus, porsi* — not free-form grams. Grams are derived on-device from the reference list (e.g. 1 centong nasi = 100 g ≈ 175 kcal, per Kemenkes DBMP/URT). Correction is counting: `[−] 2 centong [+]`. |
| P3 | Eaten fraction & sharing | "Dimakan: semua · ¾ · ½ · ¼" and "Dibagi [N] orang" for communal meals. |
| P4 | Optional second angle | A side view sent in the **same** request (no extra quota) for bowls and stacked food. |
| P5 | Personal portions | After ≥3 corrections in a food category, future estimates in that category start from the user's **median** correction ratio, marked "adjusted to your usual portion" in Detail. |
| P6 | Exact paths | Barcode (package size), nutrition label (printed values), kitchen-scale grams, delivery screenshot (named menu items), recipes weighed once. |

### 7.3 Capture routing — "they can photograph anything"

Before any AI call, on-device: read the photo timestamp (then strip EXIF via canvas re-encode), blur/darkness check, barcode detection (`BarcodeDetector` → zxing-wasm fallback), compression to ~200 KB. A barcode short-circuits to OpenFoodFacts. Otherwise **one** AI call returns a `kind` and the matching payload:

| `kind` | Handling |
|---|---|
| `meal` (single or mixed plate) | Items with household units, each editable |
| `spread` (table / communal) | "Which is yours?" selection + shared-by-N |
| `drink` | Cup size + sugar level baked into the name (*manis* default) |
| `packaged_front` | Product identified → OpenFoodFacts search by name |
| `nutrition_label` | Printed values read exactly; serving eaten is a stepper |
| `delivery_screenshot` | GoFood / GrabFood / ShopeeFood items read by name with restaurant-standard portions |
| `menu` | Routes to "What should I eat?" (SP4; before SP4, items are listed for manual pick) |
| `ingredients` | Recipe mode: log the pot, split into portions |
| `unknown_food` | Top-3 guesses as big buttons + "type it" |
| `not_food` | "Tidak ada makanan" + retake / type |

Gallery photos log at their original capture time.

### 7.4 Grounding: the AI identifies, the reference list counts

The model returns *what, how many units, how cooked* and, when it can, a `refId` chosen from the reference list included in the prompt (choosing from a list is more reliable than recalling numbers). Per-100 g values then come from the reference list (TKPI / USDA-derived), OpenFoodFacts, or the label. Only when no entry fits does the model's own estimate apply (source `ai`). Every item stores its source; sources are shown only in Detail.

### 7.5 Invisible defaults (nothing asks)

- Ambiguities with a large calorie swing are resolved to the **most likely local default** and written into the item name: "Ayam **goreng**", "Es teh **manis**", "Soto **santan**". Tapping the name switches variants. No question UI.
- Values are rounded to 10 kcal; ranges, sources and confidence live only in the item's Detail.
- Only `unknown_food` interrupts, because guessing an unidentifiable food would violate principle 1.

### 7.6 Silent guards (results make sense)

1. **Plausibility:** each item's grams are checked against the reference entry's normal range; meal totals against meal bounds; drinks against 0–600 kcal; the existing `core/nutrition` clamps (item 0–5,000 kcal, macro 0–500 g, meal 0–10,000 kcal, 4P+4C+9F cross-check) remain. An out-of-range item is pulled to the nearest bound and flagged in Detail; if more than one item trips, the model is asked once more, then the clamped result is accepted.
2. **Consistency:** discrete units, reference-list values, deterministic on-device math, temperature 0, food memory, and personal portions together make the same meal produce the same number. Consistency is measured (§7.8) and gated.
3. **Food-language feedback:** the dashboard expresses remaining budget as familiar food (SP4), so users judge numbers in terms they understand.

### 7.7 Learning & self-correction

- **Food memory**: only user-corrected items are remembered; exact match on a normalized name key (lowercase, punctuation stripped, portion words removed); a match pre-fills the user's values, marked "your usual" in Detail.
- **Personal portions** (P5).
- **Adaptive TDEE** (SP3) absorbs consistent bias: if logs undercount by 20%, measured maintenance is 20% lower too and the target adjusts. The UI states plainly: *"Target kamu dikalibrasi dari catatanmu sendiri."*

### 7.8 Measured accuracy (benchmark)

`tools/bench` runs any provider × prompt version against:

- a Nutrition5k subset (weighed Western plates, CC BY 4.0), and
- an Indonesian set built for this project: ~100 home and warung meals weighed on a kitchen scale, photographed on real phones.

Metrics: median absolute % error for kcal and grams; **consistency** = coefficient of variation of kcal over 5 repeated runs of the same photo.

Gates:

- A prompt or provider change ships only if it does not regress median error on either set.
- Consistency target: **CV ≤ 10%** on the Indonesian set.
- The backup provider (Workers AI) is benchmarked too; if its error is unacceptable against the primary, it is disabled and failed analyses queue instead.
- Photo overlay labels require item positions from the model; they ship only if the benchmark shows usable positions, otherwise the photo shows a plain legend.

Results are published on the landing page and in the README. The benchmark runs manually (it spends real quota); CI uses recorded fixtures.

---

## 8. UX rules

### 8.1 Result screen

```
┌───────────────────────────────────┐
│   [ photo, soft labels on items ] │
├───────────────────────────────────┤
│  Nasi Padang          Makan siang │
│  680 kcal                         │
│  ━━━━━━━━━━━━━  P 28 · K 82 · L 26 │
├───────────────────────────────────┤
│  Nasi putih      2 centong    350 │
│  Rendang         1 potong     190 │
│  Sayur nangka    1 sendok      80 │
│  Es teh manis    1 gelas       60 │
├───────────────────────────────────┤
│  ✓ Tersimpan · Sisa hari ini 820  Batal │
└───────────────────────────────────┘
```

- Auto-saved; undo in the toast.
- Tapping a row opens a sheet: unit stepper, eaten fraction, variants, "Bukan ini?" alternatives, and a small **Detail** link (source, range, assumptions).

### 8.2 General rules

- Nothing asks; everything guesses sensibly; anything is fixable in one tap.
- Meal type from the clock (or Ramadan meal types), time from the photo, portion from the plate.
- Setup is skippable; defaults work on first launch.
- Numbers are shown in food terms wherever possible.
- UI languages: **Indonesian and English**, auto-detected from the browser, switchable. AI replies (tips, chat, review) follow the UI language unless the user writes in the other.
- Accuracy explanations live in one Settings page ("Seberapa akurat?") and the landing page — never in the logging flow.
- Accessible by default: Radix primitives, pinch-zoom allowed, labelled controls, reduced-motion respected.

---

## 9. Architecture

### 9.1 Stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript + React Compiler |
| Routing | TanStack Router, route-level code splitting |
| Styling / components | Tailwind CSS v4 + shadcn/ui (Radix) |
| Animation | Motion, lazy-loaded, `LazyMotion` subset |
| Client data | Dexie + `dexie-react-hooks` (`useLiveQuery`) |
| i18n | Paraglide JS (compile-time, type-safe messages) |
| Build / PWA | Vite + vite-plugin-pwa (Workbox; hashed assets) |
| API | Cloudflare Workers + Hono, typed RPC client, Zod schemas |
| Server storage | D1 (quota, cache, metadata), R2 (encrypted sync blobs, SP5) |
| Abuse protection | Cloudflare Turnstile |
| Barcode | `BarcodeDetector` → zxing-wasm fallback (lazy) |
| Tests | Vitest, `@cloudflare/vitest-pool-workers`, Playwright (Chromium, WebKit, Firefox), axe |
| Lint / format | Biome |
| Monorepo | pnpm workspaces + Turborepo |
| CI | GitHub Actions: typecheck, lint, unit, e2e, bundle budget, Lighthouse CI |
| Hosting | Cloudflare Pages (`*.pages.dev`) + Workers |
| Monitoring | Sentry free tier (PII scrubbing), Cloudflare Web Analytics |

**Rejected:** React Native/Expo (iOS still costs $99/year; weaker web output), Next.js (no server rendering needed; more complex on Cloudflare), Firebase/Supabase (server-held data contradicts principle 5; Supabase free projects pause), Svelte (recommended for performance; owner chose React).

### 9.2 Repository layout

```
apps/web          React PWA — screens and composition only
apps/api          Cloudflare Worker — AI router, quota, food lookups, push, sync
packages/core     Pure TS, no DOM, no I/O: nutrition math, validation & plausibility,
                  household units & portions, targets, adaptive TDEE, meal time &
                  Ramadan logic, food-memory keys
packages/ai       Prompt builders, response schemas (Zod), parsers, model config &
                  fallback order — used by BOTH apps/api and apps/web (own-key mode)
packages/platform Interfaces + web adapters: camera, image processing, barcode,
                  notifications, share, file save/open, storage persistence, health (stub)
packages/fooddb   Build script → versioned reference list + search list (static JSON)
tools/bench       Accuracy & consistency benchmark CLI
```

Dependency rule: `core` depends on nothing; `ai` depends on `core`; `platform` depends on nothing app-specific; apps depend on packages, never the reverse.

### 9.3 `packages/platform`

One interface per capability (`Camera`, `ImageProcessor`, `BarcodeScanner`, `Notifier`, `Sharer`, `FileIO`, `StoragePersistence`, `HealthSource`). The web adapter set ships now; a Capacitor adapter set replaces it in SP5; a test adapter set feeds recorded photos and fixtures to Playwright. Application code never touches `navigator.*` for these capabilities directly.

### 9.4 Scan data flow

```
Capture ─► platform: timestamp · blur/dark check · barcode? · compress
   │ barcode ─► api /food/barcode ─► OpenFoodFacts (D1 cache) ─► exact values
   ▼
AI call via packages/ai
   own key ─► Google directly from the device
   shared  ─► api /analyze (pass + quota) ─► router ─► provider
   ▼ Zod-validated response
On-device (packages/core): reference match · household units → grams ·
   eaten fraction · personal portions · food memory · plausibility guards
   ▼
Auto-save (Dexie) ─► result screen
```

### 9.5 AI router

- Task-based routing: `vision.analyze` → Gemini Flash-Lite (shared key) → Workers AI vision (backup, if benchmark-approved); `text.*` (type-to-log, chat, review) → Groq → Gemini.
- Model IDs and fallback order live in `packages/ai` configuration; a retired model (404/400) advances to the next candidate (existing Phase 1 behaviour, generalized across providers).
- Timeouts: 15 s per provider attempt; one retry on malformed output; then next provider; then the client queues the scan.
- Tracks global daily usage per provider in D1 and stops using a provider before its free limit.
- Temperature 0 for analysis tasks.

### 9.6 Quota & abuse protection

- First launch: random `deviceId` (UUIDv4).
- A Turnstile check issues an HMAC-signed **pass** (deviceId, expiry 7 days). Requests carry the pass; verification needs no database read.
- Per-device daily limits (configurable): **3 photo analyses**, **30 text requests**.
- Per-IP daily abuse brake (configurable, default **60 analyses**) — deliberately high because Indonesian mobile carriers put many users behind shared (CGNAT) addresses; it stops scripts, not people.
- Shared pool disabled for EEA/UK/CH (`request.cf.country`).
- Own-key requests never touch the API and have no NutriSnap quota.
- When the shared pool nears its limit, the API reports it; the client shows the quota-exhausted state (§11) rather than an error.

### 9.7 Privacy

- The API proxies photos to the provider and never stores them.
- Server-side data: device id + counters, barcode cache, push times (SP4), ciphertext (SP5). No meals, no profile, no accounts.
- Photos are EXIF-stripped on-device before any upload.
- Free-tier provider terms allow the provider to use inputs to improve its products; the privacy page says so plainly.

---

## 10. Data model

### 10.1 Client (Dexie, database `nutrisnap-v3`)

Every record carries `id` (UUIDv7), `updatedAt`, and `deletedAt?` (tombstone). Deletes are soft; tombstones older than 30 days are purged locally (SP5 sync keeps its own retention).

```
meals        id, date, time, mealType, source, status, items[], photoId?,
             note?, sharedBy?, healthScore?, tip?, createdAt, updatedAt, deletedAt?
             mealType: breakfast|lunch|dinner|snack|sahur|buka|malam
             source:   photo|barcode|label|screenshot|text|search|recipe|quick|legacy
             status:   queued|analyzing|done|failed

FoodItem     refId?, name, portion {unit, count, grams?}, servingText?, eatenFraction,
             per100g? {kcal, protein, carbs, fat, fiber?, sugar?, sodium?},
             nutrition, kcalRange? {lo, hi},
             source: tkpi|usda|off|label|memory|ai|legacy, confidence: high|med|low,
             assumptions[], variants?[{label, kcalDelta}], alternatives[], box?,
             adjusted?   ← plausibility guard fired

photos       id, full, thumb, takenAt
foodMemory   key, item snapshot, corrections, lastUsed
portionFactors  category, ratio, samples
targets      id, effectiveFrom, kcal, protein, carbs, fat, reason: default|formula|adaptive|manual
weights      id, date, kg, bodyFatPct?, waistCm?
water        date, ml
recipes      id, name, servings, items[]
favorites    id, name, items[]
chats        id, role, content, createdAt
reviews      id, weekStart, content
queue        id, photoId, note?, attempts, nextAttemptAt
profile      heightCm?, weightKg?, birthYear?, sex?, activity?, goal?, rateKgPerWeek?,
             locale, ramadanMode, ramadanCity?, sugarSaltWatch, plateSize?, theme
settings     key, value            ← own API key, active model per provider, UI flags
meta         schemaVersion, deviceId, lastBackupAt, legacyImportedAt?
```

`settings` is excluded from JSON backups and from sync: an API key never leaves the device except in requests to its own provider.

Stores are introduced by the sub-project that first needs them; unused fields are optional from SP0 onward so no later migration rewrites existing records.

**Target history:** a day is always judged against the target effective on that day, so an adaptive change never rewrites the past.

**Stored inputs, computed outputs:** when an item has `per100g` and `portion.grams`, `nutrition` is recomputed from them on any edit, so the displayed source always matches the numbers. Items without `per100g` (legacy records, and SP0-era results whose model output is per-item totals with a free-text `servingText`) store `nutrition` as given, and a count change scales it proportionally.

**Reference data** (`packages/fooddb`) is a versioned static asset, cached by the service worker, not stored in Dexie.

### 10.2 Server (D1)

```
devices         device_id, created_at, last_pass_at
usage           device_id, day, analyses, texts          PK (device_id, day)
ip_usage        ip_hash, day, analyses                   PK (ip_hash, day)
global_usage    day, provider, requests                  PK (day, provider)
barcode_cache   code, payload, fetched_at
push_subs       (SP4)  device_id, endpoint, keys, times[]
sync_spaces     (SP5)  space_id, created_at, head_seq
```

IPs are stored only as salted hashes, rotated daily.

---

## 11. Error handling

Rule: **never lose a meal, never a dead end, never an error code.**

| Situation | User sees |
|---|---|
| Offline during scan | "Tersimpan — dianalisis saat online"; queued meal with photo; auto-retry on reconnect (Background Sync where supported, otherwise on app open) |
| Device quota exhausted | "Scan gratis hari ini habis" + [Analisis besok pagi] (auto-queued for reset) · [Cari makanan] · [Pakai kunci sendiri] |
| Provider down / slow | Silent fallback; after 15 s "Masih menganalisis…"; all failed → queued |
| Malformed / implausible output | Validated, one retry, next provider, guards; never shown raw |
| Blurry / dark photo | On-device, no quota: "Foto kurang jelas" [Pakai saja] · [Ulangi] |
| Not food | "Tidak ada makanan" [Foto ulang] · [Ketik saja] |
| Barcode unknown | Straight to "Foto label gizinya" |
| Own key invalid | Silent fallback to shared pool; badge on Settings |
| API unreachable | App works; only AI/barcode actions show "Butuh internet" |
| Storage nearly full | Auto-shrink old photos; notify only if insufficient |
| iOS storage eviction risk | `navigator.storage.persist()`, install nudge (installed PWAs get more durable storage), weekly one-tap backup reminder |
| Legacy import fails | Legacy database untouched; offer export; nothing deleted |
| Model retired | Fallback chain advances and persists the working model |

---

## 12. Testing & quality gates

- **Unit (Vitest):** all of `packages/core`; `packages/ai` parsers and prompt snapshots.
- **API (Vitest workers pool):** quota enforcement, pass signing/expiry, router fallback, country gating, cache behaviour.
- **E2E (Playwright):** Chromium, WebKit, Firefox × phone and desktop viewports; recorded AI fixtures via the platform test adapter; offline flow, quota-exhausted flow, legacy import, axe accessibility (zero serious violations).
- **Accuracy benchmark:** §7.8, manual.
- **Budgets (CI, blocking):** initial-route JavaScript ≤ **150 KB gzipped**; Lighthouse mobile performance ≥ **90**, accessibility ≥ **95**, PWA installable.
- **Real devices (per release):** iPhone Safari install, rear camera, orientation after re-encode, storage persistence across relaunch, update reaches the installed app; a budget Android phone.

---

## 13. Operations

- Secrets (Gemini, Groq keys, HMAC key, Turnstile secret) live in Worker secrets, never in the repo.
- Configuration (limits, model order, provider enablement) lives in Worker environment variables so quota changes need no redeploy of the web app.
- Sentry alerts on error spikes; a daily D1 query reports provider usage against free limits.
- Legal pages: privacy (ID/EN), data attributions (OpenFoodFacts ODbL, USDA, TKPI/Kemenkes, Nutrition5k CC BY 4.0), medical disclaimer ("not medical advice").

---

## 14. Decisions

| Decision | Rationale |
|---|---|
| Public, zero-setup, shared quota + own-key option | Usable by anyone; stays $0 as usage grows |
| PWA, not native | Only free channel on iOS; Android WebAPK is a real install; sideload rules tightening |
| React (owner's choice) | Recognizable; performance protected by enforced budgets |
| Local-first, server holds no personal data | Privacy, $0 storage, offline speed |
| Household units instead of grams | Portion is the dominant error; counting beats estimating |
| Defaults baked into names instead of questions | Principle 2; assumptions visible without interruption |
| Reference list + `refId` selection | Constrained choice is more reliable than recall; consistent numbers |
| Benchmark with published results | Accuracy is measured, not claimed; drives provider choice |
| UUIDv7 + tombstones from SP0 | Sync and undo without a future migration |
| Target history | Past days never re-judged by a new target |
| SP0 rebuild separate from SP1 | A parity rebuild is large enough to be its own shippable step |

---

## 15. Risks & open verification items

| Item | Decision rule |
|---|---|
| TKPI redistribution licence | Verify in SP2. If not confirmed, the shipped reference list uses values computed from standard recipes with USDA (CC0) ingredient data, and TKPI is used only as a validation reference during curation. |
| D1 free-tier limits | Re-verify in SP1 before finalizing counter design; fall back to SQLite-backed Durable Objects (free plan: 100k row writes/day) if D1 is insufficient. |
| Gemini Flash-Lite item positions | Benchmark decides whether overlay labels ship (§7.8). |
| Free-tier cuts | All limits are configuration; quota-exhausted UX already degrades gracefully to free paths. |
| Workers AI quality for Indonesian food | Benchmark decides whether it is enabled as backup. |
| iOS storage eviction | Mitigations in §11; JSON backup in SP2. |
| Shared-pool abuse | Turnstile, signed passes, per-device and per-IP limits; limits tunable without redeploy. |

---

## 16. Known limitations

- Photo calorie estimates remain approximate on a first scan of an unfamiliar dish; exactness comes from exact paths, memory, and correction.
- No Apple Health or Health Connect in the PWA.
- The shared pool serves a limited number of users per day; heavy users need their own free key.
- Free-tier providers may use inputs to improve their products.
- iOS PWAs cannot receive shared images from other apps; users pick from the gallery instead.
