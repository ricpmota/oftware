import type { Paciente360ProximaAcao, Paciente360Summary } from '@/types/paciente360';

export type Paciente360PrimaryActionKind = 'whatsapp' | 'prontuario' | 'paciente';

export type Paciente360PrimaryAction = {
  label: string;
  kind: Paciente360PrimaryActionKind;
};

const PRIMARY_LABELS: Partial<Record<NonNullable<Paciente360ProximaAcao['tipo']>, string>> = {
  cobrar_pagamento: 'Cobrar pagamento',
  avaliar_aplicacao: 'Avaliar aplicação',
  renovar_receita: 'Renovar receita',
  revisar_exames: 'Revisar exames',
  marcar_retorno: 'Marcar retorno',
  solicitar_fotos: 'Solicitar fotos',
};

export function getPaciente360PrimaryAction(summary?: Paciente360Summary): Paciente360PrimaryAction {
  const tipo = summary?.proximaAcao?.tipo;

  if (tipo === 'cobrar_pagamento') {
    return { label: PRIMARY_LABELS.cobrar_pagamento!, kind: 'whatsapp' };
  }

  if (tipo === 'avaliar_aplicacao') {
    return { label: PRIMARY_LABELS.avaliar_aplicacao!, kind: 'prontuario' };
  }

  if (tipo === 'renovar_receita') {
    return { label: PRIMARY_LABELS.renovar_receita!, kind: 'prontuario' };
  }

  if (tipo === 'revisar_exames') {
    return { label: PRIMARY_LABELS.revisar_exames!, kind: 'prontuario' };
  }

  if (tipo === 'marcar_retorno') {
    return { label: PRIMARY_LABELS.marcar_retorno!, kind: 'paciente' };
  }

  if (tipo === 'solicitar_fotos') {
    return { label: PRIMARY_LABELS.solicitar_fotos!, kind: 'paciente' };
  }

  if (
    summary?.statusComposto === 'pendente' ||
    summary?.statusComposto === 'aguardando_marco_zero' ||
    summary?.proximaAcao?.label === 'Iniciar acompanhamento'
  ) {
    return { label: 'Iniciar acompanhamento', kind: 'paciente' };
  }

  return {
    label: summary?.proximaAcao?.label ?? 'Acompanhar evolução',
    kind: 'paciente',
  };
}
