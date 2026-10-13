import { describe, expect, it } from 'vitest';
import {
  createMetaChatSandboxPacienteAteMetas,
  createMetaChatSandboxPacienteVazio,
} from '@/lib/chat/metaChatSandboxPaciente';
import { getMetaChatAnamneseProgress, getMetaChatWizardProgressIndex } from './wizardProgress';

describe('getMetaChatAnamneseProgress', () => {
  it('avaliação completa tem 27 passos', () => {
    const p = createMetaChatSandboxPacienteVazio();
    const progress = getMetaChatAnamneseProgress(p);
    expect(progress.total).toBe(27);
    expect(progress.complete).toBe(false);
    expect(progress.current).toBeGreaterThanOrEqual(1);
    expect(progress.current).toBeLessThan(27);
  });

  it('paciente até as metas aparece em 19 de 27', () => {
    const p = createMetaChatSandboxPacienteAteMetas();
    const progress = getMetaChatAnamneseProgress(p);
    expect(progress).toMatchObject({ current: 19, total: 27, complete: false });
  });

  it('depois das metas, o perfil metabólico começa em 20 de 27', () => {
    const base = createMetaChatSandboxPacienteAteMetas();
    const p = {
      ...base,
      dadosClinicos: {
        ...base.dadosClinicos,
        objetivosTratamento: { emagrecer: true },
      },
    };
    const progress = getMetaChatAnamneseProgress(p);
    expect(progress).toMatchObject({ current: 20, total: 27, complete: false });
  });

  it('avaliação essencial não inclui os 7 passos V3', () => {
    const p = createMetaChatSandboxPacienteVazio();
    p.dadosClinicos = { ...p.dadosClinicos, tipoAvaliacaoInicial: 'essencial' };
    expect(getMetaChatAnamneseProgress(p).total).toBe(20);
  });
});

describe('getMetaChatWizardProgressIndex', () => {
  it('passo 14 (metas) é o 19º na barra de 27', () => {
    const p = createMetaChatSandboxPacienteAteMetas();
    expect(getMetaChatWizardProgressIndex(14, p)).toEqual({ current: 18, total: 27 });
  });
});
