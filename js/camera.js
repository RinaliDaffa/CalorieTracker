/* ============================================
   NutriSnap — Camera Module
   Photo capture and image handling
   ============================================ */

import { compressImage, blobToBase64 } from './utils.js';

let stream = null;
let videoElement = null;

// ── Start Camera ──
export async function startCamera(videoEl) {
  videoElement = videoEl;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // Rear camera
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    });

    videoElement.srcObject = stream;
    await videoElement.play();
    return true;
  } catch (err) {
    console.error('Camera access denied:', err);
    return false;
  }
}

// ── Stop Camera ──
export function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (videoElement) {
    videoElement.srcObject = null;
  }
}

// ── Capture Photo from Video ──
export async function capturePhoto() {
  if (!videoElement || !stream) {
    throw new Error('Camera is not active');
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      // Compress if too large (> 1MB)
      let finalBlob = blob;
      if (blob.size > 1024 * 1024) {
        finalBlob = await compressImageBlob(blob, 1024, 0.7);
      }
      const base64 = await blobToBase64(finalBlob);
      resolve({ blob: finalBlob, base64 });
    }, 'image/jpeg', 0.85);
  });
}

// ── Process File from Gallery ──
export async function processImageFile(file) {
  // Compress the image
  const compressedBlob = await compressImage(file, 1024, 0.75);
  const base64 = await blobToBase64(compressedBlob);
  return { blob: compressedBlob, base64 };
}

// ── Compress a Blob ──
function compressImageBlob(blob, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (resultBlob) => resolve(resultBlob),
        'image/jpeg',
        quality
      );
    };
    img.src = url;
  });
}

// ── Create object URL for display ──
export function createImageURL(blob) {
  return URL.createObjectURL(blob);
}

// ── Revoke object URL ──
export function revokeImageURL(url) {
  URL.revokeObjectURL(url);
}

// ── Check camera availability ──
export function isCameraAvailable() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
