import { expect, test, vi } from 'vitest';

test('calls made before the toaster is ready are delivered in order afterwards', async () => {
  vi.resetModules();
  const { toast, markToasterReady } = await import('./toast');
  const base = vi.fn();
  const success = vi.fn();
  const order: string[] = [];
  base.mockImplementation(() => order.push('base'));
  success.mockImplementation(() => order.push('success'));

  toast('first', { duration: 1 });
  toast.success('second');
  expect(base).not.toHaveBeenCalled();

  markToasterReady(Object.assign(base, { success }) as never);
  await Promise.resolve();
  await Promise.resolve();

  expect(base).toHaveBeenCalledWith('first', { duration: 1 });
  expect(success).toHaveBeenCalledWith('second', undefined);
  expect(order).toEqual(['base', 'success']);
});
