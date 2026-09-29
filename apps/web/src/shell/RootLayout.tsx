import { Outlet } from '@tanstack/react-router';
import { Toaster } from './Toaster';

export function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
