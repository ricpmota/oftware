/** Papel da proteína no prato (principal vs complementar). */

export type PapelProteinaNoPrato = 'principal' | 'complementar';

/** Claras e cottage costumam ser complemento. */
export function papelProteinaItem(itemId: string): PapelProteinaNoPrato {
  if (itemId.includes('claras') || itemId.includes('cottage')) return 'complementar';
  return 'principal';
}
