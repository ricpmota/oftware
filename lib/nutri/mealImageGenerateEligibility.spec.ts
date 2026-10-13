import { describe, expect, it } from 'vitest';
import { buildMealImageSourceHash } from '@/lib/nutri/mealImageSource';
import {
  hasLinkedNutritionistFromIds,
  isMealImagePatientViewer,
  mealDishGenerateLabel,
  resolveMealDishGenerateAction,
  resolveMealDishRegenerateAction,
  resolveMealImageActorKind,
} from '@/lib/nutri/mealImageGenerateEligibility';

const hashAtual = buildMealImageSourceHash({
  itensDetalhe: [{ nome: 'Frango grelhado', peso_g: 120 }],
});

const readyAtual = {
  gcsPath: 'cardapio/p/almoco/slot_almoco_1/x.webp',
  sourceHash: hashAtual,
  status: 'ready' as const,
};

const patientViewer = {
  isPatientViewer: true,
  hasLinkedNutritionist: false,
  slotExists: true,
  currentSourceHash: hashAtual,
};

describe('resolveMealDishGenerateAction', () => {
  it('1. paciente sem nutri + sem imagem → Gerar', () => {
    expect(resolveMealDishGenerateAction({ ...patientViewer, mealImage: undefined })).toBe(
      'generate'
    );
    expect(mealDishGenerateLabel('generate')).toBe('Gerar imagem do prato');
  });

  it('2. paciente sem nutri + ready/hash atual → sem botão', () => {
    expect(resolveMealDishGenerateAction({ ...patientViewer, mealImage: readyAtual })).toBe(null);
  });

  it('3. paciente sem nutri + hash desatualizado → Atualizar', () => {
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        mealImage: { ...readyAtual, sourceHash: '0000000000000000' },
      })
    ).toBe('update');
    expect(mealDishGenerateLabel('update')).toBe('Atualizar imagem do prato');
  });

  it('4. paciente com nutri + sem imagem → sem botão', () => {
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        hasLinkedNutritionist: true,
        mealImage: undefined,
      })
    ).toBe(null);
  });

  it('5. modoNutricionista → sem botão', () => {
    expect(isMealImagePatientViewer({ modoNutricionista: true })).toBe(false);
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        isPatientViewer: false,
        mealImage: undefined,
      })
    ).toBe(null);
  });

  it('6. médico → sem botão nesta etapa', () => {
    expect(
      isMealImagePatientViewer({
        modoNutricionista: true,
        chatNutriAuthorKind: 'doctor',
      })
    ).toBe(false);
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        isPatientViewer: false,
        mealImage: undefined,
      })
    ).toBe(null);
  });

  it('7. composição vazia → sem botão', () => {
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        currentSourceHash: '',
        mealImage: undefined,
      })
    ).toBe(null);
  });

  it('pending e generating → sem botão', () => {
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        mealImage: { status: 'pending', sourceHash: hashAtual },
      })
    ).toBe(null);
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        isGenerating: true,
        mealImage: undefined,
      })
    ).toBe(null);
  });

  it('espelho nutricionistaVinculadoIds', () => {
    expect(hasLinkedNutritionistFromIds(['nutri-1'])).toBe(true);
    expect(hasLinkedNutritionistFromIds([])).toBe(false);
    expect(hasLinkedNutritionistFromIds(undefined)).toBe(false);
  });
});

describe('resolveMealDishRegenerateAction', () => {
  it('1. nutricionista + ready/current → botão regenerate', () => {
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'nutritionist',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: readyAtual,
      })
    ).toBe(true);
  });

  it('2. médico + ready/current → botão aparece', () => {
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'doctor',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: readyAtual,
      })
    ).toBe(true);
  });

  it('3. paciente sem nutri + ready/current → botão não aparece', () => {
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'patient',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: readyAtual,
      })
    ).toBe(false);
    expect(resolveMealDishGenerateAction({ ...patientViewer, mealImage: readyAtual })).toBe(null);
  });

  it('4. paciente com nutri + ready/current → botão não aparece', () => {
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'patient',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: readyAtual,
      })
    ).toBe(false);
    expect(
      resolveMealDishGenerateAction({
        ...patientViewer,
        hasLinkedNutritionist: true,
        mealImage: readyAtual,
      })
    ).toBe(null);
  });

  it('pending e imagem ausente → sem regenerate', () => {
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'nutritionist',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: { status: 'pending', sourceHash: hashAtual },
      })
    ).toBe(false);
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'nutritionist',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: undefined,
      })
    ).toBe(false);
  });

  it('failed/stale → profissional pode regenerar', () => {
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'nutritionist',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: { ...readyAtual, status: 'failed' },
      })
    ).toBe(true);
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'doctor',
        slotExists: true,
        currentSourceHash: hashAtual,
        mealImage: { ...readyAtual, sourceHash: '0000000000000000' },
      })
    ).toBe(true);
  });

  it('distingue doctor/nutritionist/patient pelo contexto, não por pathname', () => {
    expect(resolveMealImageActorKind({ chatNutriAuthorKind: 'doctor', modoNutricionista: true })).toBe(
      'doctor'
    );
    expect(
      resolveMealImageActorKind({ chatNutriAuthorKind: 'nutritionist', modoNutricionista: true })
    ).toBe('nutritionist');
    expect(resolveMealImageActorKind({ modoNutricionista: false })).toBe('patient');
  });
});
