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

export function NutritionTable({ totals }: { totals: Nutrients }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{m.total_nutrition()}</caption>
      <tbody className="divide-y">
        {NUTRIENT_KEYS.map((key) => (
          <tr key={key}>
            <th scope="row" className="py-1.5 text-left font-normal">
              <span
                className={`mr-2 inline-block size-2 rounded-full ${DOT[key]}`}
                aria-hidden="true"
              />
              {nutrientLabel(key)}
            </th>
            <td className="py-1.5 text-right tabular-nums">
              {formatNumber(totals[key])} {key === 'calories' ? m.unit_kcal() : m.unit_g()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
