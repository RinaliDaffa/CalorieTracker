import { Outlet } from '@tanstack/react-router';
import { Toaster } from './Toaster';
import { useLegacyNotice } from './useLegacyNotice';

export function RootLayout() {
  // Called here, not in a screen: React runs child effects before parent
  // effects, so by now <Toaster /> has subscribed and the toast is not lost.
  // It also covers a failed import that lands on /welcome.
  useLegacyNotice();
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
