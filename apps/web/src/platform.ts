import { createWebPlatform, type Platform } from '@nutrisnap/platform';

let current: Platform = createWebPlatform();

export function platform(): Platform {
  return current;
}

export function isTestMode(): boolean {
  return (globalThis as { __NUTRISNAP_TEST__?: boolean }).__NUTRISNAP_TEST__ === true;
}

/** Test mode is set by Playwright before boot; the test adapter is a separate lazy chunk. */
export async function initPlatform(): Promise<void> {
  if (!isTestMode()) return;
  const { withTestCamera } = await import('@nutrisnap/platform/test');
  current = withTestCamera(current);
}
