/**
 * Ordenação natural (natural sort) para strings contendo números
 * Exemplo: "1", "2", "10" ao invés de "1", "10", "2"
 */

/**
 * Compara duas strings usando ordenação natural
 * @param a Primeira string
 * @param b Segunda string
 * @returns Número negativo se a < b, positivo se a > b, 0 se a == b
 */
export function naturalCompare(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  // Regex para encontrar sequências de dígitos
  const numRegex = /(\d+)/g;

  // Dividir strings em partes (números e texto)
  const aParts = aLower.split(numRegex).filter(part => part.length > 0);
  const bParts = bLower.split(numRegex).filter(part => part.length > 0);

  // Comparar parte por parte
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';

    // Se ambas as partes são números, comparar numericamente
    const aIsNum = /^\d+$/.test(aPart);
    const bIsNum = /^\d+$/.test(bPart);

    if (aIsNum && bIsNum) {
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      // Comparar como strings
      if (aPart !== bPart) {
        return aPart < bPart ? -1 : 1;
      }
    }
  }

  return 0;
}

/**
 * Ordena um array de objetos por uma propriedade usando ordenação natural
 */
export function naturalSortBy<T>(array: T[], getValue: (item: T) => string): T[] {
  return [...array].sort((a, b) => naturalCompare(getValue(a), getValue(b)));
}
