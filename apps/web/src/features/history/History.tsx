import {
  mealTotals,
  monthGrid,
  parseDateKey,
  shiftMonth,
  sumNutrients,
  toDateKey,
  weekKeys,
} from '@nutrisnap/core';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { mealsBetween } from '@/db/meals';
import { db } from '@/db/schema';
import { currentTargets } from '@/db/targets';
import { LazyMealDetailSheet } from '@/features/common/LazyMealDetailSheet';
import { MealList } from '@/features/common/MealList';
import { formatDateLong, formatNumber } from '@/lib/i18n';
import { nutrientLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';
import { MonthCalendar } from './MonthCalendar';
import { WeeklyChart } from './WeeklyChart';

export function History() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { date?: string };
  const today = toDateKey(new Date());
  const selected = search.date ?? today;
  const selectedDate = parseDateKey(selected);
  const [view, setView] = useState({
    year: selectedDate.getFullYear(),
    month0: selectedDate.getMonth(),
  });
  const [openMeal, setOpenMeal] = useState<string | null>(null);

  const cells = monthGrid(view.year, view.month0);
  const week = weekKeys(selected);
  const from = [cells[0]?.key ?? selected, week[0] ?? selected].sort()[0] ?? selected;
  const to = [cells.at(-1)?.key ?? selected, week[6] ?? selected].sort().at(-1) ?? selected;

  const meals = useLiveQuery(() => mealsBetween(db, from, to), [from, to]);
  const targets = useLiveQuery(() => currentTargets(db, selected), [selected]);
  if (!meals || !targets) return null;

  const logged = new Set(meals.map((meal) => meal.date));
  const dayMeals = meals.filter((meal) => meal.date === selected);
  const dayTotals = sumNutrients(dayMeals.map((meal) => mealTotals(meal.items)));
  const weekDays = week.map((key) => ({
    key,
    calories: sumNutrients(
      meals.filter((meal) => meal.date === key).map((meal) => mealTotals(meal.items)),
    ).calories,
  }));

  function select(date: string) {
    void navigate({ to: '/history', search: { date } });
  }

  function shift(delta: number) {
    const next = shiftMonth(view.year, view.month0, delta);
    setView(next);
    const now = new Date();
    const isCurrent = next.year === now.getFullYear() && next.month0 === now.getMonth();
    select(isCurrent ? today : toDateKey(new Date(next.year, next.month0, 1)));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{m.title_history()}</h1>
      <MonthCalendar
        year={view.year}
        month0={view.month0}
        selected={selected}
        today={today}
        logged={logged}
        onSelect={select}
        onShift={shift}
      />

      <section
        aria-labelledby="day-summary"
        className="rounded-3xl border bg-card p-4 shadow-card sm:p-5"
      >
        <h2 id="day-summary" className="mb-3 text-lg font-bold">
          {formatDateLong(selected)}
        </h2>
        {dayMeals.length > 0 ? (
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-5" data-testid="day-summary">
            <div className="col-span-2 rounded-2xl bg-accent p-3 text-accent-foreground sm:col-span-1">
              <dt className="text-xs font-medium">{nutrientLabel('calories')}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">
                {formatNumber(dayTotals.calories)}
                <span className="ml-1 font-sans text-xs font-medium">{m.unit_kcal()}</span>
              </dd>
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <dt className="text-xs font-medium text-muted-foreground">
                {m.history_meals_logged()}
              </dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{dayMeals.length}</dd>
            </div>
            {(['protein', 'carbs', 'fat'] as const).map((key) => (
              <div key={key} className="rounded-2xl bg-muted p-3">
                <dt className="text-xs font-medium text-muted-foreground">{nutrientLabel(key)}</dt>
                <dd className="text-lg font-bold tabular-nums">
                  {formatNumber(dayTotals[key])}
                  <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                    {m.unit_g()}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {m.history_empty()}
          </p>
        )}
      </section>

      <section
        aria-labelledby="weekly"
        className="rounded-3xl border bg-card p-4 shadow-card sm:p-5"
      >
        <h2 id="weekly" className="mb-3 text-lg font-bold">
          {m.history_weekly()}
        </h2>
        <WeeklyChart days={weekDays} goal={targets.calories} today={today} />
      </section>

      {dayMeals.length > 0 ? <MealList meals={dayMeals} onOpen={setOpenMeal} /> : null}
      <LazyMealDetailSheet mealId={openMeal} onClose={() => setOpenMeal(null)} />
    </div>
  );
}
