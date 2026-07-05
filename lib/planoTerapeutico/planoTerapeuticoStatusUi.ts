import type { StatusPlanoTerapeutico } from '@/types/planoTerapeuticoInterativo';

export const PLANO_TERAPEUTICO_STATUS_LABELS: Record<StatusPlanoTerapeutico, string> = {
  rascunho: 'Rascunho',
  compartilhado: 'Aguardando paciente',
  aceito: 'Plano aceito pelo paciente',
  cancelado: 'Cancelado',
};

export function planoTerapeuticoStatusBadgeClass(status: StatusPlanoTerapeutico): string {
  switch (status) {
    case 'aceito':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'compartilhado':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'cancelado':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export function planoPacienteEscolheuPlano(
  plano: { escolhaPaciente?: unknown; escolhaPacienteEm?: string | null } | null
): boolean {
  return Boolean(plano?.escolhaPaciente && plano.escolhaPacienteEm);
}

export function planoPacienteJaAssinou(
  plano: {
    status?: StatusPlanoTerapeutico;
    acceptedAt?: string | null;
    pacienteSignStatus?: string | null;
    pdfFinalAssinadoUrl?: string | null;
  } | null
): boolean {
  if (plano?.pacienteSignStatus === 'assinado' && plano.pdfFinalAssinadoUrl?.trim()) {
    return true;
  }
  return plano?.status === 'aceito' && Boolean(plano.acceptedAt);
}

export function planoPacienteAguardandoEasySign(
  plano: {
    status?: StatusPlanoTerapeutico;
    pacienteSignStatus?: string | null;
  } | null
): boolean {
  if (!plano) return false;
  if (plano.status === 'aceito') return false;
  return plano.pacienteSignStatus === 'link_gerado';
}

export function planoMedicoJaAssinou(
  plano: { pdfAssinadoMedicoUrl?: string | null; medicoAssinadoEm?: string | null } | null
): boolean {
  return Boolean(plano?.pdfAssinadoMedicoUrl?.trim() && plano.medicoAssinadoEm);
}

export function planoPodeSerCancelado(
  plano: {
    status?: StatusPlanoTerapeutico;
    pdfAssinadoMedicoUrl?: string | null;
    medicoAssinadoEm?: string | null;
  } | null
): boolean {
  if (!plano) return false;
  if (plano.status === 'cancelado') return false;
  if (planoMedicoJaAssinou(plano)) return false;
  return plano.status === 'compartilhado' || plano.status === 'aceito' || plano.status === 'rascunho';
}

export function planoPacienteAssinaturaPendente(
  plano: { status?: StatusPlanoTerapeutico } | null
): boolean {
  return plano?.status === 'compartilhado' || plano?.status === 'rascunho';
}
