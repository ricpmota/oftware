import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Retornar status das variáveis (sem expor valores sensíveis)
  return NextResponse.json({
    hasZohoEmail: !!process.env.ZOHO_EMAIL,
    hasZohoPassword: !!process.env.ZOHO_PASSWORD,
    emailPrefix: process.env.ZOHO_EMAIL ? process.env.ZOHO_EMAIL.substring(0, 10) + '...' : 'não configurado',
    passwordLength: process.env.ZOHO_PASSWORD ? process.env.ZOHO_PASSWORD.length : 0,
    nodeEnv: process.env.NODE_ENV,
  });
}

