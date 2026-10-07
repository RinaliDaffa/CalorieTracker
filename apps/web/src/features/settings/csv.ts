import { mealTotals } from '@nutrisnap/core';
import type { MealRecord } from '@/db/schema';

// Food names come from the model, so a cell can begin with =, +, - or @.
// Spreadsheets run those as formulas on open (CSV injection). A leading
// apostrophe pins the cell to text; quoting alone does not.
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const CSV_HEADERS = [
  'Date',
  'Time',
  'Meal Type',
  'Food Items',
  'Calories',
  'Protein (g)',
  'Carbs (g)',
  'Fat (g)',
  'Fiber (g)',
  'Sugar (g)',
  'Health Score',
  'Notes',
];

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

export function mealsToCsv(
  meals: readonly MealRecord[],
  formatTime: (ms: number) => string,
): string {
  const rows = meals.map((meal) => {
    const t = mealTotals(meal.items);
    return [
      meal.date,
      formatTime(meal.time),
      meal.mealType,
      meal.items.map((item) => item.name).join('; '),
      Math.round(t.calories),
      oneDecimal(t.protein),
      oneDecimal(t.carbs),
      oneDecimal(t.fat),
      oneDecimal(t.fiber),
      oneDecimal(t.sugar),
      meal.healthScore ?? '',
      meal.note ?? '',
    ];
  });
  return [CSV_HEADERS.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
}
