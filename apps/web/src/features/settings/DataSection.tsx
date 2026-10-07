import { toDateKey } from '@nutrisnap/core';
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { clearChats, restoreChats } from '@/db/chats';
import { allMeals } from '@/db/meals';
import { db } from '@/db/schema';
import { importLegacyDump } from '@/legacy/import';
import { parseLegacyJson } from '@/legacy/json';
import { formatBytes, formatTime } from '@/lib/i18n';
import { applyTheme } from '@/lib/theme';
import { toast } from '@/lib/toast';
import { m } from '@/paraglide/messages.js';
import { platform } from '@/platform';
import { mealsToCsv } from './csv';

function Row({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<string>('…');

  useEffect(() => {
    platform()
      .storage.estimate()
      .then((estimate) => {
        if (!estimate) return setStorage(m.storage_unavailable());
        const size = m.storage_value({
          used: formatBytes(estimate.usage),
          quota: formatBytes(estimate.quota),
        });
        setStorage(`${size} · ${estimate.persisted ? m.storage_kept() : m.storage_evictable()}`);
      })
      .catch(() => setStorage(m.storage_unavailable()));
  }, []);

  async function exportCsv() {
    const csv = mealsToCsv(await allMeals(db), formatTime);
    platform().files.saveText(`nutrisnap-export-${toDateKey(new Date())}.csv`, csv, 'text/csv');
    toast.success(m.exported());
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let dump: ReturnType<typeof parseLegacyJson>;
    try {
      dump = parseLegacyJson(await file.text());
    } catch {
      toast.error(m.import_bad_file());
      return;
    }
    const outcome = await importLegacyDump(db, dump, {
      makeThumb: (blob) => platform().image.thumbnail(blob),
      onTheme: applyTheme,
    });
    if (outcome.status === 'imported') toast.success(m.legacy_imported());
    else if (outcome.status === 'already') toast.info(m.import_already());
    else toast.error(m.legacy_failed());
  }

  async function clearChat() {
    const ids = await clearChats(db);
    toast(m.chat_cleared(), {
      action: { label: m.undo(), onClick: () => void restoreChats(db, ids) },
    });
  }

  return (
    <section aria-labelledby="settings-data" className="space-y-2">
      <h2 id="settings-data" className="text-lg font-bold">
        {m.settings_data()}
      </h2>
      <div className="divide-y rounded-3xl border bg-card shadow-card px-4">
        <Row
          title={m.export_csv()}
          description={m.export_csv_desc()}
          action={
            <Button variant="secondary" onClick={() => void exportCsv()}>
              {m.export_csv()}
            </Button>
          }
        />
        <Row
          title={m.import_old()}
          description={m.import_old_desc()}
          action={
            <>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                {m.import_old()}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                data-testid="legacy-json-input"
                onChange={(e) => void importFile(e)}
              />
            </>
          }
        />
        <Row
          title={m.clear_chat()}
          description={m.clear_chat_desc()}
          action={
            <Button variant="destructive" onClick={() => void clearChat()}>
              {m.clear_chat()}
            </Button>
          }
        />
        <Row
          title={m.storage_used()}
          description={m.storage_desc()}
          action={
            <span
              className="text-sm text-muted-foreground sm:text-right"
              data-testid="storage-estimate"
            >
              {storage}
            </span>
          }
        />
      </div>
    </section>
  );
}
