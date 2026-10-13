import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toPersistedInternationalPhone } from '@/lib/phone/internationalPhoneValue';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { resolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';
import { resolveWhatsappTestDestination } from '@/lib/whatsapp/resolveWhatsappTestDestination';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('ETAPA 5 — destino canônico da tela de teste', () => {
  it('A — BR default 83988192848 + 55 → 5583988192848', () => {
    expect(
      resolveWhatsappTestDestination({
        telefone: '83988192848',
        telefoneDdi: '55',
        telefonePais: 'BR',
      }),
    ).toBe('5583988192848');
  });

  it('B — BR mascarado (83) 98819-2848 + 55', () => {
    expect(
      resolveWhatsappTestDestination({
        telefone: '(83) 98819-2848',
        telefoneDdi: '55',
        telefonePais: 'BR',
      }),
    ).toBe('5583988192848');
  });

  it('C — EUA 7137326616 + 1 / US → 17137326616', () => {
    expect(
      resolveWhatsappTestDestination({
        telefone: '7137326616',
        telefoneDdi: '1',
        telefonePais: 'US',
      }),
    ).toBe('17137326616');
  });

  it('D — Portugal 912345678 + 351 / PT → 351912345678', () => {
    expect(
      resolveWhatsappTestDestination({
        telefone: '912345678',
        telefoneDdi: '351',
        telefonePais: 'PT',
      }),
    ).toBe('351912345678');
  });

  it('E — troca BR → EUA preserva dígitos nacionais no persistido', () => {
    const br = toPersistedInternationalPhone('BR', '83988192848', '55');
    expect(br).toEqual({ telefone: '83988192848', telefoneDdi: '55', telefonePais: 'BR' });
    const us = toPersistedInternationalPhone('US', br.telefone, '1');
    expect(us.telefone).toBe('83988192848');
    expect(us.telefoneDdi).toBe('1');
    expect(us.telefonePais).toBe('US');
  });

  it('F — troca EUA → BR preserva dígitos nacionais no persistido', () => {
    const us = toPersistedInternationalPhone('US', '7137326616', '1');
    const br = toPersistedInternationalPhone('BR', us.telefone, '55');
    expect(br.telefone).toBe('7137326616');
    expect(br.telefoneDdi).toBe('55');
    expect(br.telefonePais).toBe('BR');
  });

  it('G — número inválido não é válido para envio', () => {
    expect(isValidIdentificacaoPhone({ telefone: '123', telefoneDdi: '55', telefonePais: 'BR' })).toBe(
      false,
    );
    expect(isValidIdentificacaoPhone({ telefone: '', telefoneDdi: '55', telefonePais: 'BR' })).toBe(
      false,
    );
    expect(() =>
      resolveWhatsappTestDestination({ telefone: '123', telefoneDdi: '55', telefonePais: 'BR' }),
    ).toThrow();
  });

  it('H — server resolve dados estruturados (não concatena DDI no browser)', () => {
    const saved = toPersistedInternationalPhone('US', '7137326616', '1');
    expect(saved.telefone).toBe('7137326616');
    expect(saved.telefone).not.toBe('17137326616');
    expect(resolveWhatsappTestDestination(saved)).toBe('17137326616');
  });

  it('J — 17137326616 NÃO vira 5517137326616 quando DDI é 1', () => {
    const canonical = resolveWhatsappTestDestination({
      telefone: '7137326616',
      telefoneDdi: '1',
      telefonePais: 'US',
    });
    expect(canonical).toBe('17137326616');
    expect(canonical).not.toBe('5517137326616');
    expect(canonical).not.toBe('557137326616');
    expect(canonical.startsWith('55')).toBe(false);
  });

  it('não usa telefoneE164 do input — E164 no payload é ignorado', () => {
    const sneaky = {
      telefone: '7137326616',
      telefoneDdi: '1',
      telefonePais: 'US',
      telefoneE164: '5517137326616',
    };
    expect(resolveWhatsappTestDestination(sneaky)).toBe('17137326616');
  });
});

describe('ETAPA 5 — wiring UI / API / sendTestMessage', () => {
  it('I — serviço resolve no server e chama sendTestMessage com phoneIsResolved: true', () => {
    const service = readRepo('services/whatsappSendTestService.ts');
    expect(service).toContain('resolveWhatsappTestDestination');
    expect(service).toContain('phoneIsResolved: true');
    expect(service).not.toContain('normalizeWhatsappPhone(');
  });

  it('endpoint automacoes aceita telefone+DDI e ignora phoneIsResolved do client', () => {
    const route = readRepo('app/api/metaadmingeral/automacoes/whatsapp/send-test/route.ts');
    expect(route).toContain('telefoneDdi');
    expect(route).toContain('telefonePais');
    expect(route).not.toMatch(/body\?\.phoneIsResolved/);
    expect(route).not.toContain('phoneIsResolved:');
  });

  it('UI reutiliza InternationalPhoneInput (não cria outro seletor)', () => {
    const ui = readRepo('components/metaadmingeral/automacoes/AutomacoesDashboardPanel.tsx');
    expect(ui).toContain("from '@/components/phone/InternationalPhoneInput'");
    expect(ui).toContain('<InternationalPhoneInput');
    expect(ui.match(/InternationalPhoneInput/g)?.length).toBeGreaterThanOrEqual(2);
    expect(ui).toContain('telefoneDdi');
    expect(ui).toContain('telefonePais');
    expect(ui).toContain('isValidIdentificacaoPhone');
  });

  it('não persiste telefone de teste em Firestore de paciente/médico/conexão', () => {
    const ui = readRepo('components/metaadmingeral/automacoes/AutomacoesDashboardPanel.tsx');
    const route = readRepo('app/api/metaadmingeral/automacoes/whatsapp/send-test/route.ts');
    const service = readRepo('services/whatsappSendTestService.ts');
    for (const src of [ui, route, service]) {
      expect(src).not.toContain('pacientes_completos');
      expect(src).not.toContain('updateDoc');
    }
  });

  it('WPPConnect segue no mesmo POST /send-message', () => {
    const provider = readRepo('services/whatsappProviderClient.ts');
    expect(provider).toContain('/api/${encodeURIComponent(sessionId)}/send-message');
  });
});

describe('ETAPA 5 — K regressão das Etapas 1–4', () => {
  it('resolver central e wa.me continuam corretos para US/BR/PT', () => {
    expect(resolveInternationalPhone({ telefone: '83988192848' })).toBe('5583988192848');
    expect(
      resolveInternationalPhone({ telefone: '7137326616', telefoneDdi: '1' }),
    ).toBe('17137326616');
    expect(
      resolveInternationalPhone({ telefone: '912345678', telefoneDdi: '351' }),
    ).toBe('351912345678');
    expect(
      buildWhatsappUrl({ telefone: '7137326616', telefoneDdi: '1' }),
    ).toBe('https://wa.me/17137326616');
  });
});
