import { m } from '@/paraglide/messages.js';

export function Dashboard() {
  return <h1 className="text-2xl font-bold">{m.app_name()}</h1>;
}
