/**
 * Duplica um plano automático (Mensal / Trimestral / Semestral) para o Plano Personalizado.
 * Não altera motores existentes — apenas lê via resolvePlanoPorModalidade.
 */
import {
  doseMensalInicial,
  resolvePlanoPorModalidade,
  type ResolvePlanoModalidadeInput,
} from '@/lib/planoTerapeutico/modalidadesPlano';
import { criarParametrosDePlanoBase } from '@/lib/treatment-negotiation/parametrosDefaults';
import type {
  ModalidadePlanoAutomaticoId,
  ParametrosPlanoPersonalizadoEditavel,
} from '@/lib/treatment-negotiation/types';

export type DuplicarPlanoBaseInput = Omit<
  ResolvePlanoModalidadeInput,
  'modalidade'
> & {
  modalidadeBase: ModalidadePlanoAutomaticoId;
  pesoAtualKg: number | null;
};

export function duplicarPlanoBaseParaPersonalizado(
  input: DuplicarPlanoBaseInput
): ParametrosPlanoPersonalizadoEditavel {
  const dose =
    input.doseMensalMg > 0 ? input.doseMensalMg : doseMensalInicial(input.configuracaoComercial);

  const planoBase = resolvePlanoPorModalidade({
    ...input,
    modalidade: input.modalidadeBase,
    doseMensalMg: dose,
  });

  return criarParametrosDePlanoBase({
    modalidadeBase: input.modalidadeBase,
    planoBase,
    doseMensalMg: dose,
    ritmoEscalonamento: input.ritmoEscalonamento,
    descontoManual: input.descontoManual ?? 0,
    pesoAtualKg: input.pesoAtualKg,
    metaPercentual: input.metaPercentual,
    config: input.configuracaoComercial,
  });
}
