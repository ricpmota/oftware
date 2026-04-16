export type ManifestItemStatus = 'queued' | 'running' | 'done' | 'skipped' | 'failed';

export interface ManifestItemError {
  message: string;
  code?: string;
  raw?: string;
}

export interface ManifestItem {
  objectName: string;
  videoGcsUri: string;
  outputTxtGcsUri: string;
  outputJsonGcsUri: string;
  outputAudioGcsUri: string;
  status: ManifestItemStatus;
  operationName?: string;
  error?: ManifestItemError;
}

export interface TranscribeManifest {
  batchId: string;
  coursePrefix: string;
  bucket: string;
  createdAt: string;
  items: ManifestItem[];
}

export interface Progress {
  total: number;
  done: number;
  running: number;
  queued: number;
  skipped: number;
  failed: number;
}
