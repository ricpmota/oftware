#!/usr/bin/env node
/**
 * Tira da fila de WhatsApp automático os pacientes que não estão mais no
 * quadro do médico (deletados ou desvinculados).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/prune-whatsapp-queue-unlinked.ts ricpmota.med@gmail.com
 */
import { pruneWhatsappQueueForDoctorUnlinkedPatients } from '@/services/whatsappRemindersService';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

async function resolveMedicoIdByEmail(email: string): Promise<string> {
  const snap = await getFirestoreAdmin()
    .collection('medicos')
    .where('email', '==', email)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;

  const lower = email.toLowerCase();
  const all = await getFirestoreAdmin().collection('medicos').get();
  const match = all.docs.find((doc) => String(doc.data()?.email || '').trim().toLowerCase() === lower);
  if (!match) {
    throw new Error(`Médico não encontrado para ${email}`);
  }
  return match.id;
}

async function main() {
  const email = (process.argv[2] || 'ricpmota.med@gmail.com').trim().toLowerCase();
  const medicoId = await resolveMedicoIdByEmail(email);
  const result = await pruneWhatsappQueueForDoctorUnlinkedPatients(medicoId);
  console.log(
    JSON.stringify(
      {
        email,
        medicoId,
        skipped: result.skipped,
        deleted: result.deleted,
        patientIds: result.patientIds,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
