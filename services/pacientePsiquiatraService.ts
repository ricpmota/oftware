/**
 * ACL / listagem de pacientes visíveis para o Psiquiatra.
 * Fonte de verdade: paciente_psiquiatra (status ativo).
 * NÃO lista por medicoVinculadoIds.
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COL_PACIENTE_PSIQUIATRA } from '@/features/metaPsi/metaPsi.constants';
import type { PacientePsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import { PacienteService } from './pacienteService';
import { MedicoService } from './medicoService';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';
import {
  hasActivePsiquiatraAccess,
  pacientePsiquiatraDocId,
} from '@/lib/metapsi/hasActivePsiquiatraAccess';

export type PacienteVisivelPsiquiatra = {
  vinculoId: string;
  pacienteId: string;
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome: string;
  medicoGenero?: 'M' | 'F';
  dataCompartilhamento: Date;
  status: 'ativo' | 'inativo' | 'removido';
};

function mapVinculo(id: string, data: Record<string, unknown>): PacientePsiquiatraDoc {
  const toDate = (v: unknown): Date => {
    if (v instanceof Date) return v;
    if (v && typeof v === 'object' && 'toDate' in v) {
      const d = (v as { toDate: () => Date }).toDate();
      if (d instanceof Date) return d;
    }
    return new Date();
  };
  return {
    id,
    pacienteId: String(data.pacienteId || ''),
    psiquiatraId: String(data.psiquiatraId || ''),
    medicoId: String(data.medicoId || ''),
    status: (data.status as PacientePsiquiatraDoc['status']) || 'ativo',
    dataCompartilhamento: toDate(data.dataCompartilhamento),
    removidoEm: data.removidoEm ? toDate(data.removidoEm) : undefined,
    motivoRemocao: data.motivoRemocao ? String(data.motivoRemocao) : undefined,
  };
}

export class PacientePsiquiatraService {
  static async listActiveVinculosByPsiquiatra(
    psiquiatraId: string
  ): Promise<PacientePsiquiatraDoc[]> {
    const psiId = String(psiquiatraId || '').trim();
    if (!psiId) return [];

    const q = query(
      collection(db, COL_PACIENTE_PSIQUIATRA),
      where('psiquiatraId', '==', psiId),
      where('status', '==', 'ativo')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapVinculo(d.id, d.data() as Record<string, unknown>))
      .sort(
        (a, b) =>
          (b.dataCompartilhamento?.getTime() || 0) - (a.dataCompartilhamento?.getTime() || 0)
      );
  }

  static async listActiveVinculosByMedicoAndPsiquiatra(
    medicoId: string,
    psiquiatraId: string
  ): Promise<PacientePsiquiatraDoc[]> {
    const mid = String(medicoId || '').trim();
    const psiId = String(psiquiatraId || '').trim();
    if (!mid || !psiId) return [];

    const q = query(
      collection(db, COL_PACIENTE_PSIQUIATRA),
      where('psiquiatraId', '==', psiId),
      where('medicoId', '==', mid),
      where('status', '==', 'ativo')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapVinculo(d.id, d.data() as Record<string, unknown>));
  }

  static async countActiveSharesBetweenMedicoAndPsiquiatra(
    medicoId: string,
    psiquiatraId: string
  ): Promise<number> {
    const list = await this.listActiveVinculosByMedicoAndPsiquiatra(medicoId, psiquiatraId);
    return list.length;
  }

  /** Todas as ACLs ativas deste médico (qualquer psiquiatra). */
  static async listActiveVinculosByMedico(medicoId: string): Promise<PacientePsiquiatraDoc[]> {
    const mid = String(medicoId || '').trim();
    if (!mid) return [];
    const q = query(
      collection(db, COL_PACIENTE_PSIQUIATRA),
      where('medicoId', '==', mid),
      where('status', '==', 'ativo')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapVinculo(d.id, d.data() as Record<string, unknown>));
  }

  /** Qualquer ACL ativa do paciente (qualquer psiquiatra). */
  static async listActiveVinculosByPaciente(pacienteId: string): Promise<PacientePsiquiatraDoc[]> {
    const pid = String(pacienteId || '').trim();
    if (!pid) return [];
    const q = query(
      collection(db, COL_PACIENTE_PSIQUIATRA),
      where('pacienteId', '==', pid),
      where('status', '==', 'ativo')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapVinculo(d.id, d.data() as Record<string, unknown>));
  }

  static async getActiveVinculo(
    pacienteId: string,
    psiquiatraId: string
  ): Promise<PacientePsiquiatraDoc | null> {
    const id = pacientePsiquiatraDocId(pacienteId, psiquiatraId);
    const snap = await getDoc(doc(db, COL_PACIENTE_PSIQUIATRA, id));
    if (!snap.exists()) return null;
    const mapped = mapVinculo(snap.id, snap.data() as Record<string, unknown>);
    return mapped.status === 'ativo' ? mapped : null;
  }

  static async hasActiveAccess(pacienteId: string, psiquiatraId: string): Promise<boolean> {
    return hasActivePsiquiatraAccess(pacienteId, psiquiatraId);
  }

  /**
   * Lista pacientes visíveis — SOMENTE shares ativos.
   * Não deriva de medicoVinculadoIds.
   */
  static async listPacientesVisiveisByPsiquiatra(
    psiquiatraId: string
  ): Promise<PacienteVisivelPsiquiatra[]> {
    const vinculos = await this.listActiveVinculosByPsiquiatra(psiquiatraId);
    if (vinculos.length === 0) return [];

    const pacienteIds = [...new Set(vinculos.map((v) => v.pacienteId))];
    const medicoIds = [...new Set(vinculos.map((v) => v.medicoId))];

    const [pacientesData, medicosData] = await Promise.all([
      Promise.all(pacienteIds.map((id) => PacienteService.getPacienteById(id))),
      Promise.all(medicoIds.map((id) => MedicoService.getMedicoById(id))),
    ]);

    const pacientesMap = new Map<string, PacienteCompleto>();
    pacientesData.forEach((p) => {
      if (p) pacientesMap.set(p.id, p);
    });
    const medicosMap = new Map<string, Medico>();
    medicosData.forEach((m) => {
      if (m) medicosMap.set(m.id, m);
    });

    return vinculos
      .map((vinculo) => {
        const paciente = pacientesMap.get(vinculo.pacienteId);
        if (!paciente) return null;
        const medico = medicosMap.get(vinculo.medicoId);
        return {
          vinculoId: vinculo.id,
          pacienteId: vinculo.pacienteId,
          paciente,
          medicoId: vinculo.medicoId,
          medicoNome: medico?.nome || 'Médico',
          medicoGenero: medico?.genero,
          dataCompartilhamento: vinculo.dataCompartilhamento,
          status: vinculo.status,
        } satisfies PacienteVisivelPsiquiatra;
      })
      .filter((x): x is PacienteVisivelPsiquiatra => Boolean(x));
  }
}
