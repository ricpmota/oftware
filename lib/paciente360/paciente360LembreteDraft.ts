import type { LembreteTag } from '@/types/lembrete';
import type { Paciente360ProximaAcao, Paciente360Summary } from '@/types/paciente360';

export type Paciente360LembreteDraft = {
  pacienteId: string;
  pacienteNome: string;
  texto: string;
  tag: LembreteTag;
};

function tagFromProximaAcao(tipo?: Paciente360ProximaAcao['tipo']): LembreteTag {
  switch (tipo) {
    case 'cobrar_pagamento':
      return 'Cobrança';
    case 'revisar_exames':
      return 'Exames';
    case 'renovar_receita':
      return 'Renovação';
    case 'marcar_retorno':
      return 'Consulta';
    case 'avaliar_aplicacao':
      return 'Envio';
    case 'acompanhar':
    case 'sem_acao':
    case 'solicitar_fotos':
    default:
      return 'Ligação';
  }
}

export function buildPaciente360LembreteDraft(
  summary: Paciente360Summary
): Paciente360LembreteDraft | null {
  if (!summary.pacienteId) return null;

  const label = summary.proximaAcao?.label ?? 'Acompanhar paciente';
  return {
    pacienteId: summary.pacienteId,
    pacienteNome: summary.nome,
    texto: label,
    tag: tagFromProximaAcao(summary.proximaAcao?.tipo),
  };
}
