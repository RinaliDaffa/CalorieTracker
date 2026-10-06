# Rules for AI coding agents in this repository

These rules apply to every agent (Antigravity/Gemini, Claude, others) and override any default behavior.

**Current assignment:** if you are Antigravity / Gemini, your work is defined in `docs/superpowers/handoff/2026-10-06-antigravity-handoff.md`. Read it completely before doing anything else.

## Never

1. Never `git push`, open pull requests, deploy, create accounts, or call external services. The owner gives that go-ahead personally, each time.
2. Never put a Gemini API key (`AIza…`) in code, tests, logs, URLs, commits or exports. The key is sent only in the `x-goog-api-key` header.
3. Never modify, delete or create the legacy IndexedDB database `nutrisnap`. It is read-only, forever.
4. Never use `dangerouslySetInnerHTML` or `innerHTML`. AI and user text is rendered as React text only.
5. Never redesign or restyle the UI: no new colors, fonts, spacing, animations, layouts or components. The UI/UX design pass is reserved for Claude. Use the plan's JSX and classes as written.
6. Never edit `docs/superpowers/specs/*` or `docs/superpowers/plans/*`. Report problems instead.
7. Never weaken a test to make it pass (deleting assertions, adding skips, timeouts above 15 s).
8. Never raise the bundle budget (`LIMIT_BYTES` in `apps/web/scripts/check-bundle.mjs`) or lazy-load the Dashboard to get under it.
9. Never `import … from 'sonner'` outside `src/lib/toast.ts` and `src/shell/SonnerToaster.tsx`. Use `import { toast } from '@/lib/toast'`.
10. Never use `git add -A` or `git add .`. Stage the exact paths the task names.

## Always

- Every user-visible string goes through Paraglide (`m.key()`), with the key added to **both** `apps/web/messages/en.json` and `apps/web/messages/id.json`.
- Deletes are soft (`deletedAt`); undo clears it.
- Before committing, run the gate from the repo root: `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @nutrisnap/web build && pnpm --filter @nutrisnap/web budget && pnpm e2e`. All must exit 0.
- One task = one commit (or a small series), on branch `sp0-rebuild`.

## Commits

Subject from the plan; trailer naming the model that actually wrote the code. For Gemini in Antigravity, the trailer is `Assisted-by: Gemini 3.8 Flash (Antigravity)`.

PowerShell (Windows default terminal):

```powershell
@'
feat(web): subject line from the plan

Assisted-by: Gemini 3.8 Flash (Antigravity)
'@ | git commit -F -
```

The closing `'@` must be at the start of its line. In Git Bash, use `git commit -F - <<'EOF'` … `EOF`.

## Layout

- `packages/core`: pure TypeScript logic (no DOM, no I/O)
- `packages/ai`: Gemini client and prompts
- `packages/platform`: camera, image, file and storage adapters
- `apps/web`: the React 19 PWA (Vite 8, TanStack Router, Dexie, Paraglide, Tailwind 4, shadcn/Radix)
- `legacy/`: the old app, kept until SP0 ships
