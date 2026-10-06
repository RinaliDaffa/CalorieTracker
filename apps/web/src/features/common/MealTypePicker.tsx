import { DAY_MEAL_TYPES, type MealType } from '@nutrisnap/core';
import { useId } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { mealTypeLabel } from '@/lib/labels';
import { m } from '@/paraglide/messages.js';

export function MealTypePicker({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (type: MealType) => void;
}) {
  const labelId = useId();
  return (
    <div className="space-y-1.5">
      <p id={labelId} className="text-sm font-medium">
        {m.meal_type_label()}
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as MealType);
        }}
        aria-labelledby={labelId}
        className="w-full"
      >
        {DAY_MEAL_TYPES.map((type) => (
          <ToggleGroupItem key={type} value={type} className="flex-1 text-xs sm:text-sm">
            {mealTypeLabel(type)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
