import { randomBytes } from 'crypto';
import type { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { EstimativaPlanoInicialV1, OrigemEstimativaOrcamento } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type {
  CenarioPlanoTipo,
  ContextoPacientePlanoPublico,
  EscolhaPlanoPaciente,
  PlanoTerapeuticoInterativoDocumento,
  PlanoTerapeuticoPublicoPayload,
  NegociacaoTerapeuticaSalva,
  StatusPlanoTerapeutico,
} from '@/types/planoTerapeuticoInterativo';
import { VERSAO_MOTOR_PLANO } from '@/lib/metaadmin/planoTerapeuticoInterativoEngine';
import { snapshotConfiguracaoComercialParaPlano } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { getOrcamentoTerapeuticoConfigByMedico } from '@/lib/server/orcamentoTerapeuticoConfig.server';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { buildPlanoTerapeuticoPublicUrl } from '@/lib/server/planoTerapeuticoPublicUrl';
import {
  escolherPlanoAtivoPaciente,
  escolherPlanoEdicaoMedico,
} from '@/lib/planoTerapeutico/planoTerapeuticoSelecao';

const SUBCOLLECTION = 'orcamentosTerapeuticos';
/** Índice de acesso público por orcamentoId — evita collectionGroup + índice composto. */
const LINKS_COLLECTION = 'plano_terapeutico_links';

function orcamentoRef(pacienteId: string, orcamentoId: string) {
  return getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(SUBCOLLECTION)
    .doc(orcamentoId);
}

function linkRef(orcamentoId: string) {
  return getFirestoreAdmin().collection(LINKS_COLLECTION).doc(orcamentoId);
}

function timestampToIso(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function gerarOrcamentoId(): string {
  return `pt_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function gerarTokenPublico(): string {
  return randomBytes(24).toString('hex');
}

/** Firestore não aceita `undefined` — remove recursivamente antes de gravar. */
function omitUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (nested !== undefined) {
      out[key] = omitUndefinedDeep(nested);
    }
  }
  return out as T;
}

export function extrairPrimeiroNome(nomeCompleto: string): string {
  const parte = nomeCompleto.trim().split(/\s+/)[0];
  return parte || 'Paciente';
}

export type CriarPlanoTerapeuticoInput = {
  pacienteId: string;
  medicoId: string;
  organizationId: OrganizationId;
  requestHost?: string;
  contextoPaciente: ContextoPacientePlanoPublico;
  metaKg: number | null;
  metaPercentual: number | null;
  estimativaEquilibrada: EstimativaPlanoInicialV1;
  origemEstimativaEquilibrada: OrigemEstimativaOrcamento;
  config: OrcamentoTerapeuticoConfig;
  descontoManual?: number;
  cenarios: PlanoTerapeuticoInterativoDocumento['cenarios'];
  cenarioSelecionado?: CenarioPlanoTipo;
};

export async function cancelarPlanosCompartilhadosExceto(
  pacienteId: string,
  orcamentoIdManter: string
): Promise<void> {
  const snap = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const db = getFirestoreAdmin();
  const batch = db.batch();
  const now = new Date();
  let pending = 0;

  for (const doc of snap.docs) {
    if (doc.id === orcamentoIdManter) continue;
    const data = doc.data() as Record<string, unknown>;
    const status = String(data.status ?? '');
    if (status !== 'compartilhado' && status !== 'rascunho') continue;
    if (data.pdfAssinadoMedicoUrl && data.medicoAssinadoEm) continue;

    batch.update(doc.ref, {
      status: 'cancelado' satisfies StatusPlanoTerapeutico,
      updatedAt: now,
    });
    pending++;
  }

  if (pending > 0) await batch.commit();
}

/** Cancela todos os planos em edição (rascunho/compartilhado) do paciente. */
export async function cancelarTodosPlanosEdicaoPaciente(pacienteId: string): Promise<number> {
  const snap = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const db = getFirestoreAdmin();
  const batch = db.batch();
  const now = new Date();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const status = String(data.status ?? '');
    if (status !== 'compartilhado' && status !== 'rascunho') continue;
    if (data.pdfAssinadoMedicoUrl && data.medicoAssinadoEm) continue;

    batch.update(doc.ref, {
      status: 'cancelado' satisfies StatusPlanoTerapeutico,
      updatedAt: now,
    });
    pending++;
  }

  if (pending > 0) await batch.commit();
  return pending;
}

export async function garantirPublicUrlPlanoTerapeutico(
  pacienteId: string,
  orcamentoId: string
): Promise<string | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  const urlAtual = typeof data.publicUrl === 'string' ? data.publicUrl.trim() : '';
  if (urlAtual) return urlAtual;

  const token = String(data.publicAccessToken ?? '');
  if (!token) return null;

  const organizationId = ((data.organizationId as string | null) ??
    METODO_ORGANIZATION_ID) as OrganizationId;
  const publicUrl = await buildPlanoTerapeuticoPublicUrl(organizationId, orcamentoId, token);
  await ref.update({ publicUrl, updatedAt: new Date() });
  return publicUrl;
}

export async function criarPlanoTerapeuticoRascunho(
  input: CriarPlanoTerapeuticoInput
): Promise<{
  orcamentoId: string;
  publicAccessToken: string;
  publicUrl: string;
}> {
  const orcamentoId = gerarOrcamentoId();
  const publicAccessToken = gerarTokenPublico();
  const cenarioSelecionado = input.cenarioSelecionado ?? 'equilibrado';
  const valorTotal = input.cenarios[cenarioSelecionado].valorTotal;
  const now = new Date();

  const configuracaoComercialUsada = snapshotConfiguracaoComercialParaPlano(input.config);

  const payload = {
    pacienteId: input.pacienteId,
    medicoId: input.medicoId,
    organizationId: input.organizationId,
    status: 'compartilhado' satisfies StatusPlanoTerapeutico,
    publicAccessToken,
    publicUrl: '',
    contextoPaciente: input.contextoPaciente,
    metaKg: input.metaKg,
    metaPercentual: input.metaPercentual,
    cenarioSelecionado,
    cenarios: input.cenarios,
    configuracaoComercialUsada,
    valorTotal,
    descontoManual: input.descontoManual ?? 0,
    versaoMotor: VERSAO_MOTOR_PLANO,
    origemEstimativaEquilibrada: input.origemEstimativaEquilibrada,
    createdAt: now,
    updatedAt: now,
    compartilhadoEm: now,
    escolhaPaciente: null,
    escolhaPacienteEm: null,
    pacienteAssinaturaNome: null,
    acceptedAt: null,
  };

  const db = getFirestoreAdmin();
  const batch = db.batch();
  batch.set(orcamentoRef(input.pacienteId, orcamentoId), omitUndefinedDeep(payload));
  batch.set(linkRef(orcamentoId), {
    pacienteId: input.pacienteId,
    organizationId: input.organizationId,
    publicAccessToken,
    createdAt: now,
  });
  await batch.commit();

  const publicUrl = await buildPlanoTerapeuticoPublicUrl(
    input.organizationId,
    orcamentoId,
    publicAccessToken,
    input.requestHost
  );

  await orcamentoRef(input.pacienteId, orcamentoId).update({
    publicUrl,
    updatedAt: new Date(),
  });

  await cancelarPlanosCompartilhadosExceto(input.pacienteId, orcamentoId);

  return {
    orcamentoId,
    publicAccessToken,
    publicUrl,
  };
}

export async function buscarPlanoPorIdComToken(
  orcamentoId: string,
  token: string
): Promise<PlanoTerapeuticoInterativoDocumento | null> {
  const linkSnap = await linkRef(orcamentoId).get();
  if (!linkSnap.exists) return null;

  const link = linkSnap.data() as Record<string, unknown>;
  const pacienteId = typeof link.pacienteId === 'string' ? link.pacienteId.trim() : '';
  const tokenSalvo = typeof link.publicAccessToken === 'string' ? link.publicAccessToken : '';
  if (!pacienteId || tokenSalvo !== token) return null;

  const snap = await orcamentoRef(pacienteId, orcamentoId).get();
  if (!snap.exists) return null;

  return mapPlanoDoc(orcamentoId, pacienteId, snap.data() as Record<string, unknown>);
}

function mapPlanoDoc(
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
    contextoPaciente: data.contextoPaciente as ContextoPacientePlanoPublico,
    metaKg: (data.metaKg as number | null) ?? null,
    metaPercentual: (data.metaPercentual as number | null) ?? null,
    cenarioSelecionado: (data.cenarioSelecionado as CenarioPlanoTipo) ?? 'equilibrado',
    cenarios: data.cenarios as PlanoTerapeuticoInterativoDocumento['cenarios'],
    configuracaoComercialUsada:
      data.configuracaoComercialUsada as PlanoTerapeuticoInterativoDocumento['configuracaoComercialUsada'],
    valorTotal: Number(data.valorTotal) || 0,
    descontoManual: Number(data.descontoManual) || 0,
    versaoMotor: VERSAO_MOTOR_PLANO,
    origemEstimativaEquilibrada:
      (data.origemEstimativaEquilibrada as OrigemEstimativaOrcamento) ?? 'v2_deterministica',
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    compartilhadoEm: data.compartilhadoEm ? timestampToIso(data.compartilhadoEm) : null,
    escolhaPaciente: (data.escolhaPaciente as EscolhaPlanoPaciente | null) ?? null,
    escolhaPacienteEm: data.escolhaPacienteEm ? timestampToIso(data.escolhaPacienteEm) : null,
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
    medicoAssinadoEm: data.medicoAssinadoEm ? timestampToIso(data.medicoAssinadoEm) : null,
    acceptedAt: data.acceptedAt ? timestampToIso(data.acceptedAt) : null,
    pacienteSignStatus:
      typeof data.pacienteSignStatus === 'string'
        ? (data.pacienteSignStatus as PlanoTerapeuticoInterativoDocumento['pacienteSignStatus'])
        : null,
    pacienteAssinadoEm: data.pacienteAssinadoEm ? timestampToIso(data.pacienteAssinadoEm) : null,
    bryEasySignEnvelopeId:
      typeof data.bryEasySignEnvelopeId === 'string' ? data.bryEasySignEnvelopeId : null,
  };
}

export async function enriquecerConfiguracaoComercialPlano(
  doc: PlanoTerapeuticoInterativoDocumento
): Promise<PlanoTerapeuticoInterativoDocumento> {
  const usada = doc.configuracaoComercialUsada;
  const valorPorMg = Number(usada?.valorPorMg) || 0;
  if (valorPorMg > 0) return doc;

  const medicoId = doc.medicoId?.trim();
  if (!medicoId) return doc;

  const configAtual = await getOrcamentoTerapeuticoConfigByMedico(medicoId);
  if (!configAtual || configAtual.valorPorMg <= 0) return doc;

  return {
    ...doc,
    configuracaoComercialUsada: snapshotConfiguracaoComercialParaPlano(configAtual),
  };
}

export function sanitizarPlanoParaPublico(
  doc: PlanoTerapeuticoInterativoDocumento
): PlanoTerapeuticoPublicoPayload {
  const {
    publicAccessToken: _token,
    pacienteId: _pid,
    medicoId: _mid,
    ...resto
  } = doc;
  return resto;
}

export async function atualizarCenarioSelecionadoPlano(
  pacienteId: string,
  orcamentoId: string,
  token: string,
  cenarioSelecionado: CenarioPlanoTipo
): Promise<PlanoTerapeuticoPublicoPayload | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.publicAccessToken !== token) return null;

  const cenarios = data.cenarios as PlanoTerapeuticoInterativoDocumento['cenarios'];
  const cenario = cenarios?.[cenarioSelecionado];
  if (!cenario) return null;

  await ref.update({
    cenarioSelecionado,
    valorTotal: cenario.valorTotal,
    updatedAt: new Date(),
  });

  const atualizado = await ref.get();
  const mapped = mapPlanoDoc(
    orcamentoId,
    pacienteId,
    atualizado.data() as Record<string, unknown>
  );
  return sanitizarPlanoParaPublico(mapped);
}

export async function salvarEscolhaPacientePlano(
  pacienteId: string,
  orcamentoId: string,
  token: string,
  escolha: EscolhaPlanoPaciente
): Promise<PlanoTerapeuticoPublicoPayload | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.publicAccessToken !== token) return null;
  if (data.status === 'aceito' || data.status === 'cancelado') return null;
  if (data.pacienteSignStatus === 'link_gerado' || data.pacienteSignStatus === 'assinado') {
    return null;
  }

  const now = new Date();
  await ref.update({
    escolhaPaciente: escolha,
    escolhaPacienteEm: now,
    valorTotal: escolha.valorTotal,
    status: data.status === 'rascunho' ? 'compartilhado' : data.status,
    compartilhadoEm: data.compartilhadoEm ?? now,
    updatedAt: now,
  });

  const atualizado = await ref.get();
  const mapped = mapPlanoDoc(
    orcamentoId,
    pacienteId,
    atualizado.data() as Record<string, unknown>
  );
  return sanitizarPlanoParaPublico(mapped);
}

/** Salva escolha e PDF pré-assinatura; status permanece compartilhado até EasySign concluir. */
export async function prepararPlanoParaAssinaturaPaciente(
  pacienteId: string,
  orcamentoId: string,
  token: string,
  args: {
    escolha: EscolhaPlanoPaciente;
    pdfUrl: string;
  }
): Promise<PlanoTerapeuticoPublicoPayload | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.publicAccessToken !== token) return null;
  if (data.status === 'cancelado') return null;
  if (data.status === 'aceito') {
    const mapped = mapPlanoDoc(orcamentoId, pacienteId, data);
    return sanitizarPlanoParaPublico(mapped);
  }

  const now = new Date();
  await ref.update({
    escolhaPaciente: args.escolha,
    escolhaPacienteEm: data.escolhaPacienteEm ?? now,
    valorTotal: args.escolha.valorTotal,
    pdfUrl: args.pdfUrl,
    pdfParaAssinaturaPacienteUrl: args.pdfUrl,
    compartilhadoEm: data.compartilhadoEm ?? now,
    updatedAt: now,
  });

  const atualizado = await ref.get();
  const mapped = mapPlanoDoc(
    orcamentoId,
    pacienteId,
    atualizado.data() as Record<string, unknown>
  );
  return sanitizarPlanoParaPublico(mapped);
}

export async function registrarAssinaturaMedicoPlanoTerapeutico(
  pacienteId: string,
  orcamentoId: string,
  pdfAssinadoMedicoUrl: string
): Promise<PlanoTerapeuticoInterativoDocumento | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.status !== 'aceito') return null;

  const now = new Date();
  await ref.update({
    pdfAssinadoMedicoUrl,
    medicoAssinadoEm: now,
    updatedAt: now,
  });

  const atualizado = await ref.get();
  return mapPlanoDoc(orcamentoId, pacienteId, atualizado.data() as Record<string, unknown>);
}

export async function cancelarPlanoTerapeutico(
  pacienteId: string,
  orcamentoId: string
): Promise<PlanoTerapeuticoInterativoDocumento | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.status === 'cancelado') {
    return mapPlanoDoc(orcamentoId, pacienteId, data);
  }
  if (data.pdfAssinadoMedicoUrl && data.medicoAssinadoEm) return null;

  const now = new Date();
  await ref.update({
    status: 'cancelado' satisfies StatusPlanoTerapeutico,
    pacienteSignStatus: null,
    pacienteSignLinkUrl: null,
    pacienteSignIframeUrl: null,
    bryEasySignEnvelopeId: null,
    bryEasySignDocumentUuid: null,
    bryEasySignSignerNonce: null,
    updatedAt: now,
  });

  const atualizado = await ref.get();
  return mapPlanoDoc(orcamentoId, pacienteId, atualizado.data() as Record<string, unknown>);
}

export async function buscarPlanoMaisRecentePorPaciente(
  pacienteId: string
): Promise<PlanoTerapeuticoInterativoDocumento | null> {
  const snap = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;
  return mapPlanoDoc(doc.id, pacienteId, doc.data() as Record<string, unknown>);
}

export async function buscarPlanoPendentePaciente(
  pacienteId: string
): Promise<PlanoTerapeuticoInterativoDocumento | null> {
  const snap = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  for (const doc of snap.docs) {
    const mapped = mapPlanoDoc(doc.id, pacienteId, doc.data() as Record<string, unknown>);
    if (mapped.status === 'rascunho' || mapped.status === 'compartilhado') {
      return mapped;
    }
  }
  return null;
}

/** Plano compartilhado ou já aceito pelo paciente (visível no portal). */
export async function buscarPlanoAtivoPaciente(
  pacienteId: string
): Promise<PlanoTerapeuticoInterativoDocumento | null> {
  const snap = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const planos = snap.docs.map((doc) =>
    mapPlanoDoc(doc.id, pacienteId, doc.data() as Record<string, unknown>)
  );
  return escolherPlanoAtivoPaciente(planos);
}

export async function salvarPropostaNegociacaoTerapeutica(
  pacienteId: string,
  orcamentoId: string,
  negociacao: NegociacaoTerapeuticaSalva,
  options?: { valorTotal?: number }
): Promise<PlanoTerapeuticoInterativoDocumento | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.status === 'cancelado' || data.status === 'aceito') return null;

  const now = new Date();
  const updates: Record<string, unknown> = {
    negociacaoTerapeutica: omitUndefinedDeep(negociacao),
    updatedAt: now,
    compartilhadoEm: data.compartilhadoEm ?? now,
    status: 'compartilhado',
  };

  const valorTotal = Number(options?.valorTotal);
  if (Number.isFinite(valorTotal) && valorTotal > 0) {
    updates.valorTotal = valorTotal;
  }

  const publicUrlAtual = typeof data.publicUrl === 'string' ? data.publicUrl.trim() : '';
  if (!publicUrlAtual) {
    const organizationId = ((data.organizationId as string | null) ??
      METODO_ORGANIZATION_ID) as OrganizationId;
    const token = String(data.publicAccessToken ?? '');
    if (token) {
      updates.publicUrl = await buildPlanoTerapeuticoPublicUrl(
        organizationId,
        orcamentoId,
        token
      );
    }
  }

  await ref.update(updates);

  await cancelarPlanosCompartilhadosExceto(pacienteId, orcamentoId);

  const atualizado = await ref.get();
  return mapPlanoDoc(orcamentoId, pacienteId, atualizado.data() as Record<string, unknown>);
}

export async function atualizarNegociacaoPacientePlano(
  pacienteId: string,
  orcamentoId: string,
  token: string,
  patch: Pick<NegociacaoTerapeuticaSalva, 'mensagemPaciente' | 'vistaProposta' | 'status'>
): Promise<PlanoTerapeuticoPublicoPayload | null> {
  const ref = orcamentoRef(pacienteId, orcamentoId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.publicAccessToken !== token) return null;
  if (data.status === 'cancelado' || data.status === 'aceito') return null;

  const atual = data.negociacaoTerapeutica as NegociacaoTerapeuticaSalva | null | undefined;
  if (!atual?.parametros) return null;

  const merged: NegociacaoTerapeuticaSalva = {
    ...atual,
    ...patch,
    status: patch.status ?? (patch.mensagemPaciente?.trim() ? 'EM_NEGOCIACAO' : atual.status),
  };

  const now = new Date();
  await ref.update({
    negociacaoTerapeutica: merged,
    updatedAt: now,
  });

  const atualizado = await ref.get();
  const mapped = mapPlanoDoc(orcamentoId, pacienteId, atualizado.data() as Record<string, unknown>);
  return sanitizarPlanoParaPublico(mapped);
}
