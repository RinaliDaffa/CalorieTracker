import { greetingAt, mealTotals, sumNutrients, toDateKey } from '@nutrisnap/core';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, MessageCircle, PencilLine, Star } from 'lucide-react';
import { useState } from 'react';
import { mealsOn } from '@/db/meals';
import { db } from '@/db/schema';
import { currentTargets } from '@/db/targets';
import { LazyMealDetailSheet } from '@/features/common/LazyMealDetailSheet';
import { MealList } from '@/features/common/MealList';
import { formatDateLong } from '@/lib/i18n';
import { greetingLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';
import { CalorieRing } from './CalorieRing';
import { LazyFavoritesSheet, LazyManualAddSheet } from './LazySheets';
import { MacroCards } from './MacroCards';

const ACTION =
  'flex shrink-0 flex-col items-center gap-1.5 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50';

export function Dashboard() {
  const today = toDateKey(new Date());
  const meals = useLiveQuery(() => mealsOn(db, today), [today]);
  const targets = useLiveQuery(() => currentTargets(db, today), [today]);
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

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
            <button type="button" className={ACTION} onClick={() => setManualOpen(true)}>
              <PencilLine className="size-5" />
              {m.action_type()}
            </button>
          </li>
          <li>
            <button type="button" className={ACTION} onClick={() => setFavoritesOpen(true)}>
              <Star className="size-5" />
              {m.action_favorites()}
            </button>
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
          <MealList meals={meals} onOpen={setOpenMeal} />
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

      <LazyMealDetailSheet mealId={openMeal} onClose={() => setOpenMeal(null)} />
      <LazyManualAddSheet open={manualOpen} onOpenChange={setManualOpen} />
      <LazyFavoritesSheet open={favoritesOpen} onOpenChange={setFavoritesOpen} />
    </div>
  );
}
