import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

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
    const { solicitacaoId } = await request.json();

    if (!solicitacaoId) {
      return NextResponse.json(
        { error: 'solicitacaoId é obrigatório' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    
    // 1. Buscar dados da solicitação
    const solicitacaoDoc = await db.collection('solicitacoes_medico').doc(solicitacaoId).get();
    if (!solicitacaoDoc.exists) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      );
    }

    const solicitacao = solicitacaoDoc.data();

    // 2. Buscar dados do médico
    const medicoDoc = await db.collection('medicos').doc(solicitacao.medicoId).get();
    if (!medicoDoc.exists) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      );
    }

    const medico = medicoDoc.data();
    const medicoEmail = medico.email;
    const medicoNomeBase = medico?.nome || medico?.name || 'Médico';
    const medicoGenero = medico?.genero || medico?.gender;
    const medicoNome = medicoGenero === 'F' || medicoGenero === 'female' 
      ? `Dra. ${medicoNomeBase}` 
      : `Dr. ${medicoNomeBase}`;

    console.log('🔍 Debug - Dados do médico:', {
      nome: medicoNomeBase,
      genero: medicoGenero,
      nomeFormatado: medicoNome,
      medicoData: medico
    });

    // 3. Buscar template do e-mail
    const emailDoc = await db.collection('emails').doc('novo_lead_medico_novo_lead').get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Template de e-mail não configurado' },
        { status: 404 }
      );
    }

    const emailTemplate = emailDoc.data();
    const assunto = emailTemplate?.assunto || 'Novo lead disponível';
    let html = emailTemplate?.corpoHtml || '';

    console.log('🔍 Debug - HTML antes da substituição:', html);

    // 4. Substituir variáveis
    html = html.replace(/\{nome\}/g, solicitacao.pacienteNome || 'Paciente');
    html = html.replace(/\{medico\}/g, medicoNome);

    console.log('🔍 Debug - HTML depois da substituição:', html);

    // 5. Garantir estrutura HTML completa
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

    // 6. Enviar e-mail
    let envioSucesso = false;
    let erroEnvio: string | undefined;

    console.log('📧 Iniciando envio de e-mail de novo lead médico...', {
      destinatario: medicoEmail,
      medicoNome: medicoNome,
      assunto,
      zohoConfigurado: !!(process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD)
    });

    try {
      if (process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD) {
        console.log('📧 Configurando transporter Zoho...');
        const transporter = nodemailer.createTransport({
          host: 'smtp.zoho.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.ZOHO_EMAIL,
            pass: process.env.ZOHO_PASSWORD,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000,
        });

        console.log('📧 Verificando conexão SMTP...');
        await transporter.verify();
        console.log('✅ Conexão SMTP verificada com sucesso');

        console.log('📧 Enviando e-mail...');
        const info = await transporter.sendMail({
          from: `"Oftware" <${process.env.ZOHO_EMAIL}>`,
          to: medicoEmail,
          subject: assunto,
          html: htmlFinal,
          text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });

        console.log('✅ E-mail de novo lead médico enviado com sucesso:', {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected
        });
        envioSucesso = true;
      } else {
        console.warn('⚠️ ZOHO_EMAIL ou ZOHO_PASSWORD não configurados. E-mail NÃO será enviado.');
        erroEnvio = 'Variáveis de ambiente ZOHO_EMAIL e ZOHO_PASSWORD não configuradas';
        envioSucesso = false;
      }
    } catch (emailError) {
      erroEnvio = (emailError as Error).message;
      console.error('❌ Erro ao enviar e-mail:', {
        error: emailError,
        message: (emailError as Error).message,
        stack: (emailError as Error).stack
      });
    }

    // 7. Registrar envio
    const enviosCollection = db.collection('email_envios');
    await enviosCollection.add({
      leadId: solicitacao.pacienteId || '',
      leadEmail: solicitacao.pacienteEmail,
      leadNome: solicitacao.pacienteNome,
      emailTipo: 'novo_lead_medico_novo_lead',
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: erroEnvio || null,
      tipo: 'automatico',
      destinatario: medicoEmail, // E-mail do médico
    });

    if (!envioSucesso) {
      return NextResponse.json(
        { error: 'Erro ao enviar e-mail', details: erroEnvio },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de novo lead médico enviado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de novo lead médico:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mail', details: (error as Error).message },
      { status: 500 }
    );
  }
}

