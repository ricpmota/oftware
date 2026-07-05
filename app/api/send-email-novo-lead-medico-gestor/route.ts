import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

const EMAIL_DOC_ID = 'novo_lead_medico_novo_lead';
const EMAIL_TIPO = 'novo_lead_medico_novo_lead';
const GESTOR_EMAIL = 'ricpmota.med@gmail.com';

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) return getFirestore(existingApps[0]);

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'oftware-9201e';
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!privateKey || !clientEmail) {
    throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
  }

  let processedKey = privateKey.replace(/\\n/g, '\n');
  if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
    processedKey = processedKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
      .replace(/\n+/g, '\n');
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: processedKey,
    }),
  });
  return getFirestore(app);
}

function wrapHtml(html: string): string {
  if (html.includes('<html') || html.includes('<!DOCTYPE')) return html;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${html}</body></html>`;
}

function imageMarkup(url: string, label: string): string {
  if (!url) return `${label}: não enviado`;
  const safeUrl = url.replace(/"/g, '&quot;');
  return `<strong>${label}:</strong> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a><br/><img src="${safeUrl}" alt="${label}" style="max-width: 380px; width: 100%; height: auto; margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 8px;" />`;
}

export async function POST(request: NextRequest) {
  try {
    const { medicoId } = await request.json();
    if (!medicoId) {
      return NextResponse.json(
        { error: 'medicoId é obrigatório' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    const medicoDoc = await db.collection('medicos').doc(medicoId).get();
    if (!medicoDoc.exists) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      );
    }

    const medico = medicoDoc.data() || {};
    const nomeMedico = String(medico.nome || medico.name || 'Médico').trim();
    const fotoCrm = String(medico.docVerificacaoCrmUrl || '').trim();
    const selfie = String(medico.docVerificacaoSelfieUrl || '').trim();
    const cnh = String(medico.docVerificacaoCnhUrl || '').trim();

    const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Template de e-mail não configurado' },
        { status: 404 }
      );
    }

    const template = emailDoc.data() || {};
    const assuntoTemplate =
      template.assunto || 'Novo Médico Solicitando Cadastro';
    const htmlTemplate = template.corpoHtml || '';

    const replacePlainVars = (texto: string) =>
      texto
        .replace(/\{nome\}/g, nomeMedico)
        .replace(/\{medico\}/g, nomeMedico)
        .replace(/\{foto_crm\}/g, fotoCrm)
        .replace(/\{selfie\}/g, selfie)
        .replace(/\{cnh\}/g, cnh);

    const assunto = replacePlainVars(assuntoTemplate);
    const html = htmlTemplate
      .replace(/\{nome\}/g, nomeMedico)
      .replace(/\{medico\}/g, nomeMedico)
      .replace(/\{foto_crm\}/g, imageMarkup(fotoCrm, 'Foto CRM'))
      .replace(/\{selfie\}/g, imageMarkup(selfie, 'Selfie'))
      .replace(/\{cnh\}/g, imageMarkup(cnh, 'CNH'));

    let envioSucesso = false;
    let erroEnvio: string | undefined;
    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: GESTOR_EMAIL,
          subject: assunto,
          html: wrapHtml(html),
          text: replacePlainVars(htmlTemplate)
            .replace(/<[^>]*>/g, '')
            .replace(/\n\s*\n/g, '\n\n'),
        });
        envioSucesso = sent.success;
        if (!sent.success) erroEnvio = sent.error;
      } else {
        erroEnvio = 'Variáveis ZEPTOMAIL_SMTP_* e MAIL_FROM não configuradas';
      }
    } catch (emailError) {
      erroEnvio = (emailError as Error).message;
    }

    await db.collection('email_envios').add({
      emailTipo: EMAIL_TIPO,
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: erroEnvio || null,
      tipo: 'automatico',
      destinatario: GESTOR_EMAIL,
      medicoId,
      medicoNome: nomeMedico,
    });

    if (!envioSucesso) {
      return NextResponse.json(
        { error: 'Erro ao enviar e-mail', details: erroEnvio },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de novo médico enviado ao gestor com sucesso',
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de novo médico para gestor:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mail', details: (error as Error).message },
      { status: 500 }
    );
  }
}
