export type ParsedCrmUf = {
  uf: string;
  numero: string;
};

/** Ex.: `PB18168` → UF `PB`, CRM `18168` */
export function parseCrmUfParam(crmUf: string): ParsedCrmUf | null {
  const raw = decodeURIComponent(crmUf).trim().toUpperCase();
  if (raw.length < 3) return null;

  const uf = raw.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(uf)) return null;

  const numero = raw.slice(2).replace(/\D/g, '');
  if (!numero) return null;

  return { uf, numero };
}
