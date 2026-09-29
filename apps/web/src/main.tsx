import '@/styles/globals.css';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, readThemePref } from '@/lib/theme';
import { initPlatform } from '@/platform';
import { router } from '@/router';

async function boot(): Promise<void> {
  applyTheme(readThemePref());
  await initPlatform();
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Missing #root element');
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

void boot();
