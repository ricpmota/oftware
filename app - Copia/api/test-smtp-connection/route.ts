import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'Credenciais não configuradas',
        hasEmail: !!process.env.ZOHO_EMAIL,
        hasPassword: !!process.env.ZOHO_PASSWORD,
      });
    }

    console.log('🔍 Testando conexão SMTP com Zoho...');
    console.log(`📧 E-mail: ${process.env.ZOHO_EMAIL}`);
    console.log(`🔑 Senha configurada: ${process.env.ZOHO_PASSWORD ? 'Sim (' + process.env.ZOHO_PASSWORD.length + ' caracteres)' : 'Não'}`);

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

    console.log('📧 Verificando conexão...');
    await transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso!');

    // Testar envio para o próprio e-mail
    const testEmail = process.env.ZOHO_EMAIL;
    console.log(`📧 Enviando e-mail de teste para: ${testEmail}`);
    
    const info = await transporter.sendMail({
      from: `"Oftware Teste" <${process.env.ZOHO_EMAIL}>`,
      to: testEmail,
      subject: 'Teste de Envio - Oftware',
      html: '<p>Este é um e-mail de teste do sistema Oftware.</p><p>Se você recebeu este e-mail, a configuração SMTP está funcionando corretamente!</p>',
    });

    console.log('✅ E-mail de teste enviado com sucesso!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);

    return NextResponse.json({
      success: true,
      message: 'Conexão SMTP verificada e e-mail de teste enviado com sucesso!',
      messageId: info.messageId,
      response: info.response,
      email: process.env.ZOHO_EMAIL,
      passwordLength: process.env.ZOHO_PASSWORD.length,
    });
  } catch (error: any) {
    console.error('❌ Erro ao testar SMTP:', error);
    console.error('❌ Código:', error?.code);
    console.error('❌ Comando:', error?.command);
    console.error('❌ Mensagem:', error?.message);
    
    return NextResponse.json({
      success: false,
      error: error?.message || 'Erro desconhecido',
      code: error?.code,
      command: error?.command,
      details: error?.stack,
    }, { status: 500 });
  }
}

