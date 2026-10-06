import { type FoodItem, itemTotals, mealTotals } from '@nutrisnap/core';
import { formatNumber } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';
import { HealthBadge } from './HealthBadge';
import { NutritionTable } from './NutritionTable';

/**
 * A meal as a receipt: everyone already knows how to read one. Items with
 * dotted leaders, a bold total, then the macros and the one tip.
 */
export function MealReceipt({
  items,
  healthScore,
  tip,
  itemsTestId,
}: {
  items: FoodItem[];
  healthScore?: number | null;
  tip?: string | null;
  itemsTestId?: string;
}) {
  const totals = mealTotals(items);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed bg-background/60 px-4 pt-3 pb-4">
        <ul data-testid={itemsTestId}>
          {items.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: items have no id and never reorder
            <li key={index} className="receipt-line py-2.5">
              <span className="min-w-0">
                <span className="block font-medium">{item.name}</span>
                {item.servingText ? (
                  <span className="block text-xs text-muted-foreground">{item.servingText}</span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatNumber(itemTotals(item).calories)} {m.unit_kcal()}
              </span>
            </li>
          ))}
        </ul>
        <p className="receipt-line mt-1 border-t-2 border-foreground/80 pt-3 font-display text-lg font-bold">
          <span>{m.receipt_total()}</span>
          <span className="tabular-nums">
            {formatNumber(totals.calories)} {m.unit_kcal()}
          </span>
        </p>
      </div>
      <NutritionTable totals={totals} />
      {typeof healthScore === 'number' ? <HealthBadge score={healthScore} /> : null}
      {tip ? (
        <p className="flex gap-2.5 rounded-2xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
          <span aria-hidden="true">💡</span>
          <span>{tip}</span>
        </p>
      ) : null}
    </div>
  );
}
