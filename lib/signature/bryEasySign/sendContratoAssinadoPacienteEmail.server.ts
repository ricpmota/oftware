import { FieldValue } from 'firebase-admin/firestore';
import { CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION } from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { contratoDocRef, loadContratoDocumentoForEasySignPoc } from '@/lib/signature/bryEasySign/contratoTratamentoEasySignPoc.server';

function wrapHtml(body: string): string {
  if (body.includes('<!DOCTYPE') || body.includes('<html')) return body;
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 16px;">
${body}
</body>
</html>`;
}

export async function sendContratoAssinadoPacienteEmail(args: {
  pacienteId: string;
  documentoId: string;
  pdfFinalAssinadoUrl: string;
}): Promise<{ sent: boolean; skippedReason?: string }> {
  const snap = await contratoDocRef(args.pacienteId, args.documentoId).get();
  if (!snap.exists) return { sent: false, skippedReason: 'contrato_not_found' };

  const contratoData = snap.data() as Record<string, unknown>;
  if (contratoData.pacienteSignFinalEmailSentAt) {
    return { sent: false, skippedReason: 'already_sent' };
  }

  const doc = await loadContratoDocumentoForEasySignPoc(args.pacienteId, args.documentoId);

  const db = getFirestoreAdmin();
  const pacSnap = await db.collection('pacientes_completos').doc(args.pacienteId).get();
  if (!pacSnap.exists) return { sent: false, skippedReason: 'paciente_not_found' };

  const pac = pacSnap.data() as {
    nome?: string;
    email?: string;
    dadosIdentificacao?: { nomeCompleto?: string; email?: string };
  };
  const nome =
    pac.dadosIdentificacao?.nomeCompleto?.trim() || pac.nome?.trim() || 'Paciente';
  const email = pac.dadosIdentificacao?.email?.trim() || pac.email?.trim() || '';
  if (!email || !email.includes('@')) {
    return { sent: false, skippedReason: 'paciente_sem_email' };
  }

  let medicoNome = 'seu médico';
  const medicoId = doc.medicoId?.trim();
  if (medicoId) {
    const medSnap = await db.collection('medicos').doc(medicoId).get();
    if (medSnap.exists) {
      const med = medSnap.data() as { nome?: string };
      if (med.nome?.trim()) medicoNome = med.nome.trim();
    }
  }

  const assunto = 'Seu Contrato de Tratamento foi assinado';
  const html = `
<p>Olá, <strong>${nome}</strong>,</p>
<p>O seu <strong>Contrato de Tratamento</strong> assinado por você e por ${medicoNome} está disponível.</p>
<p style="margin: 24px 0;">
  <a href="${args.pdfFinalAssinadoUrl}" style="display: inline-block; background: #0A1F44; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
    Abrir contrato assinado (PDF)
  </a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br/>
<a href="${args.pdfFinalAssinadoUrl}">${args.pdfFinalAssinadoUrl}</a></p>
<p style="font-size: 13px; color: #666;">Guarde este documento para seus registros.</p>
`.trim();

  if (!isZeptoMailConfigured()) {
    console.warn('[contrato.easysign.email] ZeptoMail não configurado; e-mail não enviado', {
      pacienteId: args.pacienteId,
      documentoId: args.documentoId,
    });
    return { sent: false, skippedReason: 'email_not_configured' };
  }

  const sent = await sendEmail({
    to: email,
    subject: assunto,
    html: wrapHtml(html),
    text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
  });

  if (!sent.success) {
    console.error('[contrato.easysign.email] falha', {
      pacienteId: args.pacienteId,
      documentoId: args.documentoId,
      error: sent.error,
    });
    return { sent: false, skippedReason: 'send_failed' };
  }

  await contratoDocRef(args.pacienteId, args.documentoId).update({
    pacienteSignFinalEmailSentAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('email_envios').add({
    leadId: args.pacienteId,
    leadEmail: email,
    leadNome: nome,
    emailTipo: 'contrato_tratamento_assinado',
    assunto,
    enviadoEm: new Date(),
    status: 'enviado',
    tentativas: 1,
    erro: null,
    tipo: 'automatico',
    metadata: {
      documentoId: args.documentoId,
      pdfFinalAssinadoUrl: args.pdfFinalAssinadoUrl,
    },
  });

  console.info('[contrato.easysign.email] enviado', {
    pacienteId: args.pacienteId,
    documentoId: args.documentoId,
    to: email,
  });

  return { sent: true };
}
