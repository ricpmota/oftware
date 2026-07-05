import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  EscolhaPlanoPaciente,
  PlanoTerapeuticoInterativoDocumento,
  StatusPlanoTerapeutico,
} from '@/types/planoTerapeuticoInterativo';
import type { CenarioPlanoTipo } from '@/types/planoTerapeuticoInterativo';
import {
  escolherPlanoAtivoPaciente,
  escolherPlanoEdicaoMedico,
} from '@/lib/planoTerapeutico/planoTerapeuticoSelecao';

const SUBCOLLECTION = 'orcamentosTerapeuticos';

function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function mapPlanoFirestoreDoc(
  id: string,
  pacienteId: string,
  data: Record<string, unknown>
): PlanoTerapeuticoInterativoDocumento {
  return {
    id,
    pacienteId,
    medicoId: String(data.medicoId ?? ''),
    organizationId: (data.organizationId as string | null) ?? null,
    status: (data.status as StatusPlanoTerapeutico) ?? 'rascunho',
    publicAccessToken: String(data.publicAccessToken ?? ''),
    contextoPaciente: data.contextoPaciente as PlanoTerapeuticoInterativoDocumento['contextoPaciente'],
    metaKg: (data.metaKg as number | null) ?? null,
    metaPercentual: (data.metaPercentual as number | null) ?? null,
    cenarioSelecionado: (data.cenarioSelecionado as CenarioPlanoTipo) ?? 'equilibrado',
    cenarios: data.cenarios as PlanoTerapeuticoInterativoDocumento['cenarios'],
    configuracaoComercialUsada:
      data.configuracaoComercialUsada as PlanoTerapeuticoInterativoDocumento['configuracaoComercialUsada'],
    valorTotal: Number(data.valorTotal) || 0,
    descontoManual: Number(data.descontoManual) || 0,
    versaoMotor: 'plano-terapeutico-v1',
    origemEstimativaEquilibrada:
      (data.origemEstimativaEquilibrada as PlanoTerapeuticoInterativoDocumento['origemEstimativaEquilibrada']) ??
      'v2_deterministica',
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    compartilhadoEm: data.compartilhadoEm ? toIso(data.compartilhadoEm) : null,
    escolhaPaciente: (data.escolhaPaciente as EscolhaPlanoPaciente | null) ?? null,
    escolhaPacienteEm: data.escolhaPacienteEm ? toIso(data.escolhaPacienteEm) : null,
    negociacaoTerapeutica:
      (data.negociacaoTerapeutica as PlanoTerapeuticoInterativoDocumento['negociacaoTerapeutica']) ??
      null,
    pacienteAssinaturaNome:
      typeof data.pacienteAssinaturaNome === 'string' ? data.pacienteAssinaturaNome : null,
    publicUrl: typeof data.publicUrl === 'string' ? data.publicUrl : null,
    pdfUrl: typeof data.pdfUrl === 'string' ? data.pdfUrl : null,
    pdfParaAssinaturaPacienteUrl:
      typeof data.pdfParaAssinaturaPacienteUrl === 'string'
        ? data.pdfParaAssinaturaPacienteUrl
        : null,
    pdfFinalAssinadoUrl:
      typeof data.pdfFinalAssinadoUrl === 'string' ? data.pdfFinalAssinadoUrl : null,
    pdfAssinadoMedicoUrl:
      typeof data.pdfAssinadoMedicoUrl === 'string' ? data.pdfAssinadoMedicoUrl : null,
    medicoAssinadoEm: data.medicoAssinadoEm ? toIso(data.medicoAssinadoEm) : null,
    acceptedAt: data.acceptedAt ? toIso(data.acceptedAt) : null,
    pacienteSignStatus:
      typeof data.pacienteSignStatus === 'string'
        ? (data.pacienteSignStatus as PlanoTerapeuticoInterativoDocumento['pacienteSignStatus'])
        : null,
    pacienteAssinadoEm: data.pacienteAssinadoEm ? toIso(data.pacienteAssinadoEm) : null,
    bryEasySignEnvelopeId:
      typeof data.bryEasySignEnvelopeId === 'string' ? data.bryEasySignEnvelopeId : null,
  };
}

function planoEmEdicaoMedicoQuery(pacienteId: string) {
  return query(
    collection(db, 'pacientes_completos', pacienteId, SUBCOLLECTION),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
}

/** Observa o plano em edição pelo médico (rascunho ou compartilhado mais recente). */
export function subscribePlanoTerapeuticoAtual(
  pacienteId: string,
  onUpdate: (doc: PlanoTerapeuticoInterativoDocumento | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!pacienteId.trim()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(
    planoEmEdicaoMedicoQuery(pacienteId),
    (snap) => {
      const planos = snap.docs.map((doc) =>
        mapPlanoFirestoreDoc(doc.id, pacienteId, doc.data() as Record<string, unknown>)
      );
      onUpdate(escolherPlanoEdicaoMedico(planos));
    },
    (err) => {
      console.error('Erro ao observar plano terapêutico do paciente:', err);
      onError?.(err);
    }
  );
}

/** Plano visível ao paciente (compartilhado ou aceito). */
export function planoTerapeuticoVisivelParaPaciente(
  doc: PlanoTerapeuticoInterativoDocumento | null
): boolean {
  if (!doc) return false;
  return doc.status === 'compartilhado' || doc.status === 'aceito';
}

/** Observa o plano terapêutico ativo do paciente (compartilhado ou aceito). */
export function subscribePlanoTerapeuticoAtivoPaciente(
  pacienteId: string,
  onUpdate: (doc: PlanoTerapeuticoInterativoDocumento | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!pacienteId.trim()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(db, 'pacientes_completos', pacienteId, SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(20)
    ),
    (snap) => {
      const planos = snap.docs.map((doc) =>
        mapPlanoFirestoreDoc(doc.id, pacienteId, doc.data() as Record<string, unknown>)
      );
      onUpdate(escolherPlanoAtivoPaciente(planos));
    },
    (err) => {
      console.error('Erro ao observar plano terapêutico ativo:', err);
      onError?.(err);
    }
  );
}

/** Plano pendente de aceite do paciente (compartilhado ou rascunho). */
export function subscribePlanoTerapeuticoPendentePaciente(
  pacienteId: string,
  onUpdate: (doc: PlanoTerapeuticoInterativoDocumento | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!pacienteId.trim()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(db, 'pacientes_completos', pacienteId, SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(20)
    ),
    (snap) => {
      const planos = snap.docs.map((doc) =>
        mapPlanoFirestoreDoc(doc.id, pacienteId, doc.data() as Record<string, unknown>)
      );
      onUpdate(escolherPlanoEdicaoMedico(planos));
    },
    (err) => {
      console.error('Erro ao observar plano terapêutico pendente:', err);
      onError?.(err);
    }
  );
}
