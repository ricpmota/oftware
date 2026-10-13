/**
 * Tabela comparativa de exames laboratoriais para o PDF.
 * Usa a mesma lista, grupos e faixas da página (LISTA_EXAMES + getLabRange).
 * Não aplica o “ideal” nem o score Oftware.
 */
import type { PacienteCompleto } from '@/types/obesidade';
import type { Sex } from '@/types/labRanges';
import { getLabRange, isInRange, type LabRange } from '@/utils/labRangesFromJson';
import { EXAME_KEY_TO_LAB, GROUP_ORDER, LISTA_EXAMES } from '@/utils/relatorioPacienteConstants';

export const LAB_AUSENTE = '\u2014';

export type SituacaoLab = 'Dentro' | 'Abaixo' | 'Acima' | 'Não classificado';

export type LabCelula = {
  texto: string;
};

export type LabMarcador = {
  key: string;
  grupo: string;
  nome: string;
  unidade: string;
  celulas: LabCelula[];
  referencia: string;
  situacao: SituacaoLab;
  /** Índice da coleta da medição mais recente. Null se nenhuma. */
  indiceMedicao: number | null;
};

export type LabGrupo = {
  nome: string;
  marcadores: LabMarcador[];
};

export type LabColeta = {
  data: unknown;
  tempo: number | null;
};

export type LabPdfModel = {
  coletas: LabColeta[];
  grupos: LabGrupo[];
};

const HEMOGRAMA = [
  { campo: 'hemoglobina', nome: 'Hemoglobina' },
  { campo: 'hematocrito', nome: 'Hematócrito' },
  { campo: 'leucocitos', nome: 'Leucócitos' },
  { campo: 'plaquetas', nome: 'Plaquetas' },
] as const;

function tempoColeta(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.getTime();
  if (typeof valor === 'object' && valor !== null && 'toDate' in valor) {
    const fn = (valor as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') {
      try {
        const d = fn.call(valor);
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getTime();
      } catch {
        return null;
      }
    }
  }
  if (typeof valor === 'string') {
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(valor as string | number);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function ordenarColetasLab<T extends { dataColeta?: unknown; id?: string }>(coletas: T[]): T[] {
  return coletas
    .map((coleta, index) => ({ coleta, index, tempo: tempoColeta(coleta.dataColeta) }))
    .sort((a, b) => {
      if (a.tempo == null && b.tempo == null) return a.index - b.index;
      if (a.tempo == null) return -1;
      if (b.tempo == null) return 1;
      if (a.tempo !== b.tempo) return a.tempo - b.tempo;
      const idA = a.coleta.id || '';
      const idB = b.coleta.id || '';
      if (idA !== idB) return idA < idB ? -1 : 1;
      return a.index - b.index;
    })
    .map((item) => item.coleta);
}

export function formatarNumeroLab(valor: number): string {
  if (!Number.isFinite(valor)) return LAB_AUSENTE;
  const texto = String(valor);
  const casas = texto.includes('.') ? Math.min(2, texto.split('.')[1]?.length || 0) : 0;
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function classificarValorLab(valor: number | null, faixa: LabRange | null): SituacaoLab {
  if (valor == null || !faixa || isInRange(valor, faixa) == null) return 'Não classificado';
  if (valor < faixa.min) return 'Abaixo';
  if (valor > faixa.max) return 'Acima';
  return 'Dentro';
}

function qualificadorDeFaixa(texto: string): boolean {
  const t = texto.trim();
  if (/^[MF]$/i.test(t)) return true;
  return /idade|sexo|método|metodo|laborat|25-?\s*OH|CKD/i.test(t);
}

export function formatarReferenciaLab(faixa: LabRange | null): string {
  if (!faixa || !Number.isFinite(faixa.min) || !Number.isFinite(faixa.max) || faixa.max < faixa.min) return '';
  const unidade = (faixa.unit || '').trim();
  const intervalo = `${formatarNumeroLab(faixa.min)}\u2013${formatarNumeroLab(faixa.max)}`;
  const qualificadores: string[] = [];
  const parenteses = faixa.label.match(/\(([^)]+)\)/);
  if (parenteses?.[1] && qualificadorDeFaixa(parenteses[1])) qualificadores.push(parenteses[1]);
  if (/defina idade/i.test(faixa.label)) qualificadores.push('idade não informada');
  const extra = qualificadores.length ? ` (${qualificadores.join(', ')})` : '';
  return unidade ? `${intervalo} ${unidade}${extra}` : `${intervalo}${extra}`;
}

function numeroCampo(bruto: unknown): number | null {
  return typeof bruto === 'number' && Number.isFinite(bruto) ? bruto : null;
}

function montarMarcador(
  key: string,
  grupo: string,
  nome: string,
  valores: Array<number | null>,
  sexo: Sex | 'Outro' | null | undefined,
  nascimento: unknown
): LabMarcador | null {
  if (!valores.some((valor) => valor != null)) return null;
  const labKey = EXAME_KEY_TO_LAB[key];
  const faixa = labKey ? getLabRange(labKey, sexo, nascimento as Parameters<typeof getLabRange>[2]) : null;
  let indiceMedicao: number | null = null;
  for (let i = valores.length - 1; i >= 0; i--) {
    if (valores[i] != null) {
      indiceMedicao = i;
      break;
    }
  }
  const atual = indiceMedicao != null ? valores[indiceMedicao] : null;
  return {
    key,
    grupo,
    nome,
    unidade: (faixa?.unit || '').trim(),
    celulas: valores.map((valor) => ({ texto: valor == null ? LAB_AUSENTE : formatarNumeroLab(valor) })),
    referencia: formatarReferenciaLab(faixa),
    situacao: classificarValorLab(atual, faixa),
    indiceMedicao,
  };
}

export function montarLabPdfModel(paciente: PacienteCompleto): LabPdfModel {
  const bruto = (paciente.examesLaboratoriais || []) as Array<Record<string, unknown> & { dataColeta?: unknown; id?: string }>;
  const ordenadas = ordenarColetasLab(bruto);
  const sexo = paciente.dadosIdentificacao?.sexoBiologico;
  const nascimento = paciente.dadosIdentificacao?.dataNascimento;
  const marcadores: LabMarcador[] = [];

  for (const def of LISTA_EXAMES) {
    if (def.key === 'hemogramaCompleto') {
      for (const parte of HEMOGRAMA) {
        const valores = ordenadas.map((coleta) => {
          const h = coleta.hemogramaCompleto as Record<string, unknown> | undefined;
          return numeroCampo(h?.[parte.campo]);
        });
        const linha = montarMarcador(`hemogramaCompleto.${parte.campo}`, def.group, parte.nome, valores, sexo, nascimento);
        if (linha) marcadores.push(linha);
      }
      continue;
    }
    const valores = ordenadas.map((coleta) => numeroCampo(coleta[def.key]));
    const linha = montarMarcador(def.key, def.group, def.label, valores, sexo, nascimento);
    if (linha) marcadores.push(linha);
  }

  const grupos: LabGrupo[] = [];
  const nomes = [
    ...GROUP_ORDER.filter((nome) => marcadores.some((item) => item.grupo === nome)),
    ...[...new Set(marcadores.map((item) => item.grupo))].filter((nome) => !GROUP_ORDER.includes(nome)),
  ];
  for (const nome of nomes) {
    const linhas = marcadores.filter((item) => item.grupo === nome);
    if (linhas.length) grupos.push({ nome, marcadores: linhas });
  }

  return {
    coletas: ordenadas.map((coleta) => ({ data: coleta.dataColeta, tempo: tempoColeta(coleta.dataColeta) })),
    grupos,
  };
}
