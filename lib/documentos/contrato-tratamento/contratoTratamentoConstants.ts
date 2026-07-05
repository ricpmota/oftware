import { SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO } from '@/types/digitalSignature';

/** Pasta do catálogo SISTEMA onde o item aparece na UI de Prescrições. */
export const CONTRATO_TRATAMENTO_PASTA_NOME = 'Base do Tratamento';

export const CONTRATO_TRATAMENTO_ITEM_NOME = 'Contrato de Tratamento';

/** Mesmo valor usado em assinatura digital (`digitalSignatureRequests.documentType`). */
export const CONTRATO_TRATAMENTO_TIPO_DOCUMENTO = SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO;

/** Subcoleção Firestore: pacientes_completos/{pacienteId}/documentos */
export const CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION = 'documentos';
