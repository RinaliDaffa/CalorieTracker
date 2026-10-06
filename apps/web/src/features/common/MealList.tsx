import { mealTotals } from '@nutrisnap/core';
import { ChevronRight } from 'lucide-react';
import type { MealRecord } from '@/db/schema';
import { formatNumber, formatTime } from '@/lib/i18n';
import { mealTypeLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';
import { MealThumb } from './MealThumb';

export function MealList({ meals, onOpen }: { meals: MealRecord[]; onOpen: (id: string) => void }) {
  return (
    <ul className="space-y-2.5">
      {meals.map((meal) => (
        <li key={meal.id}>
          <button
            type="button"
            onClick={() => onOpen(meal.id)}
            className="group flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-card transition-[transform,background-color] hover:bg-muted/60 focus-visible:bg-muted/60 active:scale-[0.99]"
          >
            <MealThumb meal={meal} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="font-semibold">{mealTypeLabel(meal.mealType)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(meal.time)}
                </span>
              </span>
              <span className="block truncate text-sm text-muted-foreground">
                {meal.items.map((i) => i.name).join(', ') || m.no_items()}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-display text-lg leading-none font-bold tabular-nums">
                {formatNumber(mealTotals(meal.items).calories)}
              </span>
              <span className="text-[11px] text-muted-foreground">{m.unit_kcal()}</span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
