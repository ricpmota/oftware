import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Para usar Twilio
// npm install twilio
// const twilio = require('twilio');

export async function POST(request: NextRequest) {
  try {
    const { to, message, logId } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, message' },
        { status: 400 }
      );
    }

    // Validar formato de telefone (+5511999999999)
    const phoneRegex = /^\+55\d{2}\d{8,9}$/;
    if (!phoneRegex.test(to)) {
      throw new Error('Formato de telefone inválido. Use: +5511999999999');
    }

    // OPÇÃO 1: Twilio (Recomendado para produção)
    /*
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`, // Ex: whatsapp:+14155238886
      to: `whatsapp:${to}`,
    });
    */

    // OPÇÃO 2: WhatsApp Business API
    /*
    const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }
    */

    // OPÇÃO 3: Simulação para desenvolvimento
    console.log('📱 SIMULAÇÃO WhatsApp:');
    console.log(`Para: ${to}`);
    console.log(`Mensagem: ${message}`);
    console.log('---');

    // Para desenvolvimento, simular sucesso após 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Atualizar log no Firestore
    if (logId) {
      await updateDoc(doc(db, 'notification_logs', logId), {
        status: 'sent',
        sentAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, message: 'WhatsApp enviado com sucesso' });

  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);

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
      { error: 'Erro ao enviar WhatsApp', details: (error as Error).message },
      { status: 500 }
    );
  }
}
