import type { TranscribeManifest, ManifestItem } from './types';
import { objectNameToOutputPaths } from './paths';
import * as storage from '@/lib/gcp/storage';

const MANIFEST_PREFIX = process.env.TRANSCRIBE_MANIFEST_PREFIX || 'transcribe-manifests/oftreview/';

export function getManifestPath(batchId: string): string {
  return `${MANIFEST_PREFIX}${batchId}.json`;
}

export async function loadManifest(batchId: string): Promise<TranscribeManifest> {
  const path = getManifestPath(batchId);
  return storage.readJson<TranscribeManifest>(path);
}

export async function saveManifest(manifest: TranscribeManifest): Promise<void> {
  const path = getManifestPath(manifest.batchId);
  await storage.writeJson(path, manifest);
}

export function createManifestItem(objectName: string): ManifestItem {
  const paths = objectNameToOutputPaths(objectName);
  return {
    objectName,
    videoGcsUri: paths.videoGcsUri,
    outputTxtGcsUri: paths.outputTxtGcsUri,
    outputJsonGcsUri: paths.outputJsonGcsUri,
    outputAudioGcsUri: paths.outputAudioGcsUri,
    status: 'queued',
  };
}
