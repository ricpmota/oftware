import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

export async function POST(request: NextRequest) {
  let logId: string | undefined;
  try {
    const body = await request.json();
    const { to, subject, html, logId: lid } = body;
    logId = lid;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error('Formato de e-mail inválido');
    }

    const text =
      typeof html === 'string'
        ? html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n')
        : '';

    if (isZeptoMailConfigured()) {
      const result = await sendEmail({ to, subject, html, text });
      if (!result.success) {
        throw new Error(result.error);
      }
      console.log('✅ E-mail enviado via ZeptoMail:', result.messageId);
    } else {
      console.log('📧 SIMULAÇÃO E-MAIL (ZeptoMail não configurado):');
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Conteúdo: ${String(html).substring(0, 100)}...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (logId) {
      await updateDoc(doc(db, 'notification_logs', logId), {
        status: 'sent',
        sentAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);

    if (logId) {
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
