import type { Camera, Platform } from '../types';

/**
 * Playwright cannot give WebKit a fake camera, so tests swap in one that
 * "captures" a generated image. Everything downstream (resize, encode, save)
 * still runs for real.
 */
export function withTestCamera(platform: Platform): Platform {
  const camera: Camera = {
    isAvailable: () => true,
    async start() {},
    capture() {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const context = canvas.getContext('2d');
      if (!context) return Promise.reject(new Error('Canvas unavailable'));
      context.fillStyle = '#d97706';
      context.fillRect(0, 0, 640, 480);
      context.fillStyle = '#ffffff';
      context.font = '48px sans-serif';
      context.fillText('TEST MEAL', 170, 250);
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Capture failed'))),
          'image/jpeg',
          0.9,
        );
      });
    },
    stop() {},
  };
  return { ...platform, camera };
}
