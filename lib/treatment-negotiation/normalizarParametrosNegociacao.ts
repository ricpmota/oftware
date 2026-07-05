import { investimentoVazio } from '@/lib/treatment-negotiation/parametrosDefaults';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

/**
 * Garante estrutura mínima dos parâmetros vindos do Firestore (campos ausentes ou parciais).
 */
export function normalizarParametrosNegociacaoSalvos(
  parametros: ParametrosPlanoPersonalizadoEditavel | null | undefined,
  config?: OrcamentoTerapeuticoConfig | null
): ParametrosPlanoPersonalizadoEditavel | null {
  if (!parametros || typeof parametros !== 'object') return null;

  const semanas = Math.max(1, Number(parametros.semanasPrazo) || 4);
  const dosePadrao = Math.max(0, Number(parametros.doseMensalMg) || 2.5);

  let dosesSemanais = parametros.dosesSemanais;
  if (!Array.isArray(dosesSemanais) || dosesSemanais.length === 0) {
    dosesSemanais = Array.from({ length: semanas }, (_, i) => ({
      semana: i + 1,
      doseMg: dosePadrao,
      observacao: '',
    }));
  } else {
    dosesSemanais = dosesSemanais.map((d, i) => ({
      semana: Number(d?.semana) || i + 1,
      doseMg: Math.max(0, Number(d?.doseMg) || dosePadrao),
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
    mesesPrazo: Math.max(1, Number(parametros.mesesPrazo) || Math.ceil(semanas / 4)),
    doseMensalMg: dosePadrao,
    ritmoEscalonamento: parametros.ritmoEscalonamento ?? 'lento',
    dosesSemanais,
    aplicacoesTotal: Math.max(0, Number(parametros.aplicacoesTotal) || semanas),
    consultas: Math.max(0, Number(parametros.consultas) || 0),
    bioimpedancias: Math.max(0, Number(parametros.bioimpedancias) || semanas),
    bioFrequencia: parametros.bioFrequencia ?? 'Semanal',
    exames: Math.max(0, Number(parametros.exames) || 0),
    examesValorUnitario:
      parametros.examesValorUnitario ?? config?.valorPorExame ?? null,
    bioValorUnitario:
      parametros.bioValorUnitario ?? config?.valorPorBioimpedancia ?? null,
    consultasValorUnitario:
      parametros.consultasValorUnitario ?? config?.valorPorConsulta ?? null,
    modoEditor: parametros.modoEditor ?? 'editar_tudo',
    modoRecalculo: parametros.modoRecalculo ?? 'manter_manuais',
    consolidacaoHabilitada: Boolean(parametros.consolidacaoHabilitada),
    consolidacaoSemanas: Math.max(0, Number(parametros.consolidacaoSemanas) || 0),
    estrategiaPosMeta: parametros.estrategiaPosMeta ?? 'manutencao',
    investimento: { ...investimentoBase, ...(parametros.investimento ?? {}) },
  };
}
