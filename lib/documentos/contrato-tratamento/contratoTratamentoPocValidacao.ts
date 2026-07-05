import { Timestamp } from 'firebase/firestore';

/** Registro futuro da validação manual do POC EasySign (sem UI de edição nesta etapa). */
export type ContratoTratamentoPocValidacao = {
  assinaturaMedicoPreservada: boolean | null;
  assinaturaPacientePresente: boolean | null;
  validadoAdobe: boolean | null;
  validadoITI: boolean | null;
  observacoes: string;
  validadoEm: Date | null;
};

export const CONTRATO_POC_VALIDACAO_DEFAULT: ContratoTratamentoPocValidacao = {
  assinaturaMedicoPreservada: null,
  assinaturaPacientePresente: null,
  validadoAdobe: null,
  validadoITI: null,
  observacoes: '',
  validadoEm: null,
};

export function mapContratoPocValidacaoFromFirestore(
  raw: unknown
): ContratoTratamentoPocValidacao | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const toBool = (v: unknown): boolean | null =>
    typeof v === 'boolean' ? v : v === null ? null : null;
  const toDate = (v: unknown): Date | null => {
    if (v instanceof Timestamp) return v.toDate();
    if (v instanceof Date) return v;
    return null;
  };
  return {
    assinaturaMedicoPreservada: toBool(o.assinaturaMedicoPreservada),
    assinaturaPacientePresente: toBool(o.assinaturaPacientePresente),
    validadoAdobe: toBool(o.validadoAdobe),
    validadoITI: toBool(o.validadoITI),
    observacoes: typeof o.observacoes === 'string' ? o.observacoes : '',
    validadoEm: toDate(o.validadoEm),
  };
}

/** Payload Firestore (sem conversão de Date). */
export function contratoPocValidacaoFirestorePayload(
  existing?: ContratoTratamentoPocValidacao
): Record<string, unknown> {
  const base = existing ?? CONTRATO_POC_VALIDACAO_DEFAULT;
  return {
    assinaturaMedicoPreservada: base.assinaturaMedicoPreservada,
    assinaturaPacientePresente: base.assinaturaPacientePresente,
    validadoAdobe: base.validadoAdobe,
    validadoITI: base.validadoITI,
    observacoes: base.observacoes ?? '',
    validadoEm: base.validadoEm ?? null,
  };
}
