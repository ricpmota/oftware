import { describe, expect, it } from 'vitest';
import { createMetaChatSandboxPacienteAteMetas, createMetaChatSandboxPacienteVazio } from '@/lib/chat/metaChatSandboxPaciente';
import { buildAnamneseLayout } from './anamneseLayout';

describe('buildAnamneseLayout', () => {
  it('não trata campo vazio como Não e não afirma ausência de risco', () => {
    const layout = buildAnamneseLayout(createMetaChatSandboxPacienteVazio());
    const seguranca = layout.blocos.find((b) => b.id === 'seguranca');
    expect(seguranca?.nenhumFatorRiscoRelatado).toBe(false);
    expect(layout.pendencias.some((p) => p.label === 'Pancreatite')).toBe(true);
    expect(layout.pendencias.some((p) => p.label === 'Não')).toBe(false);
    expect(layout.blocos.some((b) => b.campos.some((c) => c.id === 'medicamentosDiabetes'))).toBe(false);
    expect(layout.indicadores).toEqual([]);
    expect(layout.indicadores.some((item) => /não|normal|sem risco|nenhum/i.test(item.valor))).toBe(false);
  });

  it('resposta Não continua sendo resposta, e desconheço não vira ausência de risco', () => {
    const layout = buildAnamneseLayout(createMetaChatSandboxPacienteAteMetas());
    const ideacao = layout.blocos
      .flatMap((b) => b.campos)
      .find((c) => c.id === 'triagemIdeacao');
    expect(ideacao?.values).toEqual(['Não']);
    expect(ideacao?.status).toBe('preenchido');
    expect(layout.blocos.find((b) => b.id === 'seguranca')?.nenhumFatorRiscoRelatado).toBe(false);
    expect(layout.destaques).toContain('Obesidade');
  });

  it('só diz que não há fator de risco quando todas as perguntas aplicáveis são Não', () => {
    const base = createMetaChatSandboxPacienteAteMetas();
    const layout = buildAnamneseLayout({
      ...base,
      dadosClinicos: {
        ...base.dadosClinicos,
        riscos: {
          pancreatitePrevia: 'nao',
          gastroparesia: 'nao',
          historicoCMT_MEN2: 'nao',
        },
      },
    });
    expect(layout.blocos.find((b) => b.id === 'seguranca')?.nenhumFatorRiscoRelatado).toBe(true);
    expect(layout.pendencias.some((p) => p.id === 'pancreatitePrevia')).toBe(false);
  });
});
