import { greetingAt, mealTotals, sumNutrients } from '@nutrisnap/core';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, MessageCircle, PencilLine, Star } from 'lucide-react';
import { useState } from 'react';
import { mealsOn } from '@/db/meals';
import { db } from '@/db/schema';
import { currentTargets } from '@/db/targets';
import { EmptyPlate } from '@/features/common/EmptyPlate';
import { LazyMealDetailSheet } from '@/features/common/LazyMealDetailSheet';
import { MealList } from '@/features/common/MealList';
import { formatDateLong } from '@/lib/i18n';
import { greetingLabel } from '@/lib/labels';
import { useToday } from '@/lib/use-today';
import { m } from '@/paraglide/messages.js';
import { CalorieRing } from './CalorieRing';
import { LazyFavoritesSheet, LazyManualAddSheet } from './LazySheets';
import { MacroCards } from './MacroCards';

// Complete, non-overlapping class sets: this screen joins classes without tailwind-merge
// (it would add ~8 KB to the first screen), so a variant must never override a base class.
const TILE =
  'flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-3 text-center text-xs leading-tight font-semibold shadow-card transition-[transform,background-color] active:scale-[0.97] sm:text-sm';
const ACTION = `${TILE} bg-card hover:bg-muted`;
const ACTION_PRIMARY = `${TILE} border-primary bg-primary text-primary-foreground hover:bg-primary/90`;
const DISC = 'grid size-9 place-items-center rounded-full';
const ICON = `${DISC} bg-muted text-foreground`;
const ICON_PRIMARY = `${DISC} bg-primary-foreground/15 text-primary-foreground`;

export function Dashboard() {
  const today = useToday();
  const meals = useLiveQuery(() => mealsOn(db, today), [today]);
  const targets = useLiveQuery(() => currentTargets(db, today), [today]);
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  if (!meals || !targets) return null;
  const totals = sumNutrients(meals.map((meal) => mealTotals(meal.items)));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {m.dashboard_subtitle({ date: formatDateLong(today) })}
        </p>
        <h1 className="text-3xl font-extrabold">
          {greetingLabel(greetingAt(new Date()))}{' '}
          <span aria-hidden="true" className="inline-block origin-[70%_70%]">
            👋
          </span>
        </h1>
      </header>

      <CalorieRing eaten={totals.calories} target={targets.calories} />
      <MacroCards totals={totals} targets={targets} />

      <section aria-labelledby="quick-add">
        <h2 id="quick-add" className="mb-3 text-lg font-bold">
          {m.quick_add()}
        </h2>
        <ul className="grid grid-cols-4 gap-2.5 sm:gap-3" data-testid="quick-actions">
          <li>
            <Link to="/scan" className={ACTION_PRIMARY}>
              <span className={ICON_PRIMARY}>
                <Camera className="size-5" />
              </span>
              {m.action_scan()}
            </Link>
          </li>
          <li>
            <button type="button" className={ACTION} onClick={() => setManualOpen(true)}>
              <span className={ICON}>
                <PencilLine className="size-5" />
              </span>
              {m.action_type()}
            </button>
          </li>
          <li>
            <button type="button" className={ACTION} onClick={() => setFavoritesOpen(true)}>
              <span className={ICON}>
                <Star className="size-5" />
              </span>
              {m.action_favorites()}
            </button>
          </li>
          <li>
            <Link to="/chat" className={ACTION}>
              <span className={ICON}>
                <MessageCircle className="size-5" />
              </span>
              {m.action_ask()}
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="todays-meals">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="todays-meals" className="text-lg font-bold">
            {m.todays_meals()}
          </h2>
          <span className="text-sm text-muted-foreground">
            {m.entries({ count: meals.length })}
          </span>
        </div>
        {meals.length > 0 ? (
          <MealList meals={meals} onOpen={setOpenMeal} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed bg-card/50 px-6 py-10 text-center">
            <EmptyPlate />
            <p className="mt-2 font-display text-lg font-bold">{m.empty_meals_title()}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{m.empty_meals_body()}</p>
          </div>
        )}
      </section>

      <LazyMealDetailSheet mealId={openMeal} onClose={() => setOpenMeal(null)} />
      <LazyManualAddSheet open={manualOpen} onOpenChange={setManualOpen} />
      <LazyFavoritesSheet open={favoritesOpen} onOpenChange={setFavoritesOpen} />
    </div>
  );
}
