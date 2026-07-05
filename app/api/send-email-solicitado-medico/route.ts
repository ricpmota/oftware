import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';
import { zeptoEnvioFields } from '@/lib/email/emailEnvioLog';

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

    console.log('📧 [send-email-solicitado-medico] Recebida requisição para enviar e-mail de boas-vindas', {
      solicitacaoId,
      timestamp: new Date().toISOString()
    });

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
    if (solicitacao?.status !== 'aceita') {
      return NextResponse.json(
        { error: 'Solicitação não está aceita' },
        { status: 400 }
      );
    }

    // Verificar se o e-mail já foi enviado para esta solicitação específica
    const enviosCollection = db.collection('email_envios');
    const enviosExistentes = await enviosCollection
      .where('emailTipo', '==', 'solicitado_medico_boas_vindas')
      .where('solicitacaoId', '==', solicitacaoId)
      .where('status', '==', 'enviado')
      .get();

    if (!enviosExistentes.empty) {
      console.log('⚠️ E-mail de boas-vindas já foi enviado para esta solicitação. Evitando duplicação.', {
        solicitacaoId,
        pacienteEmail: solicitacao.pacienteEmail,
        enviosEncontrados: enviosExistentes.size
      });
      return NextResponse.json({
        success: true,
        message: 'E-mail já foi enviado anteriormente para esta solicitação',
        jaEnviado: true,
      });
    }

    // 2. Buscar dados do médico
    const medicoDoc = await db.collection('medicos').doc(solicitacao.medicoId).get();
    let medicoNome = 'Médico';
    if (medicoDoc.exists) {
      const medico = medicoDoc.data();
      const medicoNomeBase = medico?.nome || medico?.name || solicitacao.medicoNome || 'Médico';
      const medicoGenero = medico?.genero || medico?.gender;
      medicoNome = medicoGenero === 'F' || medicoGenero === 'female' 
        ? `Dra. ${medicoNomeBase}` 
        : `Dr. ${medicoNomeBase}`;
      
      console.log('🔍 Debug - Dados do médico:', {
        nome: medicoNomeBase,
        genero: medicoGenero,
        nomeFormatado: medicoNome
      });
    } else {
      medicoNome = solicitacao.medicoNome || 'Médico';
    }

    // 3. Buscar template do e-mail
    const emailDoc = await db.collection('emails').doc('solicitado_medico_boas_vindas').get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Template de e-mail não configurado' },
        { status: 404 }
      );
    }

    const emailTemplate = emailDoc.data();
    const pacienteNome = solicitacao.pacienteNome || 'Paciente';
    let assunto = emailTemplate?.assunto || 'Bem-vindo ao tratamento!';
    let html = emailTemplate?.corpoHtml || '';

    // 4. Substituir variáveis
    const dataInicio = solicitacao.aceitaEm?.toDate() || new Date();
    const semanas = 18; // Padrão, pode ser ajustado depois
    assunto = assunto.replace(/\{nome\}/g, pacienteNome);
    assunto = assunto.replace(/\{medico\}/g, medicoNome);
    html = html.replace(/\{nome\}/g, pacienteNome);
    html = html.replace(/\{medico\}/g, medicoNome);
    html = html.replace(/\{inicio\}/g, dataInicio.toLocaleDateString('pt-BR'));
    html = html.replace(/\{semanas\}/g, semanas.toString());

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

    // 6. Enviar e-mail (com trava de idempotência por solicitacaoId)
    let envioSucesso = false;
    let erroEnvio: string | undefined;
    let zeptoMessageId: string | undefined;
    const envioLockId = `solicitado_medico_boas_vindas_${solicitacaoId}`;
    const envioLockRef = enviosCollection.doc(envioLockId);

    try {
      await envioLockRef.create({
        solicitacaoId,
        leadId: solicitacao.pacienteId || '',
        leadEmail: solicitacao.pacienteEmail,
        leadNome: solicitacao.pacienteNome,
        emailTipo: 'solicitado_medico_boas_vindas',
        assunto,
        enviadoEm: new Date(),
        status: 'processando',
        tentativas: 1,
        erro: null,
        tipo: 'automatico',
      });
    } catch (lockError) {
      const jaExiste = (lockError as { code?: number })?.code === 6;
      if (jaExiste) {
        console.log('⚠️ Lock de envio já existe para esta solicitação. Evitando duplicação.', {
          solicitacaoId,
          pacienteEmail: solicitacao.pacienteEmail,
        });
        return NextResponse.json({
          success: true,
          message: 'E-mail já está em processamento ou foi enviado para esta solicitação',
          jaEnviado: true,
        });
      }
      throw lockError;
    }

    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: solicitacao.pacienteEmail,
          subject: assunto,
          html: htmlFinal,
          text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });
        envioSucesso = sent.success;
        if (!sent.success) erroEnvio = sent.error;
        else {
          if (sent.messageId) zeptoMessageId = sent.messageId;
          console.log('✅ E-mail de boas-vindas enviado:', sent.messageId);
        }
      } else {
        console.log('📧 SIMULAÇÃO E-MAIL (ZeptoMail não configurado)');
        envioSucesso = true;
      }
    } catch (emailError) {
      erroEnvio = (emailError as Error).message;
      console.error('❌ Erro ao enviar e-mail:', emailError);
    }

    // 7. Registrar envio final no mesmo documento lock para evitar duplicatas
    await envioLockRef.set({
      solicitacaoId: solicitacaoId,
      leadId: solicitacao.pacienteId || '',
      leadEmail: solicitacao.pacienteEmail,
      leadNome: solicitacao.pacienteNome,
      emailTipo: 'solicitado_medico_boas_vindas',
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: erroEnvio || null,
      tipo: 'automatico',
      ...(isZeptoMailConfigured()
        ? zeptoEnvioFields(envioSucesso ? zeptoMessageId : null)
        : {}),
    }, { merge: true });

    if (!envioSucesso) {
      return NextResponse.json(
        { error: 'Erro ao enviar e-mail', details: erroEnvio },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de boas-vindas enviado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mail', details: (error as Error).message },
      { status: 500 }
    );
  }
}

