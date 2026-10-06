import { chatReply } from '@nutrisnap/ai';
import { useLiveQuery } from 'dexie-react-hooks';
import { SendHorizontal, Sparkles } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { gemini } from '@/ai/client';
import { aiErrorMessage } from '@/ai/messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addChat, recentChats } from '@/db/chats';
import { useSetting } from '@/db/hooks';
import { db } from '@/db/schema';
import { AddKeyPrompt } from '@/features/common/AddKeyPrompt';
import { BrandMark } from '@/features/common/BrandMark';
import { aiLang, formatTime } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { ChatMarkdown } from './ChatMarkdown';
import { buildChatContext } from './context';

export function Chat() {
  const apiKey = useSetting<string>('apiKey');
  const messages = useLiveQuery(() => recentChats(db), []);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(false);
  // A ref, not state: two Enter presses in the same frame both see stale state.
  const sending = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Runs after every render: new messages and the typing indicator both need the view at the bottom.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  });

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || sending.current) return;
    if (!apiKey.value) {
      toast.error(m.error_no_key());
      return;
    }
    sending.current = true;
    setText('');
    setWaiting(true);
    await addChat(db, 'user', message);
    try {
      const reply = await chatReply(
        gemini,
        message,
        await buildChatContext(db, new Date()),
        aiLang(),
      );
      await addChat(db, 'assistant', reply);
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      sending.current = false;
      setWaiting(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: Enter that confirms a predictive/IME word must not send the message.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(text);
    }
  }

  const suggestions = [
    [m.chat_suggest_protein(), m.chat_suggest_protein_msg()],
    [m.chat_suggest_today(), m.chat_suggest_today_msg()],
    [m.chat_suggest_snack(), m.chat_suggest_snack_msg()],
  ] as const;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
      <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
        <BrandMark className="size-9" />
        {m.title_chat()}
      </h1>
      {apiKey.loaded && !apiKey.value ? <AddKeyPrompt /> : null}

      <div
        role="log"
        aria-label={m.chat_log_label()}
        aria-live="polite"
        className="flex-1 space-y-3"
      >
        {messages && messages.length === 0 && !waiting ? (
          <div className="space-y-4 rounded-3xl border border-dashed px-5 py-8 text-center">
            <p className="flex justify-center" aria-hidden="true">
              <Sparkles className="size-8 text-primary" />
            </p>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">{m.chat_intro()}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map(([label, message]) => (
                <Button
                  key={label}
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void send(message)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {(messages ?? []).map((message) => (
          <div
            key={message.id}
            data-role={message.role}
            className={cn(
              'max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-card',
              message.role === 'user'
                ? 'ml-auto rounded-br-lg bg-primary text-primary-foreground'
                : 'rounded-bl-lg border bg-card',
            )}
          >
            <ChatMarkdown text={message.content} />
            <span className="mt-1 block text-right text-[11px] opacity-75">
              {formatTime(message.createdAt)}
            </span>
          </div>
        ))}
        {waiting ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <span aria-hidden="true" className="flex gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
            </span>
            {m.chat_typing()}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] flex items-end gap-2 rounded-3xl border bg-card p-2 shadow-card focus-within:ring-2 focus-within:ring-ring lg:bottom-4"
      >
        <Textarea
          aria-label={m.chat_input_label()}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={m.chat_placeholder()}
          className="max-h-32 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label={m.chat_send()}
          disabled={waiting}
        >
          <SendHorizontal className="size-5" />
        </Button>
      </form>
    </div>
  );
}
