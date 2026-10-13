/**
 * Prepara os exames de bioimpedância para o PDF, com as mesmas métricas e
 * faixas usadas na página (getBioMainMetrics + getBioRange).
 */
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { BIO_ORIGEM_LABELS } from '@/types/bioImpedancia';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';
import { getBioMainMetrics, type BioMainMetrics } from '@/utils/bioImpedanciaMetrics';
import { getBioRange, type BioRange, type Sex } from '@/utils/bioImpedanciaRanges';

export type BioClassificacao = 'Abaixo' | 'Normal' | 'Acima';

export type BioIndicadorAtual = {
  label: string;
  texto: string;
};

export type BioEscala = {
  key: string;
  label: string;
  valor: number;
  valorTexto: string;
  classificacao: BioClassificacao;
  min: number;
  max: number;
  minTexto: string;
  maxTexto: string;
  /** 0–100 na barra. Fora da escala desenhada fica preso na extremidade. */
  marcadorPct: number;
};

export type BioHistoricoLinha = {
  label: string;
  unidade: string;
  /** null = exame sem esse valor. */
  valores: Array<number | null>;
  textos: string[];
  /** true quando a unidade é percentual e uma variação seria em pontos percentuais. */
  pontosPercentuais: boolean;
};

export type BioSegmentoLinha = {
  segmento: string;
  massaMagra: string;
  percentualMagra: string;
  gordura: string;
  percentualGordura: string;
};

export type BioPdfModel = {
  exames: BioImpedanciaRegistro[];
  ultimo: BioImpedanciaRegistro | null;
  dataUltimo: unknown;
  origem: string;
  quantidade: number;
  atuais: BioIndicadorAtual[];
  escalas: BioEscala[];
  historico: BioHistoricoLinha[];
  segmentar: BioSegmentoLinha[];
  temSegmentar: boolean;
};

const ZONE_ABAIXO = 30;
const ZONE_NORMAL = 30;
const ZONE_ACIMA = 40;

const SEG_ORDEM = ['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'] as const;

const SEG_LABEL: Record<(typeof SEG_ORDEM)[number], string> = {
  arm_r: 'Braço direito',
  arm_l: 'Braço esquerdo',
  trunk: 'Tronco',
  leg_r: 'Perna direita',
  leg_l: 'Perna esquerda',
};

type HistoricoDef = {
  label: string;
  unidade: string;
  digits: number;
  pontosPercentuais?: boolean;
  ler: (m: BioMainMetrics) => number | null;
};

const HISTORICO: HistoricoDef[] = [
  { label: 'Peso', unidade: 'kg', digits: 1, ler: (m) => m.peso },
  { label: 'Massa de gordura', unidade: 'kg', digits: 1, ler: (m) => m.massaGorduraKg },
  { label: 'Gordura corporal', unidade: '%', digits: 1, pontosPercentuais: true, ler: (m) => m.percentualGordura },
  { label: 'Massa muscular', unidade: 'kg', digits: 1, ler: (m) => m.massaMuscularKg },
  { label: 'Gordura visceral', unidade: '', digits: 0, ler: (m) => m.gorduraVisceral },
  { label: 'Água total', unidade: 'L', digits: 1, ler: (m) => m.aguaKg },
  { label: 'Proteínas', unidade: 'kg', digits: 1, ler: (m) => m.proteinasKg },
  { label: 'Metabolismo basal', unidade: 'kcal', digits: 0, ler: (m) => m.metabolismoBasalKcal },
  { label: 'IMC', unidade: '', digits: 1, ler: (m) => m.imc },
];

function numFinito(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Data do exame. Inválida não vira “agora”, para não parecer o exame mais recente. */
export function dataEfetivaBio(registro: BioImpedanciaRegistro): number | null {
  const bruto = registro.dataRegistro as unknown;
  if (bruto == null || bruto === '') return null;
  const d = parseBioDataRegistro(bruto);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  if (bruto instanceof Date && Number.isNaN(bruto.getTime())) return null;
  return d.getTime();
}

export function ordenarBioExames(registros: BioImpedanciaRegistro[]): BioImpedanciaRegistro[] {
  return registros
    .map((registro, index) => ({ registro, index, tempo: dataEfetivaBio(registro) }))
    .sort((a, b) => {
      if (a.tempo == null && b.tempo == null) return a.index - b.index;
      if (a.tempo == null) return -1;
      if (b.tempo == null) return 1;
      if (a.tempo !== b.tempo) return a.tempo - b.tempo;
      const idA = a.registro.id || '';
      const idB = b.registro.id || '';
      if (idA !== idB) return idA < idB ? -1 : 1;
      return a.index - b.index;
    })
    .map((item) => item.registro);
}

export function fmtBioNumero(n: number, digits = 1): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Variação de um campo em %. Percentual usa pontos percentuais, não variação relativa. */
export function formatarVariacaoBio(anterior: number, atual: number, unidade: string): string | null {
  if (!Number.isFinite(anterior) || !Number.isFinite(atual)) return null;
  const delta = atual - anterior;
  if (Math.abs(delta) < 0.05 && unidade !== '%') {
    if (Math.abs(delta) < 0.0005) return null;
  }
  const sinal = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const abs = Math.abs(delta);
  if (unidade === '%') return `${sinal}${fmtBioNumero(abs, 1)} p.p.`;
  return `${sinal}${fmtBioNumero(abs, unidade === 'kcal' || unidade === '' ? 0 : 1)} ${unidade}`.trim();
}

function faixaConfiavel(range: BioRange | null): range is BioRange {
  if (!range) return false;
  return Number.isFinite(range.min) && Number.isFinite(range.max) && range.max > range.min;
}

export function classificarBio(valor: number, range: BioRange): BioClassificacao {
  if (valor < range.min) return 'Abaixo';
  if (valor > range.max) return 'Acima';
  return 'Normal';
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Mesma divisão da barra da página: 30% abaixo, 30% referência, 40% acima. */
export function posicaoMarcadorBio(valor: number, range: BioRange): number {
  const min = range.min;
  const max = range.max;
  const barMin = range.barMin ?? min;
  const barMax = range.barMax ?? max;
  if (valor < min) {
    const span = min - barMin;
    const t = span > 0 ? (valor - barMin) / span : 0;
    return clamp01(t) * ZONE_ABAIXO;
  }
  if (valor <= max) {
    const span = max - min;
    const t = span > 0 ? (valor - min) / span : 0.5;
    return ZONE_ABAIXO + clamp01(t) * ZONE_NORMAL;
  }
  const span = barMax - max;
  const t = span > 0 ? (valor - max) / span : 1;
  return ZONE_ABAIXO + ZONE_NORMAL + clamp01(t) * ZONE_ACIMA;
}

function textoComUnidade(valor: number, unidade: string, digits: number): string {
  const n = fmtBioNumero(valor, digits);
  return unidade ? `${n} ${unidade}` : n;
}

function escalaDe(
  key: string,
  label: string,
  valor: number | null,
  unidade: string,
  digits: number,
  sexo: Sex | 'Outro' | null | undefined,
  peso: number | null
): BioEscala | null {
  if (valor == null) return null;
  const range = getBioRange(key, sexo, peso);
  if (!faixaConfiavel(range)) return null;
  return {
    key,
    label,
    valor,
    valorTexto: textoComUnidade(valor, range.unit || unidade, digits),
    classificacao: classificarBio(valor, range),
    min: range.min,
    max: range.max,
    minTexto: fmtBioNumero(range.min, digits),
    maxTexto: fmtBioNumero(range.max, digits),
    marcadorPct: posicaoMarcadorBio(valor, range),
  };
}

function segmentoTexto(valor: number | null | undefined, unidade: string): string {
  if (valor == null || !Number.isFinite(valor) || valor <= 0) return '-';
  return textoComUnidade(valor, unidade, 1);
}

export function montarBioPdfModel(
  registros: BioImpedanciaRegistro[],
  sexo?: Sex | 'Outro' | null
): BioPdfModel {
  const exames = ordenarBioExames(registros);
  const ultimo = exames.length ? exames[exames.length - 1] : null;
  const metricas = exames.map((exame) => getBioMainMetrics(exame));
  const atual = ultimo ? getBioMainMetrics(ultimo) : null;
  const peso = numFinito(ultimo?.peso);

  const atuais: BioIndicadorAtual[] = [];
  if (atual?.peso != null) atuais.push({ label: 'Peso', texto: textoComUnidade(atual.peso, 'kg', 1) });
  if (atual?.massaGorduraKg != null) {
    atuais.push({ label: 'Massa de gordura', texto: textoComUnidade(atual.massaGorduraKg, 'kg', 1) });
  }
  if (atual?.massaMuscularKg != null) {
    atuais.push({ label: 'Massa muscular', texto: textoComUnidade(atual.massaMuscularKg, 'kg', 1) });
  }
  if (atual?.gorduraVisceral != null) {
    atuais.push({ label: 'Gordura visceral', texto: textoComUnidade(atual.gorduraVisceral, '', 0) });
  }

  const escalas = ultimo
    ? [
        escalaDe('aguaTotalLitros', 'Água total', atual?.aguaKg ?? null, 'L', 1, sexo, peso),
        escalaDe('massaGorduraKg', 'Massa de gordura', atual?.massaGorduraKg ?? null, 'kg', 1, sexo, peso),
        escalaDe('massaMuscularKg', 'Massa muscular', atual?.massaMuscularKg ?? null, 'kg', 1, sexo, peso),
        escalaDe('proteinasKg', 'Proteínas', atual?.proteinasKg ?? null, 'kg', 1, sexo, peso),
        escalaDe('mineraisKg', 'Minerais', atual?.mineraisKg ?? null, 'kg', 1, sexo, peso),
        escalaDe('percentualGordura', 'Gordura corporal', atual?.percentualGordura ?? null, '%', 1, sexo, peso),
      ].filter((item): item is BioEscala => item != null)
    : [];

  const historico = HISTORICO.map((def) => {
    const valores = metricas.map((m) => def.ler(m));
    if (!valores.some((v) => v != null)) return null;
    return {
      label: def.label,
      unidade: def.unidade,
      valores,
      textos: valores.map((v) => (v == null ? '-' : textoComUnidade(v, '', def.digits))),
      pontosPercentuais: def.pontosPercentuais === true,
    };
  }).filter((item): item is BioHistoricoLinha => item != null);

  const segmentar: BioSegmentoLinha[] = [];
  if (ultimo) {
    for (const key of SEG_ORDEM) {
      const magra = ultimo.massaMagraSegmentar?.[key];
      const gordura = ultimo.gorduraSegmentar?.[key];
      const linha: BioSegmentoLinha = {
        segmento: SEG_LABEL[key],
        massaMagra: segmentoTexto(magra?.kg, 'kg'),
        percentualMagra: segmentoTexto(magra?.percentual, '%'),
        gordura: segmentoTexto(gordura?.kg, 'kg'),
        percentualGordura: segmentoTexto(gordura?.percentual, '%'),
      };
      const temAlgo = [linha.massaMagra, linha.percentualMagra, linha.gordura, linha.percentualGordura].some(
        (celula) => celula !== '-'
      );
      if (temAlgo) segmentar.push(linha);
    }
  }

  const origemBruta = ultimo?.origemExame;
  const origem = origemBruta ? BIO_ORIGEM_LABELS[origemBruta] || origemBruta : '';

  return {
    exames,
    ultimo,
    dataUltimo: ultimo?.dataRegistro,
    origem,
    quantidade: exames.length,
    atuais,
    escalas,
    historico,
    segmentar,
    temSegmentar: segmentar.length > 0,
  };
}
