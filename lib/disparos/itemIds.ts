export function pendingItemId(sequence: number): string {
  return `n_${String(sequence).padStart(6, '0')}`;
}
