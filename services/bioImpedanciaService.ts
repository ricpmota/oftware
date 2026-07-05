import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';
import { ensureBioRegistrosIds } from '@/utils/bioImpedanciaRegistroId';

const COLLECTION = 'pacientes_completos';

/** Salvar ou atualizar registros de bio impedância do paciente */
export async function salvarBioImpedanciaRegistros(
  pacienteId: string,
  registros: BioImpedanciaRegistro[]
): Promise<void> {
  const comIds = ensureBioRegistrosIds(registros);
  const ref = doc(db, COLLECTION, pacienteId);
  await updateDoc(ref, {
    bioimpedanciaRegistros: comIds.map((r) => ({
      ...r,
      /** Firestore chama toISOString em Date — nunca enviar Invalid Date */
      dataRegistro: parseBioDataRegistro(r.dataRegistro),
    })),
  });
}

/** Buscar registros de bio impedância do paciente */
export async function buscarBioImpedanciaRegistros(
  pacienteId: string
): Promise<BioImpedanciaRegistro[]> {
  const snap = await getDoc(doc(db, COLLECTION, pacienteId));
  const data = snap.data();
  const arr = data?.bioimpedanciaRegistros || [];
  const parsed = arr.map((r: Record<string, unknown>) => ({
    ...r,
    dataRegistro: parseBioDataRegistro(
      (r.dataRegistro as { toDate?: () => Date })?.toDate
        ? (r.dataRegistro as { toDate: () => Date }).toDate()
        : (r.dataRegistro as string | number | Date)
    ),
  })) as BioImpedanciaRegistro[];
  return ensureBioRegistrosIds(parsed);
}
