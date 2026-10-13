import type { Lembrete, LembreteTag } from '@/types/lembrete';

export type LembreteRecorrenciaUnidade = 'semanas' | 'meses';

export type LembreteRecorrenciaPreset = {
  id: string;
  label: string;
  detalhe: string;
  tag: LembreteTag;
  texto: string;
  intervalo: number;
  unidade: LembreteRecorrenciaUnidade;
};

export const LEMBRETE_RECORRENCIA_PRESETS: LembreteRecorrenciaPreset[] = [
  {
    id: 'exames_3m',
    label: 'Exames laboratoriais',
    detalhe: 'a cada 3 meses',
    tag: 'Exames',
    texto: 'Exames laboratoriais',
    intervalo: 3,
    unidade: 'meses',
  },
  {
    id: 'consulta_3m',
    label: 'Consultas periódicas',
    detalhe: 'a cada 3 meses',
    tag: 'Consulta',
    texto: 'Consulta periódica',
    intervalo: 3,
    unidade: 'meses',
  },
  {
    id: 'envio_4s',
    label: 'Envio de medicamentos',
    detalhe: 'a cada 4 semanas',
    tag: 'Envio',
    texto: 'Envio de medicamentos',
    intervalo: 4,
    unidade: 'semanas',
  },
];

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export function addLembreteInterval(
  ymd: string,
  quantidade: number,
  unidade: LembreteRecorrenciaUnidade
): string {
  const parsed = parseYmd(ymd);
  if (!parsed || quantidade <= 0) return ymd;
  if (unidade === 'semanas') {
    const date = new Date(parsed.y, parsed.m - 1, parsed.d);
    date.setDate(date.getDate() + quantidade * 7);
    return formatYmd(date);
  }
  const targetMonthIndex = parsed.m - 1 + quantidade;
  const target = new Date(parsed.y, targetMonthIndex + 1, 0);
  const day = Math.min(parsed.d, target.getDate());
  return formatYmd(new Date(parsed.y, targetMonthIndex, day));
}

const MAX_OCORRENCIAS = 48;

export function gerarDatasRecorrencia(params: {
  dataInicio: string;
  intervalo: number;
  unidade: LembreteRecorrenciaUnidade;
  quantidade?: number;
  dataFinal?: string;
}): string[] {
  const { dataInicio, intervalo, unidade, quantidade, dataFinal } = params;
  if (!parseYmd(dataInicio) || intervalo <= 0) return [];
  const porVezes = quantidade != null && quantidade > 0;
  const porData = Boolean(dataFinal && parseYmd(dataFinal));
  if (!porVezes && !porData) return [];
  if (porData && dataFinal && dataFinal < dataInicio) return [];

  const teto = porVezes ? Math.min(quantidade!, MAX_OCORRENCIAS) : MAX_OCORRENCIAS;
  const datas: string[] = [];
  let atual = dataInicio;
  while (datas.length < teto) {
    if (porData && dataFinal && atual > dataFinal) break;
    datas.push(atual);
    const proxima = addLembreteInterval(atual, intervalo, unidade);
    if (proxima <= atual) break;
    atual = proxima;
  }
  return datas;
}

export function maskDdMmYy(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatDdMmYy(ymd: string): string {
  const parsed = parseYmd(ymd);
  if (!parsed) return '';
  return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${String(parsed.y).slice(-2)}`;
}

export function parseDdMmYy(display: string): string | null {
  const match = display.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return formatYmd(date);
}

export function formatarIntervaloRecorrencia(
  intervalo: number,
  unidade: LembreteRecorrenciaUnidade
): string {
  if (unidade === 'meses') {
    return intervalo === 1 ? 'a cada 1 mês' : `a cada ${intervalo} meses`;
  }
  return intervalo === 1 ? 'a cada 1 semana' : `a cada ${intervalo} semanas`;
}

export type LembreteRecorrenciaGrupo = {
  recorrenciaId: string;
  texto: string;
  tag: LembreteTag;
  intervalo: number;
  unidade: LembreteRecorrenciaUnidade;
  proximaData: string | null;
  total: number;
  pendentes: number;
  idsPendentesFuturos: string[];
  quantidade?: number;
  dataFinal?: string;
};

export function agruparRecorrencias(lembretes: Lembrete[]): LembreteRecorrenciaGrupo[] {
  const hoje = formatYmd(new Date());
  const byId = new Map<string, Lembrete[]>();
  for (const item of lembretes) {
    if (!item.recorrenciaId) continue;
    const list = byId.get(item.recorrenciaId) ?? [];
    list.push(item);
    byId.set(item.recorrenciaId, list);
  }

  return [...byId.entries()]
    .map(([recorrenciaId, items]) => {
      const sorted = [...items].sort((a, b) => a.data.localeCompare(b.data));
      const first = sorted[0];
      const pendentes = sorted.filter((l) => !l.concluido);
      const proxima = pendentes.find((l) => l.data >= hoje) ?? pendentes[0] ?? null;
      return {
        recorrenciaId,
        texto: first.texto,
        tag: first.tag,
        intervalo: first.recorrenciaIntervalo || 1,
        unidade: first.recorrenciaUnidade || 'meses',
        proximaData: proxima?.data ?? null,
        total: sorted.length,
        pendentes: pendentes.length,
        idsPendentesFuturos: pendentes.filter((l) => l.data >= hoje).map((l) => l.id),
        quantidade: first.recorrenciaQuantidade,
        dataFinal: first.recorrenciaDataFinal,
      };
    })
    .sort((a, b) => (a.proximaData || '').localeCompare(b.proximaData || ''));
}

export function newRecorrenciaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
