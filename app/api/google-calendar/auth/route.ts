import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const redirectUri = searchParams.get('redirectUri') || `${request.nextUrl.origin}/api/google-calendar/callback`;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Construir URL de autorização do Google OAuth 2.0
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'GOOGLE_CLIENT_ID não configurado' },
        { status: 500 }
      );
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', JSON.stringify({ userId, email }));

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar URL de autorização' },
      { status: 500 }
    );
  }
}

