import { describe, expect, it } from 'vitest';
import { CHECK_IN_SEMANAL_QUESTIONS } from '@/lib/aplicacao/checkInSemanalQuestions';
import { calcularScoreCheckInSemanalNutri } from '@/lib/nutri/calcularScoreCheckInSemanalNutri';
import { parseCheckInSemanalNutriPublicAnswers } from '@/lib/nutri/checkInSemanalNutriAnswersSchema';
import { CHECK_IN_DIARIO_NUTRI_ENABLED } from '@/lib/nutri/checkInSemanalNutriCapabilities';
import { mergeCheckInSemanalNutriWrite } from '@/lib/nutri/checkInSemanalNutriMerge';
import { buildCheckInSemanalNutriRecord, serializeCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriPersist';
import { buildNutriCheckInPublicDados } from '@/lib/nutri/checkInSemanalNutriPublicDados';
import {
  assertNutriCheckInPublicDadosPrivacy,
  canCopyNutriCheckInPublicLink,
  canCreateNutriCheckInPublicLink,
  generateNutriCheckInPublicToken,
  isValidNutriCheckInPublicToken,
  NUTRI_CHECKIN_LINKS_COLLECTION,
  nutriCheckInPublicLinkKey,
  nutriCheckInPublicPath,
  primeiroNomePublico,
} from '@/lib/nutri/checkInSemanalNutriPublicLink';
import { CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION, checkInSemanalNutriDocSegments } from '@/lib/nutri/checkInSemanalNutriTypes';
import { CHECK_IN_SEMANAL_NUTRI_QUESTIONS } from '@/lib/nutri/checkInSemanalNutriQuestions';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { ensureNutriCheckInPublicLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';

const WEEK = getNutritionWeek('2026-08-17');

function answersPayload(overrides: Record<string, unknown> = {}) {
  return {
    aderenciaPlano: 80,
    diasProteinaMeta: 5,
    diasFrutasVegetais: 4,
    alimentacaoForaPlano: 'pouca',
    diasMetaAgua: 6,
    nauseas: 'leve',
    constipacao: 'nenhum',
    diarreia: 'nenhum',
    energiaSemana: 4,
    sessoesAtividadeFisica: 3,
    principalDificuldadeTipo: 'falta_tempo',
    principalConquistaTipo: 'hidratacao',
    ...overrides,
  };
}

function createMemoryFirestore() {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  const col = (name: string) => {
    if (!collections.has(name)) collections.set(name, new Map());
    const docs = collections.get(name)!;
    return {
      where: (field: string, _op: string, value: unknown) => ({
        limit: () => ({
          get: async () => {
            const matches = [...docs.entries()].filter(([, data]) => data[field] === value);
            return {
              empty: matches.length === 0,
              docs: matches.map(([id, data]) => ({
                id,
                data: () => data,
                ref: {
                  update: async (patch: Record<string, unknown>) => {
                    docs.set(id, { ...data, ...patch });
                  },
                },
              })),
            };
          },
        }),
      }),
      doc: (id: string) => ({
        create: async (payload: Record<string, unknown>) => {
          if (docs.has(id)) {
            throw Object.assign(new Error('already-exists'), { code: 6 });
          }
          docs.set(id, { ...payload });
        },
        get: async () => ({
          exists: docs.has(id),
          id,
          data: () => docs.get(id),
        }),
        update: async (patch: Record<string, unknown>) => {
          const current = docs.get(id);
          if (!current) throw new Error('missing');
          docs.set(id, { ...current, ...patch });
        },
      }),
    };
  };
  return { collection: col, _docs: collections };
}

describe('ETAPA 05 — identidade do link', () => {
  it('chave idempotente é nutritionistId_patientId_weekKey', () => {
    expect(nutriCheckInPublicLinkKey('nutri_123', 'pac_456', '2026-08-17')).toBe(
      'nutri_123_pac_456_2026-08-17'
    );
  });

  it('outro nutricionista gera identidade diferente para o mesmo paciente/semana', () => {
    const a = nutriCheckInPublicLinkKey('nutri_a', 'pac_456', '2026-08-17');
    const b = nutriCheckInPublicLinkKey('nutri_b', 'pac_456', '2026-08-17');
    expect(a).not.toBe(b);
  });

  it('collection própria, sem reutilizar aplicacao_links', () => {
    expect(NUTRI_CHECKIN_LINKS_COLLECTION).toBe('nutri_checkin_links');
    expect(NUTRI_CHECKIN_LINKS_COLLECTION).not.toBe('aplicacao_links');
    expect(nutriCheckInPublicPath('ABC23456')).toBe('/checkin-nutri/ABC23456');
  });
});

describe('ETAPA 05 — token', () => {
  it('gera token aleatório curto, sem IDs na URL', () => {
    const token = generateNutriCheckInPublicToken();
    expect(isValidNutriCheckInPublicToken(token)).toBe(true);
    expect(token).not.toContain('pac_456');
    expect(token).not.toContain('2026-08-17');
    expect(token).not.toMatch(/ricardo/i);
  });

  it('ensure reutiliza o mesmo token para a mesma tríade', async () => {
    const db = createMemoryFirestore();
    const first = await ensureNutriCheckInPublicLink(db as never, {
      nutritionistId: 'nutri_123',
      patientId: 'pac_456',
      weekKey: '2026-08-17',
    });
    const second = await ensureNutriCheckInPublicLink(db as never, {
      nutritionistId: 'nutri_123',
      patientId: 'pac_456',
      weekKey: '2026-08-17',
    });
    expect(second.token).toBe(first.token);
    expect(second.created).toBe(false);
    expect(first.created).toBe(true);
  });

  it('nova weekKey gera novo token', async () => {
    const db = createMemoryFirestore();
    const a = await ensureNutriCheckInPublicLink(db as never, {
      nutritionistId: 'nutri_123',
      patientId: 'pac_456',
      weekKey: '2026-08-17',
    });
    const b = await ensureNutriCheckInPublicLink(db as never, {
      nutritionistId: 'nutri_123',
      patientId: 'pac_456',
      weekKey: '2026-08-24',
    });
    expect(b.token).not.toBe(a.token);
    expect(a.link.weekKey).toBe('2026-08-17');
    expect(b.link.weekKey).toBe('2026-08-24');
  });

  it('não cria documento clínico ao gerar o link', async () => {
    const db = createMemoryFirestore();
    await ensureNutriCheckInPublicLink(db as never, {
      nutritionistId: 'nutri_123',
      patientId: 'pac_456',
      weekKey: '2026-08-17',
    });
    expect(db._docs.has('pacientes_completos')).toBe(false);
    expect(db._docs.get('nutri_checkin_links')?.size).toBe(1);
  });
});

describe('ETAPA 05 — GET contexto / privacidade', () => {
  it('primeiro nome sem expor o restante', () => {
    expect(primeiroNomePublico('Ricardo Mota da Silva')).toBe('Ricardo');
  });

  it('payload público não inclui PHI administrativo', () => {
    const payload = buildNutriCheckInPublicDados({
      week: WEEK,
      patientName: 'Ricardo Mota',
      nutritionistName: 'Ana Nutri',
      aguaDia_ml: 2500,
      alreadyCompleted: false,
    });
    expect(payload.patient.firstName).toBe('Ricardo');
    expect(payload.context.aguaDia_ml).toBe(2500);
    expect(payload.week.label).toMatch(/17 a 23 de agosto/);
    expect(assertNutriCheckInPublicDadosPrivacy(payload as unknown as Record<string, unknown>)).toEqual([]);
    expect(payload).not.toHaveProperty('cpf');
    expect(payload).not.toHaveProperty('telefone');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('patientId');
  });
});

describe('ETAPA 05 — validação POST', () => {
  it('aceita payload V2 e ignora score/weekKey/patientId do cliente', () => {
    const answers = parseCheckInSemanalNutriPublicAnswers({
      ...answersPayload(),
      score: 1,
      weekKey: '1999-01-01',
      patientId: 'outro',
      nutritionistId: 'intruso',
    });
    expect(answers.aderenciaPlano).toBe(80);
    expect((answers as { score?: number }).score).toBeUndefined();
    expect((answers as { weekKey?: string }).weekKey).toBeUndefined();
    expect((answers as { patientId?: string }).patientId).toBeUndefined();
    const backendScore = calcularScoreCheckInSemanalNutri(answers).score;
    expect(backendScore).not.toBe(1);
    expect(backendScore).toBeGreaterThan(1);
  });

  it('exige texto quando dificuldade/conquista = outra', () => {
    expect(() =>
      parseCheckInSemanalNutriPublicAnswers(
        answersPayload({ principalDificuldadeTipo: 'outra', principalDificuldadeOutra: '' })
      )
    ).toThrow();
    const ok = parseCheckInSemanalNutriPublicAnswers(
      answersPayload({
        principalDificuldadeTipo: 'outra',
        principalDificuldadeOutra: 'viagem',
        principalConquistaTipo: 'outra',
        principalConquistaOutra: 'comi em casa',
      })
    );
    expect(ok.principalDificuldade).toBe('viagem');
    expect(ok.principalConquista).toBe('comi em casa');
  });
});

describe('ETAPA 05 — persistência canônica', () => {
  it('documento clínico usa checkinsSemanais/{weekKey}', () => {
    const segments = checkInSemanalNutriDocSegments('pac_456', WEEK.weekKey);
    expect(segments).toEqual([
      'pacientes_completos',
      'pac_456',
      'nutricao',
      'dados',
      'checkinsSemanais',
      '2026-08-17',
    ]);
  });

  it('grava autoria patient_public_link e preserva scheduledDate no merge', () => {
    const record = buildCheckInSemanalNutriRecord({
      pacienteId: 'pac_456',
      week: WEEK,
      answers: parseCheckInSemanalNutriPublicAnswers(answersPayload()),
      score: calcularScoreCheckInSemanalNutri(parseCheckInSemanalNutriPublicAnswers(answersPayload())).score,
      answeredBy: 'patient',
      source: 'patient_public_link',
      nutritionistId: 'nutri_123',
      scheduledDate: '2026-08-23',
    });
    expect(record.answeredBy).toBe('patient');
    expect(record.source).toBe('patient_public_link');
    expect(record.nutritionistId).toBe('nutri_123');
    expect(record.scheduledDate).toBe('2026-08-23');
    expect(record.answeredById).toBeUndefined();

    const merged = mergeCheckInSemanalNutriWrite(
      serializeCheckInSemanalNutri({ ...record, scheduledDate: undefined }),
      { scheduledDate: '2026-08-23', createdAt: record.createdAt }
    );
    expect(merged.scheduledDate).toBe('2026-08-23');
    expect(merged.createdAt).toEqual(record.createdAt);
    expect(serializeCheckInSemanalNutri(record).createdAt).toBeInstanceOf(Date);
  });
});

describe('ETAPA 05 — calendário', () => {
  it('Copiar link só no card não concluído com scheduledDate <= hoje', () => {
    expect(
      canCopyNutriCheckInPublicLink({
        status: 'pending',
        scheduledDate: '2026-08-17',
        todayYmd: '2026-08-17',
      })
    ).toBe(true);
    expect(
      canCopyNutriCheckInPublicLink({
        status: 'upcoming',
        scheduledDate: '2026-08-23',
        todayYmd: '2026-08-17',
      })
    ).toBe(false);
    expect(
      canCopyNutriCheckInPublicLink({
        status: 'completed',
        scheduledDate: '2026-08-17',
        todayYmd: '2026-08-17',
      })
    ).toBe(false);
  });
});

describe('ETAPA 05 — segurança da criação', () => {
  it('nutricionista sem vínculo não gera link', () => {
    expect(
      canCreateNutriCheckInPublicLink({
        authenticatedNutritionistId: 'nutri_123',
        hasActiveVinculo: false,
      })
    ).toBe(false);
  });

  it('não aceita nutritionistId diferente do UID autenticado', () => {
    expect(
      canCreateNutriCheckInPublicLink({
        authenticatedNutritionistId: 'nutri_123',
        requestedNutritionistId: 'nutri_outro',
        hasActiveVinculo: true,
      })
    ).toBe(false);
    expect(
      canCreateNutriCheckInPublicLink({
        authenticatedNutritionistId: 'nutri_123',
        requestedNutritionistId: 'nutri_123',
        hasActiveVinculo: true,
      })
    ).toBe(true);
  });

  it('médico responsável pode gerar o link mesmo sem vínculo de nutricionista', () => {
    expect(
      canCreateNutriCheckInPublicLink({
        authenticatedNutritionistId: 'medico_1',
        hasActiveVinculo: false,
        isResponsibleDoctor: true,
      })
    ).toBe(true);
  });
});

describe('ETAPA 05 — regressão', () => {
  it('diário permanece desativado', () => {
    expect(CHECK_IN_DIARIO_NUTRI_ENABLED).toBe(false);
  });

  it('questionário V2 permanece legível; corrente é V3', () => {
    expect(CHECK_IN_SEMANAL_NUTRI_QUESTIONS.some((q) => q.id === 'aderenciaPlano')).toBe(true);
    expect(CHECK_IN_SEMANAL_NUTRI_QUESTIONS.some((q) => q.id === 'localAplicacao')).toBe(false);
    expect(CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION).toBe('nutri_weekly_v3');
  });

  it('/aplicacao permanece com localAplicacao', () => {
    expect(CHECK_IN_SEMANAL_QUESTIONS.some((q) => q.key === 'localAplicacao')).toBe(true);
  });
});
