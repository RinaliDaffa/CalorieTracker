# NutriSnap Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the ten defects that make the current build undeployable, insecure, and un-updatable, so that every later phase can actually reach the user's iPhone.

**Architecture:** Vanilla ES modules, no framework, no build step. Pure calculation and string-handling logic moves into `js/core/`, which imports nothing from the DOM and is unit-tested under Node's built-in test runner. Browser modules import from `core/`; `core/` never imports from them.

**Tech Stack:** Vanilla JavaScript (ES modules), IndexedDB, Service Worker, Google Gemini API, Node 24 built-in test runner (`node --test`) — zero npm dependencies.

## Global Constraints

- **No backend, no build step, no runtime npm dependencies.** The app is served as static files.
- **No secret may enter the repository.** A static site cannot hold a secret; anything shipped to the browser is readable by anyone who loads the page.
- **Everything under `js/core/` must be pure** — no `document`, no `window`, no `indexedDB`, no `fetch`. If it cannot run under `node --test`, it does not belong in `core/`.
- **Target platform is iOS Safari** as a Home-Screen-installed PWA.
- **Governing principle:** photo in, counted, two taps. No change in this phase may add a tap, a prompt, or a confirmation to the capture flow.
- **Phase 1 adds no user-visible features.** It is defect repair only. Behaviour changes are limited to things that were broken.

## Scope note — deviation from the spec

Spec §6 lists eight Phase 1 items. This plan implements items 1–7 and **defers item 8** (the full `views/` and `data/` module split of `ui.js` and `app.js`) to Phase 2.

**Reasoning:** splitting an 886-line `ui.js` into six view modules is a large refactor with no regression tests to catch breakage, and doing it in the same phase as four critical fixes risks shipping a broken app while claiming the defects are fixed. Phase 2 modifies those same files anyway (new profile view, new progress view), which is the natural and cheaper moment to split them.

What this plan **does** create is the `js/core/` and `js/config/` directories and the pure modules Phase 1 genuinely needs, establishing the structure and the test harness that the Phase 2 split will land into.

Spec §5 places HTML escaping in `ui/render.js`. Because escaping is a pure, security-critical function that must be unit-tested, this plan puts it in `js/core/escape.js` instead. The Phase 2 restructure can re-export it from `ui/render.js` if that grouping is still wanted.

---

## File Structure

**Created:**

| File | Responsibility |
|------|----------------|
| `package.json` | Declares ES modules and the test script. No dependencies. |
| `js/core/escape.js` | HTML entity escaping. Pure. (D3) |
| `js/core/nutrition.js` | Validation and clamping of model-returned nutrition. Pure. (D4) |
| `js/config/models.js` | Model candidate list and fallback selection. Pure. (D5) |
| `tests/core/escape.test.js` | Tests for escaping and markdown ordering |
| `tests/core/nutrition.test.js` | Tests for validation boundaries |
| `tests/config/models.test.js` | Tests for fallback selection |

**Modified:**

| File | Change |
|------|--------|
| `sw.js` | Full rewrite: versioned cache, network-first for code, resilient precache (D1, D2) |
| `js/app.js` | Remove `CONFIG` import and config-key branch; add update-reload listener (D1, D2) |
| `js/ui.js` | Route AI/user strings through `escapeHtml` (D3) |
| `js/gemini.js` | Validate responses; model fallback chain (D4, D5) |
| `js/camera.js` | Single image-compression implementation (D10) |
| `js/utils.js` | Remove duplicated `compressImage` (D10) |
| `index.html` | Nav accessible names; restore pinch-zoom (D7, D8) |

**Deleted:** `js/config.js` (D2)

---

## Task 1: Test harness

**Files:**
- Create: `package.json`
- Create: `tests/smoke.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs every `*.test.js` under `tests/`. All later tasks depend on this command existing.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "nutrisnap",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "npx -y serve . -l 3111"
  }
}
```

`"type": "module"` lets Node load the project's ES modules directly. Browsers ignore this file entirely, so it cannot affect the running app.

`node --test` takes no path argument. Passing a directory (`node --test tests/`) makes Node treat the directory itself as a test file and fail. With no argument it uses its default discovery patterns, which match `**/*.test.js` at any depth and exclude `node_modules` — so `tests/smoke.test.js`, `tests/core/*.test.js` and `tests/config/*.test.js` are all found.

- [ ] **Step 2: Write a smoke test that proves the runner works**

Create `tests/smoke.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('test runner is wired up', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: Run it**

```bash
npm test
```

Expected: `pass 1`, `fail 0`.

- [ ] **Step 4: Commit**

```bash
git add package.json tests/smoke.test.js
git commit -m "test: add zero-dependency test harness using node --test"
```

---

## Task 2: Service worker rewrite and API key removal (D1, D2)

The two most critical defects. They ship together because `sw.js` references `js/config.js`, so removing one without the other leaves the app broken.

**Files:**
- Modify: `sw.js` (full rewrite)
- Delete: `js/config.js`
- Modify: `js/app.js:19` (remove import), `js/app.js:48-64` (key selection), `js/app.js:704+` (SW registration)

**Interfaces:**
- Consumes: nothing
- Produces: the app becomes updatable on an installed device and holds no secret. Later tasks assume `state.settings.apiKey` is the *only* key source.

- [ ] **Step 1: Rewrite `sw.js` completely**

Replace the entire contents of `sw.js`:

```javascript
// ============================================
// NutriSnap — Service Worker
// Network-first for code so deployed updates reach installed devices.
// Cache-first only for immutable assets (icons, fonts).
// ============================================

// Bump VERSION on every deploy. This is what evicts the previous cache.
const VERSION = 'v2.0.0';
const CACHE_NAME = `nutrisnap-${VERSION}`;

// Precached so the app opens offline. Deliberately NOT atomic:
// a single missing file must not prevent the worker from installing.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/index.css',
  './css/components.css',
  './css/animations.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // allSettled, not addAll: addAll is atomic and one 404 rejects the
    // entire install, which is exactly how the previous version broke.
    const results = await Promise.allSettled(
      PRECACHE.map((url) => cache.add(url))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`SW: ${failed} precache entries failed; install continues`);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Google Fonts are immutable and versioned — cache-first.
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Any other cross-origin request (notably the Gemini API) is left
  // to the browser. Never cache API responses.
  if (url.origin !== self.location.origin) return;

  // Icons are immutable — cache-first.
  if (url.pathname.includes('/icons/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML, JS, CSS, manifest — network-first so updates land.
  event.respondWith(networkFirst(request));
});
```

- [ ] **Step 2: Delete the API key file**

```bash
git rm --cached js/config.js 2>/dev/null || true
rm js/config.js
```

`js/config.js` was never committed (it is listed in `.gitignore:2`), so the `git rm --cached` is a no-op safeguard. Leave the `.gitignore` entry in place so the file cannot reappear in a future commit.

- [ ] **Step 3: Remove the import in `js/app.js`**

Delete line 19 entirely:

```javascript
import { CONFIG } from './config.js';
```

- [ ] **Step 4: Replace the key-selection block in `js/app.js`**

Replace lines 48–64 (from the `// Set API key` comment through the closing brace of the `else` block) with:

```javascript
    // API key comes from device storage only. It is never bundled with
    // the app, because a static site cannot hold a secret.
    if (state.settings.apiKey) {
      setApiKey(state.settings.apiKey);
      hideOnboarding();
      await renderCurrentView();
    } else {
      showOnboarding();
    }
```

This also removes a dead branch: the old `if (configKey && !state.settings.apiKey)` at line 57 could never be true, because line 55 had just assigned a truthy value to `state.settings.apiKey`.

- [ ] **Step 5: Make the app reload when a new version activates**

In `js/app.js`, find `registerServiceWorker()` (near line 704) and replace the function body with:

```javascript
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // When a new service worker takes control, reload once so the user is
  // running the new code. Without this the page keeps the old modules
  // until it is manually closed and reopened.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('./sw.js')
    .then((reg) => console.log('Service worker registered:', reg.scope))
    .catch((err) => console.error('Service worker registration failed:', err));
}
```

- [ ] **Step 6: Verify the app still boots**

```bash
npm run serve
```

Open `http://localhost:3111` in a browser, then check the console. Expected: `NutriSnap DB initialized` and `Service worker registered:`. Expected: **no** `Failed to resolve module specifier './config.js'` error. Because the key file is gone, the onboarding overlay should appear — that is correct behaviour, not a regression.

- [ ] **Step 7: Verify the update mechanism actually works**

This is the regression check for D1 and the single most important verification in the plan.

1. Load the app at `http://localhost:3111`, confirm it renders.
2. Edit `index.html` — change the header text `🥗 NutriSnap` to `🥗 NutriSnap TEST`.
3. Reload the page **without** clearing any cache.
4. Expected: the header reads `NutriSnap TEST`.

If the old text persists, network-first is not in effect and D1 is not fixed. Do not proceed.

5. Revert the header text back to `🥗 NutriSnap`.

- [ ] **Step 8: Commit**

```bash
git add sw.js js/app.js
git commit -m "fix: network-first service worker and remove bundled API key

D1: cache-first with a static cache name meant a deployed update could
never reach an installed device. Now network-first for HTML/JS/CSS with
a versioned cache name, cache-first only for icons and fonts.

D2: cache.addAll listed the gitignored js/config.js, so the atomic
install rejected and offline support never activated when hosted.
Precache is now resilient via allSettled, and config.js is deleted -
the API key lives in IndexedDB via onboarding only."
```

---

## Task 3: HTML escaping (D3)

**Files:**
- Create: `js/core/escape.js`
- Create: `tests/core/escape.test.js`
- Modify: `js/ui.js:528-535` (`formatChatContent`)

**Interfaces:**
- Consumes: nothing
- Produces: `escapeHtml(value: unknown) => string`. Every later task that renders AI- or user-derived text must route it through this function.

- [ ] **Step 1: Write the failing tests**

Create `tests/core/escape.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../../js/core/escape.js';

test('escapes angle brackets so markup cannot execute', () => {
  assert.equal(
    escapeHtml('<script>alert(1)</script>'),
    '&lt;script&gt;alert(1)&lt;/script&gt;'
  );
});

test('escapes ampersands exactly once', () => {
  // A naive sequential replace would double-escape this to "&amp;amp;lt;".
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('escapes quotes so attribute injection is not possible', () => {
  assert.equal(escapeHtml(`" onerror="x`), '&quot; onerror=&quot;x');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
});

test('leaves ordinary food names untouched', () => {
  assert.equal(escapeHtml('Nasi Goreng'), 'Nasi Goreng');
});

test('handles null and undefined without throwing', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('coerces numbers to string', () => {
  assert.equal(escapeHtml(250), '250');
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test
```

Expected: failure with `Cannot find module` for `js/core/escape.js`.

- [ ] **Step 3: Implement `js/core/escape.js`**

```javascript
/* ============================================
   NutriSnap — HTML Escaping
   Pure. No DOM. Security-critical: all AI- and user-derived
   strings must pass through here before reaching innerHTML.
   ============================================ */

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escape a value for safe interpolation into HTML.
 * Single-pass replace, so '&' cannot be double-escaped.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test
```

Expected: all escape tests pass.

- [ ] **Step 5: Add the markdown-ordering test**

Append to `tests/core/escape.test.js`:

```javascript
import { formatChatContent } from '../../js/core/escape.js';

test('markdown formatting survives escaping', () => {
  assert.equal(formatChatContent('**bold**'), '<strong>bold</strong>');
  assert.equal(formatChatContent('*italic*'), '<em>italic</em>');
});

test('injected markup is neutralised but markdown still renders', () => {
  const out = formatChatContent('**hi** <img src=x onerror=alert(1)>');
  assert.ok(out.includes('<strong>hi</strong>'));
  assert.ok(!out.includes('<img'));
  assert.ok(out.includes('&lt;img'));
});

test('newlines become line breaks', () => {
  assert.equal(formatChatContent('a\nb'), 'a<br>b');
});
```

- [ ] **Step 6: Run to confirm the new tests fail**

```bash
npm test
```

Expected: failure — `formatChatContent` is not exported.

- [ ] **Step 7: Add `formatChatContent` to `js/core/escape.js`**

```javascript
/**
 * Render a chat message as HTML.
 * Escaping happens FIRST, then markdown is applied to the escaped text.
 * Reversing that order would escape the tags this function generates.
 */
export function formatChatContent(content) {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)/gm, '• $1');
}
```

- [ ] **Step 8: Run to confirm all tests pass**

```bash
npm test
```

Expected: all escape tests pass.

- [ ] **Step 9: Use it in `js/ui.js`**

Add to the imports at the top of `js/ui.js`:

```javascript
import { escapeHtml, formatChatContent } from './core/escape.js';
```

Then **delete** the local `formatChatContent` definition at `js/ui.js:528-535` — the imported version replaces it. The call site at line 548 needs no change.

- [ ] **Step 10: Escape AI-derived food names**

Food item names come from the model and are interpolated into `innerHTML` in the dashboard, scan results, history and modal renderers. Find every interpolation of a food name, meal note, or AI tip and wrap it.

Locate them:

```bash
grep -n "foodItems\|\.name\|aiTips\|mealDescription\|\.notes" js/ui.js
```

For each interpolation inside a template literal assigned to `innerHTML`, wrap the value. For example:

```javascript
// before
<div class="food-name">${item.name}</div>
// after
<div class="food-name">${escapeHtml(item.name)}</div>
```

Apply to: `item.name`, `item.servingSize`, `meal.aiTips`, `meal.notes`, `analysis.mealDescription`, and favorite names. Numeric values passed through `formatNumber()` are already safe and need no wrapping.

- [ ] **Step 11: Verify manually**

```bash
npm run serve
```

Open the app, go to Settings, and enter an API key. In the AI chat, send:

```
Reply with exactly this and nothing else: <img src=x onerror="alert('xss')">
```

Expected: the text appears **literally** in the chat bubble. Expected: no alert dialog.

- [ ] **Step 12: Commit**

```bash
git add js/core/escape.js tests/core/escape.test.js js/ui.js
git commit -m "fix: escape AI and user content before rendering as HTML

D3: formatChatContent applied regex markdown to raw model output and
the result was assigned via innerHTML, with food item names taking the
same path. Adversarial text in a photographed label or menu could
induce markup that executes with access to IndexedDB and the API key.

Escaping now happens before markdown so generated tags survive."
```

---

## Task 4: Validate model output (D4)

**Files:**
- Create: `js/core/nutrition.js`
- Create: `tests/core/nutrition.test.js`
- Modify: `js/gemini.js:143-150` and `js/gemini.js:216-223`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `LIMITS` — the clamping bounds
  - `validateAnalysis(raw: object) => { ok: boolean, value?: object, errors: string[], warnings: string[] }`

- [ ] **Step 1: Write the failing tests**

Create `tests/core/nutrition.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnalysis, LIMITS } from '../../js/core/nutrition.js';

function validAnalysis() {
  return {
    foodItems: [
      { name: 'Nasi Goreng', servingSize: '1 porsi',
        calories: 600, protein: 20, carbs: 80, fat: 22, fiber: 3, sugar: 5 }
    ],
    totalNutrition: { calories: 600, protein: 20, carbs: 80, fat: 22, fiber: 3, sugar: 5 },
    healthScore: 6,
    aiTips: 'Add vegetables.',
    mealDescription: 'Fried rice'
  };
}

test('accepts a well-formed analysis unchanged', () => {
  const result = validateAnalysis(validAnalysis());
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.foodItems[0].calories, 600);
});

test('rejects an implausible calorie count', () => {
  const bad = validAnalysis();
  bad.foodItems[0].calories = 47000;
  const result = validateAnalysis(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test('rejects negative calories', () => {
  const bad = validAnalysis();
  bad.foodItems[0].calories = -50;
  assert.equal(validateAnalysis(bad).ok, false);
});

test('rejects non-finite numbers', () => {
  const bad = validAnalysis();
  bad.foodItems[0].calories = Number.POSITIVE_INFINITY;
  assert.equal(validateAnalysis(bad).ok, false);

  const nan = validAnalysis();
  nan.foodItems[0].protein = Number.NaN;
  assert.equal(validateAnalysis(nan).ok, false);
});

test('clamps an out-of-range macro rather than rejecting', () => {
  const bad = validAnalysis();
  bad.foodItems[0].protein = 900;
  const result = validateAnalysis(bad);
  assert.equal(result.ok, true);
  assert.equal(result.value.foodItems[0].protein, LIMITS.itemMacroGrams.max);
});

test('rejects a missing or empty food list', () => {
  assert.equal(validateAnalysis({}).ok, false);
  assert.equal(validateAnalysis({ foodItems: [] }).ok, false);
  assert.equal(validateAnalysis(null).ok, false);
});

test('rejects an item with no name', () => {
  const bad = validAnalysis();
  bad.foodItems[0].name = '';
  assert.equal(validateAnalysis(bad).ok, false);
});

test('defaults missing optional macros to zero', () => {
  const partial = validAnalysis();
  delete partial.foodItems[0].fiber;
  delete partial.foodItems[0].sugar;
  const result = validateAnalysis(partial);
  assert.equal(result.ok, true);
  assert.equal(result.value.foodItems[0].fiber, 0);
});

test('recomputes totals from items rather than trusting the model', () => {
  const bad = validAnalysis();
  bad.totalNutrition.calories = 99;   // model arithmetic error
  const result = validateAnalysis(bad);
  assert.equal(result.ok, true);
  assert.equal(result.value.totalNutrition.calories, 600);
});

test('warns but still saves when macros disagree with calories', () => {
  const odd = validAnalysis();
  // 4*5 + 4*5 + 9*1 = 49 kcal claimed as 600 - far beyond 30%
  odd.foodItems[0] = { ...odd.foodItems[0], protein: 5, carbs: 5, fat: 1 };
  const result = validateAnalysis(odd);
  assert.equal(result.ok, true, 'a soft warning must never block the save');
  assert.ok(result.warnings.length > 0);
});

test('does not warn when macros agree with calories', () => {
  const result = validateAnalysis(validAnalysis());
  assert.equal(result.warnings.length, 0);
});

test('clamps healthScore into 1-10', () => {
  const bad = validAnalysis();
  bad.healthScore = 99;
  assert.equal(validateAnalysis(bad).value.healthScore, 10);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: `Cannot find module` for `js/core/nutrition.js`.

- [ ] **Step 3: Implement `js/core/nutrition.js`**

```javascript
/* ============================================
   NutriSnap — Nutrition Validation
   Pure. No DOM. Guards storage against implausible model output:
   one hallucinated number would poison every total and trend.
   ============================================ */

export const LIMITS = {
  itemCalories:   { min: 0, max: 5000 },
  itemMacroGrams: { min: 0, max: 500 },
  mealCalories:   { min: 0, max: 10000 },
  healthScore:    { min: 1, max: 10 }
};

// Beyond this relative gap, stated calories and 4P+4C+9F are treated
// as disagreeing. Fibre and alcohol make the identity inexact, so this
// is a confidence signal only - never a rejection.
const MACRO_MISMATCH_TOLERANCE = 0.3;

const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber', 'sugar'];

export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function caloriesFromMacros(protein, carbs, fat) {
  return (protein * 4) + (carbs * 4) + (fat * 9);
}

/**
 * Validate and sanitise a raw analysis object from the model.
 * Returns { ok, value, errors, warnings }.
 * On ok:false, `value` is undefined and the caller must not save.
 */
export function validateAnalysis(raw) {
  const errors = [];
  const warnings = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Analysis was empty.'], warnings };
  }
  if (!Array.isArray(raw.foodItems) || raw.foodItems.length === 0) {
    return { ok: false, errors: ['No food items were identified.'], warnings };
  }

  const foodItems = [];

  for (const [index, item] of raw.foodItems.entries()) {
    const label = `Item ${index + 1}`;

    if (!item || typeof item !== 'object') {
      errors.push(`${label} was malformed.`);
      continue;
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) {
      errors.push(`${label} had no name.`);
      continue;
    }

    if (!isFiniteNumber(item.calories)) {
      errors.push(`${name} had an unreadable calorie value.`);
      continue;
    }
    if (item.calories < LIMITS.itemCalories.min ||
        item.calories > LIMITS.itemCalories.max) {
      errors.push(
        `${name} reported ${Math.round(item.calories)} kcal, which is outside ` +
        `the plausible range (${LIMITS.itemCalories.min}-${LIMITS.itemCalories.max}).`
      );
      continue;
    }

    const clean = {
      name,
      servingSize: typeof item.servingSize === 'string' ? item.servingSize : '',
      calories: item.calories
    };

    let macroFault = false;
    for (const key of MACRO_KEYS) {
      const value = item[key];
      if (value === undefined || value === null) {
        clean[key] = 0;
        continue;
      }
      if (!isFiniteNumber(value)) {
        errors.push(`${name} had an unreadable ${key} value.`);
        macroFault = true;
        break;
      }
      clean[key] = clamp(
        value, LIMITS.itemMacroGrams.min, LIMITS.itemMacroGrams.max
      );
    }
    if (macroFault) continue;

    const implied = caloriesFromMacros(clean.protein, clean.carbs, clean.fat);
    const gap = Math.abs(clean.calories - implied) / Math.max(clean.calories, 1);
    if (gap > MACRO_MISMATCH_TOLERANCE) {
      warnings.push(
        `${name}: stated calories and macros disagree - worth checking.`
      );
    }

    foodItems.push(clean);
  }

  if (foodItems.length === 0) {
    if (errors.length === 0) errors.push('No usable food items were returned.');
    return { ok: false, errors, warnings };
  }

  // Totals are recomputed rather than trusted: the model frequently
  // returns a sum that does not match its own items.
  const totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
  for (const item of foodItems) {
    totalNutrition.calories += item.calories;
    for (const key of MACRO_KEYS) totalNutrition[key] += item[key];
  }

  if (totalNutrition.calories > LIMITS.mealCalories.max) {
    errors.push(
      `The meal totalled ${Math.round(totalNutrition.calories)} kcal, ` +
      `above the ${LIMITS.mealCalories.max} kcal limit for a single meal.`
    );
    return { ok: false, errors, warnings };
  }

  const healthScore = isFiniteNumber(raw.healthScore)
    ? Math.round(clamp(raw.healthScore, LIMITS.healthScore.min, LIMITS.healthScore.max))
    : null;

  return {
    ok: true,
    errors: [],
    warnings,
    value: {
      foodItems,
      totalNutrition,
      healthScore,
      aiTips: typeof raw.aiTips === 'string' ? raw.aiTips : '',
      mealDescription: typeof raw.mealDescription === 'string' ? raw.mealDescription : ''
    }
  };
}
```

- [ ] **Step 4: Run to confirm all tests pass**

```bash
npm test
```

Expected: all nutrition tests pass. If the mismatch-warning test fails, check that `MACRO_MISMATCH_TOLERANCE` is compared against the *relative* gap.

- [ ] **Step 5: Wire validation into `js/gemini.js`**

Add to the top of `js/gemini.js`:

```javascript
import { validateAnalysis } from './core/nutrition.js';
```

Replace the parse block at the end of `analyzeFood` (lines 145–149) with:

```javascript
  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch (e) {
    throw new Error('Failed to parse AI response. Please try again.');
  }

  const check = validateAnalysis(parsed);
  if (!check.ok) {
    const err = new Error(check.errors.join(' '));
    err.code = 'IMPLAUSIBLE_ANALYSIS';
    throw err;
  }
  return { ...check.value, warnings: check.warnings };
```

Apply the identical replacement to the parse block at the end of `analyzeFoodByText` (lines 218–222).

- [ ] **Step 6: Confirm the app still logs a meal**

```bash
npm run serve
```

Scan or type-enter a meal. Expected: it saves as before, and the console shows no validation error for ordinary food.

- [ ] **Step 7: Commit**

```bash
git add js/core/nutrition.js tests/core/nutrition.test.js js/gemini.js
git commit -m "fix: validate and clamp model nutrition output before saving

D4: model output was written to storage unchecked, so a single
hallucinated figure would silently corrupt every total, average and
trend downstream.

Implausible values are now rejected with a retry, out-of-range macros
are clamped, and totals are recomputed from items rather than trusting
the model's own arithmetic. The 4P+4C+9F cross-check is a soft warning
that still saves, since fibre and alcohol make the identity inexact."
```

---

## Task 5: Model fallback chain (D5)

**Files:**
- Create: `js/config/models.js`
- Create: `tests/config/models.test.js`
- Modify: `js/gemini.js:18-71` (`callGemini`)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `MODEL_CANDIDATES: string[]`
  - `isModelUnavailableError(status: number, message: string) => boolean`
  - `nextModel(current: string, candidates?: string[]) => string | null`

- [ ] **Step 1: Write the failing tests**

Create `tests/config/models.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_CANDIDATES, isModelUnavailableError, nextModel
} from '../../js/config/models.js';

test('there is more than one candidate to fall back to', () => {
  assert.ok(MODEL_CANDIDATES.length >= 2);
});

test('recognises a retired model from a 404', () => {
  assert.equal(isModelUnavailableError(404, 'models/x is not found'), true);
});

test('recognises a model-related 400', () => {
  assert.equal(
    isModelUnavailableError(400, 'Unsupported model: gemini-x'), true
  );
});

test('does not mistake a rate limit for a retired model', () => {
  assert.equal(isModelUnavailableError(429, 'Resource exhausted'), false);
});

test('does not mistake an auth failure for a retired model', () => {
  assert.equal(isModelUnavailableError(400, 'API_KEY_INVALID'), false);
});

test('advances through the candidate list in order', () => {
  const list = ['a', 'b', 'c'];
  assert.equal(nextModel('a', list), 'b');
  assert.equal(nextModel('b', list), 'c');
});

test('returns null when the list is exhausted', () => {
  assert.equal(nextModel('c', ['a', 'b', 'c']), null);
});

test('returns null for a model that is not in the list', () => {
  assert.equal(nextModel('zzz', ['a', 'b']), null);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: `Cannot find module` for `js/config/models.js`.

- [ ] **Step 3: Implement `js/config/models.js`**

```javascript
/* ============================================
   NutriSnap — Model Candidates
   Pure. Google retires model IDs on a regular cadence; without a
   fallback the app fails with an opaque error and no way forward.
   Ordered best-first.
   ============================================ */

export const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest'
];

/**
 * Does this error mean "this model ID is not usable", as opposed to
 * a rate limit or a bad key? Only the former is worth retrying with
 * a different model.
 */
export function isModelUnavailableError(status, message) {
  const text = String(message || '');
  if (/API_KEY|PERMISSION_DENIED/i.test(text)) return false;
  if (status === 404) return true;
  if (status === 400 && /model/i.test(text)) return true;
  return false;
}

/** The next candidate after `current`, or null if exhausted. */
export function nextModel(current, candidates = MODEL_CANDIDATES) {
  const index = candidates.indexOf(current);
  if (index === -1 || index === candidates.length - 1) return null;
  return candidates[index + 1];
}
```

- [ ] **Step 4: Run to confirm all tests pass**

```bash
npm test
```

Expected: all model tests pass.

- [ ] **Step 5: Use the chain in `js/gemini.js`**

Add to the imports:

```javascript
import { MODEL_CANDIDATES, isModelUnavailableError, nextModel } from './config/models.js';
```

Add a module-level variable beside `let apiKey = null;`:

```javascript
// The model currently known to work. Persisted by app.js once resolved.
let activeModel = MODEL_CANDIDATES[0];

export function setModel(model) {
  if (model) activeModel = model;
}

export function getModel() {
  return activeModel;
}
```

Replace the body of `callGemini` (lines 18–71) with:

```javascript
async function callGemini(contents, config = {}) {
  if (!apiKey) {
    throw new Error('API key not configured. Please add your Gemini API key in Settings.');
  }

  const { responseSchema, ...genConfig } = config;

  const body = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      ...genConfig
    }
  };

  if (responseSchema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = responseSchema;
  }

  let model = activeModel;

  // Walk the candidate list until one answers. Only a "model unusable"
  // error advances the chain; rate limits and auth errors stop it.
  while (model) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response from AI. Please try again.');
      activeModel = model;   // remember what worked
      return text;
    }

    const err = await response.json().catch(() => ({}));
    const message = err.error?.message || '';

    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait a moment and try again.');
    }
    if (response.status === 400 && message.includes('API_KEY')) {
      throw new Error('Invalid API key. Please check your key in Settings.');
    }

    if (isModelUnavailableError(response.status, message)) {
      const fallback = nextModel(model);
      if (fallback) {
        console.warn(`Model ${model} unavailable, falling back to ${fallback}`);
        model = fallback;
        continue;
      }
      throw new Error('No available AI model. Google may have changed their model names.');
    }

    throw new Error(message || `API error: ${response.status}`);
  }

  throw new Error('No available AI model.');
}
```

- [ ] **Step 6: Verify a real call still succeeds**

```bash
npm run serve
```

Enter an API key and scan or type-enter a meal. Expected: analysis returns normally. If the console logs a fallback warning, that is the chain working — note which model succeeded.

- [ ] **Step 7: Commit**

```bash
git add js/config/models.js tests/config/models.test.js js/gemini.js
git commit -m "fix: fall back through model candidates when one is retired

D5: the model ID was hardcoded. Google retires IDs regularly, and when
that happens the app failed with an opaque error and no recovery path.

The chain advances only on a model-unusable error; rate limits and auth
failures stop it, so a 429 is never mistaken for a dead model."
```

---

## Task 6: Accessibility (D7, D8)

**Files:**
- Modify: `index.html:5` (viewport), `index.html:72-91` (nav)

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Restore pinch-zoom**

Replace line 5 of `index.html`:

```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

`maximum-scale=1.0` and `user-scalable=no` are removed. They block pinch-zoom, which people rely on to read small text. `viewport-fit=cover` is retained — the safe-area insets in `css/index.css:115-118` depend on it.

- [ ] **Step 2: Give every nav button an accessible name**

Replace lines 71–92 of `index.html`:

```html
    <nav class="bottom-nav" aria-label="Main navigation">
      <button class="nav-item active" data-tab="dashboard" id="nav-dashboard" aria-label="Home">
        <span class="nav-icon" aria-hidden="true">🏠</span>
        <span>Home</span>
      </button>
      <button class="nav-item" data-tab="history" id="nav-history" aria-label="History">
        <span class="nav-icon" aria-hidden="true">📅</span>
        <span>History</span>
      </button>
      <button class="nav-item nav-scan" data-tab="scan" id="nav-scan" aria-label="Scan food">
        <span class="nav-icon" aria-hidden="true">📸</span>
        <span></span>
      </button>
      <button class="nav-item" data-tab="chat" id="nav-chat" aria-label="AI chat">
        <span class="nav-icon" aria-hidden="true">💬</span>
        <span>AI Chat</span>
      </button>
      <button class="nav-item" data-tab="settings" id="nav-settings" aria-label="Settings">
        <span class="nav-icon" aria-hidden="true">⚙️</span>
        <span>Settings</span>
      </button>
    </nav>
```

The scan button previously had an empty `<span>` and no label, so assistive technology announced it as an unnamed button. The empty span is kept because the layout centres on it; `aria-label` now supplies the name and `aria-hidden` stops the emoji being read as decoration.

- [ ] **Step 3: Verify**

```bash
npm run serve
```

Open the app. Expected: pinch-zoom works. Expected: the layout is unchanged — the nav still renders five items with the scan button raised.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: accessible nav labels and restore pinch-zoom

D7: the scan button had an empty label and no aria-label, so it was
announced as an unnamed button.
D8: maximum-scale=1.0 with user-scalable=no blocked pinch-zoom."
```

---

## Task 7: Deduplicate image compression (D10)

Two near-identical implementations exist: `utils.js:173` (`compressImage`, FileReader → data URL) and `camera.js:79` (`compressImageBlob`, object URL). The object-URL version is kept — it avoids holding a full base64 copy of the image in memory.

**Files:**
- Modify: `js/camera.js:6`, `js/camera.js:71-106`
- Modify: `js/utils.js:173-204` (delete `compressImage`)

**Interfaces:**
- Consumes: nothing
- Produces: `compressImage(fileOrBlob, maxWidth?, quality?) => Promise<Blob>`, exported from `js/services`-bound `camera.js`. A `File` is a `Blob`, so one implementation serves both call sites.

- [ ] **Step 1: Confirm nothing else imports the old helper**

```bash
grep -rn "compressImage" js/ index.html
```

Expected: references only in `js/utils.js` (the definition), and `js/camera.js` (the import at line 6 and the call at line 73). If any other file imports it, update that file in this task too.

- [ ] **Step 2: Replace the compression code in `js/camera.js`**

Change the import on line 6 to drop `compressImage`:

```javascript
import { blobToBase64 } from './utils.js';
```

Then replace `processImageFile` and `compressImageBlob` (lines 71–106) with a single exported implementation:

```javascript
// ── Compress an image (accepts a File or a Blob — a File is a Blob) ──
export function compressImage(fileOrBlob, maxWidth = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // Re-encoding through canvas also discards EXIF, which is how
      // GPS coordinates are kept out of anything sent to the API.
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Image compression failed')),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };

    img.src = url;
  });
}

// ── Process a file chosen from the gallery ──
export async function processImageFile(file) {
  const blob = await compressImage(file, 1024, 0.75);
  const base64 = await blobToBase64(blob);
  return { blob, base64 };
}
```

- [ ] **Step 3: Update the caller inside `capturePhoto`**

In `js/camera.js`, `capturePhoto` calls `compressImageBlob` at line 62. Change it to:

```javascript
        finalBlob = await compressImage(blob, 1024, 0.7);
```

- [ ] **Step 4: Delete the duplicate from `js/utils.js`**

Remove the entire `compressImage` function at `js/utils.js:173-204`, along with its `// ── Image Helpers ──` comment if that leaves it orphaned. Keep `blobToBase64` and `base64ToBlob` — both are still used.

- [ ] **Step 5: Verify both photo paths still work**

```bash
npm run serve
```

Test **both** routes, since they use different entry points:
1. Scan → choose a photo from the gallery (`processImageFile`)
2. Scan → capture from the camera (`capturePhoto`)

Expected: both produce a preview and a successful analysis.

- [ ] **Step 6: Commit**

```bash
git add js/camera.js js/utils.js
git commit -m "refactor: single image compression implementation

D10: near-identical compression existed in utils.js and camera.js. The
object-URL version is kept as it avoids holding a base64 copy of the
image in memory. A File is a Blob, so one function serves both paths."
```

---

## Task 8: Full verification and deploy

**Files:** none modified — this task is verification only.

- [ ] **Step 1: Run the whole test suite**

```bash
npm test
```

Expected: all tests pass, zero failures.

- [ ] **Step 2: Confirm no secret is tracked**

```bash
git grep --cached -l "AQ.Ab8RN6"
```

Expected: **no output**. Any output is a blocker — stop and remove the file from the index.

Note the flag order: `--cached` must precede the pattern, or git errors out and a shell fallback can make a failure look like a pass.

```bash
git status --porcelain
```

Expected: `js/config.js` does not appear (it is deleted and ignored).

- [ ] **Step 3: Desktop smoke test**

```bash
npm run serve
```

Walk the whole app: dashboard renders, scan a photo, log the meal, check it appears in history, open the AI chat and ask a question, change a setting, export CSV. Expected: no console errors.

- [ ] **Step 4: Deploy**

Push to GitHub, then connect the repository to **Cloudflare Pages** or enable **GitHub Pages** (Settings → Pages → deploy from `main`, root). Both are free and serve over HTTPS, which the PWA requires.

With `js/config.js` deleted, no secret exists in the repository, so it may be public.

- [ ] **Step 5: Install on the iPhone**

Open the deployed URL in **Safari** — only Safari can install to the Home Screen. Share → Add to Home Screen → Add. Launch from the new icon.

Expected: fullscreen, no browser chrome. Enter the Gemini API key when onboarding appears.

- [ ] **Step 6: Verify on-device, including the things only a real device can show**

1. **Camera** — capture a meal with the rear camera and confirm the analysis returns.
2. **Photo orientation** — capture in portrait and confirm the preview is not rotated or sideways. Canvas re-encoding can drop EXIF orientation; this is a known iOS pitfall and desktop testing will not reveal it.
3. **Safe areas** — confirm the header clears the notch and the nav bar clears the home indicator.
4. **Persistence** — force-quit the app, relaunch, and confirm logged meals and the API key survive.
5. **The D1 regression check** — make a small visible change (e.g. edit the dashboard greeting), redeploy, then reopen the installed app. **The change must appear.** If the old version persists, network-first is not working on-device and D1 is not fixed.

- [ ] **Step 7: Tag the release**

```bash
git tag -a v2.0.0-phase1 -m "Phase 1: foundation defect fixes"
git log --oneline
```

---

## Self-review

**Spec coverage.** Spec §6 items 1–7 map to Tasks 2, 2, 3, 4, 5, 6 and 7 respectively. Item 8 (module split) is deliberately deferred to Phase 2 with reasoning recorded above; the `core/` and `config/` directories and the test harness it depends on are created here. Defects D1–D5, D7, D8 and D10 all have tasks. D6 (offline scan queue) and D9 (undo) are Phase 3 per spec §8.4 and are correctly absent.

**Placeholders.** No TBD, TODO, "handle edge cases", or "similar to Task N". Every code step carries the actual code. Every verification step names the command and the expected result.

**Type consistency.** `escapeHtml` and `formatChatContent` are defined in Task 3 and used with those exact names in Task 3 Steps 9–10. `validateAnalysis` and `LIMITS` are defined in Task 4 and used with those names in its tests and in `gemini.js`. `MODEL_CANDIDATES`, `isModelUnavailableError` and `nextModel` are defined in Task 5 and used with those names in `callGemini`. `compressImage(fileOrBlob, maxWidth, quality) => Promise<Blob>` is defined once in Task 7 and called with that signature from both `capturePhoto` and `processImageFile`.

**Known risk.** Task 3 Step 10 requires locating food-name interpolations across ~886 lines of `js/ui.js` rather than naming exact line numbers, because the count shifts as edits are applied. The `grep` in that step enumerates them; the implementer must check every hit rather than assuming the listed fields are exhaustive.
