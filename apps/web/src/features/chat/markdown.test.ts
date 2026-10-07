import { expect, test } from 'vitest';
import { parseChatMarkdown, parseInline } from './markdown';

test('bold and italics become typed spans', () => {
  expect(parseInline('Eat **more** protein, *slowly*.')).toEqual([
    { kind: 'text', text: 'Eat ' },
    { kind: 'strong', text: 'more' },
    { kind: 'text', text: ' protein, ' },
    { kind: 'em', text: 'slowly' },
    { kind: 'text', text: '.' },
  ]);
});

test('markup from the model stays plain text', () => {
  expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
    { kind: 'text', text: '<img src=x onerror=alert(1)>' },
  ]);
});

test('consecutive bullets form one list; blank lines split paragraphs', () => {
  const blocks = parseChatMarkdown('Ideas:\n- Tempe\n* Telur\n• Tahu\n\nEnjoy!\r\nSee you');
  expect(blocks).toEqual([
    { kind: 'paragraph', lines: [[{ kind: 'text', text: 'Ideas:' }]] },
    {
      kind: 'list',
      items: [
        [{ kind: 'text', text: 'Tempe' }],
        [{ kind: 'text', text: 'Telur' }],
        [{ kind: 'text', text: 'Tahu' }],
      ],
    },
    {
      kind: 'paragraph',
      lines: [[{ kind: 'text', text: 'Enjoy!' }], [{ kind: 'text', text: 'See you' }]],
    },
  ]);
});

test('a line that starts with italics is not a bullet', () => {
  expect(parseChatMarkdown('*Tip*: drink water')[0]?.kind).toBe('paragraph');
});
