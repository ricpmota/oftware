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

export async function POST(request: NextRequest) {
  try {
    const { leadId, emailPersonalizado, emailTipo: emailTipoParam } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar lead usando Admin SDK
    const { auth, db } = getFirebaseAdmin();
    let lead: any = null;
    
    try {
      const userRecord = await auth.getUser(leadId);
      lead = {
        id: userRecord.uid,
        uid: userRecord.uid,
        email: userRecord.email || '',
        name: userRecord.displayName || userRecord.email || 'Usuário sem nome',
      };
    } catch (error) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    // Buscar configuração usando Admin SDK
    const emailsCollection = db.collection('emails');
    const emailTypes = ['email1', 'email2', 'email3', 'email4', 'email5'];
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
    
    const configDoc = await emailsCollection.doc('config').get();
    const config = {
      leads: emails,
      envioAutomatico: configDoc.exists ? configDoc.data()?.envioAutomatico || { ativo: false } : { ativo: false },
    };

    // Preparar e-mail
    const emailTipo: EmailTipo = emailTipoParam || emailPersonalizado?.emailTipo || 'email1';
    const emailTemplate = config.leads[emailTipo];
    const assunto = emailPersonalizado?.assunto || emailTemplate.assunto;
    const html = emailPersonalizado?.corpoHtml || emailTemplate.corpoHtml;
    const htmlPersonalizado = html.replace(/\{nome\}/g, lead.name || 'Cliente');

    // Enviar e-mail diretamente usando nodemailer
    let envioSucesso = false;
    let erroEnvio: string | undefined;

    try {
      if (process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD) {
        console.log('📧 Iniciando envio de e-mail via Zoho...');
        console.log(`📧 De: ${process.env.ZOHO_EMAIL}`);
        console.log(`📧 Para: ${lead.email}`);
        console.log(`📧 Assunto: ${assunto}`);
        
        const transporter = nodemailer.createTransport({
          host: 'smtp.zoho.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.ZOHO_EMAIL,
            pass: process.env.ZOHO_PASSWORD,
          },
          // Adicionar timeout e debug
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000,
        });

        // Verificar conexão primeiro
        console.log('📧 Verificando conexão SMTP...');
        await transporter.verify();
        console.log('✅ Conexão SMTP verificada com sucesso');

        // Enviar e-mail
        console.log('📧 Enviando e-mail...');
        console.log('📧 HTML recebido:', htmlPersonalizado.substring(0, 200) + '...');
        
        // Garantir que o HTML está bem formatado
        // Se o HTML não tiver estrutura básica, adicionar
        let htmlFinal = htmlPersonalizado;
        if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
          // Se não tiver estrutura HTML completa, envolver em estrutura básica
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
          to: lead.email,
          subject: assunto,
          html: htmlFinal,
          // Adicionar versão texto alternativo (opcional, mas recomendado)
          text: htmlPersonalizado.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });

        console.log('✅ E-mail enviado com sucesso!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Response:', info.response);
        
        envioSucesso = true;
      } else {
        // Modo simulação se Zoho não estiver configurado
        console.log('⚠️ SIMULAÇÃO E-MAIL (Zoho não configurado):');
        console.log(`Para: ${lead.email}`);
        console.log(`Assunto: ${assunto}`);
        envioSucesso = true;
      }
    } catch (emailError: any) {
      erroEnvio = emailError?.message || 'Erro desconhecido ao enviar e-mail';
      console.error('❌ Erro ao enviar e-mail:', emailError);
      console.error('❌ Código do erro:', emailError?.code);
      console.error('❌ Comando do erro:', emailError?.command);
      console.error('❌ Stack trace:', emailError?.stack);
      
      // Se for erro de autenticação
      if (emailError?.code === 'EAUTH' || emailError?.code === 'EENVELOPE') {
        erroEnvio = `Erro de autenticação: ${emailError.message}. Verifique as credenciais do Zoho Mail.`;
      }
      
      envioSucesso = false;
    }

    // Registrar envio usando Admin SDK
    const enviosCollection = db.collection('email_envios');
    const envioRef = enviosCollection.doc();
    const envioData = {
      leadId: lead.id,
      leadEmail: lead.email,
      leadNome: lead.name,
      emailTipo,
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: erroEnvio || null,
      tipo: 'manual', // Marcar como manual (quando implementar automático, será 'automatico')
    };
    await envioRef.set(envioData);
    const envioId = envioRef.id;

    if (!envioSucesso) {
      return NextResponse.json(
        {
          error: 'Erro ao enviar e-mail',
          details: erroEnvio,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      envioId,
      message: 'E-mail enviado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail para lead:', error);
    return NextResponse.json(
      {
        error: 'Erro ao enviar e-mail',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

