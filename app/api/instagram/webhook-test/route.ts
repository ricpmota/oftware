import { NextResponse } from 'next/server';
import { logIncomingInstagramMessages } from '@/lib/instagram/webhookMessaging';

/** Diagnóstico temporário: exercita a mesma extração/log do POST do webhook. Remover quando não precisar. */
export const dynamic = 'force-dynamic';

const INTERNAL_TEST_PAYLOAD = {
  entry: [
    {
      id: 'page',
      messaging: [
        {
          sender: { id: 'usuario123' },
          recipient: { id: 'pagina123' },
          message: { text: 'teste instagram via rota interna' },
          timestamp: 1710000000,
        },
      ],
    },
  ],
};

export async function GET() {
  console.log('Instagram webhook internal test');
  console.log('messageText teste instagram via rota interna');
  logIncomingInstagramMessages(INTERNAL_TEST_PAYLOAD);

  return NextResponse.json(
    {
      ok: true,
      hint: 'Verifique os logs do servidor (ex.: Vercel Runtime Logs) para Instagram message received.',
    },
    { status: 200 },
  );
}
