import { type DateKey, monthGrid } from '@nutrisnap/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateLong, formatMonth, formatWeekdayShort } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

interface Props {
  year: number;
  month0: number;
  selected: DateKey;
  today: DateKey;
  logged: Set<DateKey>;
  onSelect: (key: DateKey) => void;
  onShift: (delta: number) => void;
}

export function MonthCalendar({ year, month0, selected, today, logged, onSelect, onShift }: Props) {
  const cells = monthGrid(year, month0);
  return (
    <div className="rounded-3xl border bg-card p-3 shadow-card sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.history_prev_month()}
          onClick={() => onShift(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-bold" aria-live="polite">
          {formatMonth(year, month0)}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.history_next_month()}
          onClick={() => onShift(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div
        className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground"
        aria-hidden="true"
      >
        {cells.slice(0, 7).map((cell) => (
          <span key={cell.key}>{formatWeekdayShort(cell.key)}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isLogged = logged.has(cell.key);
          const isSelected = cell.key === selected;
          const label = formatDateLong(cell.key);
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              aria-pressed={isSelected}
              aria-label={isLogged ? m.day_logged({ date: label }) : label}
              data-logged={isLogged ? 'true' : undefined}
              className={cn(
                'relative aspect-square rounded-xl text-sm font-medium tabular-nums transition-colors',
                !cell.inMonth && 'text-muted-foreground',
                isSelected
                  ? 'bg-primary font-bold text-primary-foreground shadow-sm'
                  : isLogged
                    ? 'bg-accent/60 hover:bg-accent'
                    : 'hover:bg-muted',
                cell.key === today && !isSelected && 'ring-2 ring-primary ring-inset',
              )}
            >
              {cell.day}
              {isLogged ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary',
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
