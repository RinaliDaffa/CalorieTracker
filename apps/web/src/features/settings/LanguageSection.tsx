import { Button } from '@/components/ui/button';
import { type AppLocale, changeLocale, currentLocale } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

export function LanguageSection() {
  const active = currentLocale();
  const options: [AppLocale, string][] = [
    ['en', m.lang_en()],
    ['id', m.lang_id()],
  ];
  return (
    <section aria-labelledby="settings-language" className="space-y-2">
      <h2 id="settings-language" className="text-lg font-bold">
        {m.settings_language()}
      </h2>
      <div className="flex gap-2">
        {options.map(([locale, label]) => (
          <Button
            key={locale}
            variant={active === locale ? 'default' : 'secondary'}
            aria-pressed={active === locale}
            onClick={() => changeLocale(locale)}
          >
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}
