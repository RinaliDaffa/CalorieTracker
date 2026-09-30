import { type Nutrients, progressPercent } from '@nutrisnap/core';
import { formatNumber } from '@/lib/i18n';
import { nutrientLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';

const MACROS = [
  ['protein', 'bg-protein'],
  ['carbs', 'bg-carbs'],
  ['fat', 'bg-fat'],
  ['fiber', 'bg-fiber'],
  ['sugar', 'bg-sugar'],
] as const;

export function MacroCards({ totals, targets }: { totals: Nutrients; targets: Nutrients }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {MACROS.map(([key, bar]) => {
        const percent = Math.min(progressPercent(totals[key], targets[key]), 100);
        return (
          <li key={key} className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">{nutrientLabel(key)}</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatNumber(totals[key])}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">{m.unit_g()}</span>
            </p>
            <div
              role="progressbar"
              aria-label={nutrientLabel(key)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {m.macro_goal({ value: formatNumber(targets[key]) })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
