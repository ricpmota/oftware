import type { PacienteCompleto } from '@/types/obesidade';
import { MEDICAMENTOS_DIABETES_OPTIONS } from './constants';
import { lerDiagnosticoTipos } from './diagnosticoCondicoes';

export function temDiabetesSelecionado(p: PacienteCompleto): boolean {
  const tipos = lerDiagnosticoTipos(p.dadosClinicos);
  return tipos.includes('dm1') || tipos.includes('dm2');
}

export function tituloMedicamentosDiabetes(p: PacienteCompleto): string {
  const tipos = lerDiagnosticoTipos(p.dadosClinicos);
  const dm1 = tipos.includes('dm1');
  const dm2 = tipos.includes('dm2');
  const qual = dm1 && dm2 ? 'tipo 1 e tipo 2' : dm1 ? 'tipo 1' : 'tipo 2';
  return `Quais medicamentos você toma para tratar seu diabetes ${qual}?`;
}

export function textoMedicamentosDiabetes(p: PacienteCompleto): string {
  return `${tituloMedicamentosDiabetes(p)}\n\nPode marcar mais de uma opção.`;
}

export function alternarMedicamentoDiabetes(
  atual: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const marcar = !Boolean(atual[key]);
  if (key === 'nenhum') {
    if (!marcar) return { ...atual, nenhum: false };
    const next: Record<string, unknown> = { ...atual, nenhum: true };
    for (const opcao of MEDICAMENTOS_DIABETES_OPTIONS) {
      if (opcao.key !== 'nenhum') next[opcao.key] = false;
    }
    return next;
  }
  return {
    ...atual,
    [key]: marcar,
    nenhum: marcar ? false : Boolean(atual.nenhum),
  };
}

export function medicamentosDiabetesInformados(
  dc: PacienteCompleto['dadosClinicos'] | undefined
): boolean {
  const atual = dc?.medicamentosDiabetes as Record<string, unknown> | undefined;
  if (!atual) return false;
  const algum = MEDICAMENTOS_DIABETES_OPTIONS.some((opcao) => Boolean(atual[opcao.key]));
  if (!algum) return false;
  if (atual.outros && !(typeof atual.outrosDescricao === 'string' && atual.outrosDescricao.trim())) return false;
  return true;
}

export function rotulosMedicamentosDiabetes(atual: Record<string, unknown> | undefined): string[] {
  if (!atual) return [];
  return MEDICAMENTOS_DIABETES_OPTIONS.flatMap(({ key, label }) => {
    if (!atual[key]) return [];
    if (key === 'outros' && typeof atual.outrosDescricao === 'string' && atual.outrosDescricao.trim()) {
      return [atual.outrosDescricao.trim()];
    }
    return [label];
  });
}

export function pacienteComMedicamentosDiabetes(
  paciente: PacienteCompleto,
  medicamentos: Record<string, unknown>
): PacienteCompleto {
  return {
    ...paciente,
    dadosClinicos: {
      ...paciente.dadosClinicos,
      medicamentosDiabetes: medicamentos as PacienteCompleto['dadosClinicos']['medicamentosDiabetes'],
    },
  };
}
