import type { LegacyDump } from './types';

export const LEGACY_EXPORT_FORMAT = 'nutrisnap-legacy';

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

function dataUrlToBlob(url: string): Blob {
  const match = /^data:([^;,]*);base64,(.*)$/.exec(url);
  if (!match) throw new Error('Invalid photo data');
  const binary = atob(match[2] ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] ?? '' });
}

/** The API key is never written to a file. */
export async function legacyToJson(dump: LegacyDump): Promise<string> {
  const photos = [];
  for (const photo of dump.photos) {
    if (photo.blob instanceof Blob) {
      photos.push({
        mealId: photo.mealId,
        timestamp: photo.timestamp,
        dataUrl: await blobToDataUrl(photo.blob),
      });
    }
  }
  return JSON.stringify({
    format: LEGACY_EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    meals: dump.meals,
    photos,
    goals: dump.goals,
    settings: dump.settings.filter((s) => s.key !== 'apiKey'),
    favorites: dump.favorites,
    chats: dump.chats,
  });
}

export function parseLegacyJson(text: string): LegacyDump {
  const data = JSON.parse(text) as Record<string, unknown>;
  if (data?.format !== LEGACY_EXPORT_FORMAT) throw new Error('Not a NutriSnap export');
  const list = (key: string): unknown[] =>
    Array.isArray(data[key]) ? (data[key] as unknown[]) : [];
  const photos = list('photos').flatMap((raw) => {
    const photo = raw as { mealId?: unknown; timestamp?: unknown; dataUrl?: unknown };
    if (typeof photo.dataUrl !== 'string') return [];
    return [
      { mealId: photo.mealId, timestamp: photo.timestamp, blob: dataUrlToBlob(photo.dataUrl) },
    ];
  });
  return {
    meals: list('meals') as LegacyDump['meals'],
    photos,
    goals: list('goals') as LegacyDump['goals'],
    settings: list('settings') as LegacyDump['settings'],
    favorites: list('favorites') as LegacyDump['favorites'],
    chats: list('chats') as LegacyDump['chats'],
  };
}
