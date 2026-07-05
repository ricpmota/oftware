import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  Timestamp,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  fillContratoTirzepatidaTemplate,
  type ContratoTirzepatidaPlaceholderKey,
} from '@/lib/contratos/contratoTirzepatidaTemplate';
import { getContratoPadraoTemplateText } from '@/lib/contratos/contratoPadraoService';
import { buildContratoOpcaoPlaceholderValues } from '@/lib/contratos/contratoOpcaoEntregaMaterial';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION,
  CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import { mapContratoPocValidacaoFromFirestore } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPocValidacao';
import type {
  ContratoTratamentoBuildContext,
  ContratoTratamentoDocumentoRecord,
  ContratoTratamentoPlaceholderMap,
  ContratoTratamentoStatusAssinatura,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import { normalizarStatusAssinaturaPaciente } from '@/lib/documentos/contrato-tratamento/contratoTratamentoFluxoAssinatura';

const FALLBACK = 'Não informado';

function medicoTituloNome(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome?.trim() || 'Médico'}`;
}

function formatEnderecoMedico(medico: Medico | null): string {
  const loc = medico?.localizacao;
  if (!loc?.endereco?.trim()) return FALLBACK;
  const parts = [loc.endereco.trim()];
  if (loc.numero?.trim()) parts.push(loc.numero.trim());
  if (loc.cep?.trim()) parts.push(`CEP ${loc.cep.trim()}`);
  return parts.join(', ');
}

function formatCidadeMedico(medico: Medico | null): string {
  const primeira = medico?.cidades?.[0];
  return primeira?.cidade?.trim() || FALLBACK;
}

function formatEstadoMedico(medico: Medico | null): string {
  const primeira = medico?.cidades?.[0];
  return primeira?.estado?.trim() || medico?.crm?.estado?.trim() || FALLBACK;
}

function formatEnderecoPaciente(paciente: PacienteCompleto): string {
  const end = paciente.dadosIdentificacao?.endereco;
  if (!end) return FALLBACK;
  const parts: string[] = [];
  if (end.rua?.trim()) parts.push(end.rua.trim());
  if (end.cep?.trim()) parts.push(`CEP ${end.cep.trim()}`);
  return parts.length ? parts.join(', ') : FALLBACK;
}

function coerceToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds: unknown }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatDataPtBr(d: unknown): string {
  const date = d instanceof Date ? d : coerceToDate(d);
  if (!date || Number.isNaN(date.getTime())) return FALLBACK;
  try {
    return d.toLocaleDateString('pt-BR');
  } catch {
    return FALLBACK;
  }
}

function formatCpf(cpf: string | undefined): string {
  const t = (cpf || '').replace(/\D/g, '');
  if (t.length !== 11) return cpf?.trim() || FALLBACK;
  return t.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** Gera identificador curto para exibição no documento. */
export function buildContratoTratamentoHashDisplay(fullHashHex: string): string {
  const h = (fullHashHex || '').replace(/\s/g, '').toLowerCase();
  const short = h.slice(0, 12).toUpperCase();
  return `OFTW-CT-${short}`;
}

export async function sha256HexFromText(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const ts = Date.now().toString(36);
  return `local-${ts}`;
}

export function buildContratoTratamentoPlaceholders(
  medico: Medico | null,
  paciente: PacienteCompleto,
  ctx: ContratoTratamentoBuildContext
): ContratoTratamentoPlaceholderMap {
  const agora = new Date();
  const hashRaw = ctx.hashDocumento || '';
  const hashDisplay = hashRaw ? buildContratoTratamentoHashDisplay(hashRaw) : 'Pendente';

  const assinaturaEm = ctx.assinaturaMedicoEm;
  const reservaAssinaturaDigital = ctx.reservaAssinaturaDigitalNoPdf === true;
  const assinaturaDigital =
    ctx.assinaturaDigitalMedico?.trim() ||
    (assinaturaEm
      ? [
          'Contrato de Tratamento assinado digitalmente',
          '',
          medicoTituloNome(medico),
          `CRM ${medico?.crm?.numero || '—'}/${medico?.crm?.estado || '—'}`,
          '',
          `Data da assinatura: ${formatDataPtBr(assinaturaEm)}`,
          `Identificador do documento: ${hashDisplay}`,
        ].join('\n')
      : reservaAssinaturaDigital
        ? ''
        : 'Pendente de assinatura digital do(a) médico(a).');

  const nomePaciente =
    paciente.dadosIdentificacao?.nomeCompleto?.trim() || paciente.nome?.trim() || FALLBACK;
  const cpfPacienteFmt = formatCpf(paciente.dadosIdentificacao?.cpf);
  const assinaturaPacienteEm = ctx.assinaturaPacienteEm;
  const assinaturaDigitalPaciente =
    ctx.assinaturaDigitalPaciente?.trim() ||
    (assinaturaPacienteEm
      ? [
          'Contrato de Tratamento assinado digitalmente pelo paciente',
          '',
          nomePaciente,
          `CPF: ${cpfPacienteFmt}`,
          '',
          `Data da assinatura: ${formatDataPtBr(assinaturaPacienteEm)}`,
          `Identificador do documento: ${hashDisplay}`,
          '',
          'Assinatura digital com validação BRy EasySign (autenticação por e-mail, IP e geolocalização).',
        ].join('\n')
      : reservaAssinaturaDigital
        ? ''
        : 'Pendente de assinatura digital do paciente.');

  const opcaoValues = buildContratoOpcaoPlaceholderValues(ctx.opcaoEntregaMaterial);

  return {
    nomeMedico: medicoTituloNome(medico),
    crmMedico: medico?.crm?.numero?.trim() || FALLBACK,
    ufCrmMedico: medico?.crm?.estado?.trim() || FALLBACK,
    enderecoMedico: formatEnderecoMedico(medico),
    cidadeMedico: formatCidadeMedico(medico),
    estadoMedico: formatEstadoMedico(medico),
    nomePaciente,
    cpfPaciente: cpfPacienteFmt,
    rgPaciente: FALLBACK,
    dataNascimentoPaciente: formatDataPtBr(paciente.dadosIdentificacao?.dataNascimento),
    enderecoPaciente: formatEnderecoPaciente(paciente),
    cidadePaciente: paciente.dadosIdentificacao?.endereco?.cidade?.trim() || FALLBACK,
    estadoPaciente: paciente.dadosIdentificacao?.endereco?.estado?.trim() || FALLBACK,
    cidadeForo: formatCidadeMedico(medico),
    estadoForo: formatEstadoMedico(medico),
    dataImpressao: formatDataPtBr(agora),
    dataAssinaturaMedico: assinaturaEm ? formatDataPtBr(assinaturaEm) : '—',
    dataAssinaturaPaciente: assinaturaPacienteEm ? formatDataPtBr(assinaturaPacienteEm) : '—',
    hashDocumento: hashDisplay,
    assinaturaDigitalMedico: reservaAssinaturaDigital ? '' : assinaturaDigital,
    assinaturaDigitalPaciente,
    opcao1: opcaoValues.opcao1,
    opcao2: opcaoValues.opcao2,
  };
}

export async function buildContratoTratamentoTexto(
  medico: Medico | null,
  paciente: PacienteCompleto,
  ctx: ContratoTratamentoBuildContext
): Promise<{ texto: string; placeholders: ContratoTratamentoPlaceholderMap; hashDocumento: string }> {
  const templateText = await getContratoPadraoTemplateText();
  const placeholdersBase = buildContratoTratamentoPlaceholders(medico, paciente, {
    ...ctx,
    hashDocumento: ctx.hashDocumento || '',
  });
  const textoSemHash = fillContratoTirzepatidaTemplate(
    placeholdersBase as Partial<Record<ContratoTirzepatidaPlaceholderKey, string>>,
    templateText
  );
  const hashDocumento = ctx.hashDocumento || (await sha256HexFromText(textoSemHash));
  const placeholders = buildContratoTratamentoPlaceholders(medico, paciente, {
    ...ctx,
    hashDocumento,
  });
  const texto = fillContratoTirzepatidaTemplate(
    placeholders as Partial<Record<ContratoTirzepatidaPlaceholderKey, string>>,
    templateText
  );
  return { texto, placeholders, hashDocumento };
}

function mapFirestoreDoc(
  id: string,
  data: Record<string, unknown>
): ContratoTratamentoDocumentoRecord {
  const toDate = (v: unknown): Date => {
    if (v instanceof Timestamp) return v.toDate();
    if (v instanceof Date) return v;
    return new Date();
  };
  const pdfAssinadoMedicoUrl =
    typeof data.pdfAssinadoMedicoUrl === 'string'
      ? data.pdfAssinadoMedicoUrl
      : typeof data.pdfUrl === 'string'
        ? data.pdfUrl
        : undefined;

  const recordBase: ContratoTratamentoDocumentoRecord = {
    id,
    tipoDocumento: CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
    pdfUrl: typeof data.pdfUrl === 'string' ? data.pdfUrl : pdfAssinadoMedicoUrl,
    pdfAssinadoMedicoUrl,
    pdfFinalAssinadoUrl:
      typeof data.pdfFinalAssinadoUrl === 'string' ? data.pdfFinalAssinadoUrl : undefined,
    createdAt: toDate(data.createdAt),
    medicoAssinadoEm: data.medicoAssinadoEm ? toDate(data.medicoAssinadoEm) : undefined,
    medicoId: String(data.medicoId || ''),
    pacienteId: String(data.pacienteId || ''),
    hashDocumento: String(data.hashDocumento || ''),
    statusAssinatura: (data.statusAssinatura as ContratoTratamentoStatusAssinatura) || 'rascunho',
    signatureRequestId:
      typeof data.signatureRequestId === 'string' ? data.signatureRequestId : undefined,
    pacienteSignLinkToken:
      typeof data.pacienteSignLinkToken === 'string' ? data.pacienteSignLinkToken : undefined,
    pacienteSignLinkUrl:
      typeof data.pacienteSignLinkUrl === 'string' ? data.pacienteSignLinkUrl : null,
    pacienteSignIframeUrl:
      typeof data.pacienteSignIframeUrl === 'string' ? data.pacienteSignIframeUrl : undefined,
    pacienteSignStatus:
      data.pacienteSignStatus === 'link_gerado' ||
      data.pacienteSignStatus === 'assinado' ||
      data.pacienteSignStatus === 'erro_gerar_link'
        ? data.pacienteSignStatus
        : null,
    pacienteSignRequestedAt: data.pacienteSignRequestedAt
      ? toDate(data.pacienteSignRequestedAt)
      : undefined,
    pacienteSignErrorMessage:
      typeof data.pacienteSignErrorMessage === 'string' ? data.pacienteSignErrorMessage : null,
    pacienteSignErrorAt: data.pacienteSignErrorAt ? toDate(data.pacienteSignErrorAt) : null,
    pacienteAssinadoEm: data.pacienteAssinadoEm ? toDate(data.pacienteAssinadoEm) : null,
    easysignPoc: data.easysignPoc === true,
    bryEasySignEnvelopeId:
      typeof data.bryEasySignEnvelopeId === 'string' ? data.bryEasySignEnvelopeId : undefined,
    bryEasySignDocumentUuid:
      typeof data.bryEasySignDocumentUuid === 'string' ? data.bryEasySignDocumentUuid : undefined,
    pocValidacao: mapContratoPocValidacaoFromFirestore(data.pocValidacao),
    opcaoEntregaMaterial:
      data.opcaoEntregaMaterial === 'domicilio' || data.opcaoEntregaMaterial === 'clinica'
        ? data.opcaoEntregaMaterial
        : null,
    opcaoEntregaMaterialEm: data.opcaoEntregaMaterialEm
      ? toDate(data.opcaoEntregaMaterialEm)
      : null,
    pdfParaAssinaturaPacienteUrl:
      typeof data.pdfParaAssinaturaPacienteUrl === 'string'
        ? data.pdfParaAssinaturaPacienteUrl
        : null,
    fluxoAssinatura:
      data.fluxoAssinatura === 'paciente_primeiro' || data.fluxoAssinatura === 'medico_primeiro'
        ? data.fluxoAssinatura
        : undefined,
    solicitadoPacienteEm: data.solicitadoPacienteEm ? toDate(data.solicitadoPacienteEm) : null,
  };

  return {
    ...recordBase,
    statusAssinatura: normalizarStatusAssinaturaPaciente(recordBase.statusAssinatura, recordBase),
  };
}

export async function obterContratoTratamentoAtual(
  pacienteId: string
): Promise<ContratoTratamentoDocumentoRecord | null> {
  const list = await listarContratosTratamentoPaciente(pacienteId);
  return list[0] ?? null;
}

function contratoMaisRecenteQuery(pacienteId: string) {
  return query(
    collection(db, 'pacientes_completos', pacienteId, CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
}

/** Atualiza em tempo real o contrato mais recente do paciente (MetaAdmin). */
export function subscribeContratoTratamentoAtual(
  pacienteId: string,
  onUpdate: (doc: ContratoTratamentoDocumentoRecord | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!pacienteId.trim()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(
    contratoMaisRecenteQuery(pacienteId),
    (snap) => {
      const first = snap.docs[0];
      if (!first) {
        onUpdate(null);
        return;
      }
      const mapped = mapFirestoreDoc(first.id, first.data() as Record<string, unknown>);
      onUpdate(mapped.tipoDocumento === CONTRATO_TRATAMENTO_TIPO_DOCUMENTO ? mapped : null);
    },
    (err) => {
      console.error('Erro ao observar contrato do paciente (MetaAdmin):', err);
      onError?.(err);
    }
  );
}

function resolveStatusAoSalvar(
  statusNovo: ContratoTratamentoStatusAssinatura,
  statusAtual?: ContratoTratamentoStatusAssinatura
): ContratoTratamentoStatusAssinatura {
  if (!statusAtual) return statusNovo;
  if (
    statusNovo === 'rascunho' &&
    (statusAtual === 'aguardando_paciente' ||
      statusAtual === 'aguardando_medico' ||
      statusAtual === 'assinado_completo' ||
      statusAtual === 'assinado_medico')
  ) {
    return statusAtual;
  }
  return statusNovo;
}

export async function salvarContratoTratamentoDocumento(args: {
  pacienteId: string;
  medicoId: string;
  hashDocumento: string;
  statusAssinatura: ContratoTratamentoStatusAssinatura;
  pdfUrl?: string;
  pdfAssinadoMedicoUrl?: string;
  medicoAssinadoEm?: Date;
  signatureRequestId?: string;
  documentoId?: string;
}): Promise<string> {
  const existingFull = args.documentoId
    ? (await listarContratosTratamentoPaciente(args.pacienteId)).find((d) => d.id === args.documentoId) ??
      (await obterContratoTratamentoAtual(args.pacienteId))
    : await obterContratoTratamentoAtual(args.pacienteId);

  const reiniciarCicloPaciente =
    args.statusAssinatura === 'aguardando_paciente' &&
    Boolean(args.pdfAssinadoMedicoUrl || args.medicoAssinadoEm);

  const pacienteJaHaviaAssinado =
    existingFull?.statusAssinatura === 'assinado_completo' ||
    existingFull?.statusAssinatura === 'aguardando_medico' ||
    Boolean(existingFull?.pacienteAssinadoEm) ||
    existingFull?.pacienteSignStatus === 'assinado' ||
    Boolean(existingFull?.pdfFinalAssinadoUrl?.trim());

  const docParaAtualizar =
    reiniciarCicloPaciente && pacienteJaHaviaAssinado ? null : existingFull;

  const pdfAssinado =
    args.pdfAssinadoMedicoUrl || args.pdfUrl || docParaAtualizar?.pdfAssinadoMedicoUrl || null;
  let statusAssinatura = resolveStatusAoSalvar(
    args.statusAssinatura,
    docParaAtualizar?.statusAssinatura
  );

  if (
    args.statusAssinatura === 'assinado_completo' &&
    docParaAtualizar?.statusAssinatura === 'aguardando_medico'
  ) {
    statusAssinatura = 'assinado_completo';
  }

  const limparAssinaturaPaciente = reiniciarCicloPaciente;

  const payload = {
    tipoDocumento: CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
    pdfUrl: pdfAssinado,
    pdfAssinadoMedicoUrl: pdfAssinado,
    pdfFinalAssinadoUrl:
      args.statusAssinatura === 'assinado_completo' && pdfAssinado
        ? pdfAssinado
        : limparAssinaturaPaciente
          ? null
          : docParaAtualizar?.pdfFinalAssinadoUrl ?? null,
    medicoId: args.medicoId,
    pacienteId: args.pacienteId,
    hashDocumento: args.hashDocumento,
    statusAssinatura,
    signatureRequestId: args.signatureRequestId ?? docParaAtualizar?.signatureRequestId ?? null,
    medicoAssinadoEm: args.medicoAssinadoEm
      ? Timestamp.fromDate(args.medicoAssinadoEm)
      : docParaAtualizar?.medicoAssinadoEm
        ? Timestamp.fromDate(docParaAtualizar.medicoAssinadoEm)
        : null,
    pacienteSignLinkToken: limparAssinaturaPaciente ? null : docParaAtualizar?.pacienteSignLinkToken ?? null,
    pacienteSignLinkUrl: limparAssinaturaPaciente ? null : docParaAtualizar?.pacienteSignLinkUrl ?? null,
    pacienteSignIframeUrl: limparAssinaturaPaciente ? null : docParaAtualizar?.pacienteSignIframeUrl ?? null,
    pacienteSignStatus: limparAssinaturaPaciente ? null : docParaAtualizar?.pacienteSignStatus ?? null,
    pacienteSignErrorMessage: limparAssinaturaPaciente ? null : docParaAtualizar?.pacienteSignErrorMessage ?? null,
    pacienteSignErrorAt: limparAssinaturaPaciente ? null : docParaAtualizar?.pacienteSignErrorAt ?? null,
    pacienteAssinadoEm: limparAssinaturaPaciente
      ? null
      : docParaAtualizar?.pacienteAssinadoEm
        ? Timestamp.fromDate(docParaAtualizar.pacienteAssinadoEm)
        : null,
    easysignPoc: limparAssinaturaPaciente ? false : docParaAtualizar?.easysignPoc ?? false,
    bryEasySignEnvelopeId: limparAssinaturaPaciente ? null : docParaAtualizar?.bryEasySignEnvelopeId ?? null,
    bryEasySignDocumentUuid: limparAssinaturaPaciente
      ? null
      : docParaAtualizar?.bryEasySignDocumentUuid ?? null,
    updatedAt: serverTimestamp(),
    ...(limparAssinaturaPaciente ? { pacienteSignFinalEmailSentAt: null } : {}),
  };

  if (docParaAtualizar?.id) {
    await updateDoc(
      doc(
        db,
        'pacientes_completos',
        args.pacienteId,
        CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION,
        docParaAtualizar.id
      ),
      payload
    );
    return docParaAtualizar.id;
  }

  const ref = await addDoc(
    collection(db, 'pacientes_completos', args.pacienteId, CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION),
    {
      ...payload,
      createdAt: serverTimestamp(),
    }
  );
  return ref.id;
}

/** @deprecated Prefira requestExcluirContratoTratamento (API admin com limpeza completa). */
export async function excluirContratoTratamentoDocumento(
  pacienteId: string,
  documentoId?: string
): Promise<void> {
  const pid = pacienteId.trim();
  if (!pid) {
    throw new Error('Informe paciente do contrato.');
  }

  const snap = await getDocs(
    collection(db, 'pacientes_completos', pid, CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION)
  );

  const ids = new Set<string>();
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const isContrato =
      data.tipoDocumento === CONTRATO_TRATAMENTO_TIPO_DOCUMENTO ||
      data.statusAssinatura === 'aguardando_paciente' ||
      data.statusAssinatura === 'assinado_completo' ||
      data.pacienteAssinadoEm ||
      data.pdfFinalAssinadoUrl ||
      data.bryEasySignEnvelopeId;
    if (isContrato || docSnap.id === documentoId?.trim()) {
      ids.add(docSnap.id);
    }
  }
  if (documentoId?.trim()) ids.add(documentoId.trim());

  if (!ids.size) return;

  await Promise.all(
    [...ids].map((id) =>
      deleteDoc(
        doc(db, 'pacientes_completos', pid, CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION, id)
      )
    )
  );
}

export async function listarContratosTratamentoPaciente(
  pacienteId: string
): Promise<ContratoTratamentoDocumentoRecord[]> {
  const q = query(
    collection(db, 'pacientes_completos', pacienteId, CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapFirestoreDoc(d.id, d.data() as Record<string, unknown>))
    .filter((d) => d.tipoDocumento === CONTRATO_TRATAMENTO_TIPO_DOCUMENTO);
}

const CONTRATO_STATUS_VISIVEIS_PACIENTE: ContratoTratamentoStatusAssinatura[] = [
  'aguardando_paciente',
  'aguardando_medico',
  'assinado_completo',
];

/** Contrato mais recente visível no portal do paciente (1 leitura Firestore com limit). */
export async function obterContratoTratamentoAtivoVisivelPaciente(
  pacienteId: string
): Promise<ContratoTratamentoDocumentoRecord | null> {
  const snap = await getDocs(contratoAtivoVisivelPacienteQuery(pacienteId));
  const first = snap.docs[0];
  if (!first) return null;
  return mapFirestoreDoc(first.id, first.data() as Record<string, unknown>);
}

function contratoAtivoVisivelPacienteQuery(pacienteId: string) {
  return query(
    collection(db, 'pacientes_completos', pacienteId, CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION),
    where('tipoDocumento', '==', CONTRATO_TRATAMENTO_TIPO_DOCUMENTO),
    where('statusAssinatura', 'in', CONTRATO_STATUS_VISIVEIS_PACIENTE),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
}

/** Atualiza em tempo real o contrato visível no portal do paciente. */
export function subscribeContratoTratamentoAtivoVisivelPaciente(
  pacienteId: string,
  onUpdate: (doc: ContratoTratamentoDocumentoRecord | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!pacienteId.trim()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(
    contratoAtivoVisivelPacienteQuery(pacienteId),
    (snap) => {
      const first = snap.docs[0];
      onUpdate(first ? mapFirestoreDoc(first.id, first.data() as Record<string, unknown>) : null);
    },
    (err) => {
      console.error('Erro ao observar contrato do paciente:', err);
      onError?.(err);
    }
  );
}
