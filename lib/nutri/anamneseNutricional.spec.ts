import { describe, expect, it } from 'vitest';
import {
  ANAMNESE_SNAPSHOT_VERSAO,
  INTENSIDADE_DESEJADA_PADRAO,
  criarSnapshotAnamneseNutricional,
  isAnamneseSnapshotV2,
  obterIntensidadeDesejadaDoSnapshot,
  planoTemAnamneseNutricional,
  planoTemCalculosNutricionais,
  wizardFromAnamneseSnapshot,
  type AnamneseNutricionalSnapshotV1,
  type AnamneseWizardInput,
} from '@/lib/nutri/anamneseNutricional';

function wizardCompleto(
  overrides: Partial<AnamneseWizardInput> = {}
): AnamneseWizardInput {
  return {
    objetivoPrincipal: 'perda_peso',
    intensidadeDesejada: INTENSIDADE_DESEJADA_PADRAO,
    horarioTrabalho: 'diurno',
    horasSentado: '4-8h',
    dietaUltimos12Meses: 'sim',
    tipoDieta: 'Low carb',
    efeitoSanfona: 'sim',
    kgSanfona: 12,
    pesoMaximo2Anos: 98,
    pesoMinimo2Anos: 72,
    fomeMatinal: 4,
    fomeNoturna: 8,
    vontadeDoce: 6,
    pulaCafeManha: true,
    chegaComMuitaFomeJantar: false,
    atividadeFisica: '3-4x',
    sonoHoras: '6-8h',
    horarioDormir: '00-02',
    acordaDescansado: 'as_vezes',
    numeroRefeicoesDia: '4-5',
    comportamentosAlimentares: ['pulo refeições', 'doce diário'],
    fomeEmocional: true,
    compulsaoNoturna: false,
    dosesAlcoolSemana: '1-3',
    finalSemanaSaiDieta: 'as_vezes',
    restricoes: ['sem glúten'],
    preferenciasProteina: ['Frango', 'Ovos'],
    sintomasGI: 'leve',
    ...overrides,
  };
}

describe('criarSnapshotAnamneseNutricional', () => {
  it('copia todos os campos preenchidos e salva intensidadeDesejada', () => {
    const wizard = wizardCompleto({ intensidadeDesejada: 'moderada' });
    const snap = criarSnapshotAnamneseNutricional(wizard);

    expect(snap.versao).toBe(2);
    expect(snap.versao).toBe(ANAMNESE_SNAPSHOT_VERSAO);
    expect(snap.intensidadeDesejada).toBe('moderada');
    expect(snap.objetivoPrincipal).toBe('perda_peso');
    expect(snap.restricoes).toEqual(['sem glúten']);
  });

  it('preserva intensidade leve', () => {
    const snap = criarSnapshotAnamneseNutricional(
      wizardCompleto({ intensidadeDesejada: 'leve' })
    );
    expect(snap.intensidadeDesejada).toBe('leve');
  });

  it('preserva intensidade moderada', () => {
    const snap = criarSnapshotAnamneseNutricional(
      wizardCompleto({ intensidadeDesejada: 'moderada' })
    );
    expect(snap.intensidadeDesejada).toBe('moderada');
  });

  it('preserva intensidade intensiva', () => {
    const snap = criarSnapshotAnamneseNutricional(
      wizardCompleto({ intensidadeDesejada: 'intensiva' })
    );
    expect(snap.intensidadeDesejada).toBe('intensiva');
  });

  it('snapshot novo utiliza versao 2', () => {
    expect(criarSnapshotAnamneseNutricional(wizardCompleto()).versao).toBe(2);
  });

  it('campos numéricos opcionais vazios retornam null', () => {
    const snap = criarSnapshotAnamneseNutricional(
      wizardCompleto({
        kgSanfona: undefined,
        pesoMaximo2Anos: undefined,
        pesoMinimo2Anos: undefined,
      })
    );
    expect(snap.kgSanfona).toBeNull();
    expect(snap.pesoMaximo2Anos).toBeNull();
    expect(snap.pesoMinimo2Anos).toBeNull();
  });

  it('copia arrays sem compartilhar referência', () => {
    const wizard = wizardCompleto();
    const snap = criarSnapshotAnamneseNutricional(wizard);
    expect(snap.restricoes).not.toBe(wizard.restricoes);
    snap.restricoes.push('vegano');
    expect(wizard.restricoes).toEqual(['sem glúten']);
  });

  it('limita escalas 0–10', () => {
    const baixo = criarSnapshotAnamneseNutricional(
      wizardCompleto({ fomeMatinal: -3, vontadeDoce: -1 })
    );
    const alto = criarSnapshotAnamneseNutricional(
      wizardCompleto({ fomeNoturna: 15, vontadeDoce: 99 })
    );
    expect(baixo.fomeMatinal).toBe(0);
    expect(baixo.vontadeDoce).toBe(0);
    expect(alto.fomeNoturna).toBe(10);
    expect(alto.vontadeDoce).toBe(10);
  });

  it('não modifica o WizardData original', () => {
    const wizard = wizardCompleto();
    const freeze = structuredClone(wizard);
    criarSnapshotAnamneseNutricional(wizard);
    expect(wizard).toEqual(freeze);
  });

  it('intensidade não altera campos que alimentam cardápio (restrições/preferências)', () => {
    const base = wizardCompleto({
      restricoes: ['vegetariano'],
      preferenciasProteina: ['Leguminosas'],
    });
    const leve = criarSnapshotAnamneseNutricional({
      ...base,
      intensidadeDesejada: 'leve',
    });
    const intensiva = criarSnapshotAnamneseNutricional({
      ...base,
      intensidadeDesejada: 'intensiva',
    });
    expect(leve.restricoes).toEqual(intensiva.restricoes);
    expect(leve.preferenciasProteina).toEqual(intensiva.preferenciasProteina);
    expect(leve.sintomasGI).toEqual(intensiva.sintomasGI);
    expect(leve.objetivoPrincipal).toEqual(intensiva.objetivoPrincipal);
  });
});

describe('compatibilidade versão 1 e planos antigos', () => {
  it('snapshot versão 1 continua reconhecido sem inventar intensidade', () => {
    const v1: AnamneseNutricionalSnapshotV1 = {
      versao: 1,
      preenchidaEm: '2026-01-01T00:00:00.000Z',
      objetivoPrincipal: 'perda_peso',
      horarioTrabalho: 'diurno',
      horasSentado: '4-8h',
      dietaUltimos12Meses: 'nao',
      tipoDieta: '',
      efeitoSanfona: 'nao',
      kgSanfona: null,
      pesoMaximo2Anos: null,
      pesoMinimo2Anos: null,
      fomeMatinal: 5,
      fomeNoturna: 5,
      vontadeDoce: 5,
      pulaCafeManha: false,
      chegaComMuitaFomeJantar: false,
      atividadeFisica: 'nunca',
      sonoHoras: '6-8h',
      horarioDormir: '22-00',
      acordaDescansado: 'as_vezes',
      numeroRefeicoesDia: '4-5',
      comportamentosAlimentares: [],
      fomeEmocional: false,
      compulsaoNoturna: false,
      dosesAlcoolSemana: '0',
      finalSemanaSaiDieta: 'quase_nunca',
      restricoes: [],
      preferenciasProteina: [],
      sintomasGI: 'nenhum',
    };

    expect(planoTemAnamneseNutricional({ anamneseNutricional: v1 })).toBe(true);
    expect(isAnamneseSnapshotV2(v1)).toBe(false);
    expect(obterIntensidadeDesejadaDoSnapshot(v1)).toBeUndefined();
    expect('intensidadeDesejada' in v1).toBe(false);
  });

  it('não existe fallback que transforme snapshot antigo em moderada', () => {
    const v1 = {
      versao: 1 as const,
      preenchidaEm: '2026-01-01T00:00:00.000Z',
      objetivoPrincipal: 'manutencao' as const,
      horarioTrabalho: 'diurno' as const,
      horasSentado: '4-8h' as const,
      dietaUltimos12Meses: 'nao' as const,
      tipoDieta: '',
      efeitoSanfona: 'nao' as const,
      kgSanfona: null,
      pesoMaximo2Anos: null,
      pesoMinimo2Anos: null,
      fomeMatinal: 5,
      fomeNoturna: 5,
      vontadeDoce: 5,
      pulaCafeManha: false,
      chegaComMuitaFomeJantar: false,
      atividadeFisica: 'nunca' as const,
      sonoHoras: '6-8h' as const,
      horarioDormir: '22-00' as const,
      acordaDescansado: 'as_vezes' as const,
      numeroRefeicoesDia: '4-5' as const,
      comportamentosAlimentares: [] as string[],
      fomeEmocional: false,
      compulsaoNoturna: false,
      dosesAlcoolSemana: '0' as const,
      finalSemanaSaiDieta: 'quase_nunca' as const,
      restricoes: [] as string[],
      preferenciasProteina: [] as string[],
      sintomasGI: 'nenhum' as const,
    };
    expect(obterIntensidadeDesejadaDoSnapshot(v1)).not.toBe('moderada');
    expect(obterIntensidadeDesejadaDoSnapshot(v1)).toBeUndefined();
    expect(obterIntensidadeDesejadaDoSnapshot(undefined)).toBeUndefined();
    expect(obterIntensidadeDesejadaDoSnapshot(null)).toBeUndefined();
  });

  it('plano antigo sem snapshot continua compatível', () => {
    const planoAntigo = { estilo: 'low_carb_moderada', protDia_g: 100 };
    expect(planoTemAnamneseNutricional(planoAntigo)).toBe(false);
    expect(
      obterIntensidadeDesejadaDoSnapshot(
        (planoAntigo as { anamneseNutricional?: undefined }).anamneseNutricional
      )
    ).toBeUndefined();
  });

  it('valor padrão do wizard (constante) é moderada', () => {
    expect(INTENSIDADE_DESEJADA_PADRAO).toBe('moderada');
  });

  it('questionário salvo conta como anamnese mesmo sem cálculos do plano', () => {
    const snap = criarSnapshotAnamneseNutricional(wizardCompleto());
    expect(planoTemAnamneseNutricional({ anamneseNutricional: snap, anamnesePendenteGeracao: true })).toBe(
      true
    );
    expect(planoTemCalculosNutricionais({ anamneseNutricional: snap, anamnesePendenteGeracao: true })).toBe(
      false
    );
    expect(planoTemCalculosNutricionais({ estilo: 'digestiva', protDia_g: 120 })).toBe(true);
  });

  it('wizardFromAnamneseSnapshot preenche o wizard a partir do snapshot', () => {
    const snap = criarSnapshotAnamneseNutricional(wizardCompleto());
    const wizard = wizardFromAnamneseSnapshot(snap);
    expect(wizard.objetivoPrincipal).toBe('perda_peso');
    expect(wizard.intensidadeDesejada).toBe(INTENSIDADE_DESEJADA_PADRAO);
    expect(wizard.restricoes).toEqual(expect.any(Array));
  });
});
