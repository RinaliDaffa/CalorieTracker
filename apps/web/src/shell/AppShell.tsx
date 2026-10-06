import { Link, Outlet } from '@tanstack/react-router';
import { CalendarDays, Camera, Home, MessageCircle, Settings } from 'lucide-react';
import type { ComponentType } from 'react';
import { BrandMark } from '@/features/common/BrandMark';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

interface NavItem {
  to: '/' | '/history' | '/scan' | '/chat' | '/settings';
  label: () => string;
  icon: ComponentType<{ className?: string }>;
  primary?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: () => m.nav_home(), icon: Home },
  { to: '/history', label: () => m.nav_history(), icon: CalendarDays },
  { to: '/scan', label: () => m.nav_scan(), icon: Camera, primary: true },
  { to: '/chat', label: () => m.nav_chat(), icon: MessageCircle },
  { to: '/settings', label: () => m.nav_settings(), icon: Settings },
];

export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        {m.skip_to_content()}
      </a>
      <nav
        aria-label={m.nav_label()}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-t-0 lg:border-r lg:bg-card lg:pb-0"
      >
        <p className="hidden items-center gap-2.5 px-6 pt-7 pb-8 font-display text-xl font-extrabold tracking-tight lg:flex">
          <BrandMark />
          {m.app_name()}
        </p>
        <ul className="mx-auto grid max-w-xl grid-cols-5 lg:flex lg:max-w-none lg:flex-col lg:gap-1 lg:px-3">
          {NAV.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                className="group flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2.5 lg:text-sm"
                activeProps={{ className: 'is-active text-foreground lg:bg-accent' }}
              >
                <span
                  className={cn(
                    'grid h-8 w-14 place-items-center rounded-full transition-colors group-[.is-active]:bg-accent group-[.is-active]:text-accent-foreground lg:size-auto lg:bg-transparent lg:group-[.is-active]:bg-transparent',
                    item.primary &&
                      '-mt-6 size-14 bg-primary text-primary-foreground shadow-[0_8px_20px_-6px] shadow-primary/60 ring-4 ring-background group-[.is-active]:bg-primary group-[.is-active]:text-primary-foreground lg:mt-0 lg:size-auto lg:bg-transparent lg:text-inherit lg:shadow-none lg:ring-0 lg:group-[.is-active]:bg-transparent lg:group-[.is-active]:text-accent-foreground',
                  )}
                >
                  <item.icon className={cn('size-5', item.primary && 'size-6 lg:size-5')} />
                </span>
                <span>{item.label()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl animate-rise px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:pt-10 lg:pb-12"
      >
        <Outlet />
      </main>
    </div>
  );
}
