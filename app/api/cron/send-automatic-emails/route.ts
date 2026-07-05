import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailTipo } from '@/types/emailConfig';
import { sendEmail } from '@/lib/email/transporter';
import {
  assertCronZeptoConfigured,
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';
import { acquireCronLock, releaseCronLock } from '@/lib/email/cronExecutionLock';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { zeptoEnvioFields } from '@/lib/email/emailEnvioLog';

const TIPOS_CAMPANHA_LEADS: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];

type EnvioCampanhaLead = {
  id: string;
  emailTipo: string;
  status: string;
  enviadoEm: Date;
};

/** Consulta segmentada por lead — exige índice composto leadId + emailTipo. */
async function fetchEnviosCampanhaPorLead(
  db: ReturnType<typeof getFirebaseAdmin>['db'],
  leadId: string,
  cache: Map<string, EnvioCampanhaLead[]>
): Promise<EnvioCampanhaLead[]> {
  const cached = cache.get(leadId);
  if (cached) return cached;

  const snapshot = await db
    .collection('email_envios')
    .where('leadId', '==', leadId)
    .where('emailTipo', 'in', TIPOS_CAMPANHA_LEADS)
    .get();

  const envios = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      emailTipo: data.emailTipo,
      status: data.status,
      enviadoEm: data.enviadoEm?.toDate?.() ?? new Date(data.enviadoEm),
    };
  });
  cache.set(leadId, envios);
  return envios;
}

function calcularProximoEmailCampanha(
  enviosDoLead: EnvioCampanhaLead[],
  createdAt: Date,
  agora: Date
): { proximoEmail?: EmailTipo; proximoEnvio?: Date } {
  const horasDesdeCriacao = (agora.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  const email1Enviado = enviosDoLead.some((e) => e.emailTipo === 'email1' && e.status === 'enviado');
  const email2Enviado = enviosDoLead.some((e) => e.emailTipo === 'email2' && e.status === 'enviado');
  const email3Enviado = enviosDoLead.some((e) => e.emailTipo === 'email3' && e.status === 'enviado');
  const email4Enviado = enviosDoLead.some((e) => e.emailTipo === 'email4' && e.status === 'enviado');
  const email5Enviado = enviosDoLead.some((e) => e.emailTipo === 'email5' && e.status === 'enviado');

  let proximoEmail: EmailTipo | undefined;
  let proximoEnvio: Date | undefined;

  if (!email1Enviado && horasDesdeCriacao >= 1) {
    proximoEmail = 'email1';
    proximoEnvio = new Date(createdAt.getTime() + 60 * 60 * 1000);
  } else if (email1Enviado && !email2Enviado && horasDesdeCriacao >= 24) {
    proximoEmail = 'email2';
    proximoEnvio = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  } else if (email2Enviado && !email3Enviado && horasDesdeCriacao >= 72) {
    proximoEmail = 'email3';
    proximoEnvio = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
  } else if (email3Enviado && !email4Enviado && horasDesdeCriacao >= 168) {
    proximoEmail = 'email4';
    proximoEnvio = new Date(createdAt.getTime() + 168 * 60 * 60 * 1000);
  } else if (email4Enviado && !email5Enviado && horasDesdeCriacao >= 336) {
    proximoEmail = 'email5';
    proximoEnvio = new Date(createdAt.getTime() + 336 * 60 * 60 * 1000);
  }

  return { proximoEmail, proximoEnvio };
}

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
  
  return {
    auth: getAuth(adminApp),
    db: getFirestore(adminApp),
  };
}

// Função para enviar e-mail
async function enviarEmail(leadEmail: string, leadNome: string, assunto: string, html: string): Promise<{ success: boolean; messageId?: string; erro?: string }> {
  const htmlPersonalizado = html.replace(/\{nome\}/g, leadNome || 'Cliente');

  let htmlFinal = htmlPersonalizado;
  if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
    htmlFinal = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${htmlPersonalizado}
</body>
</html>
      `.trim();
  }

  const result = await sendEmail({
    to: leadEmail,
    subject: assunto,
    html: htmlFinal,
    text: htmlPersonalizado.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
  });

  if (!result.success) {
    let erroFormatado = result.error;
    if (result.code === 'EAUTH' || result.code === 'EENVELOPE') {
      erroFormatado =
        'Erro de autenticação SMTP ZeptoMail. Verifique ZEPTOMAIL_SMTP_USER e ZEPTOMAIL_SMTP_PASSWORD.';
    } else if (result.code === 'ETIMEDOUT' || result.code === 'ESOCKETTIMEOUT') {
      erroFormatado = 'Tempo limite de conexão SMTP excedido.';
    }
    console.error('❌ Erro ao enviar e-mail:', erroFormatado);
    return { success: false, erro: erroFormatado };
  }

  console.log('✅ E-mail enviado com sucesso:', result.messageId);
  return { success: true, messageId: result.messageId };
}

export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  const zeptoGate = assertCronZeptoConfigured();
  if (!zeptoGate.ok) {
    return NextResponse.json(zeptoGate.body, { status: zeptoGate.status });
  }

  let db: ReturnType<typeof getFirebaseAdmin>['db'] | undefined;
  let lockInstanceId: string | null = null;

  try {
    const firebase = getFirebaseAdmin();
    db = firebase.db;

    const lock = await acquireCronLock(db, 'send-automatic-emails');
    if (!lock.acquired) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: lock.reason,
        enviados: 0,
        falhas: 0,
      });
    }
    lockInstanceId = lock.instanceId;

    console.log('🕐 Iniciando envio automático de e-mails...');

    const { auth } = firebase;
    const agora = new Date();

    // 1. Verificar se o envio automático está ativado
    const configDoc = await db.collection('emails').doc('config').get();
    if (!configDoc.exists) {
      console.log('⚠️ Configuração de e-mails não encontrada');
      return NextResponse.json({
        success: false,
        message: 'Configuração de e-mails não encontrada',
        enviados: 0,
        falhas: 0,
      });
    }

    const configData = configDoc.data();
    if (!configData?.envioAutomatico?.ativo) {
      console.log('⚠️ Envio automático desativado');
      return NextResponse.json({
        success: true,
        message: 'Envio automático desativado',
        enviados: 0,
        falhas: 0,
      });
    }

    const limitePorExecucao = getCronZeptoMaxSendsPerRun();

    // 2. Buscar todos os e-mails configurados (módulo Leads)
    const emailsCollection = db.collection('emails');
    const emailTypes: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];
    const emails: any = {};

    for (const emailTipo of emailTypes) {
      // Tentar buscar na nova estrutura primeiro
      let emailDoc = await emailsCollection.doc(`leads_${emailTipo}`).get();
      if (!emailDoc.exists) {
        // Fallback: estrutura antiga
        emailDoc = await emailsCollection.doc(emailTipo).get();
      }
      if (emailDoc.exists) {
        const data = emailDoc.data();
        emails[emailTipo] = {
          assunto: data?.assunto || '',
          corpoHtml: data?.corpoHtml || '',
        };
      } else {
        emails[emailTipo] = { assunto: '', corpoHtml: '' };
      }
    }

    // 3. Buscar todos os leads (Firebase Auth users)
    let allFirebaseUsers: any[] = [];
    let nextPageToken: string | undefined;
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allFirebaseUsers = allFirebaseUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    console.log(`✅ ${allFirebaseUsers.length} usuários encontrados no Firebase Auth`);

    // 4. Buscar solicitações de médico e pacientes com médico
    const solicitacoesSnapshot = await db.collection('solicitacoes_medico').get();
    const todasSolicitacoes = solicitacoesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      criadoEm: doc.data().criadoEm?.toDate(),
    }));
    const solicitacaoPorEmail = new Map<string, any>();
    todasSolicitacoes.forEach(s => {
      const email = s.pacienteEmail?.toLowerCase().trim();
      if (email) solicitacaoPorEmail.set(email, s);
    });

    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    const todosPacientes = pacientesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    const pacientesComMedico = new Map<string, any>();
    todosPacientes.forEach(p => {
      const email = p.email?.toLowerCase().trim();
      if (email && p.medicoResponsavelId) pacientesComMedico.set(email, p);
    });

    // 5. Filtrar leads aptos — consulta segmentada em email_envios (sem full-scan)
    const dataMinima = new Date('2025-11-20T00:00:00');
    dataMinima.setHours(0, 0, 0, 0);

    const enviosPorLeadCache = new Map<string, EnvioCampanhaLead[]>();
    const leadsAptos: Array<{
      leadId: string;
      leadEmail: string;
      leadNome: string;
      dataCriacao: Date;
      proximoEmail?: EmailTipo;
      proximoEnvio?: Date;
    }> = [];

    let candidatosComTempoMinimo = 0;
    let docsEmailEnviosLidos = 0;

    for (const user of allFirebaseUsers) {
      const userEmail = user.email?.toLowerCase().trim();
      if (!userEmail || userEmail === 'sem email' || userEmail === '') continue;
      if (solicitacaoPorEmail.has(userEmail)) continue;
      if (pacientesComMedico.has(userEmail)) continue;

      const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
      if (!createdAt) continue;
      const userCreatedAt = new Date(createdAt);
      userCreatedAt.setHours(0, 0, 0, 0);
      if (userCreatedAt < dataMinima) continue;

      const horasDesdeCriacao = (agora.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      // Nenhum e-mail da sequência é elegível antes de 1h — evita query em email_envios
      if (horasDesdeCriacao < 1) continue;

      candidatosComTempoMinimo++;
      const enviosDoLead = await fetchEnviosCampanhaPorLead(db, user.uid, enviosPorLeadCache);
      docsEmailEnviosLidos += enviosDoLead.length;

      const { proximoEmail, proximoEnvio } = calcularProximoEmailCampanha(
        enviosDoLead,
        createdAt,
        agora
      );

      if (proximoEmail && proximoEnvio && proximoEnvio <= agora) {
        leadsAptos.push({
          leadId: user.uid,
          leadEmail: user.email || '',
          leadNome: user.displayName || user.email || 'Usuário sem nome',
          dataCriacao: createdAt,
          proximoEmail,
          proximoEnvio,
        });
      }
    }

    if (candidatosComTempoMinimo === 0) {
      console.log('📧 Nenhum lead candidato (≥1h) — email_envios não consultado nesta execução');
      return NextResponse.json({
        success: true,
        timestamp: agora.toISOString(),
        enviados: 0,
        falhas: 0,
        totalAptos: 0,
        processadosNestaExecucao: 0,
        limitePorExecucao,
        truncadoPorLimiteZepto: false,
        provedor: 'ZeptoMail',
        resultados: [],
        emailEnviosQueries: 0,
        emailEnviosDocsLidos: 0,
      });
    }

    console.log(
      `📧 email_envios: ${enviosPorLeadCache.size} consultas segmentadas, ${docsEmailEnviosLidos} docs lidos`
    );
    console.log(`📧 ${leadsAptos.length} leads aptos para envio automático (máx. ${limitePorExecucao} nesta execução)`);

    const fila = leadsAptos.slice(0, limitePorExecucao);
    const truncado = leadsAptos.length > fila.length;

    // 7. Enviar e-mails ZeptoMail com throttle entre envios
    let enviados = 0;
    let falhas = 0;
    const resultados: Array<{ leadId: string; email: string; emailTipo: EmailTipo; success: boolean; erro?: string }> = [];

    for (let i = 0; i < fila.length; i++) {
      const lead = fila[i];
      if (i > 0) await cronEmailThrottle();
      if (!lead.proximoEmail) continue;

      const emailTemplate = emails[lead.proximoEmail];
      if (!emailTemplate || !emailTemplate.assunto || !emailTemplate.corpoHtml) {
        console.log(`⚠️ Template do ${lead.proximoEmail} não configurado para ${lead.leadEmail}`);
        falhas++;
        resultados.push({
          leadId: lead.leadId,
          email: lead.leadEmail,
          emailTipo: lead.proximoEmail,
          success: false,
          erro: 'Template não configurado',
        });
        continue;
      }

      const resultadoEnvio = await enviarEmail(
        lead.leadEmail,
        lead.leadNome,
        emailTemplate.assunto,
        emailTemplate.corpoHtml
      );

      // Registrar envio no Firestore
      const enviosCollection = db.collection('email_envios');
      const envioRef = enviosCollection.doc();
      await envioRef.set({
        leadId: lead.leadId,
        leadEmail: lead.leadEmail,
        leadNome: lead.leadNome,
        emailTipo: lead.proximoEmail,
        assunto: emailTemplate.assunto,
        enviadoEm: agora,
        status: resultadoEnvio.success ? 'enviado' : 'falhou',
        tentativas: 1,
        erro: resultadoEnvio.erro || null,
        tipo: 'automatico',
        ...zeptoEnvioFields(resultadoEnvio.success ? resultadoEnvio.messageId : null),
      });

      if (resultadoEnvio.success) {
        enviados++;
        console.log(`✅ E-mail ${lead.proximoEmail} enviado para ${lead.leadEmail}`);
      } else {
        falhas++;
        console.log(`❌ Falha ao enviar e-mail ${lead.proximoEmail} para ${lead.leadEmail}: ${resultadoEnvio.erro}`);
      }

      resultados.push({
        leadId: lead.leadId,
        email: lead.leadEmail,
        emailTipo: lead.proximoEmail,
        success: resultadoEnvio.success,
        erro: resultadoEnvio.erro,
      });
    }

    console.log(`✅ Envio automático concluído: ${enviados} enviados, ${falhas} falhas`);

    return NextResponse.json({
      success: true,
      timestamp: agora.toISOString(),
      enviados,
      falhas,
      totalAptos: leadsAptos.length,
      processadosNestaExecucao: fila.length,
      limitePorExecucao,
      truncadoPorLimiteZepto: truncado,
      provedor: 'ZeptoMail',
      resultados,
      emailEnviosQueries: enviosPorLeadCache.size,
      emailEnviosDocsLidos: docsEmailEnviosLidos,
    });
  } catch (error) {
    console.error('❌ Erro no envio automático:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    if (db && lockInstanceId) {
      await releaseCronLock(db, 'send-automatic-emails', lockInstanceId);
    }
  }
}

// Permitir POST também para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}

