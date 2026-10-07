import { isDateKey } from '@nutrisnap/core';
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import { db } from '@/db/schema';
import { isOnboarded } from '@/db/settings';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { AppShell } from '@/shell/AppShell';
import { RootLayout } from '@/shell/RootLayout';
import { NotFound, RouteError } from '@/shell/RouteFallbacks';

const rootRoute = createRootRoute({ component: RootLayout });

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/welcome',
  component: lazyRouteComponent(() => import('@/features/onboarding/Onboarding'), 'Onboarding'),
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppShell,
  beforeLoad: async () => {
    if (!(await isOnboarded(db))) throw redirect({ to: '/welcome' });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: Dashboard,
});

const scanRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/scan',
  component: lazyRouteComponent(() => import('@/features/scan/ScanScreen'), 'ScanScreen'),
});

const historyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/history',
  validateSearch: (search: Record<string, unknown>): { date?: string } =>
    isDateKey(search.date) ? { date: search.date } : {},
  component: lazyRouteComponent(() => import('@/features/history/History'), 'History'),
});

const chatRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/chat',
  component: lazyRouteComponent(() => import('@/features/chat/Chat'), 'Chat'),
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('@/features/settings/Settings'), 'Settings'),
});

const routeTree = rootRoute.addChildren([
  welcomeRoute,
  appRoute.addChildren([dashboardRoute, scanRoute, historyRoute, chatRoute, settingsRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: RouteError,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
