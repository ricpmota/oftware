import { auth } from '@/lib/firebase';



export type ContratoPacienteSyncSignStatusResult =

  | {

      ok: true;

      pending: true;

      statusAssinatura: 'aguardando_paciente';

      resolvedPacienteId?: string;

      resolvedDocumentoId?: string;

    }

  | {

      ok: true;

      pending: false;

      statusAssinatura: 'aguardando_medico' | 'assinado_completo';

      pdfFinalAssinadoUrl: string;

      pacienteAssinadoEm: string;

      newlySynced?: boolean;

      emailSent?: boolean;

      resolvedPacienteId?: string;

      resolvedDocumentoId?: string;

    };



export async function requestContratoPacienteSyncSignStatus(args: {

  pacienteId: string;

  documentoId: string;

}): Promise<ContratoPacienteSyncSignStatusResult> {

  const user = auth.currentUser;

  if (!user) throw new Error('Faça login para continuar.');

  const token = await user.getIdToken();

  const res = await fetch('/api/meta/contrato-tratamento/sync-sign-status', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${token}`,

    },

    body: JSON.stringify(args),

  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || data.ok === false) {

    throw new Error(

      (typeof data.error === 'string' && data.error) || 'Não foi possível verificar sua assinatura.'

    );

  }



  const resolvedPacienteId = String(data.resolvedPacienteId || '').trim() || undefined;

  const resolvedDocumentoId = String(data.resolvedDocumentoId || '').trim() || undefined;



  if (data.pending === true || data.statusAssinatura === 'aguardando_paciente') {

    return {

      ok: true,

      pending: true,

      statusAssinatura: 'aguardando_paciente',

      resolvedPacienteId,

      resolvedDocumentoId,

    };

  }



  const pdfFinalAssinadoUrl = String(data.pdfFinalAssinadoUrl || '').trim();

  if (!pdfFinalAssinadoUrl) {

    throw new Error('Contrato assinado sem URL do PDF final.');

  }



  const statusAssinatura =

    data.statusAssinatura === 'assinado_completo' ? 'assinado_completo' : 'aguardando_medico';



  return {

    ok: true,

    pending: false,

    statusAssinatura,

    pdfFinalAssinadoUrl,

    pacienteAssinadoEm: String(data.pacienteAssinadoEm || new Date().toISOString()),

    newlySynced: data.newlySynced === true,

    emailSent: data.emailSent === true,

    resolvedPacienteId,

    resolvedDocumentoId,

  };

}

