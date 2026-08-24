import { NextRequest, NextResponse } from 'next/server';
import { processCanalChatInbound } from '@/services/canalChatInboundService';
import { readWebhookSecret, webhookSecretsMatch } from '@/lib/whatsapp/webhookSecret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/whatsapp/inbound
 * Webhook autenticado WPPConnect (VM) → Oftware.
 * Nesta etapa processa apenas confirmação OK do Canal Chat.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.WHATSAPP_INBOUND_WEBHOOK_SECRET?.trim() ?? '';
  if (!expected) {
    console.warn('[CanalChatInbound]', { reason: 'webhook_nao_configurado' });
    return NextResponse.json({ ok: false, error: 'Webhook não configurado.' }, { status: 503 });
  }

  const received = readWebhookSecret(request);
  if (!webhookSecretsMatch(expected, received)) {
    const hasQuery =
      Boolean(request.nextUrl.searchParams.get('secret') || request.nextUrl.searchParams.get('token')) ||
      request.url.includes('secret=') ||
      request.url.includes('token=');
    console.warn('[CanalChatInbound]', {
      reason: 'unauthorized',
      hasQuerySecret: hasQuery,
      hasHeader: Boolean(request.headers.get('x-webhook-secret') || request.headers.get('authorization')),
    });
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  try {
    const result = await processCanalChatInbound(payload);
    console.info('[whatsapp/inbound]', {
      status: result.status,
      reason: result.status === 'ignored' ? result.reason : undefined,
      patientId: result.status === 'ignored' ? undefined : result.patientId,
      keys: Object.keys(payload as Record<string, unknown>).slice(0, 12),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[whatsapp/inbound]', error instanceof Error ? error.message : 'erro');
    return NextResponse.json({ ok: false, error: 'Erro ao processar webhook.' }, { status: 500 });
  }
}
