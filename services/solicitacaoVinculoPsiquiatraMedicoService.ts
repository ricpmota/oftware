/**
 * Vínculo profissional Médico ↔ Psiquiatra.
 * Collection: solicitacoes_vinculo_psiquiatra_medico
 *
 * NÃO cria acesso a pacientes (etapa 3).
 * NÃO escreve em collections Nutri/Personal.
 * Remoção isola o vínculo profissional (padrão Personal, sem acoplar share).
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
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  COL_PSIQUIATRAS,
  COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO,
  PSIQUIATRA_STATUS,
  SOLICITACAO_VINCULO_PSIQUIATRA_STATUS,
} from '@/features/metaPsi/metaPsi.constants';
import type { SolicitacaoVinculoPsiquiatraMedicoDoc } from '@/features/metaPsi/metaPsi.types';
import { MedicoService } from './medicoService';
import { PsiquiatraService, isPsiquiatraElegivelParaVinculo } from './psiquiatraService';

function mapSolicitacao(
  id: string,
  data: Record<string, unknown>
): SolicitacaoVinculoPsiquiatraMedicoDoc {
  const toDate = (v: unknown): Date | undefined => {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v === 'object' && v && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
      return (v as { toDate: () => Date }).toDate();
    }
    return undefined;
  };

  return {
    id,
    medicoId: String(data.medicoId || ''),
    psiquiatraId: String(data.psiquiatraId || ''),
    solicitadoPor: (data.solicitadoPor === 'medico' ? 'medico' : 'psiquiatra') as 'medico' | 'psiquiatra',
    status: (data.status as SolicitacaoVinculoPsiquiatraMedicoDoc['status']) || SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE,
    criadoEm: toDate(data.criadoEm) || new Date(),
    aceitoEm: toDate(data.aceitoEm),
    rejeitadoEm: toDate(data.rejeitadoEm),
    canceladoEm: toDate(data.canceladoEm),
    motivoRejeicao: data.motivoRejeicao ? String(data.motivoRejeicao) : undefined,
    motivoCancelamento: data.motivoCancelamento ? String(data.motivoCancelamento) : undefined,
    psiquiatraNome: data.psiquiatraNome ? String(data.psiquiatraNome) : undefined,
    psiquiatraEmail: data.psiquiatraEmail ? String(data.psiquiatraEmail) : undefined,
    medicoNome: data.medicoNome ? String(data.medicoNome) : undefined,
  };
}

function sortByCriadoEmDesc(list: SolicitacaoVinculoPsiquiatraMedicoDoc[]) {
  return list.sort((a, b) => (b.criadoEm?.getTime() || 0) - (a.criadoEm?.getTime() || 0));
}

async function resolveMedicoKeys(medicoIdRaw: string): Promise<{
  medicoDocId: string;
  medicoKeys: string[];
  medicoNome?: string;
  medicoUserId?: string;
}> {
  const raw = String(medicoIdRaw || '').trim();
  const medicoResolved =
    (await MedicoService.getMedicoById(raw).catch(() => null)) ||
    (await MedicoService.getMedicoByUserId(raw).catch(() => null));
  const medicoDocId = String(medicoResolved?.id || raw).trim();
  const medicoUserId = medicoResolved?.userId ? String(medicoResolved.userId).trim() : undefined;
  const medicoKeys = Array.from(
    new Set([medicoDocId, medicoUserId, raw].map((x) => String(x || '').trim()).filter(Boolean))
  );
  return {
    medicoDocId,
    medicoKeys,
    medicoNome: medicoResolved?.nome,
    medicoUserId,
  };
}

function filterOutMedicoKeys(ids: unknown, medicoKeys: string[]): string[] {
  const keySet = new Set(medicoKeys);
  const list = Array.isArray(ids)
    ? ids.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  return list.filter((id) => !keySet.has(id));
}

export class SolicitacaoVinculoPsiquiatraMedicoService {
  /**
   * Cria solicitação de vínculo profissional.
   * Exige Psiquiatra verificado + ativo. Deduplica pendente/aceita.
   */
  static async createVinculoRequest(
    psiquiatraId: string,
    medicoId: string,
    solicitadoPor: 'medico' | 'psiquiatra',
    extraData?: {
      psiquiatraNome?: string;
      psiquiatraEmail?: string;
      medicoNome?: string;
    }
  ): Promise<string> {
    const psiId = String(psiquiatraId || '').trim();
    const medId = String(medicoId || '').trim();
    if (!psiId || !medId) throw new Error('IDs inválidos para vínculo.');

    const { medicoDocId, medicoKeys, medicoNome: resolvedNome } =
      await resolveMedicoKeys(medId);

    // Auto-vínculo médico↔psiquiatra no mesmo login é permitido (ambiente de teste).

    const psiquiatra =
      (await PsiquiatraService.getPsiquiatraByUserId(psiId).catch(() => null)) ||
      null;
    if (!psiquiatra || !isPsiquiatraElegivelParaVinculo(psiquiatra)) {
      throw new Error(
        'Somente psiquiatras verificados e ativos podem participar de novos vínculos.'
      );
    }

    const qPendente = query(
      collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
      where('psiquiatraId', '==', psiId),
      where('medicoId', '==', medicoDocId),
      where('status', '==', SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE)
    );
    const qAceita = query(
      collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
      where('psiquiatraId', '==', psiId),
      where('medicoId', '==', medicoDocId),
      where('status', '==', SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA)
    );

    const [pendentesSnap, aceitasSnap] = await Promise.all([getDocs(qPendente), getDocs(qAceita)]);
    if (!pendentesSnap.empty) {
      throw new Error('Já existe uma solicitação pendente para este vínculo.');
    }
    if (!aceitasSnap.empty) {
      throw new Error('Este vínculo profissional já está ativo.');
    }

    // Também bloqueia se o array já contém o médico (aceite legado / inconsistência)
    const linked = Array.isArray(psiquiatra.medicoVinculadoIds) ? psiquiatra.medicoVinculadoIds : [];
    if (linked.some((id) => medicoKeys.includes(String(id)))) {
      throw new Error('Este vínculo profissional já está ativo.');
    }

    const novaSolicitacao = {
      psiquiatraId: psiId,
      medicoId: medicoDocId,
      solicitadoPor,
      status: SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE,
      criadoEm: Timestamp.now(),
      psiquiatraNome: extraData?.psiquiatraNome || psiquiatra.nome || '',
      psiquiatraEmail: extraData?.psiquiatraEmail || psiquiatra.email || '',
      medicoNome: extraData?.medicoNome || resolvedNome || '',
    };

    const docRef = await addDoc(collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO), {
      ...novaSolicitacao,
      ...shadowOrganizationFields(),
    });
    return docRef.id;
  }

  static async listPendingVinculoRequestsByPsiquiatra(
    psiquiatraId: string
  ): Promise<SolicitacaoVinculoPsiquiatraMedicoDoc[]> {
    const q = query(
      collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
      where('psiquiatraId', '==', String(psiquiatraId || '').trim()),
      where('solicitadoPor', '==', 'medico'),
      where('status', '==', SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE)
    );
    const snap = await getDocs(q);
    return sortByCriadoEmDesc(snap.docs.map((d) => mapSolicitacao(d.id, d.data() as Record<string, unknown>)));
  }

  static async listSentVinculoRequestsByPsiquiatra(
    psiquiatraId: string
  ): Promise<SolicitacaoVinculoPsiquiatraMedicoDoc[]> {
    const q = query(
      collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
      where('psiquiatraId', '==', String(psiquiatraId || '').trim()),
      where('solicitadoPor', '==', 'psiquiatra')
    );
    const snap = await getDocs(q);
    return sortByCriadoEmDesc(
      snap.docs
        .map((d) => mapSolicitacao(d.id, d.data() as Record<string, unknown>))
        .filter((s) => s.status !== SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA)
    );
  }

  static async listVinculoRequestsByPsiquiatra(
    psiquiatraId: string
  ): Promise<SolicitacaoVinculoPsiquiatraMedicoDoc[]> {
    const q = query(
      collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
      where('psiquiatraId', '==', String(psiquiatraId || '').trim())
    );
    const snap = await getDocs(q);
    return sortByCriadoEmDesc(snap.docs.map((d) => mapSolicitacao(d.id, d.data() as Record<string, unknown>)));
  }

  static async listSentVinculoRequestsByMedico(
    medicoId: string
  ): Promise<SolicitacaoVinculoPsiquiatraMedicoDoc[]> {
    const { medicoDocId, medicoKeys } = await resolveMedicoKeys(medicoId);
    const results: SolicitacaoVinculoPsiquiatraMedicoDoc[] = [];
    const seen = new Set<string>();
    for (const key of medicoKeys.length ? medicoKeys : [medicoDocId]) {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
        where('medicoId', '==', key),
        where('solicitadoPor', '==', 'medico')
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        results.push(mapSolicitacao(d.id, d.data() as Record<string, unknown>));
      }
    }
    return sortByCriadoEmDesc(
      results.filter((s) => s.status !== SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA)
    );
  }

  static async listAllVinculoRequestsByMedico(
    medicoId: string
  ): Promise<SolicitacaoVinculoPsiquiatraMedicoDoc[]> {
    const { medicoDocId, medicoKeys } = await resolveMedicoKeys(medicoId);
    const results: SolicitacaoVinculoPsiquiatraMedicoDoc[] = [];
    const seen = new Set<string>();
    for (const key of medicoKeys.length ? medicoKeys : [medicoDocId]) {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
        where('medicoId', '==', key)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        results.push(mapSolicitacao(d.id, d.data() as Record<string, unknown>));
      }
    }
    return sortByCriadoEmDesc(results);
  }

  static async listPendingVinculoRequestsByMedico(
    medicoId: string
  ): Promise<SolicitacaoVinculoPsiquiatraMedicoDoc[]> {
    const all = await this.listAllVinculoRequestsByMedico(medicoId);
    return all.filter(
      (s) =>
        s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE &&
        s.solicitadoPor === 'psiquiatra'
    );
  }

  static async approveVinculoRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error('Solicitação não encontrada');

    const requestData = requestSnap.data();
    const psiquiatraId = String(requestData.psiquiatraId || '').trim();
    if (!psiquiatraId) throw new Error('Psiquiatra inválido na solicitação.');

    const psiquiatra = await PsiquiatraService.getPsiquiatraByUserId(psiquiatraId);
    if (!psiquiatra || !isPsiquiatraElegivelParaVinculo(psiquiatra)) {
      throw new Error(
        'Somente psiquiatras verificados e ativos podem ter o vínculo aprovado.'
      );
    }

    await updateDoc(requestRef, {
      status: SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA,
      aceitoEm: Timestamp.now(),
    });

    const { medicoDocId, medicoKeys } = await resolveMedicoKeys(String(requestData.medicoId || ''));

    const psiRef = doc(db, COL_PSIQUIATRAS, psiquiatraId);
    const psiSnap = await getDoc(psiRef);
    if (psiSnap.exists()) {
      const current = Array.isArray(psiSnap.data().medicoVinculadoIds)
        ? psiSnap.data().medicoVinculadoIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
        : [];
      const next = Array.from(new Set([...current, ...medicoKeys]));
      if (next.length !== current.length) {
        await updateDoc(psiRef, { medicoVinculadoIds: next });
      }
    }

    if (medicoDocId) {
      const medicoRef = doc(db, 'medicos', medicoDocId);
      const medicoSnap = await getDoc(medicoRef);
      if (medicoSnap.exists()) {
        const current = Array.isArray(medicoSnap.data().psiquiatraVinculadoIds)
          ? medicoSnap
              .data()
              .psiquiatraVinculadoIds.map((id: unknown) => String(id || '').trim())
              .filter(Boolean)
          : [];
        if (!current.includes(psiquiatraId)) {
          await updateDoc(medicoRef, {
            psiquiatraVinculadoIds: [...current, psiquiatraId],
          });
        }
      }
    }
  }

  static async rejectVinculoRequest(requestId: string, motivoRejeicao?: string): Promise<void> {
    const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error('Solicitação não encontrada');

    await updateDoc(requestRef, {
      status: SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.REJEITADA,
      rejeitadoEm: Timestamp.now(),
      ...(motivoRejeicao ? { motivoRejeicao } : {}),
    });
  }

  static async cancelVinculoRequest(requestId: string, motivoCancelamento?: string): Promise<void> {
    const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error('Solicitação não encontrada');

    await updateDoc(requestRef, {
      status: SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.CANCELADA,
      canceladoEm: Timestamp.now(),
      ...(motivoCancelamento ? { motivoCancelamento } : {}),
    });
  }

  static async deleteVinculoRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error('Solicitação não encontrada');

    const requestData = requestSnap.data();
    if (requestData.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA) {
      await this.removeVinculoCompleto(
        String(requestData.medicoId || ''),
        String(requestData.psiquiatraId || '')
      );
      return;
    }
    await deleteDoc(requestRef);
  }

  /**
   * Remove vínculo profissional dos dois lados e as solicitações relacionadas.
   * NÃO toca pacientes / paciente_* / solicitações clínicas.
   * Bloqueia se ainda houver paciente_psiquiatra ativo entre o par.
   */
  static async removeVinculoCompleto(medicoId: string, psiquiatraId: string): Promise<void> {
    const psiId = String(psiquiatraId || '').trim();
    const { medicoDocId, medicoKeys } = await resolveMedicoKeys(medicoId);
    if (!psiId || !medicoDocId) throw new Error('IDs inválidos para remoção de vínculo.');

    // Proteção ETAPA 3: não cascade de pacientes
    const { PacientePsiquiatraService } = await import('./pacientePsiquiatraService');
    let activeShares = 0;
    for (const key of medicoKeys) {
      activeShares += await PacientePsiquiatraService.countActiveSharesBetweenMedicoAndPsiquiatra(
        key,
        psiId
      );
    }
    if (activeShares > 0) {
      throw new Error(
        'Este Psiquiatra ainda possui pacientes ativos compartilhados por você. Encerre os compartilhamentos antes de remover o vínculo profissional.'
      );
    }

    const psiRef = doc(db, COL_PSIQUIATRAS, psiId);
    const psiSnap = await getDoc(psiRef);
    if (psiSnap.exists()) {
      await updateDoc(psiRef, {
        medicoVinculadoIds: filterOutMedicoKeys(psiSnap.data().medicoVinculadoIds, medicoKeys),
      });
    }

    const medicoRef = doc(db, 'medicos', medicoDocId);
    const medicoSnap = await getDoc(medicoRef);
    if (medicoSnap.exists()) {
      const current = Array.isArray(medicoSnap.data().psiquiatraVinculadoIds)
        ? medicoSnap.data().psiquiatraVinculadoIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
        : [];
      await updateDoc(medicoRef, {
        psiquiatraVinculadoIds: current.filter((id: string) => id !== psiId),
      });
    }

    const deleteForMedicoKey = async (key: string) => {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO),
        where('psiquiatraId', '==', psiId),
        where('medicoId', '==', key)
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    };
    await Promise.all(medicoKeys.map(deleteForMedicoKey));
  }
}

export { PSIQUIATRA_STATUS, SOLICITACAO_VINCULO_PSIQUIATRA_STATUS };
