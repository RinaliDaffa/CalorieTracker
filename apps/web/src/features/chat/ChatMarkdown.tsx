import { type Inline, parseChatMarkdown } from './markdown';

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, index) => {
        // biome-ignore lint/suspicious/noArrayIndexKey: parsed spans are static for a message
        if (part.kind === 'strong') return <strong key={index}>{part.text}</strong>;
        // biome-ignore lint/suspicious/noArrayIndexKey: parsed spans are static for a message
        if (part.kind === 'em') return <em key={index}>{part.text}</em>;
        // biome-ignore lint/suspicious/noArrayIndexKey: parsed spans are static for a message
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {parseChatMarkdown(text).map((block, index) =>
        block.kind === 'list' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: parsed blocks are static for a message
          <ul key={index} className="list-disc space-y-1 pl-5">
            {block.items.map((parts, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: parsed blocks are static for a message
              <li key={i}>
                <Inlines parts={parts} />
              </li>
            ))}
          </ul>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: parsed blocks are static for a message
          <p key={index}>
            {block.lines.map((parts, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: parsed lines are static for a message
              <span key={i} className="block">
                <Inlines parts={parts} />
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
