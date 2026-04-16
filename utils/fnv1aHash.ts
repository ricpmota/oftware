/**
 * Implementação do algoritmo FNV-1a hash para gerar IDs estáveis
 * FNV-1a (Fowler-Noll-Vo) é um hash não criptográfico rápido e simples
 * 
 * @param str - String a ser hashada
 * @returns Hash hexadecimal de 32 bits como string
 */
export function fnv1aHash(str: string): string {
  // Constantes FNV-1a (32-bit)
  const FNV_OFFSET_BASIS = 2166136261;
  const FNV_PRIME = 16777619;
  
  let hash = FNV_OFFSET_BASIS;
  
  // Iterar sobre cada caractere da string
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // Multiplicação modular (FNV-1a padrão)
    // Usar operação modular para garantir 32-bit unsigned
    hash = (hash * FNV_PRIME) >>> 0;
  }
  
  // Converter para hexadecimal (8 caracteres)
  return hash.toString(16).padStart(8, '0');
}
