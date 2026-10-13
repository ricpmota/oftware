/** URLs de foto aceitas na impressão do relatório público. Evita buscar endereço arbitrário no servidor. */

const REMOTE_PHOTO_HOSTS = ['.googleusercontent.com', '.ggpht.com'];

export function storageObjectPath(url: string, bucketName: string): string | null {
  const bucket = bucketName.trim();
  if (!bucket) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;

    if (parsed.hostname === 'storage.googleapis.com') {
      const parts = decodeURIComponent(parsed.pathname.replace(/^\//, '')).split('/').filter(Boolean);
      if (parts[0] !== bucket) return null;
      const objectPath = parts.slice(1).join('/');
      return objectPath || null;
    }

    if (parsed.hostname === 'firebasestorage.googleapis.com') {
      const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) return null;
      if (decodeURIComponent(match[1]) !== bucket) return null;
      const objectPath = decodeURIComponent(match[2]);
      return objectPath || null;
    }

    return null;
  } catch {
    return null;
  }
}

export function isAllowedRemotePhotoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return REMOTE_PHOTO_HOSTS.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

export function sniffImageContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}
