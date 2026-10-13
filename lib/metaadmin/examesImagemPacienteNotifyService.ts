import { buildExamesImagemPacienteNotifyTexto } from '@/lib/metaadmin/examesImagemPacienteNotify';
import { notifyPacienteViaCanalChatMedico } from '@/lib/metaadmin/pacienteCanalChatNotifyCore';
import { METODO_PACIENTE_META_EXAMES_IMAGENS_URL } from '@/lib/tenant/metodoPublicOrigin';

export async function notifyPacienteExamesImagem(params: {
  medicoId: string;
  pacienteId: string;
}) {
  return notifyPacienteViaCanalChatMedico({
    medicoId: params.medicoId,
    pacienteId: params.pacienteId,
    logType: 'exames_imagem',
    logTag: 'exames-imagem-notify',
    buildMessage: ({ pacienteNome, medicoNome }) =>
      buildExamesImagemPacienteNotifyTexto({
        pacienteNome,
        medicoNome,
        examesImagensUrl: METODO_PACIENTE_META_EXAMES_IMAGENS_URL,
      }),
  });
}
