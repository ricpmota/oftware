import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import { buildOrientacoesPacienteNotifyTexto } from '@/lib/nutri/orientacoes/orientacoesPacienteNotify';
import { notifyPacienteViaCanalChat } from '@/lib/metaadmin/pacienteCanalChatNotifyCore';
import { METODO_PACIENTE_META_MENSAGENS_URL } from '@/lib/tenant/metodoPublicOrigin';

async function resolveNutriNome(nutricionistaId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection(COL_NUTRICIONISTAS).doc(nutricionistaId).get();
  const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
  const nome = (typeof data.nome === 'string' && data.nome.trim()) || 'Nutricionista';
  const genero = data.genero === 'M' || data.genero === 'F' ? data.genero : undefined;
  const artigo = genero === 'M' ? 'O nutricionista' : 'A nutricionista';
  return `${artigo} ${nome}`;
}

export async function notifyPacienteOrientacaoNutri(params: {
  nutricionistaId: string;
  pacienteId: string;
}) {
  const nutriId = params.nutricionistaId.trim();
  const pacienteId = params.pacienteId.trim();
  if (!nutriId || !pacienteId) {
    return { status: 'skipped' as const, reason: 'Nutricionista ou paciente inválido.' };
  }

  const linked = await nutritionistHasActivePatientLink(getFirestoreAdmin(), nutriId, pacienteId);
  if (!linked) {
    return { status: 'skipped' as const, reason: 'Paciente não está vinculado a esta nutricionista.' };
  }

  return notifyPacienteViaCanalChat({
    logOwnerId: nutriId,
    pacienteId,
    logType: 'orientacoes_nutri',
    logTag: 'orientacoes-notify',
    resolveSenderNome: resolveNutriNome,
    buildMessage: ({ pacienteNome, senderNome }) =>
      buildOrientacoesPacienteNotifyTexto({
        pacienteNome,
        nutriNome: senderNome,
        mensagensUrl: METODO_PACIENTE_META_MENSAGENS_URL,
      }),
  });
}
