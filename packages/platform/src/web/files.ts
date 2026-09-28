import type { FileIO } from '../types';

export function createWebFileIO(): FileIO {
  return {
    saveText(filename, text, mimeType) {
      const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Revoking synchronously can cancel the download in Safari.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
  };
}
