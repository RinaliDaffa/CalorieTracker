import 'fake-indexeddb/auto';
import { createDb, type NutriSnapDb } from './schema';

let counter = 0;

/** A new, empty database per call, so tests never share state. */
export function freshDb(): NutriSnapDb {
  counter += 1;
  return createDb(`test-${counter}-${Math.random().toString(36).slice(2)}`);
}
