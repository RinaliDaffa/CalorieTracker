import { useEffect } from 'react';
import { Toaster as Sonner, toast } from 'sonner';
import { useResolvedTheme } from '@/lib/theme';
import { markToasterReady } from '@/lib/toast';

export default function SonnerToaster() {
  const theme = useResolvedTheme();
  // Child effects run first, so sonner's own Toaster has subscribed by now.
  useEffect(() => {
    markToasterReady(toast);
  }, []);
  return (
    <Sonner theme={theme} position="top-center" richColors toastOptions={{ duration: 5000 }} />
  );
}
