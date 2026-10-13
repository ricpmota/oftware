import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';
import {
  pacienteSyntheticUserId,
  participanteKey,
  resolveOrganizacaoThreadId,
  type ComunicacaoParticipante,
  type OrganizacaoMensagem,
  type OrganizacaoMensagemPacienteAnexo,
} from '@/lib/organizacaoMensagem/types';
import { PacienteMensagemService } from '@/services/pacienteMensagemService';
import { PacienteMedicoCompartilhadoService } from '@/services/pacienteMedicoCompartilhadoService';
import { hasActivePsiquiatraAccess } from '@/lib/metapsi/hasActivePsiquiatraAccess';

const COLLECTION = 'organizacao_mensagens';

/**
 * Psiquiatra só envia/participa em mensagens com paciente se ACL paciente_psiquiatra estiver ativa.
 * Não apaga histórico; apenas bloqueia novas mensagens dependentes da ACL.
 */
async function assertPsiquiatraAclForSend(params: {
  from: ComunicacaoParticipante;
  to: ComunicacaoParticipante;
  participantes: ComunicacaoParticipante[];
}): Promise<void> {
  const pairs: Array<{ pacienteId: string; psiquiatraId: string }> = [];

  const pushPair = (pacienteId: string, psiquiatraId: string) => {
    const pid = String(pacienteId || '').trim();
    const psi = String(psiquiatraId || '').trim();
    if (!pid || !psi) return;
    pairs.push({ pacienteId: pid, psiquiatraId: psi });
  };

  if (params.from.role === 'psiquiatra' && params.to.role === 'paciente') {
    pushPair(params.to.profileId, params.from.profileId);
  }
  if (params.from.role === 'paciente' && params.to.role === 'psiquiatra') {
    pushPair(params.from.profileId, params.to.profileId);
  }

  for (const p of params.participantes) {
    if (params.from.role === 'psiquiatra' && p.role === 'paciente') {
      pushPair(p.profileId, params.from.profileId);
    }
    if (params.from.role === 'paciente' && p.role === 'psiquiatra') {
      pushPair(params.from.profileId, p.profileId);
    }
  }

  if (pairs.length === 0) return;

  const seen = new Set<string>();
  for (const { pacienteId, psiquiatraId } of pairs) {
    const key = `${pacienteId}_${psiquiatraId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ok = await hasActivePsiquiatraAccess(pacienteId, psiquiatraId);
    if (!ok) {
      throw new Error(
        'Sem acesso ativo ao paciente. O compartilhamento com o psiquiatra precisa estar ativo para enviar mensagens.'
      );
    }
  }
}

function mapPacienteAnexo(raw: any): OrganizacaoMensagemPacienteAnexo | null {
  if (!raw || typeof raw !== 'object') return null;
  const pacienteId = String(raw.pacienteId || '').trim();
  const medicoOwnerId = String(raw.medicoOwnerId || '').trim();
  if (!pacienteId || !medicoOwnerId) return null;
  return {
    pacienteId,
    nome: String(raw.nome || 'Paciente'),
    email: raw.email ?? null,
    telefone: raw.telefone ?? null,
    dataNascimento: raw.dataNascimento ?? null,
    cidade: raw.cidade ?? null,
    estado: raw.estado ?? null,
    sexoBiologico: raw.sexoBiologico ?? null,
    medicoOwnerId,
    medicoOwnerNome: String(raw.medicoOwnerNome || 'Médico'),
  };
}

function mapDoc(id: string, data: Record<string, any>): OrganizacaoMensagem {
  const from = (data.from || {}) as ComunicacaoParticipante;
  const to = (data.to || {}) as ComunicacaoParticipante;
  const mapP = (p: any): ComunicacaoParticipante => ({
    userId: String(p?.userId || ''),
    role: p?.role || 'medico',
    profileId: String(p?.profileId || ''),
    nome: String(p?.nome || ''),
    email: String(p?.email || ''),
    fotoUrl: p?.fotoUrl ?? null,
    subtitle: p?.subtitle ?? null,
  });
  return {
    id,
    organizationId: String(data.organizationId || ''),
    threadId: typeof data.threadId === 'string' ? data.threadId : undefined,
    emRespostaAId: typeof data.emRespostaAId === 'string' ? data.emRespostaAId : undefined,
    from: mapP(from),
    to: mapP(to),
    participantes: Array.isArray(data.participantes)
      ? data.participantes.map(mapP)
      : undefined,
    isGrupo: Boolean(data.isGrupo),
    participantUserIds: Array.isArray(data.participantUserIds)
      ? data.participantUserIds.map(String)
      : [from.userId, to.userId].filter(Boolean),
    participantKeys: Array.isArray(data.participantKeys)
      ? data.participantKeys.map(String).filter(Boolean)
      : undefined,
    titulo: String(data.titulo || ''),
    mensagem: String(data.mensagem || ''),
    mensagemHtml: typeof data.mensagemHtml === 'string' ? data.mensagemHtml : undefined,
    anexos: Array.isArray(data.anexos)
      ? data.anexos
          .filter((a: any) => a && typeof a.url === 'string')
          .map((a: any) => ({
            id: String(a.id || ''),
            name: String(a.name || 'anexo'),
            url: String(a.url),
            mimeType: String(a.mimeType || 'application/octet-stream'),
            size: Number(a.size) || 0,
          }))
      : [],
    pacienteAnexo: mapPacienteAnexo(data.pacienteAnexo),
    lida: Boolean(data.lida),
    lidaEm: data.lidaEm?.toDate?.() ?? data.lidaEm,
    lidasPorUserIds: Array.isArray(data.lidasPorUserIds)
      ? data.lidasPorUserIds.map(String)
      : [],
    criadoEm: data.criadoEm?.toDate?.() || new Date(),
    criadoPor: String(data.criadoPor || ''),
    deletada: Boolean(data.deletada),
    pacienteMensagemId:
      typeof data.pacienteMensagemId === 'string' ? data.pacienteMensagemId : null,
  };
}

function cleanParticipante(p: ComunicacaoParticipante | null | undefined): ComunicacaoParticipante {
  if (!p || typeof p !== 'object') {
    throw new Error('Participante inválido');
  }
  return {
    userId: String(p.userId || '').trim(),
    role: p.role || 'medico',
    profileId: String(p.profileId || '').trim(),
    nome: String(p.nome || '').trim() || 'Contato',
    email: String(p.email || '').trim(),
    fotoUrl: p.fotoUrl ?? null,
    subtitle: p.subtitle ?? null,
  };
}

export class OrganizacaoMensagemService {
  static resolveThreadId = resolveOrganizacaoThreadId;

  static async listMensagensDoUsuario(userIdOrIds: string | string[]): Promise<OrganizacaoMensagem[]> {
    const ids = (Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds])
      .map((id) => String(id || '').trim())
      .filter(Boolean);
    if (ids.length === 0) return [];

    const byId = new Map<string, OrganizacaoMensagem>();

    for (const userId of ids) {
      try {
        const q = query(
          collection(db, COLLECTION),
          where('participantUserIds', 'array-contains', userId),
          where('deletada', '==', false)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          byId.set(d.id, mapDoc(d.id, d.data()));
        }
      } catch (e) {
        console.error('[OrganizacaoMensagemService.listMensagensDoUsuario]', userId, e);
        try {
          const q2 = query(
            collection(db, COLLECTION),
            where('participantUserIds', 'array-contains', userId)
          );
          const snap = await getDocs(q2);
          for (const d of snap.docs) {
            const msg = mapDoc(d.id, d.data());
            if (!msg.deletada) byId.set(d.id, msg);
          }
        } catch (e2) {
          console.error('[OrganizacaoMensagemService.listMensagensDoUsuario.fallback]', e2);
        }
      }
    }

    return Array.from(byId.values()).sort(
      (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
    );
  }

  static async criarMensagem(params: {
    organizationId: string;
    from: ComunicacaoParticipante;
    to: ComunicacaoParticipante;
    titulo: string;
    mensagem: string;
    mensagemHtml?: string;
    anexos?: OrganizacaoMensagem['anexos'];
    pacienteAnexo?: OrganizacaoMensagemPacienteAnexo | null;
    threadId?: string;
    emRespostaAId?: string;
    /** Se médico → paciente, espelha em pacientes_mensagens. */
    mirrorPacienteMensagem?: boolean;
    medicoIdForMirror?: string;
    medicoEmailForMirror?: string;
    /** Conversa em grupo (mesmo thread para todos). */
    isGrupo?: boolean;
    /** Todos os participantes do grupo (remetente + destinatários). */
    participantes?: ComunicacaoParticipante[];
  }): Promise<string> {
    const from = cleanParticipante(params.from);
    const to = cleanParticipante(params.to);
    if (!from.userId) {
      throw new Error('Remetente sem userId');
    }
    // Mesmo Auth UID / e-mail com papéis diferentes é válido (testes entre painéis).
    if (
      from.userId &&
      to.userId &&
      from.userId === to.userId &&
      from.role === to.role &&
      from.profileId &&
      to.profileId &&
      from.profileId === to.profileId
    ) {
      throw new Error('Não é possível enviar mensagem para o próprio perfil no mesmo papel');
    }

    const participantesEarly = (params.participantes || [])
      .map((p) => {
        try {
          return cleanParticipante(p);
        } catch {
          return null;
        }
      })
      .filter((p): p is ComunicacaoParticipante => !!p);

    await assertPsiquiatraAclForSend({
      from,
      to,
      participantes: participantesEarly,
    });

    const toUserId =
      to.userId ||
      (to.role === 'paciente' ? pacienteSyntheticUserId(to.profileId) : to.profileId);
    to.userId = toUserId;

    const participantesLimpos = (params.participantes || [])
      .map((p) => {
        try {
          const c = cleanParticipante(p);
          if (!c.userId && c.role === 'paciente' && c.profileId) {
            c.userId = pacienteSyntheticUserId(c.profileId);
          }
          return c;
        } catch {
          return null;
        }
      })
      .filter((p): p is ComunicacaoParticipante => !!p && !!p.userId);

    const participantUserIds = Array.from(
      new Set(
        [
          from.userId,
          toUserId,
          from.role === 'paciente' ? pacienteSyntheticUserId(from.profileId) : null,
          to.role === 'paciente' ? pacienteSyntheticUserId(to.profileId) : null,
          ...participantesLimpos.map((p) => p.userId),
          ...participantesLimpos
            .filter((p) => p.role === 'paciente' && p.profileId)
            .map((p) => pacienteSyntheticUserId(p.profileId)),
        ].filter((x): x is string => !!x && !String(x).startsWith('grupo:'))
      )
    );

    const participantKeys = Array.from(
      new Set(
        [from, to, ...participantesLimpos]
          .filter((p) => p?.role && p?.profileId && !String(p.userId || '').startsWith('grupo:'))
          .map((p) => participanteKey(p))
      )
    );

    const isGrupo = Boolean(params.isGrupo) || participantesLimpos.length > 2;

    let pacienteMensagemId: string | null = null;
    const shouldMirror =
      !isGrupo &&
      params.mirrorPacienteMensagem !== false &&
      ((from.role === 'medico' && to.role === 'paciente') ||
        (from.role === 'paciente' && to.role === 'medico'));

    if (shouldMirror && from.role === 'medico' && to.role === 'paciente') {
      try {
        pacienteMensagemId = await PacienteMensagemService.criarMensagem({
          pacienteId: to.profileId,
          pacienteEmail: to.email || '',
          medicoId: params.medicoIdForMirror || from.profileId,
          medicoEmail: params.medicoEmailForMirror || from.email,
          titulo: params.titulo.trim(),
          mensagem: params.mensagem,
          mensagemHtml: params.mensagemHtml,
          anexos: params.anexos,
          tipo: 'clinico',
          lida: false,
          criadoPor: from.email || from.userId,
          direcao: 'medico_para_paciente',
          pacienteNome: to.nome,
          ...(params.threadId
            ? { threadId: params.threadId, emRespostaAId: params.emRespostaAId }
            : {}),
        });
      } catch (e) {
        console.warn('[OrganizacaoMensagemService] mirror medico→paciente falhou', e);
      }
    }

    if (shouldMirror && from.role === 'paciente' && to.role === 'medico') {
      try {
        pacienteMensagemId = await PacienteMensagemService.criarMensagem({
          pacienteId: from.profileId,
          pacienteEmail: from.email || '',
          medicoId: to.profileId,
          medicoEmail: to.email || '',
          titulo: params.titulo.trim(),
          mensagem: params.mensagem,
          mensagemHtml: params.mensagemHtml,
          anexos: params.anexos,
          tipo: 'clinico',
          lida: false,
          criadoPor: from.email || from.userId,
          direcao: 'paciente_para_medico',
          pacienteNome: from.nome,
          ...(params.threadId
            ? { threadId: params.threadId, emRespostaAId: params.emRespostaAId }
            : {}),
        });
      } catch (e) {
        console.warn('[OrganizacaoMensagemService] mirror paciente→medico falhou', e);
      }
    }

    // Garante threadId antecipado em grupo (todos compartilham o mesmo)
    const threadId =
      params.threadId ||
      (isGrupo ? doc(collection(db, COLLECTION)).id : undefined);

    const pacienteAnexo = mapPacienteAnexo(params.pacienteAnexo);

    const payload: Record<string, unknown> = {
      organizationId: params.organizationId,
      from,
      to,
      participantUserIds,
      participantKeys,
      titulo: params.titulo.trim(),
      mensagem: params.mensagem,
      mensagemHtml: params.mensagemHtml
        ? sanitizeMensagemHtml(params.mensagemHtml)
        : undefined,
      anexos: params.anexos?.length ? params.anexos : undefined,
      pacienteAnexo: pacienteAnexo || undefined,
      lida: false,
      lidasPorUserIds: [],
      criadoEm: new Date(),
      criadoPor: from.email || from.userId,
      deletada: false,
      pacienteMensagemId,
      isGrupo,
    };
    if (participantesLimpos.length > 0) {
      payload.participantes = participantesLimpos;
    }
    if (!payload.mensagemHtml) delete payload.mensagemHtml;
    if (!payload.anexos) delete payload.anexos;
    if (!payload.pacienteAnexo) delete payload.pacienteAnexo;
    if (threadId) payload.threadId = threadId;
    if (params.emRespostaAId) payload.emRespostaAId = params.emRespostaAId;
    if (!pacienteMensagemId) delete payload.pacienteMensagemId;
    if (!isGrupo) delete payload.isGrupo;

    const ref = await addDoc(collection(db, COLLECTION), payload);
    if (!threadId) {
      await updateDoc(ref, { threadId: ref.id });
    }

    // Grant de edição aos médicos destinatários (prontuário continua do dono)
    if (pacienteAnexo && from.role === 'medico') {
      const medicosDest = new Map<string, ComunicacaoParticipante>();
      if (to.role === 'medico' && to.profileId && !String(to.userId || '').startsWith('grupo:')) {
        medicosDest.set(to.profileId, to);
      }
      for (const p of participantesLimpos) {
        if (p.role === 'medico' && p.profileId && p.profileId !== from.profileId) {
          medicosDest.set(p.profileId, p);
        }
      }
      await Promise.all(
        [...medicosDest.values()].map((m) =>
          PacienteMedicoCompartilhadoService.upsertGrant({
            pacienteId: pacienteAnexo.pacienteId,
            ownerMedicoId: pacienteAnexo.medicoOwnerId || from.profileId,
            sharedMedicoId: m.profileId,
            sourceMensagemId: ref.id,
            organizationId: params.organizationId,
          }).catch((e) => {
            console.warn('[OrganizacaoMensagemService] grant paciente falhou', m.profileId, e);
          })
        )
      );
    }

    return ref.id;
  }

  static async marcarComoLida(mensagemId: string, readerUserId?: string | string[]): Promise<void> {
    const ids = (Array.isArray(readerUserId) ? readerUserId : [readerUserId])
      .map((id) => String(id || '').trim())
      .filter(Boolean);
    const payload: Record<string, unknown> = {
      lida: true,
      lidaEm: new Date(),
    };
    if (ids.length === 1) {
      payload.lidasPorUserIds = arrayUnion(ids[0]);
    } else if (ids.length > 1) {
      payload.lidasPorUserIds = arrayUnion(...ids);
    }
    await updateDoc(doc(db, COLLECTION, mensagemId), payload);
  }

  static async deletarMensagem(mensagemId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, mensagemId), { deletada: true });
  }

  static async ensureThreadId(mensagemIds: string[], threadId: string): Promise<void> {
    await Promise.all(
      mensagemIds.map(async (id) => {
        try {
          await updateDoc(doc(db, COLLECTION, id), { threadId });
        } catch (e) {
          console.warn('[ensureThreadId org]', id, e);
        }
      })
    );
  }
}
