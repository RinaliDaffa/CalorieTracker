import { type Nutrients, progressPercent } from '@nutrisnap/core';
import { formatNumber } from '@/lib/i18n';
import { nutrientLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

type MacroKey = 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar';

const BAR: Record<MacroKey, string> = {
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
  fiber: 'bg-fiber',
  sugar: 'bg-sugar',
};

function Meter({ name, percent }: { name: MacroKey; percent: number }) {
  return (
    <div
      role="progressbar"
      aria-label={nutrientLabel(name)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700', BAR[name])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** The three macros people steer by get full tiles; fiber and sugar sit in a quieter row. */
export function MacroCards({ totals, targets }: { totals: Nutrients; targets: Nutrients }) {
  const pct = (key: MacroKey) => Math.min(progressPercent(totals[key], targets[key]), 100);
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {(['protein', 'carbs', 'fat'] as const).map((key) => (
          <li key={key} className="space-y-2 rounded-2xl border bg-card p-3 shadow-card sm:p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span aria-hidden="true" className={cn('size-2 rounded-full', BAR[key])} />
              {nutrientLabel(key)}
            </p>
            <p className="font-display text-xl font-bold tabular-nums sm:text-2xl">
              {formatNumber(totals[key])}
              <span className="ml-0.5 font-sans text-xs font-medium text-muted-foreground">
                {m.unit_g()}
              </span>
            </p>
            <Meter name={key} percent={pct(key)} />
            <p className="text-[11px] text-muted-foreground">
              {m.macro_goal({ value: formatNumber(targets[key]) })}
            </p>
          </li>
        ))}
      </ul>
      <section
        aria-label={m.macros_more()}
        className="grid grid-cols-2 gap-x-5 gap-y-2 rounded-2xl border bg-card px-4 py-3"
      >
        {(['fiber', 'sugar'] as const).map((key) => (
          <div key={key} className="space-y-1.5">
            <p className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-muted-foreground">{nutrientLabel(key)}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{formatNumber(totals[key])}</span>
                <span className="text-muted-foreground">
                  {' '}
                  {m.macro_goal({ value: formatNumber(targets[key]) })}
                </span>
              </span>
            </p>
            <Meter name={key} percent={pct(key)} />
          </div>
        ))}
      </section>
    </div>
  );
}
