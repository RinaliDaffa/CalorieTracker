import { itemTotals, mealTotals } from '@nutrisnap/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { addFavorite } from '@/db/favorites';
import { setMealType } from '@/db/meals';
import { db } from '@/db/schema';
import { HealthBadge } from '@/features/common/HealthBadge';
import { MealTypePicker } from '@/features/common/MealTypePicker';
import { NutritionTable } from '@/features/common/NutritionTable';
import { formatNumber } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

export function ResultView({ mealId, onDone }: { mealId: string; onDone: () => void }) {
  const meal = useLiveQuery(() => db.meals.get(mealId), [mealId]);
  if (!meal || meal.deletedAt !== undefined) return null;

  async function saveFavorite() {
    if (!meal) return;
    const name = meal.description || meal.items.map((i) => i.name).join(', ');
    await addFavorite(db, name, meal.items);
    toast.success(m.favorite_saved());
  }

  return (
    <section aria-labelledby="result-title" className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="result-title" className="text-lg font-semibold">
            {m.result_title()}
          </h2>
          {meal.description ? (
            <p className="text-sm text-muted-foreground">{meal.description}</p>
          ) : null}
        </div>
        {typeof meal.healthScore === 'number' ? <HealthBadge score={meal.healthScore} /> : null}
      </div>
      <ul className="divide-y" data-testid="result-items">
        {meal.items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: items have no id and never reorder
          <li key={index} className="flex items-center justify-between gap-3 py-2">
            <span>
              <span className="block font-medium">{item.name}</span>
              {item.servingText ? (
                <span className="block text-xs text-muted-foreground">{item.servingText}</span>
              ) : null}
            </span>
            <span className="tabular-nums">
              {formatNumber(itemTotals(item).calories)} {m.unit_kcal()}
            </span>
          </li>
        ))}
      </ul>
      <NutritionTable totals={mealTotals(meal.items)} />
      {meal.tip ? (
        <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">💡 {meal.tip}</p>
      ) : null}
      <MealTypePicker
        value={meal.mealType}
        onChange={(type) => void setMealType(db, meal.id, type)}
      />
      <div className="flex gap-2">
        <Button className="flex-1" onClick={onDone}>
          {m.done()}
        </Button>
        <Button variant="secondary" onClick={() => void saveFavorite()}>
          {m.add_favorite()}
        </Button>
      </div>
    </section>
  );
}
