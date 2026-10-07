import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { applyTheme, readThemePref, type ThemePref } from '@/lib/theme';
import { m } from '@/paraglide/messages.js';

export function ThemeSection() {
  const [pref, setPref] = useState<ThemePref>(readThemePref);
  const options: [ThemePref, string][] = [
    ['dark', m.theme_dark()],
    ['light', m.theme_light()],
    ['system', m.theme_system()],
  ];
  return (
    <section aria-labelledby="settings-theme" className="space-y-2">
      <h2 id="settings-theme" className="text-lg font-bold">
        {m.settings_theme()}
      </h2>
      <ToggleGroup
        type="single"
        variant="outline"
        value={pref}
        aria-labelledby="settings-theme"
        onValueChange={(next) => {
          if (!next) return;
          setPref(next as ThemePref);
          applyTheme(next as ThemePref);
        }}
      >
        {options.map(([value, label]) => (
          <ToggleGroupItem key={value} value={value}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </section>
  );
}
