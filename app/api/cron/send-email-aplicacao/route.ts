import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

// Função para calcular datas de aplicação baseado no plano terapêutico
function calcularDatasAplicacao(
  startDate: Date,
  injectionDayOfWeek: string,
  numeroSemanas: number
): Date[] {
  const datas: Date[] = [];
  const start = new Date(startDate);
  
  // Mapear dia da semana
  const diasSemana: { [key: string]: number } = {
    'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6
  };
  const diaSemana = diasSemana[injectionDayOfWeek] || 1;
  
  // Encontrar a primeira data do dia da semana após ou igual à data de início
  const primeiroDia = new Date(start);
  const diff = (diaSemana - primeiroDia.getDay() + 7) % 7;
  primeiroDia.setDate(primeiroDia.getDate() + diff);
  
  // Gerar todas as datas de aplicação
  for (let semana = 0; semana < numeroSemanas; semana++) {
    const dataAplicacao = new Date(primeiroDia);
    dataAplicacao.setDate(primeiroDia.getDate() + (semana * 7));
    datas.push(dataAplicacao);
  }
  
  return datas;
}

// Função auxiliar para enviar e-mail de aplicação
async function enviarEmailAplicacao(
  db: any,
  pacienteId: string,
  paciente: any,
  numeroAplicacao: number,
  tipo: 'antes' | 'dia'
) {
  // 1. Buscar dados do médico
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
    }
  }

  // 2. Buscar template do e-mail
  const emailDocId = tipo === 'antes' ? 'aplicacao_aplicacao_antes' : 'aplicacao_aplicacao_dia';
  const emailDoc = await db.collection('emails').doc(emailDocId).get();
  if (!emailDoc.exists) {
    throw new Error('Template de e-mail não configurado');
  }

  const emailTemplate = emailDoc.data();
  const assunto = emailTemplate?.assunto || (tipo === 'antes' ? 'Lembrete: Aplicação amanhã' : 'Lembrete: Aplicação hoje');
  let html = emailTemplate?.corpoHtml || '';

  // 3. Substituir variáveis
  html = html.replace(/\{nome\}/g, paciente.nome || 'Paciente');
  html = html.replace(/\{medico\}/g, medicoNome);
  html = html.replace(/\{numero\}/g, numeroAplicacao.toString());

  // 4. Garantir estrutura HTML completa
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

  // 5. Enviar e-mail
  let envioSucesso = false;
  let erroEnvio: string | undefined;

  try {
    if (process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD) {
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

      await transporter.verify();

      const info = await transporter.sendMail({
        from: `"Oftware" <${process.env.ZOHO_EMAIL}>`,
        to: paciente.email,
        subject: assunto,
        html: htmlFinal,
        text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
      });

      console.log(`✅ E-mail de aplicação ${tipo} enviado:`, info.messageId);
      envioSucesso = true;
    } else {
      console.log('📧 SIMULAÇÃO E-MAIL (Zoho não configurado)');
      envioSucesso = true;
    }
  } catch (emailError) {
    erroEnvio = (emailError as Error).message;
    console.error('❌ Erro ao enviar e-mail:', emailError);
    throw emailError;
  }

  // 6. Registrar envio
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
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('--- Iniciando Cron Job de E-mails de Aplicação ---');
    const db = getFirebaseAdmin();
    
    // 1. Buscar todos os pacientes com plano terapêutico
    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);
    
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    
    let emailsEnviados = 0;
    let emailsFalhados = 0;
    
    for (const pacienteDoc of pacientesSnapshot.docs) {
      const paciente = pacienteDoc.data();
      const plano = paciente.planoTerapeutico;
      
      if (!plano || !plano.startDate || !plano.injectionDayOfWeek || !plano.numeroSemanasTratamento) {
        continue;
      }
      
      const startDate = plano.startDate.toDate ? plano.startDate.toDate() : new Date(plano.startDate);
      const datasAplicacao = calcularDatasAplicacao(
        startDate,
        plano.injectionDayOfWeek,
        plano.numeroSemanasTratamento
      );
      
      // Verificar se há aplicação amanhã ou hoje
      for (let i = 0; i < datasAplicacao.length; i++) {
        const dataAplicacao = datasAplicacao[i];
        dataAplicacao.setHours(0, 0, 0, 0);
        
        const numeroAplicacao = i + 1;
        
        // Verificar se já foi enviado e-mail para esta aplicação
        const enviosSnapshot = await db.collection('email_envios')
          .where('leadId', '==', pacienteDoc.id)
          .where('emailTipo', 'in', ['aplicacao_aplicacao_antes', 'aplicacao_aplicacao_dia'])
          .get();
        
        const enviosExistentes = enviosSnapshot.docs.map(doc => doc.data());
        const jaEnviouAntes = enviosExistentes.some(
          e => e.emailTipo === 'aplicacao_aplicacao_antes' && 
          e.assunto?.includes(`#${numeroAplicacao}`)
        );
        const jaEnviouDia = enviosExistentes.some(
          e => e.emailTipo === 'aplicacao_aplicacao_dia' && 
          e.assunto?.includes(`#${numeroAplicacao}`)
        );
        
        // Enviar e-mail 1 dia antes
        if (dataAplicacao.getTime() === amanha.getTime() && !jaEnviouAntes) {
          try {
            await enviarEmailAplicacao(db, pacienteDoc.id, paciente, numeroAplicacao, 'antes');
            emailsEnviados++;
            console.log(`✅ E-mail de aplicação antes enviado para paciente ${pacienteDoc.id}, aplicação #${numeroAplicacao}`);
          } catch (error) {
            emailsFalhados++;
            console.error(`❌ Erro ao enviar e-mail de aplicação antes:`, error);
          }
        }
        
        // Enviar e-mail no dia
        if (dataAplicacao.getTime() === agora.getTime() && !jaEnviouDia) {
          try {
            await enviarEmailAplicacao(db, pacienteDoc.id, paciente, numeroAplicacao, 'dia');
            emailsEnviados++;
            console.log(`✅ E-mail de aplicação dia enviado para paciente ${pacienteDoc.id}, aplicação #${numeroAplicacao}`);
          } catch (error) {
            emailsFalhados++;
            console.error(`❌ Erro ao enviar e-mail de aplicação dia:`, error);
          }
        }
      }
    }
    
    console.log(`--- Cron Job de E-mails de Aplicação Concluído: ${emailsEnviados} enviados, ${emailsFalhados} falhas ---`);
    return NextResponse.json({
      success: true,
      message: 'Cron job de e-mails de aplicação concluído',
      emailsEnviados,
      emailsFalhados,
    });
  } catch (error) {
    console.error('❌ Erro fatal no cron job de e-mails de aplicação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}

