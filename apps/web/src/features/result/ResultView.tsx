import { useLiveQuery } from 'dexie-react-hooks';
import { CircleCheck, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { addFavorite } from '@/db/favorites';
import { setMealType } from '@/db/meals';
import { db } from '@/db/schema';
import { MealReceipt } from '@/features/common/MealReceipt';
import { MealTypePicker } from '@/features/common/MealTypePicker';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

export function ResultView({ mealId, onDone }: { mealId: string; onDone: () => void }) {
  const meal = useLiveQuery(() => db.meals.get(mealId), [mealId]);
  // One favorite per result: a second tap would store a duplicate.
  const [favorited, setFavorited] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const shown = Boolean(meal && meal.deletedAt === undefined);

  // The result lands below the viewfinder; bring it into view once it exists.
  useEffect(() => {
    if (!shown) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sectionRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [shown]);

  if (!meal || meal.deletedAt !== undefined) return null;

  async function saveFavorite() {
    if (!meal || favorited) return;
    setFavorited(true);
    const name = meal.description || meal.items.map((i) => i.name).join(', ');
    try {
      await addFavorite(db, name, meal.items);
      toast.success(m.favorite_saved());
    } catch {
      setFavorited(false);
    }
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="result-title"
      className="animate-rise scroll-mt-4 space-y-4 rounded-3xl border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-good" />
        <div className="min-w-0">
          <h2 id="result-title" className="text-xl font-bold">
            {m.result_title()}
          </h2>
          {meal.description ? (
            <p className="text-sm text-muted-foreground">{meal.description}</p>
          ) : null}
        </div>
      </div>
      <MealReceipt
        items={meal.items}
        healthScore={meal.healthScore}
        tip={meal.tip}
        itemsTestId="result-items"
      />
      <MealTypePicker
        value={meal.mealType}
        onChange={(type) => void setMealType(db, meal.id, type)}
      />
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={onDone}>
          {m.done()}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          disabled={favorited}
          onClick={() => void saveFavorite()}
        >
          <Star className={favorited ? 'fill-current' : undefined} />
          {m.add_favorite()}
        </Button>
      </div>
    </section>
  );
}
