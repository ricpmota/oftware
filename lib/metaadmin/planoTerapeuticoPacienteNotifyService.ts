import { notifyPacienteViaCanalChatMedico } from '@/lib/metaadmin/pacienteCanalChatNotifyCore';
import { buildPlanoTerapeuticoPacienteNotifyTexto } from '@/lib/metaadmin/planoTerapeuticoPacienteNotify';
import { METODO_PACIENTE_META_APLICACOES_URL } from '@/lib/tenant/metodoPublicOrigin';

export async function notifyPacientePlanoTerapeutico(params: {
  medicoId: string;
  pacienteId: string;
}) {
  return notifyPacienteViaCanalChatMedico({
    medicoId: params.medicoId,
    pacienteId: params.pacienteId,
    logType: 'plano_terapeutico',
    logTag: 'plano-terapeutico-notify',
    buildMessage: ({ pacienteNome, medicoNome }) =>
      buildPlanoTerapeuticoPacienteNotifyTexto({
        pacienteNome,
        medicoNome,
        aplicacoesUrl: METODO_PACIENTE_META_APLICACOES_URL,
      }),
  });
}
