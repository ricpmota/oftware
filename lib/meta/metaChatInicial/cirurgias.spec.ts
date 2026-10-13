import { describe, expect, it } from 'vitest';
import { META_CHAT_STEP_CIRURGIAS, META_CHAT_STEP_COMORBIDADES, META_CHAT_STEP_RISCOS } from './constants';
import { alternarCirurgia, cirurgiasInformadas } from './cirurgias';
import { getNextMetaPacienteWizardStep, getPreviousMetaPacienteWizardStep } from './validation';
import { createMetaChatSandboxPacienteVazio } from '@/lib/chat/metaChatSandboxPaciente';

describe('cirurgias', () => {
  it('nenhuma desmarca as cirurgias já escolhidas', () => {
    const next = alternarCirurgia({ sleeveGastrico: true, bypassGastrico: true }, 'nenhuma');
    expect(next.nenhuma).toBe(true);
    expect(next.sleeveGastrico).toBe(false);
    expect(next.bypassGastrico).toBe(false);
  });

  it('marcar uma cirurgia tira o nenhuma', () => {
    const next = alternarCirurgia({ nenhuma: true }, 'switchDuodenal');
    expect(next.switchDuodenal).toBe(true);
    expect(next.nenhuma).toBe(false);
  });

  it('a página nova fica entre comorbidades e riscos', () => {
    const p = createMetaChatSandboxPacienteVazio();
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_COMORBIDADES, p)).toBe(META_CHAT_STEP_CIRURGIAS);
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_CIRURGIAS, p)).toBe(META_CHAT_STEP_RISCOS);
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_CIRURGIAS, p)).toBe(META_CHAT_STEP_COMORBIDADES);
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_RISCOS, p)).toBe(META_CHAT_STEP_CIRURGIAS);
  });

  it('considera respondido quando há alguma opção marcada', () => {
    expect(cirurgiasInformadas(undefined)).toBe(false);
    expect(cirurgiasInformadas({ comorbidades: {}, cirurgiasRealizadas: { nenhuma: true } })).toBe(true);
  });
});
