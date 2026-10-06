export type Inline = { kind: 'text' | 'strong' | 'em'; text: string };
export type Block = { kind: 'paragraph'; lines: Inline[][] } | { kind: 'list'; items: Inline[][] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const EMPHASIS = /\*\*(.+?)\*\*|\*(.+?)\*/g;

/** Produces data, never HTML: the renderer turns it into React elements. */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of line.matchAll(EMPHASIS)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: 'text', text: line.slice(last, index) });
    if (match[1] !== undefined) out.push({ kind: 'strong', text: match[1] });
    else out.push({ kind: 'em', text: match[2] ?? '' });
    last = index + match[0].length;
  }
  if (last < line.length) out.push({ kind: 'text', text: line.slice(last) });
  return out;
}

export function parseChatMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Inline[][] = [];
  let list: Inline[][] = [];
  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', lines: paragraph });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length > 0) blocks.push({ kind: 'list', items: list });
    list = [];
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const bullet = BULLET.exec(line);
    if (bullet) {
      flushParagraph();
      list.push(parseInline(bullet[1] ?? ''));
      continue;
    }
    flushList();
    if (line.trim() === '') flushParagraph();
    else paragraph.push(parseInline(line));
  }
  flushParagraph();
  flushList();
  return blocks;
}
