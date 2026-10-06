import type { DateKey } from '@nutrisnap/core';
import { formatNumber, formatWeekdayShort } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

const WIDTH = 280;
const HEIGHT = 140;
const BASE = 118;
const BAR = 24;
const GAP = (WIDTH - BAR * 7) / 8;

export function WeeklyChart({
  days,
  goal,
  today,
}: {
  days: { key: DateKey; calories: number }[];
  goal: number;
  today: DateKey;
}) {
  const max = Math.max(goal, ...days.map((d) => d.calories), 1) * 1.1;
  const scale = (value: number) => (value / max) * (BASE - 8);
  const goalY = BASE - scale(goal);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={m.weekly_chart_label()}
      className="w-full"
    >
      <title>{m.weekly_chart_label()}</title>
      <line
        x1={0}
        x2={WIDTH}
        y1={goalY}
        y2={goalY}
        className="stroke-muted-foreground"
        strokeDasharray="4 4"
      />
      {days.map((day, i) => {
        const height = scale(day.calories);
        const x = GAP + i * (BAR + GAP);
        return (
          <g key={day.key} data-testid="week-bar" data-calories={Math.round(day.calories)}>
            <rect
              x={x}
              y={BASE - height}
              width={BAR}
              height={height}
              rx={4}
              className={day.key === today ? 'fill-primary' : 'fill-primary/40'}
            >
              <title>{`${formatWeekdayShort(day.key)}: ${formatNumber(day.calories)} ${m.unit_kcal()}`}</title>
            </rect>
            <text
              x={x + BAR / 2}
              y={HEIGHT - 4}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatWeekdayShort(day.key)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
