import { chatReply } from '@nutrisnap/ai';
import { useLiveQuery } from 'dexie-react-hooks';
import { SendHorizontal } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { gemini } from '@/ai/client';
import { aiErrorMessage } from '@/ai/messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addChat, recentChats } from '@/db/chats';
import { useSetting } from '@/db/hooks';
import { db } from '@/db/schema';
import { AddKeyPrompt } from '@/features/common/AddKeyPrompt';
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
  const endRef = useRef<HTMLDivElement>(null);

  // Runs after every render: new messages and the typing indicator both need the view at the bottom.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  });

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || waiting) return;
    if (!apiKey.value) {
      toast.error(m.error_no_key());
      return;
    }
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
      setWaiting(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
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
      <h1 className="text-2xl font-bold">{m.title_chat()}</h1>
      {apiKey.loaded && !apiKey.value ? <AddKeyPrompt /> : null}

      <div
        role="log"
        aria-label={m.chat_log_label()}
        aria-live="polite"
        className="flex-1 space-y-3"
      >
        {messages && messages.length === 0 && !waiting ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-4xl" aria-hidden="true">
              🤖
            </p>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">{m.chat_intro()}</p>
            <div className="mx-auto flex max-w-xs flex-col gap-2">
              {suggestions.map(([label, message]) => (
                <Button
                  key={label}
                  variant="secondary"
                  size="sm"
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
              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
              message.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'border bg-card',
            )}
          >
            <ChatMarkdown text={message.content} />
            <span className="mt-1 block text-right text-[11px]">
              {formatTime(message.createdAt)}
            </span>
          </div>
        ))}
        {waiting ? (
          <p role="status" className="text-sm text-muted-foreground">
            {m.chat_typing()}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex gap-2 bg-background py-2 lg:bottom-0"
      >
        <Textarea
          aria-label={m.chat_input_label()}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={m.chat_placeholder()}
          className="min-h-11 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0"
          aria-label={m.chat_send()}
          disabled={waiting}
        >
          <SendHorizontal className="size-5" />
        </Button>
      </form>
    </div>
  );
}
