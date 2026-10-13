import { describe, expect, it } from 'vitest';
import { createMetaChatSandboxPacienteVazio } from '@/lib/chat/metaChatSandboxPaciente';
import {
  META_CHAT_STEP_COMORBIDADES,
  META_CHAT_STEP_DIAGNOSTICO,
  META_CHAT_STEP_MEDICAMENTOS_DIABETES,
} from './constants';
import {
  alternarMedicamentoDiabetes,
  temDiabetesSelecionado,
  tituloMedicamentosDiabetes,
} from './medicamentosDiabetes';
import { getNextMetaPacienteWizardStep, getPreviousMetaPacienteWizardStep } from './validation';
import type { PacienteCompleto } from '@/types/obesidade';

function comDiabetes(tipo: 'dm1' | 'dm2'): PacienteCompleto {
  const p = createMetaChatSandboxPacienteVazio();
  return {
    ...p,
    dadosClinicos: {
      ...p.dadosClinicos,
      diagnosticoPrincipal: { tipo },
      diagnosticoPrincipalTipos: [tipo],
    },
  };
}

describe('medicamentosDiabetes', () => {
  it('nenhum medicamento desmarca os demais', () => {
    const next = alternarMedicamentoDiabetes({ insulina: true, sulfonilureias: true }, 'nenhum');
    expect(next.nenhum).toBe(true);
    expect(next.insulina).toBe(false);
    expect(next.sulfonilureias).toBe(false);
  });

  it('o título segue o tipo marcado', () => {
    expect(tituloMedicamentosDiabetes(comDiabetes('dm1'))).toBe(
      'Quais medicamentos você toma para tratar seu diabetes tipo 1?'
    );
    expect(tituloMedicamentosDiabetes(comDiabetes('dm2'))).toBe(
      'Quais medicamentos você toma para tratar seu diabetes tipo 2?'
    );
  });

  it('a página só entra no fluxo quando há diabetes', () => {
    const sem = createMetaChatSandboxPacienteVazio();
    const com = comDiabetes('dm2');
    expect(temDiabetesSelecionado(com)).toBe(true);
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_DIAGNOSTICO, sem)).toBe(META_CHAT_STEP_COMORBIDADES);
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_DIAGNOSTICO, com)).toBe(
      META_CHAT_STEP_MEDICAMENTOS_DIABETES
    );
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_COMORBIDADES, com)).toBe(
      META_CHAT_STEP_MEDICAMENTOS_DIABETES
    );
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_MEDICAMENTOS_DIABETES, com)).toBe(
      META_CHAT_STEP_DIAGNOSTICO
    );
  });
});
