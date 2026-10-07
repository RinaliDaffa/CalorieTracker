import { type DateKey, toDateKey } from '@nutrisnap/core';
import { useEffect, useState } from 'react';

/**
 * Today's local date key, kept current. An installed PWA is often resumed from
 * the background the next morning without re-rendering, so re-check when the
 * app becomes visible or focused, and at the next local midnight.
 */
export function useToday(): DateKey {
  const [today, setToday] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toDateKey(new Date()));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, next.getTime() - now.getTime());
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    scheduleMidnight();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
