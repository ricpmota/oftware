import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

const LEAD_EMAIL = 'dr.ricardo.oftware@gmail.com';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp: ReturnType<typeof initializeApp>;
  if (existingApps.length > 0) {
    adminApp = existingApps[0] as ReturnType<typeof initializeApp>;
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
    let processedKey = privateKey.replace(/\\n/g, '\n');
    if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
      processedKey = processedKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n+/g, '\n');
    }
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: processedKey }),
    });
  }
  return getFirestore(adminApp);
}

export type LeadPayload = {
  nomeCompleto: string;
  cidade: string;
  estado: string;
  email: string;
  whatsapp: string;
  faturamentoAtual: string;
  objetivoPrincipal: string;
  atendeOnline: string;
  prazoTransformacao: string;
  travamento: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadPayload;
    const {
      nomeCompleto,
      cidade,
      estado,
      email,
      whatsapp,
      faturamentoAtual,
      objetivoPrincipal,
      atendeOnline,
      prazoTransformacao,
      travamento,
    } = body;

    if (!nomeCompleto?.trim() || !email?.trim() || !whatsapp?.trim()) {
      return NextResponse.json(
        { error: 'Nome, e-mail e WhatsApp são obrigatórios' },
        { status: 400 }
      );
    }

    const assunto = 'Novo lead - Mentoria Método Emagrecer';
    const corpo = `
Nome: ${nomeCompleto}
Cidade/Estado: ${cidade || ''} / ${estado || ''}
Email: ${email}
Telefone: ${whatsapp}
Faturamento atual: ${faturamentoAtual || '—'}
Objetivo: ${objetivoPrincipal || '—'}
Atende online: ${atendeOnline || '—'}
Prazo: ${prazoTransformacao || '—'}
Travamento: ${travamento || '—'}
    `.trim();

    const html = corpo.replace(/\n/g, '<br>');
    let envioSucesso = false;
    let erroEnvio: string | undefined;

    const db = getFirebaseAdmin();

    // 1. Salvar lead no Firestore primeiro (prioridade: nunca perder o lead)
    const leadRef = await db.collection('leads_mentoria').add({
      nomeCompleto: nomeCompleto.trim(),
      cidade: (cidade || '').trim(),
      estado: estado || '',
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      faturamentoAtual: faturamentoAtual || '',
      objetivoPrincipal: objetivoPrincipal || '',
      atendeOnline: atendeOnline || '',
      prazoTransformacao: prazoTransformacao || '',
      travamento: (travamento || '').trim(),
      criadoEm: new Date(),
    });

    // 2. Buscar template opcional (padrão metaadmingeral: emails/mentoria_lead)
    let assuntoFinal = assunto;
    let htmlFinal = html;
    const emailDoc = await db.collection('emails').doc('mentoria_lead').get();
    if (emailDoc.exists) {
      const t = emailDoc.data();
      if (t?.assunto) assuntoFinal = t.assunto;
      if (t?.corpoHtml) {
        htmlFinal = t.corpoHtml
          .replace(/\{nome\}/g, nomeCompleto.trim())
          .replace(/\{cidade\}/g, (cidade || '').trim())
          .replace(/\{estado\}/g, estado || '')
          .replace(/\{email\}/g, email.trim())
          .replace(/\{telefone\}/g, whatsapp.trim())
          .replace(/\{faturamento\}/g, faturamentoAtual || '—')
          .replace(/\{objetivo\}/g, objetivoPrincipal || '—')
          .replace(/\{atende_online\}/g, atendeOnline || '—')
          .replace(/\{prazo\}/g, prazoTransformacao || '—')
          .replace(/\{travamento\}/g, (travamento || '').trim());
      }
    }
    if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
      htmlFinal = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${htmlFinal}
</body>
</html>
      `.trim();
    }

    // 3. Enviar e-mail (ZeptoMail via módulo central)
    if (isZeptoMailConfigured()) {
      const sent = await sendEmail({
        to: LEAD_EMAIL,
        subject: assuntoFinal,
        html: htmlFinal,
        text: corpo,
      });
      envioSucesso = sent.success;
      if (!sent.success) {
        erroEnvio = sent.error;
        console.error('[API Lead] Erro ao enviar e-mail ZeptoMail:', sent.error);
      } else console.log('[API Lead] E-mail mentoria enviado com sucesso');
    } else {
      console.log(
        '[API Lead] ZeptoMail não configurado. Lead salvo, e-mail não enviado.'
      );
      envioSucesso = true;
    }

    // 4. Registrar em email_envios (igual aos outros envios do metaadmingeral)
    await db.collection('email_envios').add({
      leadId: leadRef.id,
      leadEmail: email.trim(),
      leadNome: nomeCompleto.trim(),
      emailTipo: 'mentoria_lead',
      assunto: assuntoFinal,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: erroEnvio || null,
      tipo: 'evento',
      destinatario: LEAD_EMAIL,
    });

    // Lead já foi salvo – retornamos sucesso. Se o e-mail falhou, o admin vê em email_envios.
    return NextResponse.json({ success: true, emailEnviado: envioSucesso });
  } catch (error) {
    console.error('Erro ao enviar lead:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
