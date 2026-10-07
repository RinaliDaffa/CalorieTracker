import type { Camera } from '../types';

export function createWebCamera(): Camera {
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let generation = 0;

  // Stops whatever is currently assigned without touching the generation counter,
  // so a start() in flight for a newer generation is never torn down by mistake.
  function release() {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
    if (video) video.srcObject = null;
    video = null;
  }

  function stop() {
    generation++;
    release();
  }

  return {
    isAvailable: () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,

    async start(element) {
      // Release any previous stream before requesting a new one, and mark this
      // attempt's generation so a concurrent stop()/start() can cancel it below.
      stop();
      const gen = generation;

      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      if (gen !== generation) {
        // stop() (or a newer start()) ran while getUserMedia was pending: this
        // stream was never assigned to the shared fields, so release it directly.
        for (const track of nextStream.getTracks()) track.stop();
        throw new Error('Camera start was cancelled');
      }

      try {
        stream = nextStream;
        video = element;
        element.srcObject = nextStream;
        await element.play();
      } catch (error) {
        release();
        throw error;
      }
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

    stop,
  };
}
