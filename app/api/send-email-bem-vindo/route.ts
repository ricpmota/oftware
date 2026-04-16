import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

// Função para obter Firebase Admin
function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;
  
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oftware-9201e";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    
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
    
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: processedKey,
      }),
    });
  }
  
  return getFirestore(adminApp);
}

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, tipo = 'geral' } = await request.json();

    console.log('📧 [send-email-bem-vindo] Recebida requisição para enviar e-mail de boas-vindas', {
      userId,
      userEmail,
      userName,
      tipo,
      timestamp: new Date().toISOString()
    });

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'userId e userEmail são obrigatórios' },
        { status: 400 }
      );
    }

    if (tipo !== 'geral' && tipo !== 'medico') {
      return NextResponse.json(
        { error: 'tipo deve ser "geral" ou "medico"' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    
    // 1. Buscar template do e-mail de bem-vindo (geral ou médico)
    const emailDocId = tipo === 'medico' ? 'bem_vindo_bem_vindo_medico' : 'bem_vindo_bem_vindo_geral';
    const emailDoc = await db.collection('emails').doc(emailDocId).get();
    if (!emailDoc.exists) {
      console.log(`⚠️ [send-email-bem-vindo] Template ${emailDocId} não encontrado, usando template padrão`);
    }

    const emailTemplate = emailDoc.exists ? emailDoc.data() : null;
    const assunto = emailTemplate?.assunto || (tipo === 'medico' 
      ? 'Bem-vindo ao Oftware, Dr(a). {nome}!' 
      : 'Bem-vindo ao Oftware!');
    const htmlTemplate = emailTemplate?.corpoHtml || (tipo === 'medico'
      ? '<p>Olá Dr(a). {nome},</p><p>Bem-vindo ao Oftware! Seu perfil médico foi criado com sucesso.</p><p>Estamos felizes em tê-lo em nossa plataforma!</p>'
      : '<p>Olá {nome},</p><p>Bem-vindo ao Oftware! Estamos muito felizes em tê-lo conosco.</p><p>Seu cadastro foi realizado com sucesso!</p>');

    // 2. Substituir variáveis
    const nome = userName || userEmail.split('@')[0] || 'Cliente';
    let html = htmlTemplate.replace(/\{nome\}/g, nome);

    // 3. Garantir estrutura HTML completa
    let htmlFinal = html;
    if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
      htmlFinal = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${html}
</body>
</html>
      `.trim();
    }

    let envioSucesso = false;
    let erroEnvio: string | undefined;

    try {
      if (isZeptoMailConfigured()) {
        console.log(
          `📧 [send-email-bem-vindo] ZeptoMail → ${userEmail} | ${assunto}`
        );
        const sent = await sendEmail({
          to: userEmail,
          subject: assunto,
          html: htmlFinal,
          text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });
        envioSucesso = sent.success;
        if (!sent.success) erroEnvio = sent.error;
        else
          console.log(
            '✅ [send-email-bem-vindo] E-mail enviado:',
            sent.messageId
          );
      } else {
        console.log(
          '⚠️ [send-email-bem-vindo] SIMULAÇÃO E-MAIL (ZeptoMail não configurado):'
        );
        console.log(`Para: ${userEmail}`);
        console.log(`Assunto: ${assunto}`);
        envioSucesso = true;
      }
    } catch (emailError: unknown) {
      const e = emailError as { message?: string };
      erroEnvio = e?.message || 'Erro desconhecido ao enviar e-mail';
      console.error('❌ [send-email-bem-vindo] Erro ao enviar e-mail:', emailError);
      envioSucesso = false;
    }

    // 5. Registrar envio
    const enviosCollection = db.collection('email_envios');
    const emailTipo = tipo === 'medico' ? 'bem_vindo_bem_vindo_medico' : 'bem_vindo_bem_vindo_geral';
    await enviosCollection.add({
      leadId: userId,
      leadEmail: userEmail,
      leadNome: nome,
      emailTipo: emailTipo,
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: erroEnvio || null,
      tipo: 'automatico',
    });

    if (!envioSucesso) {
      return NextResponse.json(
        {
          error: 'Erro ao enviar e-mail de boas-vindas',
          details: erroEnvio,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de boas-vindas enviado com sucesso',
    });
  } catch (error) {
    console.error('❌ [send-email-bem-vindo] Erro ao processar requisição:', error);
    return NextResponse.json(
      {
        error: 'Erro ao enviar e-mail de boas-vindas',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

