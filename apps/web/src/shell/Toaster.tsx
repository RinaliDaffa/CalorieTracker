import { Toaster as Sonner } from 'sonner';
import { useResolvedTheme } from '@/lib/theme';

export function Toaster() {
  const theme = useResolvedTheme();
  return (
    <Sonner theme={theme} position="top-center" richColors toastOptions={{ duration: 5000 }} />
  );
}
