import { describe, expect, test } from 'vitest';
import {
  isKnownModel,
  isModelUnavailableError,
  MODEL_CANDIDATES,
  nextModel,
  quotaWindow,
  retryDelayMs,
} from './models';

describe('model fallback (ported)', () => {
  test('there is more than one candidate to fall back to', () => {
    expect(MODEL_CANDIDATES.length).toBeGreaterThanOrEqual(2);
  });

  test('recognises a retired model from a 404', () => {
    expect(isModelUnavailableError(404, 'models/x is not found')).toBe(true);
  });

  test('recognises a model-related 400', () => {
    expect(isModelUnavailableError(400, 'Unsupported model: gemini-x')).toBe(true);
  });

  test('does not mistake a rate limit or an auth failure for a retired model', () => {
    expect(isModelUnavailableError(429, 'Resource exhausted')).toBe(false);
    expect(isModelUnavailableError(400, 'API_KEY_INVALID')).toBe(false);
    expect(isModelUnavailableError(404, 'PERMISSION_DENIED')).toBe(false);
  });

  test('advances through the list in order and stops at the end', () => {
    expect(nextModel('a', ['a', 'b', 'c'])).toBe('b');
    expect(nextModel('c', ['a', 'b', 'c'])).toBeNull();
    expect(nextModel('zzz', ['a', 'b'])).toBeNull();
  });

  test('only candidates still in the list are known', () => {
    expect(isKnownModel(MODEL_CANDIDATES[0])).toBe(true);
    expect(isKnownModel('gemini-1.0-pro-retired')).toBe(false);
    expect(isKnownModel(undefined)).toBe(false);
  });
});

const dailyBody = {
  error: {
    code: 429,
    message: 'You exceeded your current quota.',
    status: 'RESOURCE_EXHAUSTED',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }],
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '42s' },
    ],
  },
};

const minuteBody = {
  error: {
    code: 429,
    message: 'Rate limited.',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }],
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '7.5s' },
    ],
  },
};

describe('quota classification', () => {
  test('tells a daily quota from a per-minute limit', () => {
    expect(quotaWindow(dailyBody)).toBe('day');
    expect(quotaWindow(minuteBody)).toBe('minute');
    expect(quotaWindow({})).toBe('unknown');
    expect(quotaWindow(null)).toBe('unknown');
  });

  test('reads the suggested retry delay', () => {
    expect(retryDelayMs(dailyBody)).toBe(42000);
    expect(retryDelayMs(minuteBody)).toBe(7500);
    expect(retryDelayMs({ error: {} })).toBeNull();
  });
});
