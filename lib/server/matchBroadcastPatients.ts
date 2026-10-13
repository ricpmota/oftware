import type { Firestore } from 'firebase-admin/firestore';
import type { MatchBroadcastPatient } from '@/lib/match/matchAdminTypes';
import { matchBroadcastPatientView } from '@/lib/match/matchBroadcastPatient';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';

const PATIENT_FIELDS = [
  'nome',
  'status',
  'statusTratamento',
  'dadosIdentificacao.nomeCompleto',
  'dadosIdentificacao.telefone',
  'dadosIdentificacao.telefoneDdi',
  'dadosIdentificacao.telefoneE164',
  'dadosIdentificacao.endereco.cidade',
  'telefone',
  'celular',
  'whatsapp',
] as const;

/** Toda a base de pacientes. Match não entra no filtro. */
export async function listBroadcastPatients(db: Firestore): Promise<MatchBroadcastPatient[]> {
  const snap = await db.collection('pacientes_completos').select(...PATIENT_FIELDS).get();
  const patients = snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    let phone: string | null = null;
    try {
      phone = tryResolvePhoneFromPacienteDoc(data);
    } catch {
      phone = null;
    }
    return matchBroadcastPatientView(doc.id, data, phone);
  });
  patients.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  return patients;
}
