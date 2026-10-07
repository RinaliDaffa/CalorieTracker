import { type HealthBand, healthBand } from '@nutrisnap/core';
import { healthBandLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

const TONE: Record<HealthBand, string> = {
  excellent: 'bg-good',
  great: 'bg-good',
  good: 'bg-primary',
  fair: 'bg-primary',
  poor: 'bg-destructive',
};

/** The score as ten pips plus words, so it reads without knowing the scale. */
export function HealthBadge({ score }: { score: number }) {
  const band = healthBand(score);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold">
        {m.health_score({ score })} · {healthBandLabel(band)}
      </span>
      <span aria-hidden="true" className="flex flex-1 gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative pips
            key={i}
            className={cn('h-1.5 flex-1 rounded-full', i < score ? TONE[band] : 'bg-muted')}
          />
        ))}
      </span>
    </div>
  );
}
