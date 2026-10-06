import { lazy, Suspense, useState } from 'react';

// Loaded on first open so the dialog stack stays out of the initial route.
const ManualAddSheet = lazy(() =>
  import('./ManualAddSheet').then((mod) => ({ default: mod.ManualAddSheet })),
);
const FavoritesSheet = lazy(() =>
  import('./FavoritesSheet').then((mod) => ({ default: mod.FavoritesSheet })),
);

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** True from the first time `open` is true, so close animations and focus return still run. */
function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened;
}

export function LazyManualAddSheet(props: SheetProps) {
  if (!useOpenedOnce(props.open)) return null;
  return (
    <Suspense fallback={null}>
      <ManualAddSheet {...props} />
    </Suspense>
  );
}

export function LazyFavoritesSheet(props: SheetProps) {
  if (!useOpenedOnce(props.open)) return null;
  return (
    <Suspense fallback={null}>
      <FavoritesSheet {...props} />
    </Suspense>
  );
}
