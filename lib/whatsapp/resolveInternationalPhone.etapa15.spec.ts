import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sendTestMessage } from '@/services/whatsappProviderClient';
import {
  assertCanonicalWhatsappPhone,
  resolveInternationalPhoneFromIdentificacao,
  resolvePhoneForWhatsappSend,
  tryResolvePhoneFromPacienteDoc,
} from '@/lib/whatsapp/resolveInternationalPhone';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const prevMock = process.env.WHATSAPP_MOCK_MODE;
const prevUrl = process.env.WPP_SERVER_URL;

function forceMockSend(): void {
  process.env.WHATSAPP_MOCK_MODE = 'true';
  delete process.env.WPP_SERVER_URL;
}

afterEach(() => {
  if (prevMock === undefined) delete process.env.WHATSAPP_MOCK_MODE;
  else process.env.WHATSAPP_MOCK_MODE = prevMock;
  if (prevUrl === undefined) delete process.env.WPP_SERVER_URL;
  else process.env.WPP_SERVER_URL = prevUrl;
});

async function sendMock(phone: string, phoneIsResolved?: boolean) {
  forceMockSend();
  return sendTestMessage('sess_test', 'tok', phone, 'mensagem de teste', {
    phoneIsResolved,
  });
}

describe('ETAPA 1.5 — A/B legado cru e mascarado', () => {
  it('A) 83988192848 → 5583988192848 (sendTestMessage legado)', async () => {
    expect(resolvePhoneForWhatsappSend('83988192848', false)).toBe('5583988192848');
    const sent = await sendMock('83988192848');
    expect(sent.phone).toBe('5583988192848');
  });

  it('B) (83) 98819-2848 → 5583988192848', async () => {
    expect(resolvePhoneForWhatsappSend('(83) 98819-2848', false)).toBe('5583988192848');
    const sent = await sendMock('(83) 98819-2848');
    expect(sent.phone).toBe('5583988192848');
  });
});

describe('ETAPA 1.5 — C/D/F/G/H dadosIdentificacao estruturado', () => {
  it('C) brasileiro explícito ddi 55 + 83988192848', () => {
    expect(
      resolveInternationalPhoneFromIdentificacao({
        telefone: '83988192848',
        telefoneDdi: '55',
      }),
    ).toBe('5583988192848');
    expect(
      tryResolvePhoneFromPacienteDoc({
        dadosIdentificacao: { telefone: '83988192848', telefoneDdi: '55' },
      }),
    ).toBe('5583988192848');
  });

  it('D) EUA estruturado ddi 1 + 7137326616', () => {
    expect(
      tryResolvePhoneFromPacienteDoc({
        dadosIdentificacao: { telefone: '7137326616', telefoneDdi: '1' },
      }),
    ).toBe('17137326616');
  });

  it('F) Portugal ddi 351 + 912345678', () => {
    expect(
      tryResolvePhoneFromPacienteDoc({
        dadosIdentificacao: { telefone: '912345678', telefoneDdi: '351' },
      }),
    ).toBe('351912345678');
  });

  it('G) telefoneE164 EUA tem prioridade e não ganha 55', () => {
    expect(
      tryResolvePhoneFromPacienteDoc({
        dadosIdentificacao: {
          telefone: '7137326616',
          telefoneDdi: '1',
          telefoneE164: '17137326616',
        },
      }),
    ).toBe('17137326616');
  });

  it('H) telefoneE164 BR permanece 5583988192848', () => {
    expect(
      tryResolvePhoneFromPacienteDoc({
        dadosIdentificacao: { telefoneE164: '5583988192848' },
      }),
    ).toBe('5583988192848');
  });

  it('paciente legado só com telefone nacional continua BR', () => {
    expect(
      tryResolvePhoneFromPacienteDoc({
        dadosIdentificacao: { telefone: '83988192848' },
      }),
    ).toBe('5583988192848');
  });
});

describe('ETAPA 1.5 — E/I/J telefone já resolvido (send + fila)', () => {
  it('E) EUA já resolvido 17137326616 chega ao WPPConnect sem 55', async () => {
    expect(assertCanonicalWhatsappPhone('17137326616')).toBe('17137326616');
    expect(resolvePhoneForWhatsappSend('17137326616', true)).toBe('17137326616');
    const sent = await sendMock('17137326616', true);
    expect(sent.phone).toBe('17137326616');
    expect(sent.phone).not.toBe('5517137326616');
  });

  it('sem phoneIsResolved, 17137326616 ainda é legado BR (API cru, sem DDI)', async () => {
    const sent = await sendMock('17137326616');
    expect(sent.phone).toBe('5517137326616');
  });

  it('I) fila EUA 17137326616 não recebe 55 no consumo', () => {
    const queuePhone = '17137326616';
    expect(resolvePhoneForWhatsappSend(queuePhone, true)).toBe('17137326616');
  });

  it('J) fila antiga BR 5583988192848 permanece igual', () => {
    const queuePhone = '5583988192848';
    expect(resolvePhoneForWhatsappSend(queuePhone, true)).toBe('5583988192848');
  });
});

describe('ETAPA 1.5 — wiring: sendTestMessage / fila / extractores', () => {
  it('sendTestMessage usa resolvePhoneForWhatsappSend + phoneIsResolved', () => {
    const provider = readRepo('services/whatsappProviderClient.ts');
    expect(provider).toContain('resolvePhoneForWhatsappSend(phone, options?.phoneIsResolved === true)');
    expect(provider).toContain('phoneIsResolved?: boolean');
  });

  it('router de automação marca o telefone como já resolvido', () => {
    const router = readRepo('services/whatsappPatientSendRouter.ts');
    expect(router).toContain('phoneIsResolved: true');
    expect(router.match(/phoneIsResolved: true/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('consumidor da fila envia item.phone pelo router (canônico)', () => {
    const reminders = readRepo('services/whatsappRemindersService.ts');
    expect(reminders).toContain('tryResolvePhoneFromPacienteDoc');
    expect(reminders).toContain('await sendPatientAutomationWhatsapp({');
    expect(reminders).toContain('phone: item.phone,');
  });

  it('tela de teste resolve no servidor e envia canônico (Etapa 5)', () => {
    const testUi = readRepo('services/whatsappSendTestService.ts');
    expect(testUi).toContain('resolveWhatsappTestDestination');
    expect(testUi).toContain('phoneIsResolved: true');
  });

  it('inbound do Canal Chat não reaplica a heurística 10/11 = Brasil', () => {
    const inbound = readRepo('services/canalChatInboundService.ts');
    const match = readRepo('lib/whatsapp/canalChatInboundPhoneMatch.ts');
    expect(inbound).toContain('assertCanonicalWhatsappPhone');
    expect(inbound).toContain('inboundPatientMatchesCanonical');
    expect(match).toContain('tryResolvePhoneFromPacienteDoc');
    expect(inbound).not.toContain('normalizeWhatsappPhone');
  });
});
