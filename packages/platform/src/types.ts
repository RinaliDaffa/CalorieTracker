export interface CapturedPhoto {
  blob: Blob;
  base64: string;
  width: number;
  height: number;
  takenAt: number;
}

export interface Camera {
  isAvailable(): boolean;
  start(video: HTMLVideoElement): Promise<void>;
  capture(): Promise<Blob>;
  stop(): void;
}

export interface PrepareOptions {
  maxEdge?: number;
  quality?: number;
}

export interface ImageProcessor {
  /** Orientation-corrected, EXIF-free JPEG sized for upload. Rejects when the image cannot be decoded. */
  prepare(input: Blob, options?: PrepareOptions): Promise<CapturedPhoto>;
  thumbnail(input: Blob, maxEdge?: number): Promise<Blob>;
}

export interface FileIO {
  saveText(filename: string, text: string, mimeType: string): void;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  persisted: boolean;
}

export interface StoragePersistence {
  persist(): Promise<boolean>;
  estimate(): Promise<StorageEstimate | null>;
}

export interface Platform {
  camera: Camera;
  image: ImageProcessor;
  files: FileIO;
  storage: StoragePersistence;
}
