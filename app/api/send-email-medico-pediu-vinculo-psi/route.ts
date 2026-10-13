import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

/** Médico solicitou vínculo profissional → aviso ao psiquiatra (sem dados clínicos). */
const EMAIL_DOC_ID = 'medico_pediu_vinculo_aviso_psiquiatra';
const EMAIL_TIPO = 'medico_pediu_vinculo_aviso_psiquiatra';

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
    const { medicoId, psiquiatraId } = await request.json();
    if (!medicoId || !psiquiatraId) {
      return NextResponse.json({ error: 'medicoId e psiquiatraId são obrigatórios' }, { status: 400 });
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
    const psiquiatraNome = psiData.nome || 'Psiquiatra';

    let medicoDisplay = 'Dr(a). Médico';
    const medicoDoc = await db.collection('medicos').doc(medicoId).get();
    if (medicoDoc.exists) {
      const medico = medicoDoc.data()!;
      const medicoNome = medico.nome || medico.name || 'Médico';
      const medicoGenero = medico.genero || medico.gender;
      medicoDisplay =
        (medicoGenero === 'F' || medicoGenero === 'female' ? 'Dra. ' : 'Dr. ') + medicoNome;
    }

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    const t = emailDoc.exists
      ? emailDoc.data()!
      : {
          assunto: 'Médico solicitou vínculo',
          corpoHtml:
            '<p>Olá Dr(a). {psiquiatra},</p><p>{medico} solicitou vínculo profissional com você. Acesse o Oftware para revisar a solicitação.</p>',
        };

    let assunto = t.assunto || 'Médico solicitou vínculo';
    let html = (t.corpoHtml || '')
      .replace(/\{medico\}/g, medicoDisplay)
      .replace(/\{psiquiatra\}/g, psiquiatraNome);
    assunto = assunto
      .replace(/\{medico\}/g, medicoDisplay)
      .replace(/\{psiquiatra\}/g, psiquiatraNome);

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
    });
    if (!envioSucesso) {
      return NextResponse.json({ error: 'Erro ao enviar e-mail', details: erroEnvio }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('send-email-medico-pediu-vinculo-psi:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: (error as Error).message }, { status: 500 });
  }
}
