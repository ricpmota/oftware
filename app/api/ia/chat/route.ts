import { NextRequest, NextResponse } from 'next/server';
import { orchestrate, type IARole } from '@/lib/ia/orchestrate';
import { buildSystemPrompt, parseContextSurface } from '@/lib/ia/buildSystemPrompt';
import { callLLM, type ChatTurn } from '@/lib/ia/callLLM';

export const runtime = 'nodejs';

const MAX_MESSAGE_LEN = 4000;
const MAX_HISTORY = 20;
const MAX_BODY_JSON = 120_000;

function isValidRole(s: string | undefined): s is IARole {
  return (
    s === 'paciente' ||
    s === 'medico' ||
    s === 'nutricionista' ||
    s === 'personal' ||
    s === 'lead' ||
    s === 'desconhecido'
  );
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatTurn[] = [];
  for (const item of raw) {
    if (out.length >= MAX_HISTORY) break;
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: string }).role;
    const content = (item as { content?: string }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const t = content.trim();
    if (!t) continue;
    out.push({ role, content: t.slice(0, MAX_MESSAGE_LEN) });
  }
  return out;
}

export async function POST(request: NextRequest) {
  if (process.env.OFTWARE_IA_CHAT_ENABLED === 'false') {
    return NextResponse.json({ error: 'Chat desativado.' }, { status: 503 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_JSON) {
      return NextResponse.json({ error: 'Corpo muito grande.' }, { status: 413 });
    }
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const b = body as {
    message?: unknown;
    messages?: unknown;
    roleHint?: unknown;
    contextSurface?: unknown;
    visitorMeta?: unknown;
  };

  if (typeof b.message !== 'string' || !b.message.trim()) {
    return NextResponse.json({ error: 'Campo "message" é obrigatório.' }, { status: 400 });
  }

  const message = b.message.trim().slice(0, MAX_MESSAGE_LEN);
  const history = sanitizeHistory(b.messages);
  const roleHint = typeof b.roleHint === 'string' && isValidRole(b.roleHint) ? b.roleHint : undefined;
  const contextSurface = parseContextSurface(b.contextSurface);

  let strategy = orchestrate(message, roleHint ? { roleHint } : undefined);
  if (contextSurface === 'meta_paciente') {
    strategy = { ...strategy, role: 'paciente' };
  } else if (contextSurface === 'metaadmin_medico') {
    strategy = { ...strategy, role: 'medico' };
  } else if (contextSurface === 'rafaela_public') {
    strategy = {
      ...strategy,
      role: 'lead',
      mode: 'suporte',
      tone: 'acolhedor',
      length: 'medio',
    };
  }

  let systemPrompt = buildSystemPrompt(strategy, contextSurface);

  if (contextSurface === 'rafaela_public' && b.visitorMeta && typeof b.visitorMeta === 'object') {
    const vm = b.visitorMeta as { name?: unknown; phone?: unknown };
    const vn = typeof vm.name === 'string' ? vm.name.trim().slice(0, 120).replace(/\s+/g, ' ') : '';
    const vp = typeof vm.phone === 'string' ? vm.phone.trim().slice(0, 40).replace(/\s+/g, ' ') : '';
    if (vn && vp) {
      systemPrompt += `\n\n[Identificação do visitante nesta sessão]\nNome: ${vn}\nTelefone/WhatsApp: ${vp}\nNão peça de novo nome e telefone; já constam aqui.`;
    }
  }

  const turns: ChatTurn[] = [...history, { role: 'user', content: message }];

  try {
    const reply = await callLLM(systemPrompt, turns);
    return NextResponse.json({
      reply,
      meta: {
        mode: strategy.mode,
        role: strategy.role,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao gerar resposta.';
    console.error('[api/ia/chat]', msg);
    return NextResponse.json(
      { error: 'Não foi possível obter resposta agora. Tente em instantes ou verifique a configuração do provedor (OpenAI ou Vertex).' },
      { status: 502 }
    );
  }
}
