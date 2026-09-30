import { healthBand } from '@nutrisnap/core';
import { healthBandLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';

export function HealthBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium">
      {m.health_score({ score })} · {healthBandLabel(healthBand(score))}
    </span>
  );
}
