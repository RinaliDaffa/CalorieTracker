import { checkApiKey, MODEL_CANDIDATES } from '@nutrisnap/ai';
import { type FormEvent, useState } from 'react';
import { fetchTransport } from '@/ai/client';
import { saveApiKey } from '@/ai/key';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetting } from '@/db/hooks';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

export function KeySection() {
  const stored = useSetting<string>('apiKey');
  const model = useSetting<string>('activeModel');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError(m.key_empty());
      return;
    }
    setChecking(true);
    setError(null);
    const result = await checkApiKey(fetchTransport, trimmed);
    setChecking(false);
    if (result === 'invalid') return setError(m.key_invalid());
    if (result === 'unreachable') return setError(m.key_unreachable());
    await saveApiKey(trimmed);
    setKey('');
    toast.success(m.settings_key_saved());
  }

  return (
    <section aria-labelledby="settings-ai" className="space-y-2">
      <h2 id="settings-ai" className="font-semibold">
        {m.settings_ai()}
      </h2>
      <form onSubmit={save} className="space-y-2 rounded-xl border bg-card p-4" noValidate>
        <Label htmlFor="settings-key">{m.welcome_key_label()}</Label>
        <div className="flex gap-2">
          <Input
            id="settings-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={m.welcome_key_placeholder()}
            aria-invalid={error ? true : undefined}
            aria-describedby="settings-key-status"
          />
          <Button type="submit" disabled={checking}>
            {checking ? m.welcome_checking() : m.settings_save()}
          </Button>
        </div>
        <p id="settings-key-status" role={error ? 'alert' : undefined} className="text-sm">
          {error ?? (stored.value ? m.settings_key_configured() : m.settings_key_missing())}
        </p>
        <p className="text-xs text-muted-foreground">
          {m.settings_model({ model: model.value ?? MODEL_CANDIDATES[0] ?? '' })}
        </p>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          {m.welcome_get_key()}
        </a>
      </form>
    </section>
  );
}
