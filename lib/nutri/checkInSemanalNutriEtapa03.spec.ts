import { describe, expect, it } from 'vitest';
import { CHECK_IN_SEMANAL_QUESTIONS } from '@/lib/aplicacao/checkInSemanalQuestions';
import { canEditWeeklyNutritionCheckIn } from '@/lib/nutri/canEditWeeklyNutritionCheckIn';
import { resolveWeeklyCheckInSaveAuthorship } from '@/lib/nutri/checkInSemanalNutriAuthorship';
import { origemProntuarioDeAutoria } from '@/lib/nutri/checkInSemanalNutriAutoria';
import {
  CHECK_IN_DIARIO_NUTRI_ENABLED,
  getCheckInSemanalNutriCapabilities,
  resolveCheckInSemanalNutriViewerRole,
} from '@/lib/nutri/checkInSemanalNutriCapabilities';
import {
  compareWeeklyNutritionCheckIns,
  getWeeklyNutritionCheckInFlags,
} from '@/lib/nutri/checkInSemanalNutriFlags';
import {
  checkInSemanalNutriAnswersToForm,
  formToCheckInSemanalNutriAnswers,
} from '@/lib/nutri/checkInSemanalNutriForm';
import { deserializeCheckInSemanalNutri, serializeCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriPersist';
import { checkInsSemanaisNutricaoParaEventos, TITULO_CHECKIN_NUTRI_DIARIO_LEGADO, TITULO_CHECKIN_NUTRI_SEMANAL } from '@/lib/nutri/checkInSemanalNutriProntuario';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V1 } from '@/lib/nutri/checkInSemanalNutriTypes';

function weeklyRecord(overrides: Partial<CheckInSemanalNutri> = {}): CheckInSemanalNutri {
  return {
    questionnaireVersion: 'nutri_weekly_v2',
    pacienteId: 'pac-1',
    weekKey: '2026-08-17',
    weekStart: '2026-08-17',
    weekEnd: '2026-08-23',
    aderenciaPlano: 85,
    diasProteinaMeta: 6,
    diasFrutasVegetais: 5,
    alimentacaoForaPlano: 'pouca',
    diasMetaAgua: 6,
    nauseas: 'nenhum',
    constipacao: 'moderado',
    diarreia: 'nenhum',
    energiaSemana: 4,
    sessoesAtividadeFisica: 4,
    principalDificuldadeTipo: 'eventos_sociais',
    principalConquistaTipo: 'organizacao',
    observacoes: 'Prefiro lanches prontos',
    score: 86,
    answeredBy: 'patient',
    source: 'patient_meta',
    createdAt: new Date('2026-08-23T18:42:00'),
    updatedAt: new Date('2026-08-23T18:42:00'),
    ...overrides,
  };
}

describe('ETAPA 03 — diário desativado', () => {
  it('não habilita Check-in Diário como funcionalidade', () => {
    expect(CHECK_IN_DIARIO_NUTRI_ENABLED).toBe(false);
  });
});

describe('ETAPA 03 — papéis e capabilities', () => {
  it('MetaPersonal (somenteVisualizacao + modoNutricionista) é personal, não nutricionista', () => {
    expect(
      resolveCheckInSemanalNutriViewerRole({
        modoNutricionista: true,
        somenteVisualizacao: true,
      })
    ).toBe('personal');
  });

  it('MetaAdmin com chatNutriAuthorKind doctor é médico mesmo com modoNutricionista', () => {
    expect(
      resolveCheckInSemanalNutriViewerRole({
        chatNutriAuthorKind: 'doctor',
        modoNutricionista: true,
      })
    ).toBe('doctor');
  });

  it('médico pode preencher, editar e apagar check-in; personal só visualiza', () => {
    expect(getCheckInSemanalNutriCapabilities('doctor')).toEqual({
      create: true,
      edit: true,
      editCurrentWeek: true,
      view: true,
      fillOnBehalf: true,
      configureSchedule: false,
      delete: true,
    });
    expect(getCheckInSemanalNutriCapabilities('personal').create).toBe(false);
    expect(getCheckInSemanalNutriCapabilities('personal').edit).toBe(false);
    expect(getCheckInSemanalNutriCapabilities('personal').delete).toBe(false);
    expect(getCheckInSemanalNutriCapabilities('nutritionist').delete).toBe(true);
  });

  it('nutricionista pode preencher qualquer semana já iniciada; paciente só a de referência', () => {
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-10',
        today: '2026-08-17',
        capabilities: getCheckInSemanalNutriCapabilities('nutritionist'),
      })
    ).toBe(true);
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-10',
        today: '2026-08-17',
        capabilities: getCheckInSemanalNutriCapabilities('patient'),
      })
    ).toBe(true);
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-17',
        today: '2026-08-17',
        capabilities: getCheckInSemanalNutriCapabilities('patient'),
      })
    ).toBe(false);
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-17',
        today: '2026-08-17',
        capabilities: getCheckInSemanalNutriCapabilities('doctor'),
      })
    ).toBe(true);
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-24',
        today: '2026-08-17',
        capabilities: getCheckInSemanalNutriCapabilities('nutritionist'),
      })
    ).toBe(false);
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-24',
        today: '2026-08-17',
        capabilities: getCheckInSemanalNutriCapabilities('doctor'),
      })
    ).toBe(false);
  });
});

describe('ETAPA 03 — questionário e form V2', () => {
  it('Outra normaliza texto em principalDificuldade / principalConquista', () => {
    const answers = formToCheckInSemanalNutriAnswers(
      {
        aderenciaPlano: '80',
        diasProteinaMeta: '5',
        diasFrutasVegetais: '4',
        alimentacaoForaPlano: 'pouca',
        diasMetaAgua: '6',
        nauseas: 'nenhum',
        constipacao: 'nenhum',
        diarreia: 'nenhum',
        energiaSemana: '4',
        sessoesAtividadeFisica: '3',
        principalDificuldadeTipo: 'outra',
        principalDificuldadeOutra: 'Viagem de trabalho',
        principalConquistaTipo: 'outra',
        principalConquistaOutra: 'Cozinhei no domingo',
        observacoes: '',
      },
      new Set()
    );
    expect(answers.principalDificuldade).toBe('Viagem de trabalho');
    expect(answers.principalConquista).toBe('Cozinhei no domingo');
    expect(answers.probioticoDias).toBeUndefined();
    expect(answers.mediaSono).toBeUndefined();
  });

  it('registro V1 só com texto livre preenche tipo Outra', () => {
    const form = checkInSemanalNutriAnswersToForm({
      principalDificuldade: 'Fim de semana na casa da família',
      principalConquista: 'Bebi mais água',
    });
    expect(form.principalDificuldadeTipo).toBe('outra');
    expect(form.principalDificuldadeOutra).toBe('Fim de semana na casa da família');
    expect(form.principalConquistaTipo).toBe('outra');
    expect(form.principalConquistaOutra).toBe('Bebi mais água');
  });
});

describe('ETAPA 03 — compatibilidade V1', () => {
  it('deserialize preserva questionnaireVersion v1 e campos de suplemento/sono', () => {
    const record = deserializeCheckInSemanalNutri(
      {
        questionnaireVersion: CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V1,
        pacienteId: 'pac-1',
        weekKey: '2026-08-10',
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        aderenciaPlano: 70,
        diasProteinaMeta: 4,
        diasFrutasVegetais: 3,
        alimentacaoForaPlano: 'moderada',
        diasMetaAgua: 5,
        probioticoDias: 6,
        wheyDias: 2,
        creatinaDias: 0,
        mediaSono: 'menos_6h',
        nauseas: 'leve',
        constipacao: 'nenhum',
        diarreia: 'nenhum',
        principalDificuldade: 'texto livre V1',
        answeredBy: 'patient',
        source: 'patient_meta',
      },
      '2026-08-10'
    );
    expect(record.questionnaireVersion).toBe('nutri_weekly_v1');
    expect(record.probioticoDias).toBe(6);
    expect(record.wheyDias).toBe(2);
    expect(record.mediaSono).toBe('menos_6h');
    expect(record.principalDificuldade).toBe('texto livre V1');
  });

  it('serialize V2 não grava nulos de suplemento/sono (não apaga V1 no merge)', () => {
    const payload = serializeCheckInSemanalNutri(weeklyRecord());
    expect(payload).not.toHaveProperty('probioticoDias');
    expect(payload).not.toHaveProperty('wheyDias');
    expect(payload).not.toHaveProperty('creatinaDias');
    expect(payload).not.toHaveProperty('mediaSono');
    expect(payload.questionnaireVersion).toBe('nutri_weekly_v2');
  });
});

describe('ETAPA 03 — autoria', () => {
  it('criação pelo nutricionista grava answeredBy nutritionist', () => {
    expect(
      resolveWeeklyCheckInSaveAuthorship({
        existing: null,
        actor: { answeredBy: 'nutritionist', answeredById: 'nutri-1', source: 'nutritionist' },
      })
    ).toEqual({
      answeredBy: 'nutritionist',
      answeredById: 'nutri-1',
      source: 'nutritionist',
    });
  });

  it('edição do nutricionista preserva o autor original', () => {
    const saved = resolveWeeklyCheckInSaveAuthorship({
      existing: { answeredBy: 'patient', answeredById: 'uid-p', source: 'patient_meta' },
      actor: { answeredBy: 'nutritionist', answeredById: 'nutri-1', source: 'nutritionist' },
    });
    expect(saved.answeredBy).toBe('patient');
    expect(saved.answeredById).toBe('uid-p');
    expect(saved.source).toBe('patient_meta');
    expect(saved.lastEditedBy).toBe('nutritionist');
    expect(saved.lastEditedById).toBe('nutri-1');
  });
});

describe('ETAPA 03 — flags e comparação', () => {
  it('gera flags objetivas sem diagnóstico', () => {
    const flags = getWeeklyNutritionCheckInFlags({
      aderenciaPlano: 40,
      diasProteinaMeta: 2,
      diasMetaAgua: 6,
      nauseas: 'nenhum',
      constipacao: 'moderado',
      diarreia: 'nenhum',
      energiaSemana: 4,
    });
    expect(flags.map((f) => f.id)).toEqual(['low_adherence', 'low_protein', 'moderate_constipation']);
  });

  it('compara métricas simples com a semana anterior', () => {
    const cmp = compareWeeklyNutritionCheckIns(
      { score: 86, aderenciaPlano: 85, diasProteinaMeta: 6, diasMetaAgua: 6 },
      { score: 80, aderenciaPlano: 75, diasProteinaMeta: 4, diasMetaAgua: 5 }
    );
    expect(cmp.score.delta).toBe(6);
    expect(cmp.aderencia.delta).toBe(10);
    expect(cmp.proteina.delta).toBe(2);
    expect(cmp.agua.delta).toBe(1);
  });
});

describe('ETAPA 03 — prontuário', () => {
  it('evento semanal usa autoria real e título novo', () => {
    const [evento] = checkInsSemanaisNutricaoParaEventos([
      weeklyRecord({ answeredBy: 'nutritionist' }),
    ]);
    expect(evento.titulo).toBe(TITULO_CHECKIN_NUTRI_SEMANAL);
    expect(evento.origem).toBe('nutri');
    expect(evento.descricao).toContain('Score 86');
    expect(evento.descricao).toContain('Aderência 85%');
    expect(evento.descricao).toMatch(/Eventos sociais/);
    expect(origemProntuarioDeAutoria('patient')).toBe('paciente');
    expect(origemProntuarioDeAutoria('doctor')).toBe('medico');
  });

  it('check-in diário legado permanece identificado', () => {
    expect(TITULO_CHECKIN_NUTRI_DIARIO_LEGADO).toBe('Check-in nutricional — histórico anterior');
  });
});

describe('ETAPA 03 — /aplicacao intacto', () => {
  it('questionário clínico da aplicação continua com localAplicacao', () => {
    expect(CHECK_IN_SEMANAL_QUESTIONS.some((q) => q.key === 'localAplicacao')).toBe(true);
  });
});
