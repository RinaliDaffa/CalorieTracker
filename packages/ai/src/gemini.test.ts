import { describe, expect, test, vi } from 'vitest';
import { AiError } from './errors';
import { createGeminiClient } from './gemini';
import { errorReply, fakeTransport, textReply } from './test-transport';

const contents = [{ role: 'user' as const, parts: [{ text: 'hi' }] }];
const candidates = ['m1', 'm2', 'm3'];

function client(replies: Parameters<typeof fakeTransport>[0], stored?: string) {
  const fake = fakeTransport(replies);
  const onModelResolved = vi.fn();
  const sleep = vi.fn(async (_ms: number) => {});
  const gemini = createGeminiClient({
    transport: fake.transport,
    getApiKey: () => 'secret-key',
    getModel: () => stored,
    onModelResolved,
    sleep,
    candidates,
  });
  return { gemini, calls: fake.calls, onModelResolved, sleep };
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'resolved';
  } catch (error) {
    return error instanceof AiError ? error.code : 'other';
  }
}

describe('createGeminiClient', () => {
  test('sends the key in a header, never in the URL', async () => {
    const { gemini, calls } = client([textReply('ok')]);
    await gemini.generate(contents);
    expect(calls[0]?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/m1:generateContent',
    );
    expect(calls[0]?.url).not.toContain('secret-key');
    expect(calls[0]?.headers['x-goog-api-key']).toBe('secret-key');
  });

  test('starts from the stored model when it is still a candidate', async () => {
    const { gemini, calls } = client([textReply('ok')], 'm2');
    await gemini.generate(contents);
    expect(calls[0]?.url).toContain('/m2:');
  });

  test('advances past a retired model and remembers the one that answered', async () => {
    const { gemini, calls, onModelResolved } = client([
      errorReply(404, 'model not found'),
      textReply('ok'),
    ]);
    await expect(gemini.generate(contents)).resolves.toBe('ok');
    expect(calls.map((c) => c.url.split('/').at(-1))).toEqual([
      'm1:generateContent',
      'm2:generateContent',
    ]);
    expect(onModelResolved).toHaveBeenCalledWith('m2');
  });

  test('switches model on a daily quota but does not remember it', async () => {
    const daily = errorReply(429, 'quota', {
      details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }],
    });
    const { gemini, onModelResolved } = client([daily, textReply('ok')]);
    await expect(gemini.generate(contents)).resolves.toBe('ok');
    expect(onModelResolved).not.toHaveBeenCalled();
  });

  test('reports QUOTA_EXHAUSTED when every model is out of daily quota', async () => {
    const daily = errorReply(429, 'quota', { details: [{ quotaId: 'PerDay' }] });
    const { gemini } = client([daily, daily, daily]);
    expect(await codeOf(gemini.generate(contents))).toBe('QUOTA_EXHAUSTED');
  });

  test('waits once for a short per-minute limit, then succeeds', async () => {
    const minute = errorReply(429, 'slow down', {
      details: [{ quotaId: 'PerMinute' }, { retryDelay: '3s' }],
    });
    const { gemini, sleep } = client([minute, textReply('ok')]);
    await expect(gemini.generate(contents)).resolves.toBe('ok');
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  test('gives up with RATE_LIMITED and the delay when the wait is long', async () => {
    const minute = errorReply(429, 'slow down', {
      details: [{ quotaId: 'PerMinute' }, { retryDelay: '40s' }],
    });
    const { gemini } = client([minute]);
    const error = await gemini.generate(contents).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe('RATE_LIMITED');
    expect((error as AiError).details.retryAfterMs).toBe(40000);
  });

  test('falls through an overloaded model without remembering the fallback', async () => {
    const { gemini, calls, onModelResolved } = client([
      errorReply(503, 'The model is overloaded. Please try again later.'),
      textReply('ok'),
    ]);
    expect(await gemini.generate(contents)).toBe('ok');
    expect(calls.map((call) => call.url.split('/').at(-1))).toEqual([
      'm1:generateContent',
      'm2:generateContent',
    ]);
    expect(onModelResolved).not.toHaveBeenCalled();
  });

  test('reports HTTP only when every model fails on the server side', async () => {
    const { gemini } = client([
      errorReply(503, 'overloaded'),
      errorReply(500, 'internal'),
      errorReply(503, 'overloaded'),
    ]);
    expect(await codeOf(gemini.generate(contents))).toBe('HTTP');
  });

  test('reports an invalid key', async () => {
    const { gemini } = client([errorReply(400, 'API key not valid. Please pass a valid API key.')]);
    expect(await codeOf(gemini.generate(contents))).toBe('INVALID_KEY');
  });

  test('never calls the network without a key', async () => {
    const fake = fakeTransport([]);
    const gemini = createGeminiClient({ transport: fake.transport, getApiKey: () => undefined });
    expect(await codeOf(gemini.generate(contents))).toBe('NO_KEY');
    expect(fake.calls).toHaveLength(0);
  });

  test('a failed fetch keeps its cause and the wait in the message, for support details', async () => {
    const { gemini } = client(['network']);
    const error = await gemini.generate(contents).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).message).toMatch(/^Network request failed \(TypeError after \d+s\)$/);
  });

  test('maps a failed fetch to NETWORK and an empty answer to EMPTY_RESPONSE', async () => {
    expect(await codeOf(client(['network']).gemini.generate(contents))).toBe('NETWORK');
    expect(await codeOf(client([textReply('  ')]).gemini.generate(contents))).toBe(
      'EMPTY_RESPONSE',
    );
  });

  test('reports NO_MODEL when every candidate is retired', async () => {
    const gone = errorReply(404, 'not found');
    expect(await codeOf(client([gone, gone, gone]).gemini.generate(contents))).toBe('NO_MODEL');
  });
});
