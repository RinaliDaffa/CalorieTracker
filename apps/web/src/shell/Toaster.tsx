import { lazy, Suspense } from 'react';

const SonnerToaster = lazy(() => import('./SonnerToaster').catch(() => ({ default: () => null })));

export function Toaster() {
  return (
    <Suspense fallback={null}>
      <SonnerToaster />
    </Suspense>
  );
}
