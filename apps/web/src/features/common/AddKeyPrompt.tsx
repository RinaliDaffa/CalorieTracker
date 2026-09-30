import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';

export function AddKeyPrompt() {
  return (
    <div className="rounded-xl border bg-accent p-4 text-accent-foreground">
      <p className="font-semibold">{m.add_key_title()}</p>
      <p className="text-sm">{m.add_key_body()}</p>
      <Link
        to="/settings"
        className="mt-2 inline-block text-sm font-semibold underline underline-offset-4"
      >
        {m.add_key_action()}
      </Link>
    </div>
  );
}
