import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { BrandMark } from '@/features/common/BrandMark';
import { m } from '@/paraglide/messages.js';

// Plain classes on purpose: the error page must render even when the chunk that
// holds the shared Button failed to load (often the very error being shown).
const ACTION =
  'inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function Fallback({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandMark className="size-12" />
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      {action}
    </main>
  );
}

/** Unknown URLs (old links, typos) get a way home instead of the router's bare default. */
export function NotFound() {
  return (
    <Fallback
      title={m.not_found_title()}
      body={m.not_found_body()}
      action={
        <Link to="/" className={ACTION}>
          {m.back_home()}
        </Link>
      }
    />
  );
}

/** A failed route chunk or database read: say the data is safe and offer a reload. */
export function RouteError() {
  return (
    <Fallback
      title={m.crash_title()}
      body={m.crash_body()}
      action={
        <button type="button" className={ACTION} onClick={() => window.location.reload()}>
          {m.reload()}
        </button>
      }
    />
  );
}
