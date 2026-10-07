import type { StoragePersistence } from '../types';

export function createWebStorage(): StoragePersistence {
  return {
    async persist() {
      return navigator.storage?.persist ? navigator.storage.persist() : false;
    },
    async estimate() {
      if (!navigator.storage?.estimate) return null;
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      return { usage, quota, persisted };
    },
  };
}
