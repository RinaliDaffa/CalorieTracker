import {
  NUTRIENT_KEYS,
  type Nutrients,
  TARGET_RANGES,
  type Targets,
  toDateKey,
  validateTargets,
} from '@nutrisnap/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/db/schema';
import { currentTargets, setTargets } from '@/db/targets';
import { nutrientLabel } from '@/lib/labels';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

function TargetsForm({ initial }: { initial: Targets }) {
  const [values, setValues] = useState<Record<keyof Nutrients, string>>(() => ({
    calories: String(initial.calories),
    protein: String(initial.protein),
    carbs: String(initial.carbs),
    fat: String(initial.fat),
    fiber: String(initial.fiber),
    sugar: String(initial.sugar),
  }));
  const [invalid, setInvalid] = useState<(keyof Nutrients)[]>([]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = {} as Record<keyof Nutrients, number>;
    for (const key of NUTRIENT_KEYS) parsed[key] = Number(values[key]);
    const result = validateTargets(parsed);
    if (!result.ok) {
      setInvalid(result.invalid);
      return;
    }
    setInvalid([]);
    await setTargets(db, result.value, 'manual', toDateKey(new Date()));
    toast.success(m.targets_saved());
  }

  return (
    <form
      onSubmit={save}
      className="space-y-3 rounded-3xl border bg-card shadow-card p-4"
      noValidate
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NUTRIENT_KEYS.map((key) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`target-${key}`}>
              {nutrientLabel(key)} ({key === 'calories' ? m.unit_kcal() : m.unit_g()})
            </Label>
            <Input
              id={`target-${key}`}
              type="number"
              inputMode="numeric"
              min={TARGET_RANGES[key].min}
              max={TARGET_RANGES[key].max}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              aria-invalid={invalid.includes(key) ? true : undefined}
            />
          </div>
        ))}
      </div>
      {invalid.length > 0 ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {m.targets_invalid()}
        </p>
      ) : null}
      <Button type="submit" className="w-full">
        {m.targets_save()}
      </Button>
    </form>
  );
}

export function TargetsSection() {
  const today = toDateKey(new Date());
  const targets = useLiveQuery(() => currentTargets(db, today), [today]);
  return (
    <section aria-labelledby="settings-targets" className="space-y-2">
      <h2 id="settings-targets" className="text-lg font-bold">
        {m.settings_targets()}
      </h2>
      {/* Keyed by the stored values so the form resets when they change elsewhere. */}
      {targets ? <TargetsForm key={JSON.stringify(targets)} initial={targets} /> : null}
    </section>
  );
}
