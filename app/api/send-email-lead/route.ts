import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailTipo } from '@/types/emailConfig';
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

    // Enviar e-mail via ZeptoMail (módulo central)
    let envioSucesso = false;
    let erroEnvio: string | undefined;
    let zeptoMessageId: string | undefined;

    try {
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

      if (isZeptoMailConfigured()) {
        console.log('📧 Enviando e-mail via ZeptoMail...');
        console.log(`📧 Para: ${lead.email} | Assunto: ${assunto}`);
        const sent = await sendEmail({
          to: lead.email,
          subject: assunto,
          html: htmlFinal,
          text: htmlPersonalizado
            .replace(/<[^>]*>/g, '')
            .replace(/\n\s*\n/g, '\n\n'),
        });
        envioSucesso = sent.success;
        if (!sent.success) erroEnvio = sent.error;
        else if (sent.messageId) zeptoMessageId = sent.messageId;
      } else {
        console.log('⚠️ SIMULAÇÃO E-MAIL (ZeptoMail não configurado):');
        console.log(`Para: ${lead.email}`);
        console.log(`Assunto: ${assunto}`);
        envioSucesso = true;
      }
    } catch (emailError: unknown) {
      const e = emailError as { message?: string };
      erroEnvio = e?.message || 'Erro desconhecido ao enviar e-mail';
      console.error('❌ Erro ao enviar e-mail:', emailError);
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
      tipo: 'manual',
      ...(isZeptoMailConfigured()
        ? zeptoEnvioFields(envioSucesso ? zeptoMessageId : null)
        : {}),
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

