import { uuidv7At } from '@nutrisnap/core';
import type { ChatRecord, NutriSnapDb } from './schema';

export async function addChat(
  d: NutriSnapDb,
  role: ChatRecord['role'],
  content: string,
  now: number = Date.now(),
): Promise<ChatRecord> {
  const record: ChatRecord = { id: uuidv7At(now), role, content, createdAt: now, updatedAt: now };
  await d.chats.add(record);
  return record;
}

export async function recentChats(d: NutriSnapDb, limit = 50): Promise<ChatRecord[]> {
  const chats = await d.chats
    .orderBy('createdAt')
    .filter((c) => c.deletedAt === undefined)
    .toArray();
  return chats.slice(-limit);
}

/** Returns the ids it cleared so the caller can offer undo. */
export async function clearChats(d: NutriSnapDb, now: number = Date.now()): Promise<string[]> {
  const ids = (await recentChats(d, Number.MAX_SAFE_INTEGER)).map((c) => c.id);
  await d.chats.bulkUpdate(
    ids.map((key) => ({ key, changes: { deletedAt: now, updatedAt: now } })),
  );
  return ids;
}

export async function restoreChats(
  d: NutriSnapDb,
  ids: string[],
  now: number = Date.now(),
): Promise<void> {
  await d.chats.bulkUpdate(
    ids.map((key) => ({ key, changes: { deletedAt: undefined, updatedAt: now } })),
  );
}
