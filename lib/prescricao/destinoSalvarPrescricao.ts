import type { Prescricao } from '@/types/prescricao';

const IDS_TEMPORARIOS = new Set(['temp-new', 'temp-new']);

export function isProtocoloCatalogoAba(aba: string | undefined): boolean {
  return aba === 'protocolo';
}

/** Protocolo do médico no catálogo (sem paciente) — entra na lista da aba Injetáveis. */
export function isProtocoloCatalogoProprioMedico(
  p:
    | Pick<Prescricao, 'isTemplate' | 'pacienteId' | 'catalogoAba' | 'medicoId' | 'id'>
    | null
    | undefined,
  medicoId: string
): boolean {
  if (!p) return false;
  if (p.isTemplate) return false;
  if ((p.pacienteId || '').trim()) return false;
  if (p.catalogoAba !== 'protocolo') return false;
  const mid = (medicoId || '').trim();
  if (!mid || p.medicoId !== mid) return false;
  if (p.medicoId === 'SISTEMA') return false;
  if (IDS_TEMPORARIOS.has(p.id)) return false;
  return true;
}

/** Ao clicar no item: histórico do paciente ou protocolo próprio do catálogo ficam em edição (Salvar atualiza). */
export function prescricaoDeveFicarEmEdicao(p: Prescricao, medicoId: string): boolean {
  if (p.isTemplate) return false;
  if (IDS_TEMPORARIOS.has(p.id)) return false;
  if ((p.pacienteId || '').trim()) return true;
  return isProtocoloCatalogoProprioMedico(p, medicoId);
}

export type DestinoSalvarPrescricao = 'atualizar' | 'catalogo_protocolo' | 'historico_paciente';

export function resolverDestinoSalvarPrescricao(opts: {
  catalogoAba: string | undefined;
  atualizarHistoricoPaciente: boolean;
  atualizarProtocoloCatalogo: boolean;
}): DestinoSalvarPrescricao {
  if (opts.atualizarHistoricoPaciente || opts.atualizarProtocoloCatalogo) return 'atualizar';
  if (isProtocoloCatalogoAba(opts.catalogoAba)) return 'catalogo_protocolo';
  return 'historico_paciente';
}
