import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';
import { ensureBioRegistrosIds } from '@/utils/bioImpedanciaRegistroId';

function dataRegistroIso(value: unknown): string {
  return parseBioDataRegistro(value).toISOString();
}

function serializeRegistro(raw: Record<string, unknown>): BioImpedanciaRegistro {
  const { avisosIA: _avisos, ...rest } = raw;
  return {
    ...(rest as unknown as BioImpedanciaRegistro),
    dataRegistro: dataRegistroIso(raw.dataRegistro) as unknown as Date,
  };
}

export async function listarBioRegistrosPaciente(pacienteId: string): Promise<BioImpedanciaRegistro[]> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  const arr = snap.data()?.bioimpedanciaRegistros;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(serializeRegistro);
}

export async function salvarBioRegistrosPaciente(
  pacienteId: string,
  registros: unknown
): Promise<BioImpedanciaRegistro[]> {
  if (!Array.isArray(registros)) {
    throw new Error('Lista de bioimpedância inválida');
  }
  if (registros.length > 200) {
    throw new Error('Limite de registros de bioimpedância excedido');
  }

  const normalizados = ensureBioRegistrosIds(
    registros.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Registro de bioimpedância inválido');
      }
      const raw = item as Record<string, unknown>;
      const peso = Number(raw.peso);
      if (!Number.isFinite(peso) || peso <= 0) {
        throw new Error('Registro de bioimpedância sem peso válido');
      }
      const { avisosIA: _avisos, ...rest } = raw;
      return Object.fromEntries(
        Object.entries({
          ...rest,
          peso,
          dataRegistro: parseBioDataRegistro(raw.dataRegistro),
        }).filter(([, value]) => value !== undefined)
      ) as unknown as BioImpedanciaRegistro;
    })
  );

  await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .update({
      bioimpedanciaRegistros: normalizados,
    });

  return normalizados.map((reg) => ({
    ...reg,
    dataRegistro: dataRegistroIso(reg.dataRegistro) as unknown as Date,
  }));
}
