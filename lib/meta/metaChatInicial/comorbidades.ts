import type { PacienteCompleto } from '@/types/obesidade';
import { COMORBIDADES_LEGADO, COMORBIDADES_OPTIONS } from './constants';

export function alternarComorbidade(
  atual: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const marcar = !Boolean(atual[key]);
  if (key === 'nenhuma') {
    if (!marcar) return { ...atual, nenhuma: false };
    const next: Record<string, unknown> = { ...atual, nenhuma: true };
    for (const opcao of COMORBIDADES_OPTIONS) {
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

export function comorbidadesLegadoMarcadas(atual: Record<string, unknown>) {
  return COMORBIDADES_LEGADO.filter((opcao) => Boolean(atual[opcao.key]));
}

export function rotulosComorbidades(atual: Record<string, unknown> | undefined): string[] {
  if (!atual) return [];
  return COMORBIDADES_OPTIONS.flatMap(({ key, label }) => {
    if (!atual[key]) return [];
    if (key === 'outra' && typeof atual.outraDescricao === 'string' && atual.outraDescricao.trim()) {
      return [atual.outraDescricao.trim()];
    }
    return [label];
  });
}

export function pacienteComComorbidades(
  paciente: PacienteCompleto,
  comorbidades: Record<string, unknown>
): PacienteCompleto {
  return {
    ...paciente,
    dadosClinicos: {
      ...paciente.dadosClinicos,
      comorbidades: comorbidades as PacienteCompleto['dadosClinicos']['comorbidades'],
    },
  };
}
