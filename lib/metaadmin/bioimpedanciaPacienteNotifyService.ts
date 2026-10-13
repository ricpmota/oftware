import { buildBioimpedanciaPacienteNotifyTexto } from '@/lib/metaadmin/bioimpedanciaPacienteNotify';
import { notifyPacienteViaCanalChatMedico } from '@/lib/metaadmin/pacienteCanalChatNotifyCore';
import { METODO_PACIENTE_META_URL } from '@/lib/tenant/metodoPublicOrigin';

export async function notifyPacienteBioimpedancia(params: {
  medicoId: string;
  pacienteId: string;
}) {
  return notifyPacienteViaCanalChatMedico({
    medicoId: params.medicoId,
    pacienteId: params.pacienteId,
    logType: 'bioimpedancia',
    logTag: 'bioimpedancia-notify',
    buildMessage: ({ pacienteNome, medicoNome }) =>
      buildBioimpedanciaPacienteNotifyTexto({
        pacienteNome,
        medicoNome,
        metaUrl: METODO_PACIENTE_META_URL,
      }),
  });
}
