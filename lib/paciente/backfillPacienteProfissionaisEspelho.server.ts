/**
 * Backfill server-side: preenche em pacientes_completos
 *   - nutricionistaVinculadoIds
 *   - personalTrainerVinculadoIds
 * a partir dos vínculos ativos em paciente_nutricionista / paciente_personal_trainer.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { COL_PACIENTE_NUTRICIONISTA } from '@/features/metaNutri/metaNutri.constants';
import { COL_PACIENTE_PERSONAL_TRAINER } from '@/features/metaPersonal/metaPersonal.constants';

export type PacienteProfissionaisEspelhoBackfillReport = {
  vinculosNutriAtivos: number;
  vinculosPersonalAtivos: number;
  pacientesComNutri: number;
  pacientesComPersonal: number;
  pacientesAtualizados: number;
  pacientesSemDoc: number;
  erros: Array<{ pacienteId: string; error: string }>;
  dryRun: boolean;
};

function uniquePush(map: Map<string, Set<string>>, pacienteId: string, id: string) {
  const pid = String(pacienteId || '').trim();
  const vid = String(id || '').trim();
  if (!pid || !vid) return;
  if (!map.has(pid)) map.set(pid, new Set());
  map.get(pid)!.add(vid);
}

export async function backfillPacienteProfissionaisEspelho(
  db: Firestore,
  options?: { dryRun?: boolean }
): Promise<PacienteProfissionaisEspelhoBackfillReport> {
  const dryRun = options?.dryRun === true;

  const nutriByPaciente = new Map<string, Set<string>>();
  const personalByPaciente = new Map<string, Set<string>>();

  const [nutriSnap, personalSnap] = await Promise.all([
    db.collection(COL_PACIENTE_NUTRICIONISTA).where('status', '==', 'ativo').get(),
    db.collection(COL_PACIENTE_PERSONAL_TRAINER).where('status', '==', 'ativo').get(),
  ]);

  for (const docSnap of nutriSnap.docs) {
    const data = docSnap.data() || {};
    uniquePush(nutriByPaciente, data.pacienteId, data.nutricionistaId);
  }
  for (const docSnap of personalSnap.docs) {
    const data = docSnap.data() || {};
    uniquePush(personalByPaciente, data.pacienteId, data.personalTrainerId);
  }

  const allPacienteIds = new Set<string>([
    ...nutriByPaciente.keys(),
    ...personalByPaciente.keys(),
  ]);

  const report: PacienteProfissionaisEspelhoBackfillReport = {
    vinculosNutriAtivos: nutriSnap.size,
    vinculosPersonalAtivos: personalSnap.size,
    pacientesComNutri: nutriByPaciente.size,
    pacientesComPersonal: personalByPaciente.size,
    pacientesAtualizados: 0,
    pacientesSemDoc: 0,
    erros: [],
    dryRun,
  };

  const ids = Array.from(allPacienteIds);
  const CHUNK = 400;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const refs = chunk.map((pacienteId) => db.collection('pacientes_completos').doc(pacienteId));
    const snaps = await db.getAll(...refs);
    const batch = db.batch();
    let ops = 0;

    for (let j = 0; j < snaps.length; j++) {
      const snap = snaps[j]!;
      const pacienteId = chunk[j]!;
      if (!snap.exists) {
        report.pacientesSemDoc += 1;
        continue;
      }

      const nutricionistaVinculadoIds = Array.from(nutriByPaciente.get(pacienteId) || []);
      const personalTrainerVinculadoIds = Array.from(personalByPaciente.get(pacienteId) || []);

      if (dryRun) {
        report.pacientesAtualizados += 1;
        continue;
      }

      batch.update(snap.ref, {
        nutricionistaVinculadoIds,
        personalTrainerVinculadoIds,
      });
      ops += 1;
      report.pacientesAtualizados += 1;
    }

    if (!dryRun && ops > 0) {
      try {
        await batch.commit();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        report.erros.push({ pacienteId: `chunk_${i}`, error: msg });
      }
    }
  }

  return report;
}
