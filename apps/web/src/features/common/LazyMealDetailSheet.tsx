import { lazy, Suspense, useState } from 'react';

// Loaded on first open so the dialog stack stays out of the initial route.
const MealDetailSheet = lazy(() =>
  import('./MealDetailSheet').then((mod) => ({ default: mod.MealDetailSheet })),
);

/** Mounts the detail sheet on first use, then keeps it mounted so close animations and focus return work. */
export function LazyMealDetailSheet({
  mealId,
  onClose,
}: {
  mealId: string | null;
  onClose: () => void;
}) {
  const [used, setUsed] = useState(mealId !== null);
  if (mealId !== null && !used) setUsed(true);
  if (!used && mealId === null) return null;
  return (
    <Suspense fallback={null}>
      <MealDetailSheet mealId={mealId} onClose={onClose} />
    </Suspense>
  );
}
