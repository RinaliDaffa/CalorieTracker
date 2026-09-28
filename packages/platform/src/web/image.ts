import { fitWithin } from '../sizing';
import type { ImageProcessor } from '../types';

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

function drawToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas unavailable'));
  context.drawImage(source, 0, 0, width, height);
  // Re-encoding through canvas discards EXIF, which keeps GPS data on the device.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      'image/jpeg',
      quality,
    );
  });
}

async function resize(input: Blob, maxEdge: number, quality: number) {
  const bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
  try {
    const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const blob = await drawToJpeg(bitmap, size.width, size.height, quality);
    return { blob, ...size };
  } finally {
    bitmap.close();
  }
}

export function createWebImageProcessor(): ImageProcessor {
  return {
    async prepare(input, options = {}) {
      const { blob, width, height } = await resize(
        input,
        options.maxEdge ?? 1024,
        options.quality ?? 0.75,
      );
      return { blob, base64: await blobToBase64(blob), width, height, takenAt: Date.now() };
    },
    async thumbnail(input, maxEdge = 256) {
      return (await resize(input, maxEdge, 0.7)).blob;
    },
  };
}
