# NutriSnap

Snap your meal, see the calories. A free, installable calorie tracker that works on iPhone, Android and desktop, in Indonesian and English. Your data stays on your device.

- **Scan, type or pick a favorite.** Every result is saved at once and reads like a receipt: items, portions, a total. Undo is one tap.
- **Know what's left today.** The dashboard leads with the calories remaining, then protein, carbs and fat.
- **History and a coach.** A month calendar, a weekly chart, and an AI chat that knows today's meals.
- **Private and offline.** Meals live in your browser's storage. The app opens without a connection. Your Gemini key is sent only to Google, in a request header.
- **Free.** It runs on your own free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Everything except AI analysis works without one.

## Use it

Open the site, add your free Gemini API key (or tap "Later"), and install it: on iPhone, Safari → Share → Add to Home Screen; on Android or desktop, "Install app" in Chrome.

## Develop

Requires Node 24 and pnpm 11.

```bash
pnpm install
pnpm --filter @nutrisnap/web dev      # http://localhost:5173
pnpm test                             # unit tests (all packages)
pnpm e2e                              # Playwright: Chromium, WebKit, Firefox × phone and desktop
pnpm lint && pnpm typecheck
pnpm --filter @nutrisnap/web build && pnpm --filter @nutrisnap/web budget   # initial JS ≤ 150 KB gzip
pnpm --filter @nutrisnap/web lhci     # Lighthouse: performance ≥ 0.90, accessibility ≥ 0.95
```

## Layout

- `packages/core`: pure nutrition, date and target logic (unit-tested)
- `packages/ai`: Gemini prompts, response schema and the model-fallback client
- `packages/platform`: camera, image, file and storage adapters
- `apps/web`: the React 19 PWA (Vite, TanStack Router, Dexie, Paraglide, Tailwind, Radix)
- `legacy/`: the previous plain-JavaScript app, kept only until existing data has moved to the new one (`pnpm legacy:serve`, then Settings → "Export JSON"; import it in the new app's Settings)

Design: `docs/superpowers/specs/`. Plans: `docs/superpowers/plans/`.
