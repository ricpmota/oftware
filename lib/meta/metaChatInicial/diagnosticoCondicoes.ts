import type { PacienteCompleto } from '@/types/obesidade';
import {
  DIAGNOSTICO_NENHUMA,
  DIAGNOSTICO_TIPOS,
  DIAGNOSTICO_TIPOS_LEGADO,
} from './constants';

export type DiagnosticoTipo = (typeof DIAGNOSTICO_TIPOS)[number];
export type DiabetesTipo = 'dm1' | 'dm2';

const DIABETES = new Set<string>(['dm1', 'dm2']);
const LEGADO = new Set<string>(DIAGNOSTICO_TIPOS_LEGADO);

export function lerDiagnosticoTipos(
  dc: PacienteCompleto['dadosClinicos'] | undefined
): DiagnosticoTipo[] {
  const lista = dc?.diagnosticoPrincipalTipos;
  if (lista?.length) return [...lista];
  const tipo = dc?.diagnosticoPrincipal?.tipo;
  return tipo ? [tipo] : [];
}

export function rotuloDiabetesSelecionado(tipos: readonly string[]): string | null {
  const dm1 = tipos.includes('dm1');
  const dm2 = tipos.includes('dm2');
  if (dm1 && dm2) return 'Tipo 1 e tipo 2';
  if (dm1) return 'Tipo 1';
  if (dm2) return 'Tipo 2';
  return null;
}

export function diagnosticosLegadoSelecionados(tipos: readonly string[]): DiagnosticoTipo[] {
  return tipos.filter((t): t is DiagnosticoTipo => LEGADO.has(t));
}

/** "Nenhuma dessas" substitui todas as marcas. As demais convivem e tiram o "nenhuma". */
export function toggleDiagnosticoOpcao(atuais: readonly string[], value: string): DiagnosticoTipo[] {
  if (value === DIAGNOSTICO_NENHUMA) {
    return atuais.length === 1 && atuais[0] === DIAGNOSTICO_NENHUMA ? [] : [DIAGNOSTICO_NENHUMA];
  }
  const semNenhuma = atuais.filter((item) => item !== DIAGNOSTICO_NENHUMA);
  const next = semNenhuma.includes(value)
    ? semNenhuma.filter((item) => item !== value)
    : [...semNenhuma, value];
  return next as DiagnosticoTipo[];
}

export function definirTipoDiabetes(atuais: readonly string[], tipo: DiabetesTipo): DiagnosticoTipo[] {
  const semDiabetes = atuais.filter((item) => !DIABETES.has(item) && item !== DIAGNOSTICO_NENHUMA);
  return [...semDiabetes, tipo] as DiagnosticoTipo[];
}

export function removerDiabetes(atuais: readonly string[]): DiagnosticoTipo[] {
  return atuais.filter((item) => !DIABETES.has(item)) as DiagnosticoTipo[];
}

export function pacienteComDiagnosticos(
  paciente: PacienteCompleto,
  tipos: DiagnosticoTipo[]
): PacienteCompleto {
  const primeiro = tipos[0];
  const outro = paciente.dadosClinicos?.diagnosticoPrincipal?.outro;
  return {
    ...paciente,
    dadosClinicos: {
      ...paciente.dadosClinicos,
      diagnosticoPrincipal: primeiro ? { tipo: primeiro, outro } : undefined,
      diagnosticoPrincipalTipos: tipos,
    },
  };
}
