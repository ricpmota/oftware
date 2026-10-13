import { describe, expect, it } from 'vitest';
import {
  classifyHydrationCheckInDenial,
  classifyHydrationCheckInToken,
  hydrationAllowedDatesKey,
  hydrationCheckInDefaultAllowedDates,
  hydrationCheckInLinkIsReusable,
  hydrationCheckInLinkIsUsable,
  isHydrationCheckInShortToken,
  isValidHydrationCheckInToken,
} from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import {
  hydrationCheckInAmountClosestToGoal,
  hydrationCheckInQuickAmounts,
  hydrationCheckInStartStep,
} from '@/lib/nutri/hidratacao/hydrationCheckInAmounts';
import { buildHydrationCheckInSuccessCopy } from '@/lib/nutri/hidratacao/hydrationCheckInCopy';
import { generateHydrationCheckInToken, hashHydrationCheckInToken } from '@/lib/nutri/hidratacao/hydrationCheckInToken';
import { generatePublicLinkToken, PUBLIC_LINK_TOKEN_LENGTH } from '@/lib/publicLinks/publicLinkToken';
import { hydrationWriteDateDenied } from '@/lib/nutri/hidratacao/hydrationPolicy';

describe('hydration check-in dates', () => {
  it('autoriza os dois últimos dias civis completos, sem o dia em andamento', () => {
    const noonSp = new Date('2026-08-31T15:00:00.000Z');
    expect(hydrationCheckInDefaultAllowedDates(noonSp)).toEqual(['2026-08-29', '2026-08-30']);
  });

  it('no dia ímpar reusa o período do ciclo, igual à automação', () => {
    const oddNoonSp = new Date('2026-09-01T15:00:00.000Z');
    expect(hydrationCheckInDefaultAllowedDates(oddNoonSp)).toEqual(['2026-08-29', '2026-08-30']);
  });

  it('não amplia a janela do portal autenticado', () => {
    const noonSp = new Date('2026-08-31T15:00:00.000Z');
    expect(
      hydrationWriteDateDenied({ actor: 'patient_portal', date: '2026-08-29', now: noonSp })
    ).toBeTruthy();
    expect(
      hydrationWriteDateDenied({
        actor: 'whatsapp_checkin',
        date: '2026-08-29',
        allowedDates: ['2026-08-29', '2026-08-30'],
      })
    ).toBeNull();
    expect(
      hydrationWriteDateDenied({
        actor: 'whatsapp_checkin',
        date: '2026-08-31',
        allowedDates: ['2026-08-29', '2026-08-30'],
      })
    ).toBe('Esta data não está autorizada neste check-in.');
  });
});

describe('hydration check-in token', () => {
  it('A. token curto de 8 chars do helper público é válido', () => {
    const token = generatePublicLinkToken();
    expect(token).toHaveLength(PUBLIC_LINK_TOKEN_LENGTH);
    expect(classifyHydrationCheckInToken(token)).toBe('short');
    expect(isValidHydrationCheckInToken(token)).toBe(true);
    expect(isHydrationCheckInShortToken(token.toLowerCase())).toBe(true);
  });

  it('B. token legado longo (hash 64 e secreto 32) continua válido', () => {
    const secret = generateHydrationCheckInToken();
    expect(secret).toHaveLength(32);
    expect(classifyHydrationCheckInToken(secret)).toBe('secret');
    expect(isValidHydrationCheckInToken(secret)).toBe(true);
    const hash = hashHydrationCheckInToken(secret);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(classifyHydrationCheckInToken(hash)).toBe('hash');
    expect(isValidHydrationCheckInToken(hash)).toBe(true);
  });

  it('C. token inválido não é aceito', () => {
    expect(classifyHydrationCheckInToken('')).toBe('invalid');
    expect(classifyHydrationCheckInToken('abc')).toBe('invalid');
    expect(isValidHydrationCheckInToken('not-a-token')).toBe(false);
  });

  it('reusa só o mesmo paciente + mesmas datas + ainda válido', () => {
    const expiresAt = new Date('2026-09-07T12:00:00.000Z');
    const now = new Date('2026-08-31T15:00:00.000Z');
    const key = hydrationAllowedDatesKey(['2026-08-30', '2026-08-29']);
    const base = {
      purpose: 'hydration_checkin' as const,
      status: 'active' as const,
      expiresAt,
      allowedDatesKey: key,
      patientId: 'p1',
    };
    expect(hydrationCheckInLinkIsReusable(base, { patientId: 'p1', allowedDatesKey: key }, now)).toBe(true);
    expect(hydrationCheckInLinkIsReusable({ ...base, status: 'completed' }, { patientId: 'p1', allowedDatesKey: key }, now)).toBe(true);
    expect(hydrationCheckInLinkIsReusable({ ...base, status: 'revoked' }, { patientId: 'p1', allowedDatesKey: key }, now)).toBe(false);
    expect(hydrationCheckInLinkIsReusable(base, { patientId: 'p2', allowedDatesKey: key }, now)).toBe(false);
    expect(
      hydrationCheckInLinkIsUsable(base, new Date('2026-09-08T12:00:00.000Z'))
    ).toBe(false);
  });

  it('não diferencia token inexistente de revogado', () => {
    expect(
      classifyHydrationCheckInDenial({ found: false, purposeOk: false, status: null, expiresAt: null })
    ).toBe('unavailable');
    expect(
      classifyHydrationCheckInDenial({
        found: true,
        purposeOk: true,
        status: 'revoked',
        expiresAt: new Date('2026-09-10'),
      })
    ).toBe('unavailable');
    expect(
      classifyHydrationCheckInDenial({
        found: true,
        purposeOk: true,
        status: 'active',
        expiresAt: new Date('2026-08-01'),
        now: new Date('2026-08-31'),
      })
    ).toBe('expired');
  });
});

describe('hydration check-in suggestions and copy', () => {
  it('gera atalhos em torno da meta', () => {
    expect(hydrationCheckInQuickAmounts(2503)).toEqual([1000, 1500, 2000, 2500, 3000]);
    const for3200 = hydrationCheckInQuickAmounts(3200);
    expect(for3200).toHaveLength(5);
    expect(for3200).toContain(3200);
    expect(for3200[0]).toBeLessThan(3200);
    expect(for3200[4]).toBeGreaterThan(3200);
  });

  it('escolhe a mensagem de sucesso sem tom punitivo', () => {
    const all = buildHydrationCheckInSuccessCopy([
      { date: '2026-08-29', weekdayLabel: 'Sábado', goalReached: true, percentage: 100, consumedMl: 2500 },
      { date: '2026-08-30', weekdayLabel: 'Domingo', goalReached: true, percentage: 112, consumedMl: 2800 },
    ]);
    expect(all.title).toContain('Check-in enviado');

    const mixed = buildHydrationCheckInSuccessCopy([
      { date: '2026-08-29', weekdayLabel: 'Sábado', goalReached: true, percentage: 100, consumedMl: 2500 },
      { date: '2026-08-30', weekdayLabel: 'Domingo', goalReached: false, percentage: 80, consumedMl: 2000 },
    ]);
    expect(mixed.rows).toHaveLength(2);
    expect(mixed.rows[1]?.detail).toContain('80% da meta');
    expect(mixed.rows[0]?.detail).toContain('Meta atingida');

    const none = buildHydrationCheckInSuccessCopy([
      { date: '2026-08-29', weekdayLabel: 'Sábado', goalReached: false, percentage: 40, consumedMl: 1000 },
    ]);
    expect(none.title).toContain('Check-in enviado');
    expect(none.paragraphs.join(' ')).not.toMatch(/falhou|ruim|errado/i);
  });
});

describe('hydration check-in UX helpers', () => {
  it('A/C. começa no primeiro dia pendente', () => {
    expect(hydrationCheckInStartStep([{ registered: false }, { registered: false }])).toBe(0);
    expect(hydrationCheckInStartStep([{ registered: true }, { registered: false }])).toBe(1);
  });

  it('D. dois dias preenchidos → done', () => {
    expect(hydrationCheckInStartStep([{ registered: true }, { registered: true }])).toBe('done');
  });

  it('marca a opção mais próxima da meta', () => {
    expect(hydrationCheckInAmountClosestToGoal([1000, 1500, 2000, 2500, 3000], 2503)).toBe(2500);
  });
});
