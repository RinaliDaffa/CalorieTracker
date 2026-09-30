import { greetingAt, mealTotals, sumNutrients, toDateKey } from '@nutrisnap/core';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, MessageCircle } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { mealsOn } from '@/db/meals';
import { db } from '@/db/schema';
import { currentTargets } from '@/db/targets';
import { MealList } from '@/features/common/MealList';
import { formatDateLong } from '@/lib/i18n';
import { greetingLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';
import { CalorieRing } from './CalorieRing';
import { MacroCards } from './MacroCards';

// Loaded on first open so the dialog stack stays out of the initial route.
const MealDetailSheet = lazy(() =>
  import('@/features/common/MealDetailSheet').then((mod) => ({ default: mod.MealDetailSheet })),
);

const ACTION =
  'flex shrink-0 flex-col items-center gap-1.5 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50';

export function Dashboard() {
  const today = toDateKey(new Date());
  const meals = useLiveQuery(() => mealsOn(db, today), [today]);
  const targets = useLiveQuery(() => currentTargets(db, today), [today]);
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [sheetUsed, setSheetUsed] = useState(false);

  if (!meals || !targets) return null;
  const totals = sumNutrients(meals.map((meal) => mealTotals(meal.items)));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{greetingLabel(greetingAt(new Date()))} 👋</h1>
        <p className="text-sm text-muted-foreground">
          {m.dashboard_subtitle({ date: formatDateLong(today) })}
        </p>
      </header>

      <CalorieRing eaten={totals.calories} target={targets.calories} />
      <MacroCards totals={totals} targets={targets} />

      <section aria-labelledby="quick-add">
        <h2 id="quick-add" className="mb-2 font-semibold">
          {m.quick_add()}
        </h2>
        <ul className="flex gap-3 overflow-x-auto pb-1" data-testid="quick-actions">
          <li>
            <Link to="/scan" className={ACTION}>
              <Camera className="size-5" />
              {m.action_scan()}
            </Link>
          </li>
          <li>
            <Link to="/chat" className={ACTION}>
              <MessageCircle className="size-5" />
              {m.action_ask()}
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="todays-meals">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="todays-meals" className="font-semibold">
            {m.todays_meals()}
          </h2>
          <span className="text-sm text-muted-foreground">
            {m.entries({ count: meals.length })}
          </span>
        </div>
        {meals.length > 0 ? (
          <MealList
            meals={meals}
            onOpen={(id) => {
              setSheetUsed(true);
              setOpenMeal(id);
            }}
          />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-3xl" aria-hidden="true">
              🍽️
            </p>
            <p className="font-semibold">{m.empty_meals_title()}</p>
            <p className="text-sm text-muted-foreground">{m.empty_meals_body()}</p>
          </div>
        )}
      </section>

      {sheetUsed ? (
        <Suspense fallback={null}>
          <MealDetailSheet mealId={openMeal} onClose={() => setOpenMeal(null)} />
        </Suspense>
      ) : null}
    </div>
  );
}
