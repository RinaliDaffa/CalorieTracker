import { m } from '@/paraglide/messages.js';
import { DataSection } from './DataSection';
import { KeySection } from './KeySection';
import { LanguageSection } from './LanguageSection';
import { TargetsSection } from './TargetsSection';
import { ThemeSection } from './ThemeSection';

export function Settings() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">{m.title_settings()}</h1>
      <LanguageSection />
      <ThemeSection />
      <KeySection />
      <TargetsSection />
      <DataSection />
      <footer className="pb-4 text-center text-xs text-muted-foreground">
        <p>{m.about_version({ version: __APP_VERSION__ })}</p>
        <p>{m.about_powered()}</p>
      </footer>
    </div>
  );
}
