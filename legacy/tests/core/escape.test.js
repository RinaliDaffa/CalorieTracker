import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatChatContent } from '../../js/core/escape.js';

test('escapes angle brackets so markup cannot execute', () => {
  assert.equal(
    escapeHtml('<script>alert(1)</script>'),
    '&lt;script&gt;alert(1)&lt;/script&gt;'
  );
});

test('escapes ampersands exactly once', () => {
  // A naive sequential replace would double-escape this to "&amp;amp;lt;".
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('escapes quotes so attribute injection is not possible', () => {
  assert.equal(escapeHtml(`" onerror="x`), '&quot; onerror=&quot;x');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
});

test('leaves ordinary food names untouched', () => {
  assert.equal(escapeHtml('Nasi Goreng'), 'Nasi Goreng');
});

test('handles null and undefined without throwing', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('coerces numbers to string', () => {
  assert.equal(escapeHtml(250), '250');
});

test('markdown formatting survives escaping', () => {
  assert.equal(formatChatContent('**bold**'), '<strong>bold</strong>');
  assert.equal(formatChatContent('*italic*'), '<em>italic</em>');
});

test('injected markup is neutralised but markdown still renders', () => {
  const out = formatChatContent('**hi** <img src=x onerror=alert(1)>');
  assert.ok(out.includes('<strong>hi</strong>'));
  assert.ok(!out.includes('<img'));
  assert.ok(out.includes('&lt;img'));
});

test('newlines become line breaks', () => {
  assert.equal(formatChatContent('a\nb'), 'a<br>b');
});

test('every bullet in a list becomes a bullet, not just the first', () => {
  // The /m anchor needs real newlines, so bullets have to be substituted
  // before newlines become <br>. Getting that order wrong leaves every
  // line after the first rendered as a literal "- ".
  const out = formatChatContent('- protein\n- carbs\n- fat');
  assert.equal(out, '• protein<br>• carbs<br>• fat');
});

test('a bullet list below a paragraph still renders', () => {
  const out = formatChatContent('Try this:\n- more fibre');
  assert.equal(out, 'Try this:<br>• more fibre');
});
