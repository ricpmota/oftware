import type { PacienteMensagemAnexo } from '@/lib/pacienteMensagem/mensagemHtml';

export type ComunicacaoParticipanteRole =
  | 'medico'
  | 'nutricionista'
  | 'psiquiatra'
  | 'personal'
  | 'paciente';

export type ComunicacaoParticipante = {
  /** Firebase Auth UID quando existir; para paciente sem conta: `paciente:{id}`. */
  userId: string;
  role: ComunicacaoParticipanteRole;
  /** ID do documento (medicoId / nutriId / psiId / personalId / pacienteId). */
  profileId: string;
  nome: string;
  email: string;
  fotoUrl?: string | null;
  subtitle?: string | null;
};

export type ComunicacaoDestinatario = ComunicacaoParticipante & {
  grupo: 'pacientes' | 'medicos' | 'nutricionistas' | 'psiquiatras' | 'personais';
};

/** Snapshot do paciente anexado na mensagem (compartilhamento médico ↔ médico). */
export type OrganizacaoMensagemPacienteAnexo = {
  pacienteId: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  dataNascimento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  sexoBiologico?: string | null;
  /** Médico dono do prontuário (profileId / medicos doc id). */
  medicoOwnerId: string;
  medicoOwnerNome: string;
};

/** Candidato para o seletor “Anexar paciente” no compose. */
export type PacienteAnexavelComunicacao = {
  pacienteId: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  dataNascimento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  sexoBiologico?: string | null;
};

export type OrganizacaoMensagem = {
  id: string;
  organizationId: string;
  threadId?: string;
  emRespostaAId?: string;
  from: ComunicacaoParticipante;
  to: ComunicacaoParticipante;
  /** Todos os participantes do thread (obrigatório em mensagens de grupo). */
  participantes?: ComunicacaoParticipante[];
  /** true = conversa em grupo (mesmo thread para todos). */
  isGrupo?: boolean;
  /** Para queries array-contains. */
  participantUserIds: string[];
  /**
   * Identidade por papel: `role:profileId` (ex.: `medico:abc`, `nutricionista:xyz`).
   * Necessário quando o mesmo Auth UID tem vários perfis (metaadmin/metanutri/…).
   */
  participantKeys?: string[];
  titulo: string;
  mensagem: string;
  mensagemHtml?: string;
  anexos?: PacienteMensagemAnexo[];
  /** Paciente compartilhado entre médicos (card clicável; não entra na lista do destinatário). */
  pacienteAnexo?: OrganizacaoMensagemPacienteAnexo | null;
  /** Destinatário leu. (legado 1:1; preferir lidasPorUserIds). */
  lida: boolean;
  lidaEm?: Date;
  /** UserIds que abriram/leram a mensagem (feedback para o remetente). */
  lidasPorUserIds?: string[];
  criadoEm: Date;
  criadoPor: string;
  deletada?: boolean;
  /** Espelho em pacientes_mensagens (quando médico ↔ paciente). */
  pacienteMensagemId?: string | null;
};

export function participanteKey(p: Pick<ComunicacaoParticipante, 'role' | 'profileId'>): string {
  return `${p.role}:${p.profileId}`;
}

/** Mesmo papel + mesmo perfil (não basta Auth UID — um e-mail pode ter vários papéis). */
export function participanteMatchesMe(
  p: Pick<ComunicacaoParticipante, 'userId' | 'role' | 'profileId'> | null | undefined,
  me: Pick<ComunicacaoParticipante, 'userId' | 'role' | 'profileId'>
): boolean {
  if (!p || !me?.role) return false;
  if (p.role !== me.role) return false;
  // Preferência: profileId (id do documento do papel)
  if (me.profileId && p.profileId) return p.profileId === me.profileId;
  if (me.role === 'paciente' && me.profileId) {
    if (p.userId === pacienteSyntheticUserId(me.profileId)) return true;
  }
  // Legado: mesmo Auth UID + mesmo role quando profileId falta em um dos lados
  if (me.userId && p.userId && p.userId === me.userId) return true;
  return false;
}

/** A mensagem envolve o usuário no papel atual (não em outro portal). */
export function mensagemPertenceAoPapel(
  m: Pick<OrganizacaoMensagem, 'from' | 'to' | 'participantes' | 'participantKeys'>,
  me: Pick<ComunicacaoParticipante, 'userId' | 'role' | 'profileId'>
): boolean {
  if (!me?.role) return false;
  if (participanteMatchesMe(m.from, me) || participanteMatchesMe(m.to, me)) return true;
  if (Array.isArray(m.participantes) && m.participantes.some((p) => participanteMatchesMe(p, me))) {
    return true;
  }
  if (me.profileId && Array.isArray(m.participantKeys)) {
    const key = participanteKey(me);
    if (m.participantKeys.includes(key)) return true;
  }
  return false;
}

export function resolveOrganizacaoThreadId(msg: {
  id: string;
  threadId?: string;
  titulo?: string;
  from: Pick<ComunicacaoParticipante, 'profileId'>;
  to: Pick<ComunicacaoParticipante, 'profileId'>;
}): string {
  if (msg.threadId?.trim()) return msg.threadId.trim();
  const assunto = String(msg.titulo || '')
    .replace(/^(re|fw|fwd)\s*:\s*/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const pair = [msg.from.profileId, msg.to.profileId].sort().join('_');
  if (assunto) return `legacy:${pair}:${assunto}`;
  return msg.id;
}

export function pacienteSyntheticUserId(pacienteId: string): string {
  return `paciente:${pacienteId}`;
}

/** Se algum dos userIds informados já leu a mensagem. */
export function mensagemFoiLidaPor(
  m: Pick<OrganizacaoMensagem, 'lida' | 'lidasPorUserIds' | 'to' | 'isGrupo'>,
  userIds: string[]
): boolean {
  const ids = (userIds || []).filter(Boolean);
  if (ids.length === 0) return false;
  const lidas = Array.isArray(m.lidasPorUserIds) ? m.lidasPorUserIds : [];
  if (ids.some((id) => lidas.includes(id))) return true;
  // Legado 1:1: flag lida sem lista por usuário
  if (m.lida && !m.isGrupo) {
    if (!m.to?.userId) return true;
    return ids.includes(m.to.userId);
  }
  return false;
}

/** Remetente: destinatário(s) já abriram? */
export function mensagemTemLeituraDeDestinatario(
  m: Pick<
    OrganizacaoMensagem,
    'lida' | 'lidasPorUserIds' | 'to' | 'from' | 'isGrupo' | 'participantUserIds' | 'participantes'
  >
): boolean {
  const lidas = Array.isArray(m.lidasPorUserIds) ? m.lidasPorUserIds : [];
  const fromId = m.from?.userId;
  const leiturasDeOutros = lidas.filter((id) => id && id !== fromId && !String(id).startsWith('grupo:'));
  if (leiturasDeOutros.length > 0) return true;
  if (m.lida && !m.isGrupo) return true;
  return false;
}
