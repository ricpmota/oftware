import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

const EMAIL_DOC_ID = 'novo_lead_nutri_novo_lead';
const EMAIL_TIPO = 'novo_lead_nutri_novo_lead';

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
    const { nutricionistaId, leadId } = await request.json();
    if (!nutricionistaId || !leadId) return NextResponse.json({ error: 'nutricionistaId e leadId são obrigatórios' }, { status: 400 });

    const db = getFirebaseAdmin();
    const nutriDoc = await db.collection('nutricionistas').doc(nutricionistaId).get();
    if (!nutriDoc.exists) return NextResponse.json({ error: 'Nutricionista não encontrado' }, { status: 404 });
    const nutri = nutriDoc.data()!;
    const nutriEmail = (nutri.email || '')?.trim();
    if (!nutriEmail || !nutriEmail.includes('@')) return NextResponse.json({ error: 'E-mail do nutricionista não encontrado' }, { status: 400 });
    const nutricionistaNome = nutri.nome || 'Nutricionista';

    const leadDoc = await db.collection('leads').doc(leadId).get();
    const nome = leadDoc.exists ? (leadDoc.data()?.nome || leadDoc.data()?.email?.split('@')[0] || 'Lead') : 'Lead';

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    if (!emailDoc.exists) return NextResponse.json({ error: 'Template não configurado' }, { status: 404 });
    const t = emailDoc.data()!;
    const assuntoTemplate = t.assunto || 'Novo lead/paciente';
    const fotoRegistro = nutri.docVerificacaoRegistroUrl || '';
    const fotoSelfie = nutri.docVerificacaoSelfieUrl || '';
    const fotoCnh = nutri.docVerificacaoCnhUrl || '';
    const replaceVars = (texto: string) =>
      texto
        .replace(/\{nutricionista\}/g, nutricionistaNome)
        .replace(/\{nome\}/g, nome)
        .replace(/\{foto_registro\}/g, fotoRegistro)
        .replace(/\{selfie\}/g, fotoSelfie)
        .replace(/\{cnh\}/g, fotoCnh);
    let assunto = replaceVars(assuntoTemplate);
    let html = replaceVars(t.corpoHtml || '');

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
    await db.collection('email_envios').add({ emailTipo: EMAIL_TIPO, destinatarioEmail: nutriEmail, assunto, enviadoEm: new Date(), status: envioSucesso ? 'enviado' : 'falhou', erro: erroEnvio || null, tipo: 'automatico', nutricionistaId, leadId });
    if (!envioSucesso) return NextResponse.json({ error: 'Erro ao enviar e-mail', details: erroEnvio }, { status: 500 });
    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('send-email-novo-lead-nutri:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: (error as Error).message }, { status: 500 });
  }
}
