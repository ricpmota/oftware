import type { Medico } from '@/types/medico';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';

const normalizarNomeSlug = (str: string) =>
  (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Primeiro e último nome normalizados — alinhado a `app/api/medico-por-nome/route.ts`. */
export function medicoNomeIdentityKey(nome: string): { first: string; last: string } {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 0);
  if (partes.length === 0) return { first: '', last: '' };
  const first = normalizarNomeSlug(partes[0]);
  const last = partes.length > 1 ? normalizarNomeSlug(partes[partes.length - 1]) : first;
  return { first, last };
}

/** Slug da URL pública /dr/[slug] — mesmo padrão de metanutri/meta links. */
export function gerarSlugDrMedico(nome: string): string {
  const partesNome = nome.trim().split(/\s+/).filter((p) => p.length > 0);
  if (partesNome.length <= 1) return normalizarNomeSlug(partesNome[0] || '');
  return `${normalizarNomeSlug(partesNome[0])}-${normalizarNomeSlug(partesNome[partesNome.length - 1])}`;
}

/**
 * Slug final em `/dr/[slug]`: homônimos viram `nome-sobrenome2`, `nome-sobrenome3`, …
 * Índice segue a ordem do array `medicos` (ex.: mesma ordem do Firestore em `getAllMedicos`),
 * como em `app/api/medico-por-nome/route.ts`.
 */
export function publicDrSlugForMedico(medico: Medico, medicosEmOrdem: Medico[]): string {
  const { first, last } = medicoNomeIdentityKey(medico.nome);
  if (!first) return gerarSlugDrMedico(medico.nome);
  const mesmoPar = medicosEmOrdem.filter((m) => {
    const k = medicoNomeIdentityKey(m.nome);
    return k.first === first && k.last === last;
  });
  const idx = mesmoPar.findIndex((m) => m.id === medico.id);
  const base = gerarSlugDrMedico(medico.nome);
  if (idx <= 0) return base;
  return `${base}${idx + 1}`;
}

export function publicDrUrlForMedico(
  medico: Medico,
  medicosEmOrdem: Medico[],
  origin?: string
): string {
  const slug = publicDrSlugForMedico(medico, medicosEmOrdem);
  if (origin?.trim()) {
    return `${origin.replace(/\/$/, '')}/dr/${slug}`;
  }
  return buildOrganizacaoPublicUrl(`/dr/${slug}`);
}
