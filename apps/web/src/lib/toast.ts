import type { ExternalToast } from 'sonner';

type SonnerToast = typeof import('sonner').toast;

let resolveReady: (t: SonnerToast) => void = () => {};
const ready = new Promise<SonnerToast>((resolve) => {
  resolveReady = resolve;
});

/** Called by the lazily mounted Toaster once sonner has subscribed. */
export function markToasterReady(t: SonnerToast): void {
  resolveReady(t);
}

type Kind = 'success' | 'error' | 'info';

// Calls made before sonner loads are queued on the promise and delivered in order.
function send(kind: Kind | null, message: string, options?: ExternalToast): void {
  void ready.then((t) => {
    if (kind) t[kind](message, options);
    else t(message, options);
  });
}

export const toast = Object.assign(
  (message: string, options?: ExternalToast): void => send(null, message, options),
  {
    success: (message: string, options?: ExternalToast): void => send('success', message, options),
    error: (message: string, options?: ExternalToast): void => send('error', message, options),
    info: (message: string, options?: ExternalToast): void => send('info', message, options),
  },
);
