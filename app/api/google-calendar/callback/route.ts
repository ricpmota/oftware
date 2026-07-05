import { NextRequest, NextResponse } from 'next/server';
import { saveGoogleCalendarTokenAdmin } from '@/lib/google/calendarService';
import { GoogleCalendarService } from '@/services/googleCalendarService';

function redirectPathForTipo(tipo?: string): string {
  if (tipo === 'paciente') return '/meta';
  if (tipo === 'whitelabel') return '/metaadmingeral?menu=leads-whitelabel';
  return '/metaadmin';
}

function buildRedirectUrl(origin: string, tipo: string | undefined, params: Record<string, string>) {
  const url = new URL(redirectPathForTipo(tipo), origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: NextRequest) {
  let tipoFromState: string | undefined;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      try {
        const parsed = JSON.parse(state || '{}') as { tipo?: string };
        tipoFromState = parsed.tipo;
      } catch {}
      return NextResponse.redirect(
        buildRedirectUrl(request.nextUrl.origin, tipoFromState, { error: 'authorization_failed' })
      );
    }

    const { userId, email, tipo } = JSON.parse(state) as {
      userId: string;
      email: string;
      tipo?: string;
    };
    tipoFromState = tipo;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${request.nextUrl.origin}/api/google-calendar/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        buildRedirectUrl(request.nextUrl.origin, tipo, { error: 'config_error' })
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
      return NextResponse.redirect(
        buildRedirectUrl(request.nextUrl.origin, tipo, { error: 'token_error' })
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

    const tokenPayload = {
      userId,
      email,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || '',
      expiresAt,
    };

    await saveGoogleCalendarTokenAdmin(tokenPayload).catch(async () => {
      await GoogleCalendarService.salvarToken({
        ...tokenPayload,
        sincronizadoEm: new Date(),
      });
    });

    return NextResponse.redirect(
      buildRedirectUrl(request.nextUrl.origin, tipo, { calendar_sync: 'success' })
    );
  } catch (error) {
    console.error('Erro no callback do Google Calendar:', error);
    return NextResponse.redirect(
      buildRedirectUrl(request.nextUrl.origin, tipoFromState, { error: 'callback_error' })
    );
  }
}
