import { useEffect } from 'react';
import { downloadLegacyBackup, takeLegacyOutcome } from '@/legacy/startup';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

export function useLegacyNotice(): void {
  useEffect(() => {
    const outcome = takeLegacyOutcome();
    if (outcome?.status === 'imported' && outcome.counts.meals > 0) {
      toast.success(m.legacy_imported());
    }
    if (outcome?.status === 'failed') {
      toast.error(m.legacy_failed(), {
        duration: Number.POSITIVE_INFINITY,
        action: { label: m.legacy_download(), onClick: () => void downloadLegacyBackup() },
      });
    }
  }, []);
}
