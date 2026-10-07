import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
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
import { formatTime } from '@/lib/i18n';
import { mealTypeLabel } from '@/lib/labels';
import { toast } from '@/lib/toast';
import { useObjectUrl } from '@/lib/use-object-url';
import { m } from '@/paraglide/messages.js';
import { MealReceipt } from './MealReceipt';

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
        className="max-h-[92dvh] overflow-y-auto"
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
          <div className="space-y-4 px-4 pb-6 sm:px-6">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={m.meal_photo_alt()}
                className="max-h-60 w-full rounded-2xl object-cover"
              />
            ) : null}
            <section aria-labelledby="detail-items" className="space-y-2">
              <h3 id="detail-items" className="sr-only">
                {m.detail_items()}
              </h3>
              <MealReceipt items={meal.items} healthScore={meal.healthScore} tip={meal.tip} />
            </section>
            <div className="flex gap-2">
              <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
                {m.close()}
              </Button>
              <Button variant="destructive" size="lg" onClick={() => void remove(meal.id)}>
                <Trash2 />
                {m.detail_delete()}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
