import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISPAROS_WHATSAPP_OWNER, DISPAROS_WHATSAPP_SESSION_ID } from '@/lib/disparos/constants';
import {
  assertDisparosWhatsappSession,
  isDisparosWhatsappSession,
  publicDisparosWhatsappError,
} from '@/lib/disparos/disparosWhatsappGuard';
import { disparosViewFromConnection, formatDisparosConnectedPhone } from '@/lib/disparos/whatsappView';

const OWNED_FILES = [
  'app/api/metaadmingeral/disparos/whatsapp/status/route.ts',
  'app/api/metaadmingeral/disparos/whatsapp/start-session/route.ts',
  'app/api/metaadmingeral/disparos/whatsapp/disconnect/route.ts',
  'lib/server/disparosWhatsapp.server.ts',
];

describe('disparos whatsapp isolation', () => {
  it('aceita somente a sessão exclusiva do módulo', () => {
    expect(isDisparosWhatsappSession(DISPAROS_WHATSAPP_SESSION_ID)).toBe(true);
    expect(isDisparosWhatsappSession('system_canal_chat')).toBe(false);
    expect(isDisparosWhatsappSession('doctor_abc')).toBe(false);
    expect(() => assertDisparosWhatsappSession('system_canal_chat')).toThrow(/Disparos/);
  });

  it('não devolve segredo da VM na mensagem do card', () => {
    expect(publicDisparosWhatsappError(new Error('invalid WPP_SERVER_SECRET_KEY'), 'falhou')).toBe(
      'Não foi possível falar com o servidor do WhatsApp. Tente novamente em instantes.',
    );
  });

  it('formata o telefone conectado e esconde o QR depois de conectar', () => {
    expect(formatDisparosConnectedPhone('5583999998888')).toBe('+55 83 99999-8888');
    const view = disparosViewFromConnection({
      status: 'connected',
      phone: '5583999998888',
      profileName: 'Disparos',
      qrCode: 'data:image/png;base64,abc',
    });
    expect(view.sessionId).toBe(DISPAROS_WHATSAPP_SESSION_ID);
    expect(view.phone).toBe('+55 83 99999-8888');
    expect(view.qrCode).toBeNull();
    expect(DISPAROS_WHATSAPP_OWNER).toBe('disparos');
  });

  it('as rotas novas não citam Canal Chat, envio nem a sessão de outro módulo', () => {
    const banned = [
      'system_canal_chat',
      'canal_chat',
      'canalChat',
      'ensureCanalChatInboundWebhook',
      'maybeNotifyDoctorWhatsappDisconnected',
      'send-message',
      'sendTestMessage',
      'system_disparos',
      "'disparos'",
      '"disparos"',
    ];
    for (const file of OWNED_FILES) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8');
      for (const token of banned) {
        expect(source, `${file} contém ${token}`).not.toContain(token);
      }
    }
    const server = readFileSync(path.join(process.cwd(), 'lib/server/disparosWhatsapp.server.ts'), 'utf8');
    expect(server).toContain('DISPAROS_WHATSAPP_SESSION_ID');
    expect(server).toContain('DISPAROS_WHATSAPP_OWNER');
    expect(server).not.toContain('webhookUrl');
    for (const file of OWNED_FILES.slice(0, 3)) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).toContain('requireMetaAdminGeral');
    }
  });
});
