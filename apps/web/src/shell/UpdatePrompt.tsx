import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

/**
 * A waiting version activates by itself on the next launch; the prompt only
 * lets the user switch now. Nothing reloads under their hands mid-scan.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toast(m.update_available(), {
      duration: Number.POSITIVE_INFINITY,
      action: { label: m.update_now(), onClick: () => void updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
