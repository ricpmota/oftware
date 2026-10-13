import { describe, expect, it } from 'vitest';
import { createMetaChatSandboxPacienteAteMetas } from '@/lib/chat/metaChatSandboxPaciente';
import {
  META_CHAT_STEP_DEPRESSAO,
  META_CHAT_STEP_IDEACAO_SUICIDA,
  META_CHAT_STEP_METAS,
  META_CHAT_STEP_SINTOMAS_GI,
} from './constants';
import { getInitialBotTextForStep } from './helpers';
import { getFirstIncompleteStep } from './resume';
import { getNextMetaPacienteWizardStep, getPreviousMetaPacienteWizardStep } from './validation';

describe('triagem de humor', () => {
  it('depois dos sintomas digestivos vai para depressão, ideação e só então as metas', () => {
    const p = createMetaChatSandboxPacienteAteMetas();
    const semHumor = {
      ...p,
      dadosClinicos: { ...p.dadosClinicos, triagemHumor: undefined },
    };
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_SINTOMAS_GI, semHumor)).toBe(
      META_CHAT_STEP_DEPRESSAO
    );
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_DEPRESSAO, semHumor)).toBe(
      META_CHAT_STEP_IDEACAO_SUICIDA
    );
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_IDEACAO_SUICIDA, semHumor)).toBe(
      META_CHAT_STEP_METAS
    );
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_DEPRESSAO, semHumor)).toBe(
      META_CHAT_STEP_SINTOMAS_GI
    );
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_IDEACAO_SUICIDA, semHumor)).toBe(
      META_CHAT_STEP_DEPRESSAO
    );
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_METAS, semHumor)).toBe(
      META_CHAT_STEP_IDEACAO_SUICIDA
    );
  });

  it('paciente sem essas respostas retoma na depressão, depois dos sintomas digestivos', () => {
    const p = createMetaChatSandboxPacienteAteMetas();
    const semHumor = {
      ...p,
      dadosClinicos: { ...p.dadosClinicos, triagemHumor: undefined },
    };
    expect(getFirstIncompleteStep(semHumor)).toBe(META_CHAT_STEP_DEPRESSAO);
  });

  it('o texto dessas perguntas não vira a busca de médico', () => {
    expect(getInitialBotTextForStep(META_CHAT_STEP_DEPRESSAO)).toMatch(/depressão/i);
    expect(getInitialBotTextForStep(META_CHAT_STEP_IDEACAO_SUICIDA)).toMatch(/própria vida/);
  });
});
