import { type ComponentType, lazy, Suspense } from 'react';

// Registers the service worker after first paint; a failed chunk only loses the update prompt.
const UpdatePrompt = lazy<ComponentType>(() =>
  import('./UpdatePrompt')
    .then((mod) => ({ default: mod.UpdatePrompt }))
    .catch(() => ({ default: () => null })),
);

export function LazyUpdatePrompt() {
  return (
    <Suspense fallback={null}>
      <UpdatePrompt />
    </Suspense>
  );
}
