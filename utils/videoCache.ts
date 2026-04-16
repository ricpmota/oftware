/**
 * Utilitário para cache de vídeos convertidos no IndexedDB
 */

const DB_NAME = 'videoCache';
const STORE_NAME = 'convertedVideos';
const DB_VERSION = 1;

interface VideoCacheEntry {
  videoId: string;
  data: ArrayBuffer; // ArrayBuffer ao invés de Blob (IndexedDB não suporta Blob diretamente)
  convertedAt: number;
  originalSize: number;
  convertedSize: number;
}

/**
 * Abre o banco de dados IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
        store.createIndex('convertedAt', 'convertedAt', { unique: false });
      }
    };
  });
}

/**
 * Obtém vídeo convertido do cache
 */
export async function getCachedVideo(videoId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(videoId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          // Converter ArrayBuffer de volta para Blob
          const blob = new Blob([result.data], { type: 'video/mp4' });
          resolve(blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao buscar vídeo do cache:', error);
    return null;
  }
}

/**
 * Salva vídeo convertido no cache
 */
export async function cacheVideo(
  videoId: string,
  blob: Blob,
  originalSize: number
): Promise<void> {
  try {
    // Converter Blob para ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();
    
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const entry: VideoCacheEntry = {
      videoId,
      data: arrayBuffer,
      convertedAt: Date.now(),
      originalSize,
      convertedSize: blob.size,
    };

    await store.put(entry);
    console.log('Vídeo convertido salvo no cache:', videoId, '(', (blob.size / 1024 / 1024).toFixed(2), 'MB)');
  } catch (error) {
    console.error('Erro ao salvar vídeo no cache:', error);
    throw error;
  }
}

/**
 * Remove vídeo do cache
 */
export async function removeCachedVideo(videoId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(videoId);
  } catch (error) {
    console.error('Erro ao remover vídeo do cache:', error);
  }
}

/**
 * Limpa todo o cache (útil para debug)
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
    console.log('Cache limpo');
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}

/**
 * Obtém tamanho total do cache
 */
export async function getCacheSize(): Promise<number> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entries = request.result as VideoCacheEntry[];
        const totalSize = entries.reduce((sum, entry) => sum + entry.convertedSize, 0);
        resolve(totalSize);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao calcular tamanho do cache:', error);
    return 0;
  }
}
