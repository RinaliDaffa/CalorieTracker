import { expect, test } from '@playwright/test';
import { enableTestMode } from './helpers';

test("imports the old app's data on first launch and leaves it in place", async ({ page }) => {
  await enableTestMode(page);
  await page.goto('/');

  await page.evaluate(async () => {
    const now = Date.now();
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('nutrisnap', 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore('meals', { keyPath: 'id' }).createIndex('date', 'date');
        for (const [store, keyPath] of [
          ['photos', 'mealId'],
          ['goals', 'id'],
          ['settings', 'key'],
          ['favorites', 'id'],
          ['chats', 'id'],
        ] as const) {
          database.createObjectStore(store, { keyPath });
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction(['meals', 'settings'], 'readwrite');
        tx.objectStore('meals').put({
          id: 'legacy-1',
          date,
          mealType: 'lunch',
          timestamp: now,
          foodItems: [
            {
              name: 'Gado-gado',
              servingSize: '1 porsi',
              calories: 420,
              protein: 15,
              carbs: 40,
              fat: 22,
            },
          ],
          nutrition: { calories: 420, protein: 15, carbs: 40, fat: 22, fiber: 0, sugar: 0 },
        });
        tx.objectStore('settings').put({ key: 'apiKey', value: 'legacy-key' });
        tx.oncomplete = () => {
          database.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });

  // goto, not reload: once onboarding exists (Task 11) the first visit sits on /welcome.
  await page.goto('/');
  // A generous timeout: under the full six-project parallel run this host's
  // boot (readLegacy + import + render) can take longer than the default 5s.
  await expect(page.getByText('Your data from the old app was imported.')).toBeVisible({
    timeout: 15000,
  });

  const stillThere = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const request = indexedDB.open('nutrisnap');
        request.onsuccess = () => {
          const count = request.result.transaction('meals').objectStore('meals').count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
  expect(stillThere).toBe(1);
});
