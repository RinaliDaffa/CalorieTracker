import type { Platform } from '../types';
import { createWebCamera } from './camera';
import { createWebFileIO } from './files';
import { createWebImageProcessor } from './image';
import { createWebStorage } from './storage';

export { blobToBase64 } from './image';

export function createWebPlatform(): Platform {
  return {
    camera: createWebCamera(),
    image: createWebImageProcessor(),
    files: createWebFileIO(),
    storage: createWebStorage(),
  };
}
