export type ContratoOpcaoEntregaMaterial = 'domicilio' | 'clinica';

export const CONTRATO_OPCAO_ENTREGA_LABELS: Record<ContratoOpcaoEntregaMaterial, string> = {
  domicilio: 'Receber o material em casa',
  clinica: 'Aplicar presencialmente na clínica',
};

export const CONTRATO_OPCAO_ENTREGA_NUMERO: Record<ContratoOpcaoEntregaMaterial, 1 | 2> = {
  domicilio: 1,
  clinica: 2,
};

export function getContratoOpcaoEntregaNumero(opcao: ContratoOpcaoEntregaMaterial): 1 | 2 {
  return CONTRATO_OPCAO_ENTREGA_NUMERO[opcao];
}

/** Ex.: "Opção 1 — Receber o material em casa" */
export function formatContratoOpcaoEntregaResumo(opcao: ContratoOpcaoEntregaMaterial): string {
  const numero = getContratoOpcaoEntregaNumero(opcao);
  return `Opção ${numero} — ${CONTRATO_OPCAO_ENTREGA_LABELS[opcao]}`;
}

export function isContratoOpcaoEntregaMaterial(
  value: unknown
): value is ContratoOpcaoEntregaMaterial {
  return value === 'domicilio' || value === 'clinica';
}

/** Marca "X" na opção escolhida; a outra fica vazia para ( {{opcao}} ) no template. */
export function buildContratoOpcaoPlaceholderValues(
  opcao?: ContratoOpcaoEntregaMaterial | null
): { opcao1: string; opcao2: string } {
  return {
    opcao1: opcao === 'domicilio' ? 'X' : '',
    opcao2: opcao === 'clinica' ? 'X' : '',
  };
}
