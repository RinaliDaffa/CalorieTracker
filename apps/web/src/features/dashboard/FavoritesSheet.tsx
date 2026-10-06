import { mealTotals, mealTypeAt, toDateKey } from '@nutrisnap/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { listFavorites, restoreFavorite, softDeleteFavorite } from '@/db/favorites';
import { addMeal, softDeleteMeal } from '@/db/meals';
import { db, type FavoriteRecord } from '@/db/schema';
import { formatNumber } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

export function FavoritesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const favorites = useLiveQuery(() => listFavorites(db), []);
  const opener = useRef<HTMLElement | null>(null);

  async function log(favorite: FavoriteRecord) {
    const now = new Date();
    const meal = await addMeal(db, {
      date: toDateKey(now),
      time: now.getTime(),
      mealType: mealTypeAt(now),
      source: 'favorite',
      items: favorite.items,
      note: favorite.name,
    });
    onOpenChange(false);
    toast.success(m.favorite_added(), {
      action: { label: m.undo(), onClick: () => void softDeleteMeal(db, meal.id) },
    });
  }

  async function remove(favorite: FavoriteRecord) {
    await softDeleteFavorite(db, favorite.id);
    toast(m.favorite_removed(), {
      action: { label: m.undo(), onClick: () => void restoreFavorite(db, favorite.id) },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto"
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = opener.current?.isConnected
            ? opener.current
            : document.getElementById('main');
          target?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{m.favorites_title()}</SheetTitle>
          <SheetDescription>{m.favorites_body()}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {favorites && favorites.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="font-display text-lg font-bold">{m.favorites_empty_title()}</p>
              <p className="text-sm text-muted-foreground">{m.favorites_empty_body()}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(favorites ?? []).map((favorite) => {
                const totals = mealTotals(favorite.items);
                return (
                  <li
                    key={favorite.id}
                    className="flex items-center gap-3 rounded-2xl border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{favorite.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.macros_line({
                          kcal: formatNumber(totals.calories),
                          protein: formatNumber(totals.protein),
                          carbs: formatNumber(totals.carbs),
                          fat: formatNumber(totals.fat),
                        })}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      aria-label={m.favorite_add({ name: favorite.name })}
                      onClick={() => void log(favorite)}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={m.favorite_remove({ name: favorite.name })}
                      onClick={() => void remove(favorite)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
