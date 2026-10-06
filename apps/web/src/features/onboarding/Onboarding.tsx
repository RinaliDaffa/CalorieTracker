import { checkApiKey } from '@nutrisnap/ai';
import { useNavigate } from '@tanstack/react-router';
import { Gift, ShieldCheck, Zap } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { fetchTransport } from '@/ai/client';
import { saveApiKey } from '@/ai/key';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/db/schema';
import { setSetting } from '@/db/settings';
import { BrandMark } from '@/features/common/BrandMark';
import { m } from '@/paraglide/messages.js';

type Status = 'idle' | 'checking' | 'invalid' | 'unreachable' | 'empty';

const POINTS = [
  { icon: Zap, text: () => m.welcome_point_fast() },
  { icon: ShieldCheck, text: () => m.welcome_point_private() },
  { icon: Gift, text: () => m.welcome_point_free() },
];

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
    <main className="relative mx-auto flex min-h-dvh max-w-md animate-rise flex-col justify-center gap-7 overflow-hidden px-6 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative space-y-4">
        <BrandMark className="size-14" />
        <h1 className="text-4xl leading-[1.05] font-extrabold text-balance">{m.welcome_title()}</h1>
        <p className="text-muted-foreground">{m.welcome_body()}</p>
        <ul className="space-y-2.5 pt-1 text-sm font-medium">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text()} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>
              {text()}
            </li>
          ))}
        </ul>
      </div>
      <form
        onSubmit={save}
        className="relative space-y-3 rounded-3xl border bg-card p-5 shadow-card"
        noValidate
      >
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
        <Button type="submit" size="lg" className="w-full" disabled={status === 'checking'}>
          {status === 'checking' ? m.welcome_checking() : m.welcome_save()}
        </Button>
      </form>
      <Button variant="ghost" className="relative" onClick={() => void later()}>
        {m.welcome_later()}
      </Button>
    </main>
  );
}
