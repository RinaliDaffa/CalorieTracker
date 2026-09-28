import type { Camera } from '../types';

export function createWebCamera(): Camera {
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;

  return {
    isAvailable: () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,

    async start(element) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      video = element;
      element.srcObject = stream;
      await element.play();
    },

    capture() {
      if (!video || !stream) return Promise.reject(new Error('Camera is not active'));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) return Promise.reject(new Error('Canvas unavailable'));
      context.drawImage(video, 0, 0);
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Capture failed'))),
          'image/jpeg',
          0.92,
        );
      });
    },

    stop() {
      for (const track of stream?.getTracks() ?? []) track.stop();
      stream = null;
      if (video) video.srcObject = null;
      video = null;
    },
  };
}
