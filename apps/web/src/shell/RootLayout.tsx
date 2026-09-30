import { Outlet } from '@tanstack/react-router';
import { Toaster } from './Toaster';
import { useLegacyNotice } from './useLegacyNotice';

export function RootLayout() {
  // Called here, not in a screen. The notice survives because lib/toast.ts
  // queues toast calls until the lazy Toaster is ready. It also covers a
  // failed import that lands on /welcome.
  useLegacyNotice();
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
