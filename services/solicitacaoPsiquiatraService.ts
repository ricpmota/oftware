/**
 * Solicitação de compartilhamento Paciente ↔ Psiquiatra.
 * Collection: solicitacoes_psiquiatra
 * ACL: paciente_psiquiatra/{pacienteId}_{psiquiatraId}
 *
 * Independente de solicitacoes_vinculo_psiquiatra_medico.
 * NÃO escreve em collections Nutri/Personal.
 */

import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  COL_PACIENTE_PSIQUIATRA,
  COL_PACIENTE_PSIQUIATRA_SLOT,
  COL_SOLICITACOES_PSIQUIATRA,
  SOLICITACAO_PSIQUIATRA_STATUS,
} from '@/features/metaPsi/metaPsi.constants';
import type { SolicitacaoPsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import { pacientePsiquiatraDocId } from '@/lib/metapsi/hasActivePsiquiatraAccess';
import { syncPacienteProfissionaisEspelho } from '@/lib/paciente/syncPacienteProfissionaisEspelho';
import { MedicoService } from './medicoService';
import { PacienteService } from './pacienteService';
import { PacientePsiquiatraService } from './pacientePsiquiatraService';
import {
  isPsiquiatraElegivelParaVinculo,
  PsiquiatraService,
} from './psiquiatraService';

const MSG_JA_TEM_PSIQUIATRA_ATIVO =
  'Este paciente já possui um psiquiatra ativo. Encerre o compartilhamento atual antes de compartilhar com outro.';

function mapSolicitacao(id: string, data: Record<string, unknown>): SolicitacaoPsiquiatraDoc {
  const toDate = (v: unknown): Date | undefined => {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v === 'object' && v && 'toDate' in v) {
      return (v as { toDate: () => Date }).toDate();
    }
    return undefined;
  };
  return {
    id,
    pacienteId: String(data.pacienteId || ''),
    psiquiatraId: String(data.psiquiatraId || ''),
    medicoId: String(data.medicoId || ''),
    status:
      (data.status as SolicitacaoPsiquiatraDoc['status']) ||
      SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE,
    criadoEm: toDate(data.criadoEm) || new Date(),
    aceitoEm: toDate(data.aceitoEm),
    rejeitadoEm: toDate(data.rejeitadoEm),
    canceladoEm: toDate(data.canceladoEm),
    motivoRejeicao: data.motivoRejeicao ? String(data.motivoRejeicao) : undefined,
    motivoCancelamento: data.motivoCancelamento ? String(data.motivoCancelamento) : undefined,
    pacienteNome: data.pacienteNome ? String(data.pacienteNome) : undefined,
    medicoNome: data.medicoNome ? String(data.medicoNome) : undefined,
    psiquiatraNome: data.psiquiatraNome ? String(data.psiquiatraNome) : undefined,
    psiquiatraEmail: data.psiquiatraEmail ? String(data.psiquiatraEmail) : undefined,
  };
}

function sortDesc(list: SolicitacaoPsiquiatraDoc[]) {
  return list.sort((a, b) => (b.criadoEm?.getTime() || 0) - (a.criadoEm?.getTime() || 0));
}

async function resolveMedicoKeys(medicoIdRaw: string): Promise<string[]> {
  const raw = String(medicoIdRaw || '').trim();
  const resolved =
    (await MedicoService.getMedicoById(raw).catch(() => null)) ||
    (await MedicoService.getMedicoByUserId(raw).catch(() => null));
  return Array.from(
    new Set(
      [resolved?.id, resolved?.userId, raw].map((x) => String(x || '').trim()).filter(Boolean)
    )
  );
}

async function assertPsiquiatraVinculadoAoMedico(
  psiquiatraId: string,
  medicoId: string
): Promise<void> {
  const psi = await PsiquiatraService.getPsiquiatraByUserId(psiquiatraId);
  if (!psi || !isPsiquiatraElegivelParaVinculo(psi)) {
    throw new Error(
      'Somente psiquiatras verificados e ativos podem receber compartilhamento de pacientes.'
    );
  }
  const medicoKeys = await resolveMedicoKeys(medicoId);
  const linked = Array.isArray(psi.medicoVinculadoIds) ? psi.medicoVinculadoIds : [];
  if (!linked.some((id) => medicoKeys.includes(String(id)))) {
    throw new Error(
      'O psiquiatra precisa ter vínculo profissional ativo com este médico antes do compartilhamento.'
    );
  }
}

async function assertSemOutroPsiquiatraAtivo(
  pacienteId: string,
  psiquiatraIdPermitido?: string
): Promise<void> {
  const ativos = await PacientePsiquiatraService.listActiveVinculosByPaciente(pacienteId);
  const outros = ativos.filter(
    (v) => !psiquiatraIdPermitido || v.psiquiatraId !== psiquiatraIdPermitido
  );
  if (outros.length > 0) {
    throw new Error(MSG_JA_TEM_PSIQUIATRA_ATIVO);
  }

  // Slot atômico (concorrência) — mesmo se ACL legada estiver limpa
  const slotSnap = await getDoc(doc(db, COL_PACIENTE_PSIQUIATRA_SLOT, pacienteId));
  if (slotSnap.exists()) {
    const slotPsi = String(slotSnap.data()?.psiquiatraId || '').trim();
    if (slotPsi && (!psiquiatraIdPermitido || slotPsi !== psiquiatraIdPermitido)) {
      throw new Error(MSG_JA_TEM_PSIQUIATRA_ATIVO);
    }
  }
}

export class SolicitacaoPsiquiatraService {
  /**
   * Médico inicia compartilhamento de paciente com Psiquiatra da equipe.
   */
  static async createPacienteShareRequest(
    medicoId: string,
    psiquiatraId: string,
    pacienteId: string,
    extraData?: {
      pacienteNome?: string;
      medicoNome?: string;
      psiquiatraNome?: string;
      psiquiatraEmail?: string;
    }
  ): Promise<string> {
    const mid = String(medicoId || '').trim();
    const psiId = String(psiquiatraId || '').trim();
    const pid = String(pacienteId || '').trim();
    if (!mid || !psiId || !pid) throw new Error('IDs inválidos para compartilhamento.');

    await assertPsiquiatraVinculadoAoMedico(psiId, mid);
    await assertSemOutroPsiquiatraAtivo(pid);

    const existingActive = await PacientePsiquiatraService.getActiveVinculo(pid, psiId);
    if (existingActive) {
      throw new Error('Este paciente já está compartilhado com este psiquiatra.');
    }

    const qPendente = query(
      collection(db, COL_SOLICITACOES_PSIQUIATRA),
      where('medicoId', '==', mid),
      where('psiquiatraId', '==', psiId),
      where('pacienteId', '==', pid),
      where('status', '==', SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE)
    );
    const pendSnap = await getDocs(qPendente);
    if (!pendSnap.empty) {
      throw new Error('Já existe uma solicitação pendente para este paciente.');
    }

    let pacienteNome = extraData?.pacienteNome;
    let medicoNome = extraData?.medicoNome;
    let psiquiatraNome = extraData?.psiquiatraNome;
    let psiquiatraEmail = extraData?.psiquiatraEmail;

    if (!pacienteNome) {
      const paciente = await PacienteService.getPacienteById(pid);
      pacienteNome =
        paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || 'Paciente';
    }
    if (!medicoNome) {
      const medico = await MedicoService.getMedicoById(mid);
      medicoNome = medico?.nome || '';
    }
    if (!psiquiatraNome || !psiquiatraEmail) {
      const psi = await PsiquiatraService.getPsiquiatraByUserId(psiId);
      psiquiatraNome = psiquiatraNome || psi?.nome || '';
      psiquiatraEmail = psiquiatraEmail || psi?.email || '';
    }

    const docRef = await addDoc(collection(db, COL_SOLICITACOES_PSIQUIATRA), {
      medicoId: mid,
      psiquiatraId: psiId,
      pacienteId: pid,
      status: SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE,
      criadoEm: Timestamp.now(),
      pacienteNome: pacienteNome || '',
      medicoNome: medicoNome || '',
      psiquiatraNome: psiquiatraNome || '',
      psiquiatraEmail: psiquiatraEmail || '',
      ...shadowOrganizationFields(),
    });
    return docRef.id;
  }

  static async listPendingRequestsByPsiquiatra(
    psiquiatraId: string
  ): Promise<SolicitacaoPsiquiatraDoc[]> {
    const q = query(
      collection(db, COL_SOLICITACOES_PSIQUIATRA),
      where('psiquiatraId', '==', String(psiquiatraId || '').trim()),
      where('status', '==', SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE)
    );
    const snap = await getDocs(q);
    return sortDesc(snap.docs.map((d) => mapSolicitacao(d.id, d.data() as Record<string, unknown>)));
  }

  static async listRequestsByPaciente(
    medicoId: string,
    pacienteId: string
  ): Promise<SolicitacaoPsiquiatraDoc[]> {
    const q = query(
      collection(db, COL_SOLICITACOES_PSIQUIATRA),
      where('medicoId', '==', String(medicoId || '').trim()),
      where('pacienteId', '==', String(pacienteId || '').trim())
    );
    const snap = await getDocs(q);
    return sortDesc(snap.docs.map((d) => mapSolicitacao(d.id, d.data() as Record<string, unknown>)));
  }

  static async approveShareRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, COL_SOLICITACOES_PSIQUIATRA, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error('Solicitação não encontrada');

    const data = requestSnap.data();
    if (data.status !== SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE) {
      throw new Error('Apenas solicitações pendentes podem ser aceitas');
    }

    const pacienteId = String(data.pacienteId || '').trim();
    const psiquiatraId = String(data.psiquiatraId || '').trim();
    const medicoId = String(data.medicoId || '').trim();

    await assertPsiquiatraVinculadoAoMedico(psiquiatraId, medicoId);
    // Validação prévia (inclui legado sem slot) — revalidada atomicamente abaixo
    await assertSemOutroPsiquiatraAtivo(pacienteId, psiquiatraId);

    const vinculoId = pacientePsiquiatraDocId(pacienteId, psiquiatraId);
    const vinculoRef = doc(db, COL_PACIENTE_PSIQUIATRA, vinculoId);
    const slotRef = doc(db, COL_PACIENTE_PSIQUIATRA_SLOT, pacienteId);

    await runTransaction(db, async (transaction) => {
      const freshReq = await transaction.get(requestRef);
      if (!freshReq.exists()) throw new Error('Solicitação não encontrada');
      if (freshReq.data().status !== SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE) {
        throw new Error('Apenas solicitações pendentes podem ser aceitas');
      }

      const slotSnap = await transaction.get(slotRef);
      if (slotSnap.exists()) {
        const slotPsi = String(slotSnap.data()?.psiquiatraId || '').trim();
        if (slotPsi && slotPsi !== psiquiatraId) {
          throw new Error(MSG_JA_TEM_PSIQUIATRA_ATIVO);
        }
      }

      transaction.update(requestRef, {
        status: SOLICITACAO_PSIQUIATRA_STATUS.ACEITA,
        aceitoEm: Timestamp.now(),
      });

      transaction.set(vinculoRef, {
        pacienteId,
        psiquiatraId,
        medicoId,
        status: 'ativo',
        dataCompartilhamento: Timestamp.now(),
        ...shadowOrganizationFields(),
      });

      transaction.set(slotRef, {
        pacienteId,
        psiquiatraId,
        medicoId,
        vinculoId,
        updatedAt: Timestamp.now(),
        ...shadowOrganizationFields(),
      });
    });

    await syncPacienteProfissionaisEspelho(pacienteId).catch((e) =>
      console.warn('[approveShareRequest psi] sync espelho', e)
    );
  }

  static async rejectShareRequest(requestId: string, motivoRejeicao?: string): Promise<void> {
    const requestRef = doc(db, COL_SOLICITACOES_PSIQUIATRA, requestId);
    const snap = await getDoc(requestRef);
    if (!snap.exists()) throw new Error('Solicitação não encontrada');

    await updateDoc(requestRef, {
      status: SOLICITACAO_PSIQUIATRA_STATUS.REJEITADA,
      rejeitadoEm: Timestamp.now(),
      motivoRejeicao: motivoRejeicao || '',
    });
  }

  static async cancelShareRequest(requestId: string, motivoCancelamento?: string): Promise<void> {
    const requestRef = doc(db, COL_SOLICITACOES_PSIQUIATRA, requestId);
    const snap = await getDoc(requestRef);
    if (!snap.exists()) throw new Error('Solicitação não encontrada');
    if (snap.data().status !== SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE) {
      throw new Error('Apenas solicitações pendentes podem ser canceladas');
    }
    await updateDoc(requestRef, {
      status: SOLICITACAO_PSIQUIATRA_STATUS.CANCELADA,
      canceladoEm: Timestamp.now(),
      motivoCancelamento: motivoCancelamento || '',
    });
  }

  /**
   * Encerra ACL Paciente ↔ Psiquiatra.
   * NÃO remove vínculo profissional Médico ↔ Psiquiatra.
   */
  static async endCompartilhamento(
    pacienteId: string,
    psiquiatraId: string,
    medicoId: string
  ): Promise<void> {
    const pid = String(pacienteId || '').trim();
    const psiId = String(psiquiatraId || '').trim();
    const mid = String(medicoId || '').trim();
    if (!pid || !psiId || !mid) throw new Error('IDs inválidos.');

    const vinculoRef = doc(db, COL_PACIENTE_PSIQUIATRA, pacientePsiquiatraDocId(pid, psiId));
    const slotRef = doc(db, COL_PACIENTE_PSIQUIATRA_SLOT, pid);

    await runTransaction(db, async (transaction) => {
      const vinculoSnap = await transaction.get(vinculoRef);
      const slotSnap = await transaction.get(slotRef);
      if (!vinculoSnap.exists()) {
        throw new Error('Compartilhamento não encontrado');
      }

      transaction.update(vinculoRef, {
        status: 'inativo',
        removidoEm: Timestamp.now(),
        motivoRemocao: 'Encerrado pelo médico',
      });

      if (slotSnap.exists()) {
        const slotPsi = String(slotSnap.data()?.psiquiatraId || '').trim();
        if (!slotPsi || slotPsi === psiId) {
          transaction.delete(slotRef);
        }
      }
    });

    await syncPacienteProfissionaisEspelho(pid).catch((e) =>
      console.warn('[endCompartilhamento psi] sync espelho', e)
    );

    const solicitacoesQuery = query(
      collection(db, COL_SOLICITACOES_PSIQUIATRA),
      where('pacienteId', '==', pid),
      where('psiquiatraId', '==', psiId),
      where('medicoId', '==', mid)
    );
    const solicitacoesSnap = await getDocs(solicitacoesQuery);
    await Promise.all(solicitacoesSnap.docs.map((d) => deleteDoc(d.ref)));
  }
}
