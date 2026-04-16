import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

const EMAIL_DOC_ID = 'check_recomendacoes_nutri_recomendacoes_lidas';
const EMAIL_TIPO = 'check_recomendacoes_nutri_recomendacoes_lidas';

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
    const { pacienteId, nutricionistaId } = await request.json();
    if (!pacienteId || !nutricionistaId) return NextResponse.json({ error: 'pacienteId e nutricionistaId são obrigatórios' }, { status: 400 });

    const db = getFirebaseAdmin();
    const nutriDoc = await db.collection('nutricionistas').doc(nutricionistaId).get();
    if (!nutriDoc.exists) return NextResponse.json({ error: 'Nutricionista não encontrado' }, { status: 404 });
    const nutri = nutriDoc.data()!;
    const nutriEmail = (nutri.email || '')?.trim();
    if (!nutriEmail || !nutriEmail.includes('@')) return NextResponse.json({ error: 'E-mail do nutricionista não encontrado' }, { status: 400 });
    const nutricionistaNome = nutri.nome || 'Nutricionista';

    const pacDoc = await db.collection('pacientes_completos').doc(pacienteId).get();
    const nome = pacDoc.exists ? (pacDoc.data()?.nome || pacDoc.data()?.dadosIdentificacao?.nomeCompleto || 'Paciente') : 'Paciente';

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    if (!emailDoc.exists) return NextResponse.json({ error: 'Template não configurado' }, { status: 404 });
    const t = emailDoc.data()!;
    let assunto = t.assunto || 'Paciente leu suas recomendações';
    let html = (t.corpoHtml || '').replace(/\{nutricionista\}/g, nutricionistaNome).replace(/\{nome\}/g, nome);
    assunto = assunto.replace(/\{nutricionista\}/g, nutricionistaNome).replace(/\{nome\}/g, nome);

    let envioSucesso = false;
    let erroEnvio: string | undefined;
    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: nutriEmail,
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
    await db.collection('email_envios').add({ emailTipo: EMAIL_TIPO, destinatarioEmail: nutriEmail, assunto, enviadoEm: new Date(), status: envioSucesso ? 'enviado' : 'falhou', erro: erroEnvio || null, tipo: 'automatico', pacienteId, nutricionistaId });
    if (!envioSucesso) return NextResponse.json({ error: 'Erro ao enviar e-mail', details: erroEnvio }, { status: 500 });
    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('send-email-recomendacoes-lidas-nutri:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: (error as Error).message }, { status: 500 });
  }
}
