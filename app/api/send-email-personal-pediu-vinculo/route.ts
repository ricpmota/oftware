import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

const EMAIL_DOC_ID = 'personal_pediu_vinculo_aviso_medico';
const EMAIL_TIPO = 'personal_pediu_vinculo_aviso_medico';

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
    const { medicoId, personalId, pacienteId } = await request.json();
    if (!medicoId || !personalId) return NextResponse.json({ error: 'medicoId e personalId são obrigatórios' }, { status: 400 });

    const db = getFirebaseAdmin();
    const medicoDoc = await db.collection('medicos').doc(medicoId).get();
    if (!medicoDoc.exists) return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
    const medico = medicoDoc.data()!;
    const medicoEmail = (medico.email || '')?.trim();
    if (!medicoEmail || !medicoEmail.includes('@')) return NextResponse.json({ error: 'E-mail do médico não encontrado' }, { status: 400 });
    const medicoNome = medico.nome || medico.name || 'Médico';
    const medicoGenero = medico.genero || medico.gender;
    const medicoDisplay = (medicoGenero === 'F' || medicoGenero === 'female' ? 'Dra. ' : 'Dr. ') + medicoNome;

    let personalNome = 'Personal';
    const personalDoc = await db.collection('personal_trainers').doc(personalId).get();
    if (personalDoc.exists) personalNome = personalDoc.data()?.nome || personalNome;
    else {
      const byUserId = await db.collection('personal_trainers').where('userId', '==', personalId).limit(1).get();
      if (!byUserId.empty) personalNome = byUserId.docs[0].data()?.nome || personalNome;
    }

    let nome = 'Paciente';
    if (pacienteId) {
      const pacDoc = await db.collection('pacientes_completos').doc(pacienteId).get();
      if (pacDoc.exists) nome = pacDoc.data()?.nome || pacDoc.data()?.dadosIdentificacao?.nomeCompleto || nome;
    }

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    if (!emailDoc.exists) return NextResponse.json({ error: 'Template não configurado' }, { status: 404 });
    const t = emailDoc.data()!;
    let assunto = t.assunto || 'Personal solicitou vínculo';
    let html = (t.corpoHtml || '').replace(/\{medico\}/g, medicoDisplay).replace(/\{personal\}/g, personalNome).replace(/\{nome\}/g, nome);
    assunto = assunto.replace(/\{medico\}/g, medicoDisplay).replace(/\{personal\}/g, personalNome).replace(/\{nome\}/g, nome);

    let envioSucesso = false;
    let erroEnvio: string | undefined;
    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: medicoEmail,
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
    await db.collection('email_envios').add({ emailTipo: EMAIL_TIPO, destinatarioEmail: medicoEmail, assunto, enviadoEm: new Date(), status: envioSucesso ? 'enviado' : 'falhou', erro: erroEnvio || null, tipo: 'automatico', medicoId, personalId, pacienteId });
    if (!envioSucesso) return NextResponse.json({ error: 'Erro ao enviar e-mail', details: erroEnvio }, { status: 500 });
    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('send-email-personal-pediu-vinculo:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: (error as Error).message }, { status: 500 });
  }
}
