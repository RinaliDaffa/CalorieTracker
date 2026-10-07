import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';
import { getSetting, type SettingKey } from './settings';

/** `loaded` distinguishes "still reading" from "not set". */
export function useSetting<T>(key: SettingKey): { loaded: boolean; value: T | undefined } {
  const result = useLiveQuery(async () => ({ value: await getSetting<T>(db, key) }), [key]);
  return { loaded: result !== undefined, value: result?.value };
}
