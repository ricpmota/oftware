import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import nodemailer from 'nodemailer';

// Para usar SendGrid (recomendado para produção)
// npm install @sendgrid/mail
// import sgMail from '@sendgrid/mail';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, logId } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html' },
        { status: 400 }
      );
    }

    // Validar formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error('Formato de e-mail inválido');
    }

    // OPÇÃO 1: SendGrid (Recomendado para produção)
    /*
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL!, // E-mail verificado no SendGrid
      subject,
      html,
    };

    await sgMail.send(msg);
    */

    // OPÇÃO 2: Zoho Mail via SMTP (Nodemailer)
    const useZoho = process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD;
    
    if (useZoho) {
      // Configurar transporter do Zoho Mail
      const transporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 587,
        secure: false, // true para 465, false para outras portas
        auth: {
          user: process.env.ZOHO_EMAIL, // suporte@oftware.com.br
          pass: process.env.ZOHO_PASSWORD, // Senha de app do Zoho
        },
      });

      // Enviar e-mail
      const info = await transporter.sendMail({
        from: process.env.ZOHO_EMAIL,
        to,
        subject,
        html,
      });

      console.log('✅ E-mail enviado via Zoho:', info.messageId);
    } else {
      // OPÇÃO 3: Simulação para desenvolvimento (quando Zoho não está configurado)
      console.log('📧 SIMULAÇÃO E-MAIL:');
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Conteúdo: ${html.substring(0, 100)}...`);
      console.log('---');
      
      // Para desenvolvimento, simular sucesso
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Atualizar log no Firestore
    if (logId) {
      await updateDoc(doc(db, 'notification_logs', logId), {
        status: 'sent',
        sentAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });

  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);

    // Atualizar log com erro
    if (request.body && JSON.parse(await request.text()).logId) {
      const { logId } = JSON.parse(await request.text());
      try {
        await updateDoc(doc(db, 'notification_logs', logId), {
          status: 'failed',
          error: (error as Error).message,
        });
      } catch (logError) {
        console.error('Erro ao atualizar log:', logError);
      }
    }

    return NextResponse.json(
      { error: 'Erro ao enviar e-mail', details: (error as Error).message },
      { status: 500 }
    );
  }
}
