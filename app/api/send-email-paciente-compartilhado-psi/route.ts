import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

/**
 * Médico compartilhou paciente → aviso administrativo ao psiquiatra.
 * Sem diagnóstico, medicação, escalas ou outros dados clínicos.
 */
const EMAIL_DOC_ID = 'paciente_compartilhado_aviso_psiquiatra';
const EMAIL_TIPO = 'paciente_compartilhado_aviso_psiquiatra';

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) return getFirestore(existingApps[0]);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
  let key = privateKey.replace(/\\n/g, '\n');
  if (!key.includes('\n') && key.includes('-----BEGIN')) {
    key = key
      .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
      .replace(/\n+/g, '\n');
  }
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  return getFirestore(app);
}

function wrapHtml(html: string) {
  if (html.includes('<html') || html.includes('<!DOCTYPE')) return html;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${html}</body></html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { medicoId, psiquiatraId, pacienteId } = await request.json();
    if (!medicoId || !psiquiatraId || !pacienteId) {
      return NextResponse.json(
        { error: 'medicoId, psiquiatraId e pacienteId são obrigatórios' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    const psiDoc = await db.collection('psiquiatras').doc(psiquiatraId).get();
    let psiData = psiDoc.exists ? psiDoc.data() : null;
    if (!psiData) {
      const byUserId = await db.collection('psiquiatras').where('userId', '==', psiquiatraId).limit(1).get();
      if (!byUserId.empty) psiData = byUserId.docs[0].data();
    }
    if (!psiData) return NextResponse.json({ error: 'Psiquiatra não encontrado' }, { status: 404 });

    const psiEmail = (psiData.email || '')?.trim();
    if (!psiEmail || !psiEmail.includes('@')) {
      return NextResponse.json({ error: 'E-mail do psiquiatra não encontrado' }, { status: 400 });
    }

    let medicoDisplay = 'Dr(a). Médico';
    const medicoDoc = await db.collection('medicos').doc(medicoId).get();
    if (medicoDoc.exists) {
      const medico = medicoDoc.data()!;
      const medicoNome = medico.nome || medico.name || 'Médico';
      const medicoGenero = medico.genero || medico.gender;
      medicoDisplay =
        (medicoGenero === 'F' || medicoGenero === 'female' ? 'Dra. ' : 'Dr. ') + medicoNome;
    }

    let pacienteNome = 'Paciente';
    const pacDoc = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (pacDoc.exists) {
      pacienteNome =
        pacDoc.data()?.nome || pacDoc.data()?.dadosIdentificacao?.nomeCompleto || pacienteNome;
    }

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    const t = emailDoc.exists
      ? emailDoc.data()!
      : {
          assunto: 'Novo paciente compartilhado',
          corpoHtml:
            '<p>Olá,</p><p>{medico} compartilhou o acompanhamento de {paciente} com você.</p><p>Acesse o Oftware para revisar a solicitação.</p>',
        };

    let assunto = t.assunto || 'Novo paciente compartilhado';
    let html = (t.corpoHtml || '')
      .replace(/\{medico\}/g, medicoDisplay)
      .replace(/\{paciente\}/g, pacienteNome)
      .replace(/\{nome\}/g, pacienteNome);
    assunto = assunto
      .replace(/\{medico\}/g, medicoDisplay)
      .replace(/\{paciente\}/g, pacienteNome)
      .replace(/\{nome\}/g, pacienteNome);

    let envioSucesso = false;
    let erroEnvio: string | undefined;
    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: psiEmail,
          subject: assunto,
          html: wrapHtml(html),
          text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });
        envioSucesso = sent.success;
        if (!sent.success) erroEnvio = sent.error;
      } else envioSucesso = true;
    } catch (e) {
      erroEnvio = (e as Error).message;
    }
    await db.collection('email_envios').add({
      emailTipo: EMAIL_TIPO,
      destinatarioEmail: psiEmail,
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      erro: erroEnvio || null,
      tipo: 'automatico',
      medicoId,
      psiquiatraId,
      pacienteId,
    });
    if (!envioSucesso) {
      return NextResponse.json({ error: 'Erro ao enviar e-mail', details: erroEnvio }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('send-email-paciente-compartilhado-psi:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: (error as Error).message }, { status: 500 });
  }
}
