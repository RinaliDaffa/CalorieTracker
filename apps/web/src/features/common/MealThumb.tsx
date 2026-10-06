import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MealRecord } from '@/db/schema';
import { useObjectUrl } from '@/lib/use-object-url';

const ICON: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };

export function MealThumb({ meal }: { meal: MealRecord }) {
  const photo = useLiveQuery(
    () => (meal.photoId ? db.photos.get(meal.photoId) : undefined),
    [meal.photoId],
  );
  const url = useObjectUrl(photo?.thumb);
  if (url) return <img src={url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />;
  return (
    <span
      aria-hidden="true"
      className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent text-2xl"
    >
      {ICON[meal.mealType] ?? '🍽️'}
    </span>
  );
}
