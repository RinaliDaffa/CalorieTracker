# NutriSnap UI/UX design pass (SP0)

**Date:** 2026-10-06 · **Owner decision:** design delegated to Claude ("continue and finish the rest"). · **Branch:** `sp0-rebuild`

## Intent

The rebuilt app works, but it looks like a stock component template: the same dark blue-grey and emerald as a thousand other apps, and numbers laid out as tables. The owner wants it to feel **useful and impressive**. Users don't read about accuracy; they glance at a result and it has to make sense.

Success criteria:
- A first-time user understands the dashboard in one glance: **how much is left today**.
- A scan result reads like something familiar (a receipt), not like a data table.
- The app has its own look: warm, food-first, rooted in Indonesia. It is identifiable from a screenshot.
- No regressions: every e2e test, axe check, the 150 KB initial-JS budget and the Lighthouse thresholds (performance ≥ 0.90, accessibility ≥ 0.95) still pass.

## Direction: "warung receipt"

Warm charcoal and rice-paper surfaces, a turmeric (*kunyit*) accent, and meals presented as receipts: item names, dotted leaders, the number on the right, and a bold total.

### Colour tokens

| Token | Dark (default) | Light |
|---|---|---|
| background | `#12100e` | `#f6f1e9` |
| card / popover | `#1c1916` | `#fffcf7` |
| muted / secondary | `#27231f` | `#eee6da` |
| border | `#2f2a25` | `#e2d8c9` |
| input | `#3b352f` | `#d3c7b6` |
| foreground | `#f4efe8` | `#1d1813` |
| muted-foreground | `#aaa196` | `#665a4d` |
| primary (turmeric) | `#f4b13e`, text `#231603` | `#a15c00`, text `#ffffff` |
| accent (tip callout) | `#2b2416` / `#f6d58f` | `#fbefd6` / `#6b3f00` |
| destructive (chili) | `#ff8466` (text), button `#c2391d` | `#b42d14` |
| good (health ≥ 7) | `#6fd39a` | `#1f7a47` |
| macro: protein, carbs, fat, fiber, sugar | `#6aa6ff`, `#b49cff`, `#ff8a5c`, `#7cc68a`, `#f07fb2` | `#2f6fd6`, `#7656d8`, `#d4562b`, `#3d8a4f`, `#c4447f` |

All text pairs meet WCAG AA (4.5:1 for body text, 3:1 for large text and UI). Primary differs between themes because turmeric on cream fails contrast as text.

### Typography

- **Plus Jakarta Sans** (variable; Tokotype, designed in Jakarta) for all UI text.
- **Bricolage Grotesque** (variable) for display: headings, and the big numbers on the ring, totals and stats.
- Both are self-hosted through `@fontsource-variable/*`. They are bundled as same-origin `woff2`, with no third-party request, preserving the "no network except Gemini" rule. They are precached by the service worker, use `font-display: swap`, and load only the Latin unicode ranges a page actually uses.
- Numbers always use `tabular-nums`.

### Shape and motion

- Radius 1rem for cards, 0.75rem for controls; touch targets ≥ 44 px.
- Sheets get a grab handle and a 1.5rem top radius.
- Motion is limited to: the ring drawing in on first paint, a 160 ms fade-up of screen content, and button press scale. All of it is off under `prefers-reduced-motion`.

## Screen-by-screen

1. **Shell:** bottom nav with an active-pill indicator and a raised turmeric Scan button. On desktop, a sidebar with a brand mark. The brand mark is an inline SVG (a plate with a bite taken out), so it adds no network request.
2. **Welcome:** brand mark, display headline, three one-line benefits (fast, private on-device, free), then the key form. The "Later" path is unchanged.
3. **Dashboard:**
   - **Hero:** the ring (eaten) plus the **remaining** line as the headline number (`data-testid="calories-remaining"` keeps its exact text) and a "of N kcal goal" line. When over target, the ring and number turn chili.
   - **Macros:** protein, carbs and fat as three equal tiles; fiber and sugar as a compact secondary row.
   - **Quick add:** a 4-column grid that always fits 360 px; Scan is the filled tile.
   - **Meals:** rows show meal type and time on one line, items below, kcal on the right in the display face.
   - **Empty state:** an illustrated plate, no emoji.
4. **Receipt** (shared by the scan result and meal detail):
   - item rows with dotted leaders and serving text, then a bold total row;
   - a health badge coloured by band (good / fair / poor);
   - macro chips;
   - the tip as a turmeric callout.

   `NutritionTable` stays a real `<table>`, styled as receipt lines.
5. **Scan:** a viewfinder with corner brackets, a calm hint, and the three round controls. The result card scrolls into view when it appears (smoothly, unless the user prefers reduced motion).
6. **History:**
   - calendar with a turmeric selected day, a ring on today and logged dots;
   - the day summary as stat tiles;
   - a taller weekly chart, with the kcal value above each bar and a labelled goal line.
7. **Chat:** turmeric user bubbles with dark text, card-coloured assistant bubbles with a small brand avatar, and suggestion chips.
8. **Settings:** consistent section cards; data rows stack on phones instead of squeezing the description.

## Rules kept from SP0

- Every test ID, role, accessible name and visible string the e2e tests assert stays the same. New copy gets new message keys in **both** `en.json` and `id.json`.
- No new runtime JavaScript dependency. Fonts are CSS and font files only.
- Toasts via `@/lib/toast`; no `innerHTML`.
- Bundle budget checked after the change.

## Verification

Gate (`format`, `lint`, `typecheck`, `test`, `build`, `budget`, `e2e`), Lighthouse CI, and before/after screenshots at 390×844 and 1280×800 in both themes, reviewed against this spec.
