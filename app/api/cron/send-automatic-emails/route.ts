import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailTipo } from '@/types/emailConfig';
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
  
  return {
    auth: getAuth(adminApp),
    db: getFirestore(adminApp),
  };
}

// Função para enviar e-mail
async function enviarEmail(leadEmail: string, leadNome: string, assunto: string, html: string): Promise<{ success: boolean; messageId?: string; erro?: string }> {
  try {
    if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
      console.log('📧 SIMULAÇÃO E-MAIL (Zoho não configurado):');
      console.log(`Para: ${leadEmail}`);
      console.log(`Assunto: ${assunto}`);
      return { success: true };
    }

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

    const htmlPersonalizado = html.replace(/\{nome\}/g, leadNome || 'Cliente');

    // Garantir estrutura HTML completa
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

    const info = await transporter.sendMail({
      from: `"Oftware" <${process.env.ZOHO_EMAIL}>`,
      to: leadEmail,
      subject: assunto,
      html: htmlFinal,
      text: htmlPersonalizado.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
    });

    console.log('✅ E-mail enviado com sucesso:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const erroMsg = (error as Error).message;
    console.error('❌ Erro ao enviar e-mail:', erroMsg);
    
    let erroFormatado = erroMsg;
    if ((error as any).code === 'EAUTH') {
      erroFormatado = 'Erro de autenticação SMTP. Verifique ZOHO_EMAIL e ZOHO_PASSWORD.';
    } else if ((error as any).code === 'ETIMEDOUT' || (error as any).code === 'ESOCKETTIMEOUT') {
      erroFormatado = 'Tempo limite de conexão SMTP excedido.';
    }
    
    return { success: false, erro: erroFormatado };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Iniciando envio automático de e-mails...');
    
    const { auth, db } = getFirebaseAdmin();
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

    // 5. Buscar todos os envios já realizados
    const enviosSnapshot = await db.collection('email_envios').get();
    const envios: any[] = enviosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enviadoEm: doc.data().enviadoEm?.toDate(),
    }));
    const enviosPorLead = new Map<string, any[]>();
    envios.forEach(envio => {
      if (!enviosPorLead.has(envio.leadId)) {
        enviosPorLead.set(envio.leadId, []);
      }
      enviosPorLead.get(envio.leadId)!.push(envio);
    });

    // 6. Filtrar leads aptos e calcular próximos envios
    const dataMinima = new Date('2025-11-20T00:00:00');
    dataMinima.setHours(0, 0, 0, 0);

    const leadsAptos: Array<{
      leadId: string;
      leadEmail: string;
      leadNome: string;
      dataCriacao: Date;
      proximoEmail?: EmailTipo;
      proximoEnvio?: Date;
    }> = [];

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

      const enviosDoLead = enviosPorLead.get(user.uid) || [];
      const minutosDesdeCriacao = (agora.getTime() - createdAt.getTime()) / (1000 * 60);
      const horasDesdeCriacao = (agora.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Verificar qual e-mail deve ser enviado
      // Lógica: Enviar e-mails em sequência baseado no tempo desde o login (criação da conta)
      // 1º email: 1 hora após login sem escolher médico
      // 2º email: 24 horas após login sem escolher médico
      // 3º email: 72 horas após login
      // 4º email: 7 dias (168 horas) após login
      // 5º email: 14 dias (336 horas) após login
      let proximoEmail: EmailTipo | undefined;
      let proximoEnvio: Date | undefined;

      const email1Enviado = enviosDoLead.some(e => e.emailTipo === 'email1' && e.status === 'enviado');
      const email2Enviado = enviosDoLead.some(e => e.emailTipo === 'email2' && e.status === 'enviado');
      const email3Enviado = enviosDoLead.some(e => e.emailTipo === 'email3' && e.status === 'enviado');
      const email4Enviado = enviosDoLead.some(e => e.emailTipo === 'email4' && e.status === 'enviado');
      const email5Enviado = enviosDoLead.some(e => e.emailTipo === 'email5' && e.status === 'enviado');

      // 1º email: 1 hora após login
      if (!email1Enviado && horasDesdeCriacao >= 1) {
        proximoEmail = 'email1';
        proximoEnvio = new Date(createdAt.getTime() + 60 * 60 * 1000); // 1 hora
      }
      // 2º email: 24 horas após login (só se email1 já foi enviado)
      else if (email1Enviado && !email2Enviado && horasDesdeCriacao >= 24) {
        proximoEmail = 'email2';
        proximoEnvio = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      }
      // 3º email: 72 horas após login (só se email2 já foi enviado)
      else if (email2Enviado && !email3Enviado && horasDesdeCriacao >= 72) {
        proximoEmail = 'email3';
        proximoEnvio = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
      }
      // 4º email: 7 dias (168 horas) após login (só se email3 já foi enviado)
      else if (email3Enviado && !email4Enviado && horasDesdeCriacao >= 168) {
        proximoEmail = 'email4';
        proximoEnvio = new Date(createdAt.getTime() + 168 * 60 * 60 * 1000);
      }
      // 5º email: 14 dias (336 horas) após login (só se email4 já foi enviado)
      else if (email4Enviado && !email5Enviado && horasDesdeCriacao >= 336) {
        proximoEmail = 'email5';
        proximoEnvio = new Date(createdAt.getTime() + 336 * 60 * 60 * 1000);
      }

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

    console.log(`📧 ${leadsAptos.length} leads aptos para envio automático`);

    // 7. Enviar e-mails
    let enviados = 0;
    let falhas = 0;
    const resultados: Array<{ leadId: string; email: string; emailTipo: EmailTipo; success: boolean; erro?: string }> = [];

    for (const lead of leadsAptos) {
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
      total: leadsAptos.length,
      resultados,
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
  }
}

// Permitir POST também para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}

