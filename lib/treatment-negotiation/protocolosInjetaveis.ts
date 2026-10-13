import type { Prescricao, PrescricaoItem } from '@/types/prescricao';
import type { InjetavelPontoGrafico, PontoGraficoTratamento } from '@/lib/treatment-designer/types';
import type {
  ItemProtocoloInjetavelNegociado,
  ParametrosPlanoPersonalizadoEditavel,
  ProtocoloInjetavelNegociado,
} from '@/lib/treatment-negotiation/types';

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function newProtocoloId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `inj-orc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function uniqueSortedWeeks(weeks: number[], duracaoMax?: number): number[] {
  const max = duracaoMax != null && duracaoMax > 0 ? duracaoMax : Number.POSITIVE_INFINITY;
  const set = new Set<number>();
  for (const raw of weeks) {
    const n = Math.round(Number(raw));
    if (Number.isFinite(n) && n >= 1 && n <= max) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

function rangeSemanas(inicio: number, quantidade: number, duracaoMax?: number): number[] {
  const start = Math.max(1, Math.round(inicio) || 1);
  const n = Math.max(0, Math.round(quantidade) || 0);
  const weeks: number[] = [];
  for (let i = 0; i < n; i++) weeks.push(start + i);
  return uniqueSortedWeeks(weeks, duracaoMax);
}

export function itensPrescricaoParaNegociacao(
  itens: PrescricaoItem[] | undefined
): ItemProtocoloInjetavelNegociado[] {
  if (!Array.isArray(itens) || itens.length === 0) return [];
  return itens.map((item) => ({
    medicamento: (item.medicamento || '').trim(),
    dosagem: (item.dosagem || '').trim(),
    frequencia: (item.frequencia || '').trim(),
    valorUnitario: 0,
  }));
}

export function substanciaProtocoloInjetavel(p: ProtocoloInjetavelNegociado): string {
  const nomes = (p.itens ?? [])
    .map((item) => item.medicamento.trim())
    .filter(Boolean);
  if (nomes.length > 0) return nomes.join(' + ');
  return (p.protocoloNome || '').trim() || 'Injetável';
}

export function observacaoPadraoInjetavel(p: ProtocoloInjetavelNegociado): string {
  return substanciaProtocoloInjetavel(p);
}

/** Semanas efetivas no plano. Array vazio = nenhuma; ausente = 1..semanas (legado). */
export function semanasAplicacaoEfetivas(
  p: ProtocoloInjetavelNegociado,
  duracaoPlano?: number
): number[] {
  if (Array.isArray(p.semanasAplicacao)) {
    return uniqueSortedWeeks(p.semanasAplicacao, duracaoPlano);
  }
  return rangeSemanas(1, Math.max(0, Number(p.semanas) || 0), duracaoPlano);
}

export function quantidadeSemanasCobradas(p: ProtocoloInjetavelNegociado): number {
  return semanasAplicacaoEfetivas(p).length;
}

export function observacaoSemanaInjetavel(
  p: ProtocoloInjetavelNegociado,
  semana: number
): string {
  const raw = p.observacoesPorSemana?.[String(semana)];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return observacaoPadraoInjetavel(p);
}

function preencherObservacoes(
  p: ProtocoloInjetavelNegociado,
  semanas: number[],
  overwrite = false
): Record<string, string> {
  const padrao = observacaoPadraoInjetavel(p);
  const next: Record<string, string> = { ...(p.observacoesPorSemana ?? {}) };
  for (const s of semanas) {
    const key = String(s);
    if (overwrite || !next[key]?.trim()) next[key] = padrao;
  }
  return next;
}

export function sincronizarSemanasProtocolo(
  p: ProtocoloInjetavelNegociado,
  semanas: number[],
  opts?: { overwriteObservacoes?: boolean; duracaoPlano?: number }
): ProtocoloInjetavelNegociado {
  const semanasAplicacao = uniqueSortedWeeks(semanas, opts?.duracaoPlano);
  return {
    ...p,
    semanasAplicacao,
    semanas: semanasAplicacao.length,
    observacoesPorSemana: preencherObservacoes(p, semanasAplicacao, opts?.overwriteObservacoes),
  };
}

export function aplicarIntervaloSemanasProtocolo(
  p: ProtocoloInjetavelNegociado,
  inicio: number,
  quantidade: number,
  duracaoPlano?: number
): ProtocoloInjetavelNegociado {
  return sincronizarSemanasProtocolo(p, rangeSemanas(inicio, quantidade, duracaoPlano), {
    duracaoPlano,
  });
}

export function alternarSemanaProtocolo(
  p: ProtocoloInjetavelNegociado,
  semana: number,
  duracaoPlano?: number
): ProtocoloInjetavelNegociado {
  const atuais = semanasAplicacaoEfetivas(p, duracaoPlano);
  const tem = atuais.includes(semana);
  const next = tem ? atuais.filter((s) => s !== semana) : [...atuais, semana];
  return sincronizarSemanasProtocolo(p, next, { duracaoPlano });
}

export function cliparProtocolosNaDuracao(
  lista: ProtocoloInjetavelNegociado[] | undefined,
  duracaoPlano: number
): ProtocoloInjetavelNegociado[] {
  return (lista ?? []).map((p) =>
    sincronizarSemanasProtocolo(p, semanasAplicacaoEfetivas(p, duracaoPlano), { duracaoPlano })
  );
}

export function injetaveisPorSemana(
  lista: ProtocoloInjetavelNegociado[] | undefined,
  duracaoPlano: number
): Map<number, InjetavelPontoGrafico[]> {
  const map = new Map<number, InjetavelPontoGrafico[]>();
  for (const p of lista ?? []) {
    const semanas = semanasAplicacaoEfetivas(p, duracaoPlano);
    const nome = substanciaProtocoloInjetavel(p);
    for (const s of semanas) {
      const item: InjetavelPontoGrafico = {
        protocoloId: p.id,
        nome,
        observacao: observacaoSemanaInjetavel(p, s),
      };
      const arr = map.get(s) ?? [];
      arr.push(item);
      map.set(s, arr);
    }
  }
  return map;
}

export function anexarInjetaveisAoGrafico(
  pontos: PontoGraficoTratamento[],
  lista: ProtocoloInjetavelNegociado[] | undefined,
  duracaoPlano: number
): PontoGraficoTratamento[] {
  if (!lista?.length) return pontos;
  const porSemana = injetaveisPorSemana(lista, duracaoPlano);
  if (porSemana.size === 0) return pontos;
  return pontos.map((ponto) => ({
    ...ponto,
    injetaveis: porSemana.get(ponto.semana) ?? [],
  }));
}

/** Valor semanal: soma dos itens com preço, senão o unitário do protocolo. */
export function valorSemanalProtocoloInjetavel(p: ProtocoloInjetavelNegociado): number {
  const somaItens = (p.itens ?? []).reduce(
    (s, item) => s + Math.max(0, Number(item.valorUnitario) || 0),
    0
  );
  if (somaItens > 0) return arredondarMoeda(somaItens);
  return arredondarMoeda(Math.max(0, Number(p.valorUnitario) || 0));
}

export function totalLinhaProtocoloInjetavel(p: ProtocoloInjetavelNegociado): number {
  if (p.valorTotalManual != null && Number.isFinite(p.valorTotalManual) && p.valorTotalManual >= 0) {
    return arredondarMoeda(p.valorTotalManual);
  }
  return arredondarMoeda(quantidadeSemanasCobradas(p) * valorSemanalProtocoloInjetavel(p));
}

export function calcularTotalInjetaveis(
  parametros: Pick<ParametrosPlanoPersonalizadoEditavel, 'protocolosInjetaveis'>
): number {
  const lista = parametros.protocolosInjetaveis ?? [];
  return arredondarMoeda(lista.reduce((s, p) => s + totalLinhaProtocoloInjetavel(p), 0));
}

export function criarProtocoloInjetavelVazio(
  semanasPadrao = 12
): ProtocoloInjetavelNegociado {
  const n = Math.max(1, semanasPadrao);
  const semanasAplicacao = rangeSemanas(1, n);
  return {
    id: newProtocoloId(),
    protocoloId: '',
    protocoloNome: '',
    itens: [],
    semanas: semanasAplicacao.length,
    semanasAplicacao,
    observacoesPorSemana: {},
    valorUnitario: 0,
    valorTotalManual: null,
  };
}

export function aplicarPrescricaoAoProtocolo(
  atual: ProtocoloInjetavelNegociado,
  prescricao: Prescricao,
  nomeExibicao: string,
  duracaoPlano?: number
): ProtocoloInjetavelNegociado {
  const base: ProtocoloInjetavelNegociado = {
    ...atual,
    protocoloId: prescricao.id,
    protocoloNome: nomeExibicao,
    itens: itensPrescricaoParaNegociacao(prescricao.itens),
    valorTotalManual: null,
    observacoesPorSemana: {},
  };
  return sincronizarSemanasProtocolo(base, semanasAplicacaoEfetivas(base, duracaoPlano), {
    overwriteObservacoes: true,
    duracaoPlano,
  });
}

export function normalizarProtocolosInjetaveis(
  lista: ProtocoloInjetavelNegociado[] | undefined
): ProtocoloInjetavelNegociado[] {
  if (!Array.isArray(lista)) return [];
  return lista.map((p, i) => {
    const itens = Array.isArray(p?.itens)
      ? p.itens.map((item) => ({
          medicamento: typeof item?.medicamento === 'string' ? item.medicamento : '',
          dosagem: typeof item?.dosagem === 'string' ? item.dosagem : '',
          frequencia: typeof item?.frequencia === 'string' ? item.frequencia : '',
          valorUnitario: Math.max(0, Number(item?.valorUnitario) || 0),
        }))
      : [];
    const observacoesPorSemana: Record<string, string> = {};
    if (p?.observacoesPorSemana && typeof p.observacoesPorSemana === 'object') {
      for (const [k, v] of Object.entries(p.observacoesPorSemana)) {
        if (typeof v === 'string') observacoesPorSemana[k] = v;
      }
    }
    const semanasAplicacao = Array.isArray(p?.semanasAplicacao)
      ? uniqueSortedWeeks(p.semanasAplicacao)
      : rangeSemanas(1, Math.max(0, Number(p?.semanas) || 0));
    const base: ProtocoloInjetavelNegociado = {
      id: typeof p?.id === 'string' && p.id.trim() ? p.id : `inj-orc-${i}`,
      protocoloId: typeof p?.protocoloId === 'string' ? p.protocoloId : '',
      protocoloNome: typeof p?.protocoloNome === 'string' ? p.protocoloNome : '',
      itens,
      semanas: semanasAplicacao.length,
      semanasAplicacao,
      observacoesPorSemana,
      valorUnitario: Math.max(0, Number(p?.valorUnitario) || 0),
      valorTotalManual:
        p?.valorTotalManual == null || !Number.isFinite(Number(p.valorTotalManual))
          ? null
          : Math.max(0, Number(p.valorTotalManual)),
    };
    return sincronizarSemanasProtocolo(base, semanasAplicacao);
  });
}

export function clonarProtocolosInjetaveis(
  lista: ProtocoloInjetavelNegociado[] | undefined
): ProtocoloInjetavelNegociado[] {
  return normalizarProtocolosInjetaveis(lista).map((p) => ({
    ...p,
    itens: p.itens.map((item) => ({ ...item })),
    semanasAplicacao: [...p.semanasAplicacao],
    observacoesPorSemana: { ...p.observacoesPorSemana },
  }));
}
