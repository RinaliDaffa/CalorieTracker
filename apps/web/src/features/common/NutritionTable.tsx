import { NUTRIENT_KEYS, type Nutrients } from '@nutrisnap/core';
import { formatNumber } from '@/lib/i18n';
import { nutrientLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';

const DOT: Record<keyof Nutrients, string> = {
  calories: 'bg-primary',
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
  fiber: 'bg-fiber',
  sugar: 'bg-sugar',
};

/** Still a real table for screen readers; laid out as a grid of chips. */
export function NutritionTable({ totals }: { totals: Nutrients }) {
  return (
    <table className="block w-full text-sm">
      <caption className="sr-only">{m.total_nutrition()}</caption>
      <tbody className="grid grid-cols-3 gap-2">
        {NUTRIENT_KEYS.map((key) => (
          <tr key={key} className="flex flex-col rounded-xl bg-muted px-3 py-2">
            <th
              scope="row"
              className="flex items-center gap-1.5 text-left text-[11px] font-medium text-muted-foreground"
            >
              <span className={`size-1.5 rounded-full ${DOT[key]}`} aria-hidden="true" />
              {nutrientLabel(key)}
            </th>
            <td className="font-semibold tabular-nums">
              {formatNumber(totals[key])}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {key === 'calories' ? m.unit_kcal() : m.unit_g()}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
