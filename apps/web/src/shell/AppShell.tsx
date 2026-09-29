import { Link, Outlet } from '@tanstack/react-router';
import { CalendarDays, Camera, Home, MessageCircle, Settings } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: '/' | '/history' | '/scan' | '/chat' | '/settings';
  label: () => string;
  icon: ComponentType<{ className?: string }>;
  primary?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: () => 'Home', icon: Home },
  { to: '/history', label: () => 'History', icon: CalendarDays },
  { to: '/scan', label: () => 'Scan', icon: Camera, primary: true },
  { to: '/chat', label: () => 'Ask AI', icon: MessageCircle },
  { to: '/settings', label: () => 'Settings', icon: Settings },
];

export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-t-0 lg:border-r lg:pb-0"
      >
        <p className="hidden px-6 py-6 text-lg font-bold lg:block">NutriSnap</p>
        <ul className="grid grid-cols-5 lg:flex lg:flex-col lg:gap-1 lg:px-3">
          {NAV.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground lg:flex-row lg:gap-3 lg:rounded-lg lg:px-3 lg:py-2.5 lg:text-sm"
                activeProps={{ className: 'font-semibold text-foreground lg:bg-accent' }}
              >
                <span
                  className={cn(
                    'grid place-items-center',
                    item.primary &&
                      '-mt-5 size-12 rounded-full bg-primary text-primary-foreground shadow-lg lg:mt-0 lg:size-auto lg:bg-transparent lg:text-inherit lg:shadow-none',
                  )}
                >
                  <item.icon className="size-5" />
                </span>
                <span>{item.label()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main
        id="main"
        className="mx-auto w-full max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10"
      >
        <Outlet />
      </main>
    </div>
  );
}
