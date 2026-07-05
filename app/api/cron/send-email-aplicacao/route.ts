import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/email/transporter';
import {
  assertCronZeptoConfigured,
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { criarCalendarioDoses } from '@/lib/aplicacao/criarCalendarioDoses';
import { ensureAplicacaoPublicUrl } from '@/lib/aplicacao/ensureAplicacaoPublicLink';
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

// Função auxiliar para enviar e-mail de aplicação
async function enviarEmailAplicacao(
  db: any,
  pacienteId: string,
  paciente: any,
  numeroAplicacao: number,
  tipo: 'antes' | 'dia',
  linkAplicacao?: { dataAplicacao: Date; doseMg: number }
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
  let assunto = emailTemplate?.assunto || (tipo === 'antes' ? 'Lembrete: Aplicação amanhã' : 'Lembrete: Aplicação hoje');
  let html = emailTemplate?.corpoHtml || '';

  // 3. Substituir variáveis
  html = html.replace(/\{nome\}/g, paciente.nome || 'Paciente');
  html = html.replace(/\{medico\}/g, medicoNome);
  html = html.replace(/\{numero\}/g, numeroAplicacao.toString());

  let urlAplicacao = '';
  if (linkAplicacao) {
    try {
      urlAplicacao = await ensureAplicacaoPublicUrl(db, {
        pacienteId,
        data: new Date(linkAplicacao.dataAplicacao.getTime()),
        semana: numeroAplicacao,
        dose: linkAplicacao.doseMg,
      });
    } catch (e) {
      console.error('ensureAplicacaoPublicUrl (cron e-mail aplicação):', e);
    }
  }
  html = html.replace(/\{aplicacao\}/g, urlAplicacao);
  assunto = assunto.replace(/\{aplicacao\}/g, urlAplicacao);

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
  let zeptoMessageId: string | undefined;

  try {
    const sent = await sendEmail({
      to: paciente.email,
      subject: assunto,
      html: htmlFinal,
      text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
    });
    envioSucesso = sent.success;
    if (!sent.success) {
      erroEnvio = sent.error;
      throw new Error(sent.error);
    }
    if (sent.messageId) zeptoMessageId = sent.messageId;
    console.log(`✅ E-mail de aplicação ${tipo} enviado:`, sent.messageId);
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
    ...zeptoEnvioFields(zeptoMessageId ?? null),
  });
}

export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  try {
    console.log('--- Iniciando Cron Job de E-mails de Aplicação ---');
    const zeptoGate = assertCronZeptoConfigured();
    if (!zeptoGate.ok) {
      return NextResponse.json(zeptoGate.body, { status: zeptoGate.status });
    }

    const limitePorExecucao = getCronZeptoMaxSendsPerRun();
    let enviosZeptoNestaExecucao = 0;
    let truncadoPorLimite = false;

    const db = getFirebaseAdmin();
    
    // 1. Buscar todos os pacientes com plano terapêutico
    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);
    
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    
    let emailsEnviados = 0;
    let emailsFalhados = 0;
    
    outer: for (const pacienteDoc of pacientesSnapshot.docs) {
      if (truncadoPorLimite) break;
      const paciente = pacienteDoc.data();
      const plano = paciente.planoTerapeutico;
      
      if (!plano || !plano.startDate || !plano.injectionDayOfWeek || !plano.numeroSemanasTratamento) {
        continue;
      }
      
      // Usar a mesma lógica do calendário da Pasta 7 para obter aplicações futuras
      const evolucaoSeguimento = paciente.evolucaoSeguimento || [];
      const calendario = criarCalendarioDoses(plano, evolucaoSeguimento);
      
      // Filtrar aplicações futuras E de hoje (para enviar e-mail no dia)
      const aplicacoesFuturas = calendario.filter(item => item.status === 'futura' || item.status === 'hoje');
      
      // Verificar se há aplicação amanhã ou hoje
      for (const aplicacao of aplicacoesFuturas) {
        if (enviosZeptoNestaExecucao >= limitePorExecucao) {
          truncadoPorLimite = true;
          break outer;
        }
        const dataAplicacao = new Date(aplicacao.data.getTime());
        dataAplicacao.setHours(0, 0, 0, 0);
        
        const numeroAplicacao = aplicacao.semana;
        
        // Usar o mesmo ID que será usado ao registrar o envio (paciente.userId || pacienteDoc.id)
        const leadIdParaVerificacao = paciente.userId || pacienteDoc.id;
        
        // Verificar se já foi enviado e-mail para esta aplicação
        const enviosSnapshot = await db.collection('email_envios')
          .where('leadId', '==', leadIdParaVerificacao)
          .where('emailTipo', 'in', ['aplicacao_aplicacao_antes', 'aplicacao_aplicacao_dia'])
          .get();
        
        const enviosExistentes = enviosSnapshot.docs.map(doc => doc.data());
        const jaEnviouAntes = enviosExistentes.some(
          e => e.emailTipo === 'aplicacao_aplicacao_antes' && 
          e.assunto?.includes(`#${numeroAplicacao}`) &&
          Math.abs((e.enviadoEm?.toDate ? e.enviadoEm.toDate() : new Date(e.enviadoEm)).getTime() - amanha.getTime()) < 24 * 60 * 60 * 1000
        );
        const jaEnviouDia = enviosExistentes.some(
          e => e.emailTipo === 'aplicacao_aplicacao_dia' && 
          e.assunto?.includes(`#${numeroAplicacao}`) &&
          Math.abs((e.enviadoEm?.toDate ? e.enviadoEm.toDate() : new Date(e.enviadoEm)).getTime() - agora.getTime()) < 24 * 60 * 60 * 1000
        );
        
        // Enviar e-mail 1 dia antes
        if (dataAplicacao.getTime() === amanha.getTime() && !jaEnviouAntes) {
          if (enviosZeptoNestaExecucao >= limitePorExecucao) {
            truncadoPorLimite = true;
            break outer;
          }
          try {
            if (enviosZeptoNestaExecucao > 0) await cronEmailThrottle();
            await enviarEmailAplicacao(db, pacienteDoc.id, paciente, numeroAplicacao, 'antes', {
              dataAplicacao,
              doseMg: aplicacao.dose,
            });
            enviosZeptoNestaExecucao++;
            emailsEnviados++;
            console.log(`✅ E-mail de aplicação antes enviado para paciente ${pacienteDoc.id}, aplicação #${numeroAplicacao} (dose: ${aplicacao.dose}mg)`);
          } catch (error) {
            emailsFalhados++;
            console.error(`❌ Erro ao enviar e-mail de aplicação antes:`, error);
          }
        }
        
        // Enviar e-mail no dia
        if (dataAplicacao.getTime() === agora.getTime() && !jaEnviouDia) {
          if (enviosZeptoNestaExecucao >= limitePorExecucao) {
            truncadoPorLimite = true;
            break outer;
          }
          try {
            if (enviosZeptoNestaExecucao > 0) await cronEmailThrottle();
            await enviarEmailAplicacao(db, pacienteDoc.id, paciente, numeroAplicacao, 'dia', {
              dataAplicacao,
              doseMg: aplicacao.dose,
            });
            enviosZeptoNestaExecucao++;
            emailsEnviados++;
            console.log(`✅ E-mail de aplicação dia enviado para paciente ${pacienteDoc.id}, aplicação #${numeroAplicacao} (dose: ${aplicacao.dose}mg)`);
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
      limitePorExecucao,
      truncadoPorLimiteZepto: truncadoPorLimite,
      provedor: 'ZeptoMail',
    });
  } catch (error) {
    console.error('❌ Erro fatal no cron job de e-mails de aplicação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}

