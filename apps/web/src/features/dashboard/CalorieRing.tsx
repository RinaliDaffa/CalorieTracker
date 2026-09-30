import { progressPercent } from '@nutrisnap/core';
import { formatNumber } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const percent = Math.min(progressPercent(eaten, target), 100);
  const remaining = Math.max(0, target - eaten);
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-5">
      <div
        className="relative size-44"
        role="img"
        aria-label={m.ring_label({ eaten: formatNumber(eaten), target: formatNumber(target) })}
      >
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            className="stroke-muted"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-700"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{formatNumber(eaten)}</span>
          <span className="text-xs text-muted-foreground">{m.kcal_eaten()}</span>
        </div>
      </div>
      <p className="text-sm font-medium" data-testid="calories-remaining">
        {remaining > 0 ? m.kcal_remaining({ kcal: formatNumber(remaining) }) : m.goal_reached()}
      </p>
    </div>
  );
}
