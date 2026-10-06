import type { DateKey } from '@nutrisnap/core';
import { formatNumber, formatWeekdayShort } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

const WIDTH = 320;
const HEIGHT = 190;
const TOP = 22;
const BASE = 162;
const BAR = 28;
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
  const max = Math.max(goal, ...days.map((d) => d.calories), 1) * 1.08;
  const scale = (value: number) => (value / max) * (BASE - TOP);
  const goalY = BASE - scale(goal);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={m.weekly_chart_label()}
      className="w-full overflow-visible"
    >
      <title>{m.weekly_chart_label()}</title>
      <line x1={0} x2={WIDTH} y1={BASE} y2={BASE} className="stroke-border" />
      {days.map((day, i) => {
        const height = Math.max(scale(day.calories), day.calories > 0 ? 3 : 0);
        const x = GAP + i * (BAR + GAP);
        const isToday = day.key === today;
        const isOver = day.calories > goal;
        return (
          <g key={day.key} data-testid="week-bar" data-calories={Math.round(day.calories)}>
            <rect x={x} y={TOP} width={BAR} height={BASE - TOP} rx={8} className="fill-muted/60" />
            <rect
              x={x}
              y={BASE - height}
              width={BAR}
              height={height}
              rx={8}
              className={isOver ? 'fill-destructive' : isToday ? 'fill-primary' : 'fill-primary/45'}
            >
              <title>{`${formatWeekdayShort(day.key)}: ${formatNumber(day.calories)} ${m.unit_kcal()}`}</title>
            </rect>
            {day.calories > 0 ? (
              <text
                x={x + BAR / 2}
                y={BASE - height - 5}
                textAnchor="middle"
                className="fill-foreground text-[9px] font-semibold tabular-nums"
              >
                {formatNumber(day.calories)}
              </text>
            ) : null}
            <text
              x={x + BAR / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              className={
                isToday
                  ? 'fill-foreground text-[11px] font-bold'
                  : 'fill-muted-foreground text-[11px]'
              }
            >
              {formatWeekdayShort(day.key)}
            </text>
          </g>
        );
      })}
      <line
        x1={0}
        x2={WIDTH}
        y1={goalY}
        y2={goalY}
        className="stroke-foreground/50"
        strokeDasharray="3 4"
      />
      <text x={WIDTH} y={goalY - 5} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {m.chart_goal()} {formatNumber(goal)}
      </text>
    </svg>
  );
}
