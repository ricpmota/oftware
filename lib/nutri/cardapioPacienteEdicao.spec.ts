import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

describe('edição de cardápio pelo paciente no /meta', () => {
  it('botão Editar fica ao lado do badge Atual, no mesmo tamanho', () => {
    const nutri = readFileSync(path.join(ROOT, 'components/NutriContent.tsx'), 'utf8');
    expect(nutri).toContain('podeAlterarCardapio');
    expect(nutri).toContain('Usar como atual');
    expect(nutri).toContain('opcaoBloqueadaParaPaciente');
    expect(nutri).toContain(
      'rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide'
    );
    expect(nutri).toContain("origem: podeEditarNutri ? (temTaco ? 'taco' : 'manual') : 'paciente'");
  });

  it('paciente não salva opção elaborada pela nutricionista', () => {
    const nutri = readFileSync(path.join(ROOT, 'components/NutriContent.tsx'), 'utf8');
    expect(nutri).toContain(
      '!podeEditarNutri && slotFoiEditadoPorNutricionista(slotAnterior)'
    );
    expect(nutri).toContain('definirOpcaoComoAtual');
    expect(nutri).toContain('if (!plano || !podeAlterarCardapio) return;');
  });
});
