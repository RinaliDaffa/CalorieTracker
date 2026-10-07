import { AiError } from '@nutrisnap/ai';
import { expect, test } from 'vitest';
import { aiErrorDetail } from './messages';

test('an AI error is summarised as code, status and Google message', () => {
  const error = new AiError('HTTP', 'Request contains an invalid argument.', { status: 400 });
  expect(aiErrorDetail(error)).toBe('HTTP · 400 · Request contains an invalid argument.');
});

test('any other failure shows its name, and long text is cut short', () => {
  expect(aiErrorDetail(new TypeError('Load failed'))).toBe('TypeError: Load failed');
  const long = aiErrorDetail(new Error('x'.repeat(400)));
  expect(long.length).toBe(160);
  expect(long.endsWith('…')).toBe(true);
});
