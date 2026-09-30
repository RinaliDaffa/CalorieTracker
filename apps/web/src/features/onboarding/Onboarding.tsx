import { checkApiKey } from '@nutrisnap/ai';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { fetchTransport } from '@/ai/client';
import { saveApiKey } from '@/ai/key';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/db/schema';
import { setSetting } from '@/db/settings';
import { m } from '@/paraglide/messages.js';

type Status = 'idle' | 'checking' | 'invalid' | 'unreachable' | 'empty';

function statusMessage(status: Status): string | null {
  if (status === 'invalid') return m.key_invalid();
  if (status === 'unreachable') return m.key_unreachable();
  if (status === 'empty') return m.key_empty();
  return null;
}

export function Onboarding() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function save(event: FormEvent) {
    event.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setStatus('empty');
      return;
    }
    setStatus('checking');
    const result = await checkApiKey(fetchTransport, trimmed);
    if (result !== 'valid') {
      setStatus(result);
      return;
    }
    await saveApiKey(trimmed);
    await navigate({ to: '/' });
  }

  async function later() {
    await setSetting(db, 'onboarded', true);
    await navigate({ to: '/' });
  }

  const error = statusMessage(status);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{m.welcome_title()}</h1>
        <p className="text-muted-foreground">{m.welcome_body()}</p>
      </div>
      <form onSubmit={save} className="space-y-3" noValidate>
        <Label htmlFor="api-key">{m.welcome_key_label()}</Label>
        <Input
          id="api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={m.welcome_key_placeholder()}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'api-key-error' : undefined}
        />
        {error ? (
          <p id="api-key-error" role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-medium text-primary underline underline-offset-4"
        >
          {m.welcome_get_key()}
        </a>
        <Button type="submit" className="w-full" disabled={status === 'checking'}>
          {status === 'checking' ? m.welcome_checking() : m.welcome_save()}
        </Button>
      </form>
      <Button variant="ghost" onClick={() => void later()}>
        {m.welcome_later()}
      </Button>
    </main>
  );
}
