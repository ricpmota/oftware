import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  chooseOutboundChatId,
  destinationKindOf,
  isGetMessageByIdFailure,
  shouldTreatPostSendErrorAsDelivered,
} from '@/lib/whatsapp/wppOutbound';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('chooseOutboundChatId — fluxo conhecido como funcional', () => {
  it('Teste A: número 5583… segue {phone}@c.us quando não há resolução extra', () => {
    const resolved = chooseOutboundChatId({ phoneDigits: '5583988192848' });
    expect(resolved.chatId).toBe('5583988192848@c.us');
    expect(resolved.phoneForSend).toBe('5583988192848');
    expect(resolved.isLid).toBe(false);
    expect(resolved.destinationKind).toBe('c_us');
    expect(resolved.resolvedFrom).toBe('phone_c_us');
  });

  it('Teste B: pn-lid @lid vira destino de envio (backup PN → LID)', () => {
    const resolved = chooseOutboundChatId({
      phoneDigits: '5583988192848',
      pnLidChatId: '279958870077456@lid',
    });
    expect(resolved.chatId).toBe('279958870077456@lid');
    expect(resolved.phoneForSend).toBe('279958870077456');
    expect(resolved.isLid).toBe(true);
    expect(resolved.destinationKind).toBe('lid');
    expect(resolved.resolvedFrom).toBe('pn_lid');
    expect(destinationKindOf(resolved.chatId)).toBe('lid');
  });

  it('Teste B: pn-lid ganha de check-number @c.us', () => {
    const resolved = chooseOutboundChatId({
      phoneDigits: '5583988192848',
      checkNumberChatId: '5583988192848@c.us',
      pnLidChatId: '279958870077456@lid',
    });
    expect(resolved.chatId).toBe('279958870077456@lid');
    expect(resolved.resolvedFrom).toBe('pn_lid');
    expect(resolved.isLid).toBe(true);
  });

  it('Teste C: check-number-status @c.us é usado quando não há pn-lid', () => {
    const resolved = chooseOutboundChatId({
      phoneDigits: '5583988192848',
      checkNumberChatId: '5583988192848@c.us',
    });
    expect(resolved.chatId).toBe('5583988192848@c.us');
    expect(resolved.destinationKind).toBe('c_us');
    expect(resolved.resolvedFrom).toBe('check_number');
    expect(resolved.isLid).toBe(false);
  });
});

describe('pós-envio ambíguo (backup)', () => {
  it('TIMEOUT / SERVER_ERROR / getMessageById não viram falha dura', () => {
    expect(
      shouldTreatPostSendErrorAsDelivered({
        code: 'TIMEOUT',
        message: 'Tempo esgotado ao comunicar com o servidor WPPConnect.',
      }),
    ).toBe(true);
    expect(
      shouldTreatPostSendErrorAsDelivered({
        code: 'SERVER_ERROR',
        message: "Cannot read properties of undefined (reading 'get')",
      }),
    ).toBe(true);
    expect(isGetMessageByIdFailure("Cannot read properties of undefined (reading 'get')")).toBe(true);
    expect(isGetMessageByIdFailure('Número não encontrado no WhatsApp.')).toBe(false);
  });
});

describe('caminho vivo do provider e VM sem overlays', () => {
  it('provider resolve PN → LID, check-number-status e POST /send-message', () => {
    const provider = readRepo('services/whatsappProviderClient.ts');
    expect(provider).toContain('async function resolveWhatsappChatId');
    expect(provider).toContain('/contact/pn-lid/');
    expect(provider).toContain('/check-number-status/');
    expect(provider).toContain('/send-message');
    expect(provider).toContain("result: 'ok_ambiguous'");
    expect(provider).toContain("msg.includes('cannot read properties')");
    expect(provider).not.toContain("from '@/lib/whatsapp/wppOutbound'");
    expect(provider).not.toContain('chooseOutboundChatId');
    expect(provider).not.toContain('pn_lid_ignored');
  });

  it('compose/Dockerfile/config não carregam overlays nem webhook global', () => {
    const compose = readRepo('infra/whatsapp/vm/docker-compose.yml');
    expect(compose).not.toMatch(/^\s*NODE_OPTIONS:/m);
    expect(compose).not.toContain('oftware-preload.js:');
    expect(compose).not.toContain('oftwareInboundHook.js:');
    expect(compose).not.toContain('oftwareOutboundSendTextPatch.js:');

    const dockerfile = readRepo('infra/whatsapp/wppconnect/Dockerfile');
    expect(dockerfile).toContain('COPY config.runtime.js ./dist/config.js');
    expect(dockerfile).not.toContain('COPY overlays/');

    const runtime = readRepo('infra/whatsapp/wppconnect/config.runtime.js');
    expect(runtime).toMatch(/url:\s*null/);
    expect(runtime).toContain('whatsappVersion: null');
    expect(runtime).toContain('autoClose: 0');
    expect(runtime).toContain('deviceSyncTimeout: 0');
    expect(runtime).toContain('disableWelcome: true');
    expect(runtime).not.toContain('oftware-preload');
    expect(runtime).not.toContain('inboundWebhookUrl');
  });
});

describe('Teste D — financeiro intacto', () => {
  it('cobrança WhatsApp continua no sendTestMessage, sem wppOutbound', () => {
    const financeiro = readRepo('services/financeiroCobrancaWhatsappService.ts');
    expect(financeiro).toContain('export async function sendFinanceiroCobrancaWhatsapp');
    expect(financeiro).toContain('sendTestMessage(');
    expect(financeiro).not.toContain("from '@/lib/whatsapp/wppOutbound'");
    expect(financeiro).toContain('canalChatVerified');

    const automatica = readRepo('services/cobrancaAutomaticaWhatsappService.ts');
    expect(automatica).toContain('canalChatVerified');
    expect(automatica).not.toContain("from '@/lib/whatsapp/wppOutbound'");
  });
});

describe('Teste E — canalChatVerified no modelo e na UI', () => {
  it('PacienteCompleto e badge de verificação continuam definidos', () => {
    const verified: PacienteCompleto['canalChatVerified'] = true;
    const verifiedAt: PacienteCompleto['canalChatVerifiedAt'] = new Date();
    const phoneKey: PacienteCompleto['canalChatPhoneKey'] = '5583988192848';
    const chatId: PacienteCompleto['canalChatChatId'] = '5583988192848@c.us';
    expect(verified).toBe(true);
    expect(verifiedAt).toBeInstanceOf(Date);
    expect(phoneKey).toMatch(/^5583/);
    expect(chatId).toContain('@c.us');

    const types = readRepo('types/obesidade.ts');
    expect(types).toContain('canalChatVerified?: boolean');
    expect(types).toContain('canalChatVerifiedAt?: Date');
    expect(types).toContain('canalChatPhoneKey?: string');
    expect(types).toContain('canalChatChatId?: string');

    const badge = readRepo('components/metaadmin/CanalChatVerifiedBadge.tsx');
    expect(badge).toContain('export function CanalChatVerifiedBadge');
    expect(readRepo('app/metaadmin/page.tsx')).toContain('canalChatVerified');
  });
});
