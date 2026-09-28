import type { Transport } from './types';

export interface FakeReply {
  status: number;
  body: unknown;
}

export interface RecordedCall {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Replies in order; throws `'network'` entries as a rejected fetch. */
export function fakeTransport(replies: (FakeReply | 'network')[]): {
  transport: Transport;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const queue = [...replies];
  const transport: Transport = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    const next = queue.shift();
    if (!next) throw new Error('fakeTransport: no reply queued');
    if (next === 'network') throw new TypeError('Failed to fetch');
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body,
    };
  };
  return { transport, calls };
}

export function textReply(text: string): FakeReply {
  return { status: 200, body: { candidates: [{ content: { role: 'model', parts: [{ text }] } }] } };
}

export function errorReply(status: number, message: string, extra: object = {}): FakeReply {
  return { status, body: { error: { code: status, message, ...extra } } };
}
