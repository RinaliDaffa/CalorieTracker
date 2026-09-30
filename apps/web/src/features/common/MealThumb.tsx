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
  if (url) return <img src={url} alt="" className="size-12 shrink-0 rounded-lg object-cover" />;
  return (
    <span
      aria-hidden="true"
      className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-xl"
    >
      {ICON[meal.mealType] ?? '🍽️'}
    </span>
  );
}
