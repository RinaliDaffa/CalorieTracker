import { itemTotals, mealTotals } from '@nutrisnap/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getMealWithPhoto, restoreMeal, softDeleteMeal } from '@/db/meals';
import { db } from '@/db/schema';
import { formatNumber, formatTime } from '@/lib/i18n';
import { mealTypeLabel } from '@/lib/labels';
import { toast } from '@/lib/toast';
import { useObjectUrl } from '@/lib/use-object-url';
import { m } from '@/paraglide/messages.js';
import { HealthBadge } from './HealthBadge';
import { NutritionTable } from './NutritionTable';

export function MealDetailSheet({
  mealId,
  onClose,
  returnFocusTo,
}: {
  mealId: string | null;
  onClose: () => void;
  /** Where focus goes on close if the element that opened the sheet is gone. Defaults to <main>. */
  returnFocusTo?: () => HTMLElement | null;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const data = useLiveQuery(() => (mealId ? getMealWithPhoto(db, mealId) : undefined), [mealId]);
  const photoUrl = useObjectUrl(data?.photo?.full);

  async function remove(id: string) {
    await softDeleteMeal(db, id);
    onClose();
    toast(m.deleted(), { action: { label: m.undo(), onClick: () => void restoreMeal(db, id) } });
  }

  const meal = data?.meal;
  return (
    <Sheet open={mealId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto rounded-t-2xl"
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          // Controlled sheet without a trigger: Radix would focus null, so restore focus ourselves.
          event.preventDefault();
          const target = opener.current?.isConnected
            ? opener.current
            : (returnFocusTo?.() ?? document.getElementById('main'));
          target?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{meal ? mealTypeLabel(meal.mealType) : m.detail_items()}</SheetTitle>
          <SheetDescription>{meal ? formatTime(meal.time) : ''}</SheetDescription>
        </SheetHeader>
        {meal ? (
          <div className="space-y-4 px-4 pb-6">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={m.meal_photo_alt()}
                className="max-h-56 w-full rounded-xl object-cover"
              />
            ) : null}
            {typeof meal.healthScore === 'number' ? <HealthBadge score={meal.healthScore} /> : null}
            <section aria-labelledby="detail-items">
              <h3 id="detail-items" className="mb-1 font-semibold">
                {m.detail_items()}
              </h3>
              <ul className="divide-y">
                {meal.items.map((item, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: items have no id and never reorder
                  <li key={index} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <span className="block">{item.name}</span>
                      {item.servingText ? (
                        <span className="block text-xs text-muted-foreground">
                          {item.servingText}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">
                      {formatNumber(itemTotals(item).calories)} {m.unit_kcal()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <NutritionTable totals={mealTotals(meal.items)} />
            {meal.tip ? (
              <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                💡 {meal.tip}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={() => void remove(meal.id)}>
                {m.detail_delete()}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                {m.close()}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
