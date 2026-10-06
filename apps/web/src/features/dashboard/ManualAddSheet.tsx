import { analyzeText } from '@nutrisnap/ai';
import { type MealType, mealTypeAt } from '@nutrisnap/core';
import { type FormEvent, useRef, useState } from 'react';
import { gemini } from '@/ai/client';
import { aiErrorMessage } from '@/ai/messages';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useSetting } from '@/db/hooks';
import { softDeleteMeal } from '@/db/meals';
import { db } from '@/db/schema';
import { AddKeyPrompt } from '@/features/common/AddKeyPrompt';
import { MealTypePicker } from '@/features/common/MealTypePicker';
import { saveAnalysis } from '@/features/scan/save';
import { aiLang } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';

export function ManualAddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const apiKey = useSetting<string>('apiKey');
  const opener = useRef<HTMLElement | null>(null);
  const [text, setText] = useState('');
  const [mealType, setMealType] = useState<MealType>(() => mealTypeAt(new Date()));
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const description = text.trim();
    if (!description) {
      toast.error(m.describe_empty());
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await analyzeText(gemini, description, aiLang());
      const meal = await saveAnalysis(db, {
        analysis: outcome,
        source: 'text',
        now: new Date(),
        mealType,
      });
      setText('');
      onOpenChange(false);
      toast.success(m.saved(), {
        action: { label: m.undo(), onClick: () => void softDeleteMeal(db, meal.id) },
      });
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl"
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = opener.current?.isConnected
            ? opener.current
            : document.getElementById('main');
          target?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{m.manual_title()}</SheetTitle>
          <SheetDescription>{m.manual_body()}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 px-4 pb-6">
          {apiKey.loaded && !apiKey.value ? <AddKeyPrompt /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="manual-text">{m.manual_label()}</Label>
            <Textarea
              id="manual-text"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={m.manual_placeholder()}
            />
          </div>
          <MealTypePicker value={mealType} onChange={setMealType} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? m.analyzing() : m.manual_submit()}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
