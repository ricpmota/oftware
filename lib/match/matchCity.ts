/** Comparação de cidade. O texto mostrado continua o valor original. */

export function matchCityKey(value: string | undefined): string {
  if (!value) return '';
  const withoutSuffix = value.replace(/\s*[-/,]\s*[A-Za-z]{2}\s*$/, '');
  return withoutSuffix
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchStateKey(value: string | undefined): string {
  if (!value) return '';
  const letters = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  return letters.slice(0, 2);
}

export function sameMatchCity(
  left: { city?: string; state?: string },
  right: { city?: string; state?: string }
): boolean {
  const cityLeft = matchCityKey(left.city);
  const cityRight = matchCityKey(right.city);
  if (!cityLeft || !cityRight || cityLeft !== cityRight) return false;
  const stateLeft = matchStateKey(left.state);
  const stateRight = matchStateKey(right.state);
  if (stateLeft && stateRight && stateLeft !== stateRight) return false;
  return true;
}
