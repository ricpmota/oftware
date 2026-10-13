import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { notifyPacienteViaCanalChat } from '@/lib/metaadmin/pacienteCanalChatNotifyCore';
import { personalTrainerHasActivePatientLink } from '@/lib/personal/personalTrainerHasActivePatientLink';
import { buildTreinoPacienteNotifyTexto } from '@/lib/personal/treinoPacienteNotify';
import { METODO_PACIENTE_META_PERSONAL_URL } from '@/lib/tenant/metodoPublicOrigin';

async function resolvePersonalNome(personalTrainerId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection(COL_PERSONAL_TRAINERS).doc(personalTrainerId).get();
  const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
  const nome = (typeof data.nome === 'string' && data.nome.trim()) || 'Personal trainer';
  const genero = data.genero === 'M' || data.genero === 'F' ? data.genero : undefined;
  const artigo = genero === 'F' ? 'A personal' : 'O personal';
  return `${artigo} ${nome}`;
}

export async function notifyPacienteTreinoPersonal(params: {
  personalTrainerId: string;
  pacienteId: string;
}) {
  const trainerId = params.personalTrainerId.trim();
  const pacienteId = params.pacienteId.trim();
  if (!trainerId || !pacienteId) {
    return { status: 'skipped' as const, reason: 'Personal ou paciente inválido.' };
  }

  const linked = await personalTrainerHasActivePatientLink(
    getFirestoreAdmin(),
    trainerId,
    pacienteId
  );
  if (!linked) {
    return { status: 'skipped' as const, reason: 'Paciente não está vinculado a este personal trainer.' };
  }

  return notifyPacienteViaCanalChat({
    logOwnerId: trainerId,
    pacienteId,
    logType: 'treino_personal',
    logTag: 'treino-notify',
    resolveSenderNome: resolvePersonalNome,
    buildMessage: ({ pacienteNome, senderNome }) =>
      buildTreinoPacienteNotifyTexto({
        pacienteNome,
        personalNome: senderNome,
        treinoUrl: METODO_PACIENTE_META_PERSONAL_URL,
      }),
  });
}
