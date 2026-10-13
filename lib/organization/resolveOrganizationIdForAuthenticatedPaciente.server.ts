import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { resolvePatientOrganizationContext } from '@/lib/organization/patientOrganizationContext';
import type { OrganizationId } from '@/lib/organization/organizationTypes';

type PacienteOrgDoc = {
  medicoResponsavelId?: string | null;
  organizationId?: string | null;
  email?: string | null;
  dadosIdentificacao?: { email?: string | null };
};

type MedicoOrgDoc = {
  organizationId?: string | null;
  metodoImagensAtivo?: boolean | null;
};

function normalizeEmail(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

async function findPacienteDocForAuth(uid: string, email: string | undefined) {
  const db = getFirestoreAdmin();
  const col = db.collection('pacientes_completos');

  const byUid = await col.where('userId', '==', uid).limit(1).get();
  if (!byUid.empty) return byUid.docs[0]!;

  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const byEmail = await col.where('email', '==', normalized).limit(1).get();
  if (!byEmail.empty) return byEmail.docs[0]!;

  const byDadosEmail = await col.where('dadosIdentificacao.email', '==', normalized).limit(1).get();
  if (!byDadosEmail.empty) return byDadosEmail.docs[0]!;

  return null;
}

/**
 * Resolve organizationId da sessão do paciente autenticado (mesmo critério da 02A).
 * Branding não é autorização: só identifica a org do vínculo já carregado.
 */
export async function resolveOrganizationIdForAuthenticatedPaciente(params: {
  uid: string;
  email?: string;
}): Promise<OrganizationId | null> {
  const patientDoc = await findPacienteDocForAuth(params.uid, params.email);
  if (!patientDoc) return null;

  const patientData = (patientDoc.data() || {}) as PacienteOrgDoc;
  const medicoId = (patientData.medicoResponsavelId || '').trim();

  let doctor: MedicoOrgDoc | null = null;
  if (medicoId) {
    const medicoSnap = await getFirestoreAdmin().collection('medicos').doc(medicoId).get();
    if (medicoSnap.exists) {
      doctor = (medicoSnap.data() || {}) as MedicoOrgDoc;
    }
  }

  const ctx = resolvePatientOrganizationContext({
    patient: {
      medicoResponsavelId: patientData.medicoResponsavelId,
      organizationId: patientData.organizationId,
    },
    doctor,
    doctorLookupDone: true,
  });

  return ctx.organizationId;
}
