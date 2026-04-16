import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/services/googleCalendarService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      // Tentar detectar tipo do state se disponível
      let redirectPath = '/metaadmin';
      try {
        const parsed = JSON.parse(state || '{}');
        if (parsed.tipo === 'paciente') {
          redirectPath = '/meta';
        }
      } catch {}
      return NextResponse.redirect(
        new URL(`${redirectPath}?error=authorization_failed`, request.nextUrl.origin)
      );
    }

    const { userId, email, tipo } = JSON.parse(state);

    // Trocar código por token
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${request.nextUrl.origin}/api/google-calendar/callback`;

    if (!clientId || !clientSecret) {
      let redirectPath = '/metaadmin';
      try {
        const parsed = JSON.parse(state || '{}');
        if (parsed.tipo === 'paciente') {
          redirectPath = '/meta';
        }
      } catch {}
      return NextResponse.redirect(
        new URL(`${redirectPath}?error=config_error`, request.nextUrl.origin)
      );
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Erro ao obter token:', error);
      const redirectPath = tipo === 'paciente' ? '/meta' : '/metaadmin';
      return NextResponse.redirect(
        new URL(`${redirectPath}?error=token_error`, request.nextUrl.origin)
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

    // Salvar token
    await GoogleCalendarService.salvarToken({
      userId,
      email,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || '',
      expiresAt,
      sincronizadoEm: new Date()
    });

    // Redirecionar de volta para a página correta com sucesso
    const redirectPath = tipo === 'paciente' ? '/meta' : '/metaadmin';
    return NextResponse.redirect(
      new URL(`${redirectPath}?calendar_sync=success`, request.nextUrl.origin)
    );
  } catch (error) {
    console.error('Erro no callback do Google Calendar:', error);
    // Tentar detectar o tipo pelo userId ou redirecionar para metaadmin por padrão
    try {
      const { tipo } = JSON.parse(state || '{}');
      const redirectPath = tipo === 'paciente' ? '/meta' : '/metaadmin';
      return NextResponse.redirect(
        new URL(`${redirectPath}?error=callback_error`, request.nextUrl.origin)
      );
    } catch {
      return NextResponse.redirect(
        new URL('/metaadmin?error=callback_error', request.nextUrl.origin)
      );
    }
  }
}

