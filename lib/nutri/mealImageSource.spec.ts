import { describe, expect, it } from 'vitest';
import {
  buildMealImageSource,
  buildMealImageSourceHash,
  pickMealImage,
  withMealImage,
  type MealImageSourceOption,
} from '@/lib/nutri/mealImageSource';

const pratoFrango: MealImageSourceOption = {
  titulo: 'Opção 01',
  calorias_kcal: 520,
  proteina_g: 42,
  itensDetalhe: [
    { id: 'a1', nome: 'Frango grelhado', peso_g: 120, proteina_g: 32, calorias_kcal: 180 },
    { id: 'b1', nome: 'Arroz integral', quantidade: 4, unidade: 'colheres de sopa' },
    { id: 'c1', nome: 'Feijão', quantidade: 0.5, unidade: 'concha' },
    { id: 'd1', nome: 'Salada verde', unidade: 'à vontade' },
  ],
};

describe('buildMealImageSource / buildMealImageSourceHash', () => {
  it('CASO 1 — mesmo prato duas vezes: mesma source e mesmo hash', () => {
    const a = { ...pratoFrango, itensDetalhe: pratoFrango.itensDetalhe?.map((i) => ({ ...i })) };
    const b = { ...pratoFrango, itensDetalhe: pratoFrango.itensDetalhe?.map((i) => ({ ...i })) };
    expect(buildMealImageSource(a)).toBe(buildMealImageSource(b));
    expect(buildMealImageSourceHash(a)).toBe(buildMealImageSourceHash(b));
    expect(buildMealImageSourceHash(a).length).toBeGreaterThan(0);
  });

  it('CASO 2 — trocar Frango por Salmão muda o hash', () => {
    const salmao: MealImageSourceOption = {
      ...pratoFrango,
      itensDetalhe: pratoFrango.itensDetalhe?.map((item) =>
        item.nome === 'Frango grelhado' ? { ...item, nome: 'Salmão' } : item
      ),
    };
    expect(buildMealImageSourceHash(salmao)).not.toBe(buildMealImageSourceHash(pratoFrango));
    expect(buildMealImageSource(salmao)).toContain('Salmão');
    expect(buildMealImageSource(pratoFrango)).toContain('Frango grelhado');
  });

  it('CASO 3 — alterar 120g para 150g muda o hash', () => {
    const maior: MealImageSourceOption = {
      ...pratoFrango,
      itensDetalhe: pratoFrango.itensDetalhe?.map((item) =>
        item.nome === 'Frango grelhado' ? { ...item, peso_g: 150 } : item
      ),
    };
    expect(buildMealImageSourceHash(maior)).not.toBe(buildMealImageSourceHash(pratoFrango));
  });

  it('CASO 4 — alterar só calorias_kcal agregadas não muda o hash', () => {
    const soCalorias: MealImageSourceOption = {
      ...pratoFrango,
      calorias_kcal: 9999,
      proteina_g: 1,
    };
    expect(buildMealImageSource(soCalorias)).toBe(buildMealImageSource(pratoFrango));
    expect(buildMealImageSourceHash(soCalorias)).toBe(buildMealImageSourceHash(pratoFrango));
  });

  it('CASO 5 — alterar só o título da opção não muda o hash', () => {
    const outroTitulo: MealImageSourceOption = { ...pratoFrango, titulo: 'Opção 02' };
    expect(buildMealImageSourceHash(outroTitulo)).toBe(buildMealImageSourceHash(pratoFrango));
  });

  it('CASO 6 — sem itensDetalhe, fallback pela descricao', () => {
    const soTexto: MealImageSourceOption = {
      titulo: 'Opção 01',
      descricao: 'Frango grelhado - 120g + Arroz integral',
      calorias_kcal: 400,
    };
    const source = buildMealImageSource(soTexto);
    expect(source).toBe('Frango grelhado - 120g + Arroz integral');
    expect(buildMealImageSourceHash(soTexto).length).toBeGreaterThan(0);

    const mesmaDescricaoEspacos: MealImageSourceOption = {
      descricao: '  Frango grelhado - 120g + Arroz integral  \n',
    };
    expect(buildMealImageSource(mesmaDescricaoEspacos)).toBe(source);
    expect(buildMealImageSourceHash(mesmaDescricaoEspacos)).toBe(buildMealImageSourceHash(soTexto));
  });

  it('CASO 7 — sem composição suficiente retorna string vazia (sem throw)', () => {
    expect(buildMealImageSource(undefined)).toBe('');
    expect(buildMealImageSource(null)).toBe('');
    expect(buildMealImageSource({})).toBe('');
    expect(buildMealImageSource({ titulo: 'Opção 01', calorias_kcal: 300, itensSelecionados: ['id_aleatorio'] })).toBe(
      ''
    );
    expect(buildMealImageSourceHash({ titulo: 'Opção 01', itensSelecionados: ['x'] })).toBe('');
  });

  it('IDs de item e mealImage não entram no hash', () => {
    const comIdsDiferentes: MealImageSourceOption = {
      ...pratoFrango,
      itensDetalhe: pratoFrango.itensDetalhe?.map((item, i) => ({ ...item, id: `outro-${i}` })),
      mealImage: {
        gcsPath: 'cardapio/p/almoco/1/abc.jpg',
        generatedAt: '2026-09-04T00:00:00.000Z',
        sourceHash: 'nao-usar',
        status: 'ready',
      },
    };
    expect(buildMealImageSource(comIdsDiferentes)).toBe(buildMealImageSource(pratoFrango));
    expect(buildMealImageSourceHash(comIdsDiferentes)).toBe(buildMealImageSourceHash(pratoFrango));
  });

  it('não reordena itensDetalhe', () => {
    const invertido: MealImageSourceOption = {
      itensDetalhe: [...(pratoFrango.itensDetalhe || [])].reverse(),
    };
    expect(buildMealImageSource(invertido)).not.toBe(buildMealImageSource(pratoFrango));
  });
});

describe('pickMealImage / withMealImage', () => {
  it('rejeita gcsPath vazio e não materializa objeto oco', () => {
    expect(pickMealImage(undefined)).toBeUndefined();
    expect(pickMealImage({ gcsPath: '' })).toBeUndefined();
    expect(pickMealImage({ gcsPath: '   ' })).toBeUndefined();
    expect(pickMealImage({ generatedAt: '2026-01-01' })).toBeUndefined();
  });

  it('preserva mealImage existente no rebuild sem criar campo novo', () => {
    const anterior = {
      id: 'slot_almoco_1',
      mealImage: {
        gcsPath: 'cardapio/p1/almoco/1/x.jpg',
        sourceHash: 'abc',
        status: 'ready' as const,
      },
    };
    const rebuild = withMealImage(
      { id: 'slot_almoco_1', titulo: 'Opção 01', descricao: 'Frango' },
      anterior
    );
    expect(rebuild.mealImage?.gcsPath).toBe('cardapio/p1/almoco/1/x.jpg');
    expect(rebuild.mealImage?.status).toBe('ready');

    const semImagem = withMealImage({ id: 'slot_almoco_2', descricao: 'Salada' });
    expect('mealImage' in semImagem && semImagem.mealImage !== undefined).toBe(false);
  });
});
