import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

const COL_SOLICITACOES_NUTRICIONISTA = 'solicitacoes_nutricionista';
const EMAIL_DOC_ID = 'solicitado_nutri_boas_vindas';
const EMAIL_TIPO = 'solicitado_nutri_boas_vindas';

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getFirestore(existingApps[0]);
  }
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
    const { solicitacaoId } = await request.json();
    if (!solicitacaoId) return NextResponse.json({ error: 'solicitacaoId é obrigatório' }, { status: 400 });

    const db = getFirebaseAdmin();
    const solDoc = await db.collection(COL_SOLICITACOES_NUTRICIONISTA).doc(solicitacaoId).get();
    if (!solDoc.exists) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    const sol = solDoc.data()!;
    if (sol.status !== 'aceita') return NextResponse.json({ error: 'Solicitação não está aceita' }, { status: 400 });

    const envios = db.collection('email_envios');
    const jaEnviado = await envios.where('emailTipo', '==', EMAIL_TIPO).where('solicitacaoId', '==', solicitacaoId).where('status', '==', 'enviado').get();
    if (!jaEnviado.empty) return NextResponse.json({ success: true, message: 'E-mail já enviado', jaEnviado: true });

    let pacienteEmail = (sol.pacienteEmail as string)?.trim();
    if (!pacienteEmail || !pacienteEmail.includes('@')) {
      const pacDoc = await db.collection('pacientes_completos').doc(sol.pacienteId).get();
      const pac = pacDoc.data();
      pacienteEmail = (pac?.email || pac?.dadosIdentificacao?.email || '')?.trim();
    }
    if (!pacienteEmail || !pacienteEmail.includes('@')) return NextResponse.json({ error: 'E-mail do paciente não encontrado' }, { status: 400 });

    let nutriNome = sol.nutricionistaNome || 'Nutricionista';
    const nutriDocById = await db.collection('nutricionistas').doc(sol.nutricionistaId).get();
    if (nutriDocById.exists) {
      nutriNome = nutriDocById.data()?.nome || nutriNome;
    } else {
      const nutriByUserId = await db.collection('nutricionistas').where('userId', '==', sol.nutricionistaId).limit(1).get();
      if (!nutriByUserId.empty) nutriNome = nutriByUserId.docs[0].data()?.nome || nutriNome;
    }

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    if (!emailDoc.exists) return NextResponse.json({ error: 'Template não configurado' }, { status: 404 });
    const t = emailDoc.data()!;
    let assunto = t.assunto || 'Bem-vindo ao acompanhamento nutricional!';
    let html = t.corpoHtml || '';
    const dataInicio = sol.aceitoEm?.toDate?.() || new Date();
    const semanas = '18';
    const nome = sol.pacienteNome || 'Paciente';
    html = html.replace(/\{nome\}/g, nome).replace(/\{nutricionista\}/g, nutriNome).replace(/\{inicio\}/g, dataInicio.toLocaleDateString('pt-BR')).replace(/\{semanas\}/g, semanas);
    assunto = assunto.replace(/\{nome\}/g, nome).replace(/\{nutricionista\}/g, nutriNome).replace(/\{inicio\}/g, dataInicio.toLocaleDateString('pt-BR')).replace(/\{semanas\}/g, semanas);

    let envioSucesso = false;
    let erroEnvio: string | undefined;
    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: pacienteEmail,
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
    await envios.add({ solicitacaoId, emailTipo: EMAIL_TIPO, destinatarioEmail: pacienteEmail, assunto, enviadoEm: new Date(), status: envioSucesso ? 'enviado' : 'falhou', erro: erroEnvio || null, tipo: 'automatico' });
    if (!envioSucesso) return NextResponse.json({ error: 'Erro ao enviar e-mail', details: erroEnvio }, { status: 500 });
    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('send-email-solicitado-nutri:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: (error as Error).message }, { status: 500 });
  }
}
