import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';
import { zeptoEnvioFields } from '@/lib/email/emailEnvioLog';
import { getAplicacaoPublicUrlForSemana } from '@/lib/aplicacao/getAplicacaoPublicUrlForSemana';

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
    const { pacienteId, numeroAplicacao, tipo } = await request.json(); // tipo: 'antes' | 'dia'

    if (!pacienteId || !numeroAplicacao || !tipo) {
      return NextResponse.json(
        { error: 'pacienteId, numeroAplicacao e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    
    // 1. Buscar dados do paciente
    const pacienteDoc = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteDoc.exists) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      );
    }

    const paciente = pacienteDoc.data();

    // 2. Buscar dados do médico
    let medicoNome = 'Médico';
    if (paciente.medicoResponsavelId) {
      const medicoDoc = await db.collection('medicos').doc(paciente.medicoResponsavelId).get();
      if (medicoDoc.exists) {
        const medico = medicoDoc.data();
        const medicoNomeBase = medico?.nome || medico?.name || 'Médico';
        const medicoGenero = medico?.genero || medico?.gender;
        medicoNome = medicoGenero === 'F' || medicoGenero === 'female' 
          ? `Dra. ${medicoNomeBase}` 
          : `Dr. ${medicoNomeBase}`;
        
        console.log('🔍 Debug - Dados do médico:', {
          nome: medicoNomeBase,
          genero: medicoGenero,
          nomeFormatado: medicoNome
        });
      }
    }

    // 3. Buscar template do e-mail
    const emailDocId = tipo === 'antes' ? 'aplicacao_aplicacao_antes' : 'aplicacao_aplicacao_dia';
    const emailDoc = await db.collection('emails').doc(emailDocId).get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Template de e-mail não configurado' },
        { status: 404 }
      );
    }

    const emailTemplate = emailDoc.data();
    let assunto = emailTemplate?.assunto || (tipo === 'antes' ? 'Lembrete: Aplicação amanhã' : 'Lembrete: Aplicação hoje');
    let html = emailTemplate?.corpoHtml || '';

    // 4. Substituir variáveis
    html = html.replace(/\{nome\}/g, paciente.nome || 'Paciente');
    html = html.replace(/\{medico\}/g, medicoNome);
    html = html.replace(/\{numero\}/g, numeroAplicacao.toString());

    const urlAplicacao = await getAplicacaoPublicUrlForSemana(db, pacienteId, paciente, Number(numeroAplicacao));
    html = html.replace(/\{aplicacao\}/g, urlAplicacao);
    assunto = assunto.replace(/\{aplicacao\}/g, urlAplicacao);

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
    let zeptoMessageId: string | undefined;

    try {
      if (isZeptoMailConfigured()) {
        const sent = await sendEmail({
          to: paciente.email,
          subject: assunto,
          html: htmlFinal,
          text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });
        envioSucesso = sent.success;
        if (!sent.success) erroEnvio = sent.error;
        else {
          if (sent.messageId) zeptoMessageId = sent.messageId;
          console.log(`✅ E-mail de aplicação ${tipo} enviado:`, sent.messageId);
        }
      } else {
        console.log('📧 SIMULAÇÃO E-MAIL (ZeptoMail não configurado)');
        envioSucesso = true;
      }
    } catch (emailError) {
      erroEnvio = (emailError as Error).message;
      console.error('❌ Erro ao enviar e-mail:', emailError);
    }

    // 7. Registrar envio
    const enviosCollection = db.collection('email_envios');
    await enviosCollection.add({
      leadId: paciente.userId || pacienteId,
      leadEmail: paciente.email,
      leadNome: paciente.nome,
      emailTipo: emailDocId,
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: erroEnvio || null,
      tipo: 'automatico',
      ...(isZeptoMailConfigured()
        ? zeptoEnvioFields(envioSucesso ? zeptoMessageId : null)
        : {}),
    });

    if (!envioSucesso) {
      return NextResponse.json(
        { error: 'Erro ao enviar e-mail', details: erroEnvio },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `E-mail de aplicação ${tipo} enviado com sucesso`,
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de aplicação:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mail', details: (error as Error).message },
      { status: 500 }
    );
  }
}

