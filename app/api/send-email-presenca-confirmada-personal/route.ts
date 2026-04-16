import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

const EMAIL_DOC_ID = 'check_presenca_personal_presenca_confirmada';
const EMAIL_TIPO = 'check_presenca_personal_presenca_confirmada';

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) return getFirestore(existingApps[0]);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
  let key = privateKey.replace(/\\n/g, '\n');
  if (!key.includes('\n') && key.includes('-----BEGIN')) {
    key = key.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n').replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----').replace(/\n+/g, '\n');
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
    const { alunoId, personalId } = await request.json();
    if (!alunoId || !personalId) return NextResponse.json({ error: 'alunoId e personalId são obrigatórios' }, { status: 400 });

    const db = getFirebaseAdmin();
    const personalDoc = await db.collection('personal_trainers').doc(personalId).get();
    if (!personalDoc.exists) return NextResponse.json({ error: 'Personal não encontrado' }, { status: 404 });
    const personal = personalDoc.data()!;
    const personalEmail = (personal.email || '')?.trim();
    if (!personalEmail || !personalEmail.includes('@')) return NextResponse.json({ error: 'E-mail do personal não encontrado' }, { status: 400 });
    const personalNome = personal.nome || 'Personal';

    const pacDoc = await db.collection('pacientes_completos').doc(alunoId).get();
    const nome = pacDoc.exists ? (pacDoc.data()?.nome || pacDoc.data()?.dadosIdentificacao?.nomeCompleto || 'Aluno') : 'Aluno';

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    if (!emailDoc.exists) return NextResponse.json({ error: 'Template não configurado' }, { status: 404 });
    const t = emailDoc.data()!;
    let assunto = t.assunto || 'Aluno confirmou presença';
    let html = (t.corpoHtml || '').replace(/\{personal\}/g, personalNome).replace(/\{nome\}/g, nome);
    assunto = assunto.replace(/\{personal\}/g, personalNome).replace(/\{nome\}/g, nome);

    let envioSucesso = false;
    let erroEnvio: string | undefined;
    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: personalEmail,
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
    await db.collection('email_envios').add({ emailTipo: EMAIL_TIPO, destinatarioEmail: personalEmail, assunto, enviadoEm: new Date(), status: envioSucesso ? 'enviado' : 'falhou', erro: erroEnvio || null, tipo: 'automatico', alunoId, personalId });
    if (!envioSucesso) return NextResponse.json({ error: 'Erro ao enviar e-mail', details: erroEnvio }, { status: 500 });
    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('send-email-presenca-confirmada-personal:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: (error as Error).message }, { status: 500 });
  }
}
