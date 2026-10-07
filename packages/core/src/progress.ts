export function progressPercent(current: number, goal: number): number {
  if (!(goal > 0)) return 0;
  return Math.round((current / goal) * 100);
}

export type HealthBand = 'excellent' | 'great' | 'good' | 'fair' | 'poor';

export function healthBand(score: number): HealthBand {
  if (score >= 9) return 'excellent';
  if (score >= 7) return 'great';
  if (score >= 5) return 'good';
  if (score >= 3) return 'fair';
  return 'poor';
}
