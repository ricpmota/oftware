const METODO_ASSET_PATTERN =
  /(metodo-emagrecer|metodo-simbolo|simbolo-metodo|og-metodo|icones-base-metodo|imc-meta-alvo-simbolo)/i;

/** Arquivos da marca Método Emagrecer. Outra organização nunca os exibe. */
export function isMetodoBrandAsset(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* mantém o valor original */
  }
  return METODO_ASSET_PATTERN.test(decoded);
}
