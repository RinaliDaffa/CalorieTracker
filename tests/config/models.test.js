import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_CANDIDATES, isModelUnavailableError, nextModel
} from '../../js/config/models.js';

test('there is more than one candidate to fall back to', () => {
  assert.ok(MODEL_CANDIDATES.length >= 2);
});

test('recognises a retired model from a 404', () => {
  assert.equal(isModelUnavailableError(404, 'models/x is not found'), true);
});

test('recognises a model-related 400', () => {
  assert.equal(
    isModelUnavailableError(400, 'Unsupported model: gemini-x'), true
  );
});

test('does not mistake a rate limit for a retired model', () => {
  assert.equal(isModelUnavailableError(429, 'Resource exhausted'), false);
});

test('does not mistake an auth failure for a retired model', () => {
  assert.equal(isModelUnavailableError(400, 'API_KEY_INVALID'), false);
});

test('advances through the candidate list in order', () => {
  const list = ['a', 'b', 'c'];
  assert.equal(nextModel('a', list), 'b');
  assert.equal(nextModel('b', list), 'c');
});

test('returns null when the list is exhausted', () => {
  assert.equal(nextModel('c', ['a', 'b', 'c']), null);
});

test('returns null for a model that is not in the list', () => {
  assert.equal(nextModel('zzz', ['a', 'b']), null);
});
