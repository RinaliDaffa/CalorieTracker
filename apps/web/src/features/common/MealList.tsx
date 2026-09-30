import { mealTotals } from '@nutrisnap/core';
import type { MealRecord } from '@/db/schema';
import { formatNumber, formatTime } from '@/lib/i18n';
import { mealTypeLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';
import { MealThumb } from './MealThumb';

export function MealList({ meals, onOpen }: { meals: MealRecord[]; onOpen: (id: string) => void }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {meals.map((meal) => (
        <li key={meal.id}>
          <button
            type="button"
            onClick={() => onOpen(meal.id)}
            className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 focus-visible:bg-muted/50"
          >
            <MealThumb meal={meal} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{mealTypeLabel(meal.mealType)}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {meal.items.map((i) => i.name).join(', ') || m.no_items()}
              </span>
              <span className="block text-xs text-muted-foreground">{formatTime(meal.time)}</span>
            </span>
            <span className="text-right">
              <span className="block font-semibold tabular-nums">
                {formatNumber(mealTotals(meal.items).calories)}
              </span>
              <span className="block text-xs text-muted-foreground">{m.unit_kcal()}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
