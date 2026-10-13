import type { PacienteCompleto } from '@/types/obesidade';
import { CIRURGIAS_OPTIONS } from './constants';

export function alternarCirurgia(atual: Record<string, unknown>, key: string): Record<string, unknown> {
  const marcar = !Boolean(atual[key]);
  if (key === 'nenhuma') {
    if (!marcar) return { ...atual, nenhuma: false };
    const next: Record<string, unknown> = { ...atual, nenhuma: true };
    for (const opcao of CIRURGIAS_OPTIONS) {
      if (opcao.key !== 'nenhuma') next[opcao.key] = false;
    }
    return next;
  }
  return {
    ...atual,
    [key]: marcar,
    nenhuma: marcar ? false : Boolean(atual.nenhuma),
  };
}

export function cirurgiasInformadas(
  dc: PacienteCompleto['dadosClinicos'] | undefined
): boolean {
  const atual = dc?.cirurgiasRealizadas as Record<string, unknown> | undefined;
  if (!atual) return false;
  return CIRURGIAS_OPTIONS.some((opcao) => Boolean(atual[opcao.key]));
}

export function rotulosCirurgias(atual: Record<string, unknown> | undefined): string[] {
  if (!atual) return [];
  return CIRURGIAS_OPTIONS.flatMap(({ key, label }) => (atual[key] ? [label] : []));
}

export function pacienteComCirurgias(
  paciente: PacienteCompleto,
  cirurgias: Record<string, unknown>
): PacienteCompleto {
  return {
    ...paciente,
    dadosClinicos: {
      ...paciente.dadosClinicos,
      cirurgiasRealizadas: cirurgias as PacienteCompleto['dadosClinicos']['cirurgiasRealizadas'],
    },
  };
}
