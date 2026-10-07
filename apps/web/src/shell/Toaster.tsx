import { type ComponentType, lazy, Suspense } from 'react';

// A chunk that fails to load loses toasts, not the whole shell.
const SonnerToaster = lazy<ComponentType>(() =>
  import('./SonnerToaster').catch(() => ({ default: () => null })),
);

export function Toaster() {
  return (
    <Suspense fallback={null}>
      <SonnerToaster />
    </Suspense>
  );
}
