/**
 * Extrai a duração de um vídeo a partir de uma URL (Signed URL ou qualquer URL de mídia).
 * Usa HTMLVideoElement em memória com preload="metadata" — não baixa o vídeo inteiro.
 * Apenas para uso no browser (client-side).
 */

const inFlight = new Map<string, Promise<number>>();

/**
 * Extrai a duração em segundos do vídeo na URL.
 * Não executa múltiplas extrações simultâneas para a mesma URL (deduplica).
 * @param url URL do vídeo (ex.: Signed URL do GCS)
 * @returns Duração em segundos
 * @throws Se não for possível obter duração (erro de rede, formato não suportado, etc.)
 */
export async function extractVideoDuration(url: string): Promise<number> {
  const key = url;
  let promise = inFlight.get(key);
  if (promise) return promise;

  promise = (async () => {
    return new Promise<number>((resolve, reject) => {
      if (typeof document === 'undefined' || !document.createElement) {
        reject(new Error('extractVideoDuration só pode ser executado no browser'));
        return;
      }
      const video = document.createElement('video');
      video.preload = 'metadata';
      const timeout = setTimeout(() => {
        video.src = '';
        video.load();
        inFlight.delete(key);
        reject(new Error('Timeout ao carregar metadados do vídeo'));
      }, 30000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const duration = video.duration;
        video.src = '';
        video.load();
        inFlight.delete(key);
        if (Number.isFinite(duration) && duration > 0) {
          resolve(duration);
        } else {
          reject(new Error('Duração inválida'));
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        video.src = '';
        inFlight.delete(key);
        reject(new Error('Erro ao carregar vídeo'));
      };

      video.src = url;
    });
  })();

  inFlight.set(key, promise);
  return promise;
}
