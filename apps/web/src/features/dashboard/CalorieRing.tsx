import { progressPercent } from '@nutrisnap/core';
import { clsx as cx } from 'clsx';
import type { CSSProperties } from 'react';
import { formatNumber } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The one number people act on is what's left, so it leads; the ring shows what's eaten. */
export function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const percent = Math.min(progressPercent(eaten, target), 100);
  const remaining = Math.max(0, target - eaten);
  const over = eaten - target;
  const isOver = over > 0.5;
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-card sm:p-6">
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -top-24 -right-20 size-64 rounded-full blur-3xl',
          isOver ? 'bg-destructive/15' : 'bg-primary/15',
        )}
      />
      <div className="relative flex items-center gap-5 sm:gap-8">
        <div
          className="relative size-36 shrink-0 sm:size-44"
          role="img"
          aria-label={m.ring_label({ eaten: formatNumber(eaten), target: formatNumber(target) })}
        >
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="11"
              className="stroke-muted"
            />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="11"
              strokeLinecap="round"
              className={cx(
                'animate-ring-draw transition-[stroke-dashoffset] duration-700',
                isOver ? 'stroke-destructive' : 'stroke-primary',
              )}
              style={{ '--ring-circumference': `${CIRCUMFERENCE}` } as CSSProperties}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold tabular-nums sm:text-4xl">
              {formatNumber(eaten)}
            </span>
            <span className="text-xs text-muted-foreground">{m.kcal_eaten()}</span>
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p
            className={cx(
              'font-display text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl',
              isOver && 'text-destructive',
            )}
            data-testid="calories-remaining"
          >
            {remaining > 0 ? m.kcal_remaining({ kcal: formatNumber(remaining) }) : m.goal_reached()}
          </p>
          <p className="text-sm text-muted-foreground">
            {isOver
              ? m.ring_over({ kcal: formatNumber(over) })
              : m.ring_goal({ kcal: formatNumber(target) })}
          </p>
        </div>
      </div>
    </section>
  );
}
