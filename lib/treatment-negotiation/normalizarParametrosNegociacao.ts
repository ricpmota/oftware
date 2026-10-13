import { investimentoVazio } from '@/lib/treatment-negotiation/parametrosDefaults';
import { normalizarProtocolosInjetaveis } from '@/lib/treatment-negotiation/protocolosInjetaveis';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

function numeroNaoNegativo(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Garante estrutura mínima dos parâmetros vindos do Firestore (campos ausentes ou parciais).
 * Zero é valor válido (dose zerada, sem bio, sem kit) — não substitui pelo fallback.
 */
export function normalizarParametrosNegociacaoSalvos(
  parametros: ParametrosPlanoPersonalizadoEditavel | null | undefined,
  config?: OrcamentoTerapeuticoConfig | null
): ParametrosPlanoPersonalizadoEditavel | null {
  if (!parametros || typeof parametros !== 'object') return null;

  const semanas = Math.max(1, numeroNaoNegativo(parametros.semanasPrazo, 4) || 4);
  const dosePadrao = numeroNaoNegativo(parametros.doseMensalMg, 2.5);

  let dosesSemanais = parametros.dosesSemanais;
  if (!Array.isArray(dosesSemanais) || dosesSemanais.length === 0) {
    dosesSemanais = Array.from({ length: semanas }, (_, i) => ({
      semana: i + 1,
      doseMg: dosePadrao,
      observacao: '',
    }));
  } else {
    dosesSemanais = dosesSemanais.map((d, i) => ({
      semana: Math.max(1, numeroNaoNegativo(d?.semana, i + 1) || i + 1),
      doseMg: numeroNaoNegativo(d?.doseMg, dosePadrao),
      observacao: typeof d?.observacao === 'string' ? d.observacao : '',
    }));
  }

  const investimentoBase = investimentoVazio(
    Number(parametros.descontoManual) || 0,
    parametros.investimento?.valorPorMg ?? config?.valorPorMg ?? null
  );

  return {
    ...parametros,
    modalidadeBase: parametros.modalidadeBase ?? 'mensal',
    nomePlano: parametros.nomePlano?.trim() || 'Plano personalizado',
    descricaoCurta: parametros.descricaoCurta ?? '',
    semanasPrazo: semanas,
    mesesPrazo: Math.max(1, numeroNaoNegativo(parametros.mesesPrazo, Math.ceil(semanas / 4)) || 1),
    doseMensalMg: dosePadrao,
    ritmoEscalonamento: parametros.ritmoEscalonamento ?? 'lento',
    dosesSemanais,
    aplicacoesTotal: numeroNaoNegativo(parametros.aplicacoesTotal, semanas),
    consultas: numeroNaoNegativo(parametros.consultas, 0),
    bioimpedancias: numeroNaoNegativo(parametros.bioimpedancias, semanas),
    bioFrequencia: parametros.bioFrequencia ?? 'Semanal',
    exames: numeroNaoNegativo(parametros.exames, 0),
    examesValorUnitario:
      parametros.examesValorUnitario ?? config?.valorPorExame ?? null,
    bioValorUnitario:
      parametros.bioValorUnitario ?? config?.valorPorBioimpedancia ?? null,
    consultasValorUnitario:
      parametros.consultasValorUnitario ?? config?.valorPorConsulta ?? null,
    protocolosInjetaveis: normalizarProtocolosInjetaveis(parametros.protocolosInjetaveis),
    modoEditor: parametros.modoEditor ?? 'editar_tudo',
    modoRecalculo: parametros.modoRecalculo ?? 'manter_manuais',
    consolidacaoHabilitada: Boolean(parametros.consolidacaoHabilitada),
    consolidacaoSemanas: Math.max(0, Number(parametros.consolidacaoSemanas) || 0),
    estrategiaPosMeta: parametros.estrategiaPosMeta ?? 'manutencao',
    investimento: { ...investimentoBase, ...(parametros.investimento ?? {}) },
  };
}
