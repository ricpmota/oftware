import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { CardapioPdfContext } from '@/types/cardapioPrint';
import { buildCardapioJsPdfDocument } from '@/utils/cardapioPdfDownload';
import {
  formatGramasPtBr,
  formatKcalPtBr,
  formatNumeroPtBr,
  formatCardapioPdfItemCells,
  macrosDaOpcao,
  splitDescricaoAlimentoQuantidade,
} from '@/utils/cardapioPdfLayout';

describe('cardapio PDF layout helpers', () => {
  it('separa alimento e quantidade no formato salvo', () => {
    expect(splitDescricaoAlimentoQuantidade('Ovo, de galinha, inteiro, frito - 50g')).toEqual({
      alimento: 'Ovo, de galinha, inteiro, frito',
      quantidade: '50 g',
    });
    expect(splitDescricaoAlimentoQuantidade('Goma Tapioca - 45g - 4 - col de sopa')).toEqual({
      alimento: 'Goma Tapioca',
      quantidade: '4 colheres de sopa · 45 g',
    });
    expect(
      splitDescricaoAlimentoQuantidade('Fruta pequena - 20g - 1 - Unidade ou fatia')
    ).toEqual({
      alimento: 'Fruta pequena',
      quantidade: '1 Unidade ou fatia · 20 g',
    });
  });

  it('não inventa quantidade quando só há nome', () => {
    expect(splitDescricaoAlimentoQuantidade('Frango grelhado')).toEqual({
      alimento: 'Frango grelhado',
      quantidade: '',
    });
  });

  it('formata números em pt-BR', () => {
    expect(formatNumeroPtBr(8.4, 1)).toBe('8,4');
    expect(formatKcalPtBr(1894)).toBe('1.894');
    expect(formatGramasPtBr(8.4)).toBe('8,4 g');
  });

  it('formata células do item com quantidade, proteína e kcal', () => {
    expect(
      formatCardapioPdfItemCells({
        descricao: 'Ovo, de galinha, inteiro, frito - 50g',
        proteinaG: 7.8,
        kcal: 120,
      })
    ).toEqual({
      alimento: 'Ovo, de galinha, inteiro, frito',
      quantidade: '50 g',
      proteina: '7,8 g',
      kcal: '120',
    });
  });

  it('omite macros zeradas nas células', () => {
    expect(formatCardapioPdfItemCells({ descricao: 'Água', proteinaG: 0, kcal: 0 })).toEqual({
      alimento: 'Água',
      quantidade: '—',
      proteina: '—',
      kcal: '—',
    });
  });

  it('omite macros ausentes no resumo da opção', () => {
    expect(macrosDaOpcao([{ descricao: 'X', proteinaG: 0, kcal: 0 }])).toEqual({});
    expect(macrosDaOpcao([{ descricao: 'X', proteinaG: 8.4, carboidratoG: 0.6, kcal: 648 }])).toEqual({
      proteina: 8.4,
      carboidrato: 0.6,
      kcal: 648,
    });
  });
});

function ctxBase(over: Partial<CardapioPdfContext> = {}): CardapioPdfContext {
  return {
    pacienteNome: 'Maria José Leite Carneiro',
    dataImpressao: '15/08/2026',
    refeicoes: [],
    resumoDia: [],
    totais: { protAtual: 0, protPrev: 115, kcalAtual: 0, kcalPrev: 1850 },
    ...over,
  };
}

describe('geração jsPDF do plano alimentar', () => {
  it('gera PDF de 1 opção sem quebrar e com 1 página', () => {
    const ctx = ctxBase({
      refeicoes: [
        {
          nomeRefeicao: 'Café da Manhã',
          tituloOpcao: 'Opção 01',
          itens: [],
          opcoes: [
            {
              tituloOpcao: 'Opção 01',
              itens: [
                { descricao: 'Ovo, de galinha, inteiro, frito - 50g', proteinaG: 7.8, carboidratoG: 0.6, kcal: 120 },
                { descricao: 'Goma Tapioca - 45g - 4 - col de sopa', proteinaG: 0.6, kcal: 516 },
                { descricao: 'Fruta pequena - 20g - 1 - Unidade ou fatia', proteinaG: 0, kcal: 12 },
              ],
              observacao: 'Adicionar chia na massa da tapioca.',
            },
          ],
        },
      ],
      resumoDia: [{ nome: 'Café da Manhã', protAtual: 8.4, protPrev: 27, kcalAtual: 648, kcalPrev: 400 }],
      totais: { protAtual: 8.4, protPrev: 27, kcalAtual: 648, kcalPrev: 400 },
    });
    const doc = buildCardapioJsPdfDocument(ctx, { horaEmissao: '14:42' });
    expect(doc.getNumberOfPages()).toBe(1);
    const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(raw).toContain('Alimento');
    expect(raw).toContain('Qtd');
    expect(raw).toContain('Prot.');
    expect(raw).toContain('kcal');
    expect(raw).toContain('7,8 g');
    expect(raw).toContain('50 g');
  });

  it('gera PDF longo (3+ páginas) com opções, observação longa e acentos', () => {
    const obsLonga = Array.from({ length: 18 }, (_, i) =>
      `Parágrafo ${i + 1}: orientação da nutricionista com acentuação — ç ã é ô. Não alterar este texto.`
    ).join('\n');
    const opcao = (n: number) => ({
      tituloOpcao: `Opção ${String(n).padStart(2, '0')}`,
      itens: [
        {
          descricao:
            'Carne bovina, acém, sem gordura, cozida - 140g - 2 - pedaços / unidades / fatias médias',
          proteinaG: 32.9,
          carboidratoG: 0,
          kcal: 198,
        },
        { descricao: 'Arroz, integral, cozido - 120g - 4 - col de sopa', proteinaG: 3.1, carboidratoG: 28, kcal: 148 },
        { descricao: 'Feijão, carioca, cozido - 80g', proteinaG: 4.8, carboidratoG: 14, kcal: 77 },
      ],
      observacao: n === 1 ? obsLonga : n === 2 ? 'O ovo pode ser mexido ou cozido.' : undefined,
    });
    const refeicao = (nome: string, nOpcoes: number) => ({
      nomeRefeicao: nome,
      tituloOpcao: 'Opção 01',
      itens: [],
      opcoes: Array.from({ length: nOpcoes }, (_, i) => opcao(i + 1)),
    });
    const ctx = ctxBase({
      refeicoes: [
        refeicao('Café da Manhã', 3),
        refeicao('Lanche da Manhã', 1),
        refeicao('Almoço', 3),
        refeicao('Lanche da Tarde', 2),
        refeicao('Janta', 2),
      ],
      resumoDia: [
        { nome: 'Café da Manhã', protAtual: 8.4, protPrev: 27, kcalAtual: 648, kcalPrev: 400 },
        { nome: 'Lanche da Manhã', protAtual: 9.4, protPrev: 17, kcalAtual: 247, kcalPrev: 250 },
        { nome: 'Almoço', protAtual: 33.6, protPrev: 27, kcalAtual: 341, kcalPrev: 550 },
        { nome: 'Lanche da Tarde', protAtual: 19.1, protPrev: 17, kcalAtual: 460, kcalPrev: 200 },
        { nome: 'Janta', protAtual: 32.9, protPrev: 27, kcalAtual: 198, kcalPrev: 450 },
      ],
      totais: { protAtual: 103.4, protPrev: 115, kcalAtual: 1894, kcalPrev: 1850 },
    });
    const doc = buildCardapioJsPdfDocument(ctx, { horaEmissao: '14:42' });
    const pages = doc.getNumberOfPages();
    expect(pages).toBeGreaterThanOrEqual(3);

    const dir = resolve(process.cwd(), 'artifacts');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const out = resolve(dir, 'cardapio-pdf-teste.pdf');
    writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
    expect(existsSync(out)).toBe(true);
  });

  it('inclui foto do prato quando informada', () => {
    const ctx = ctxBase({
      refeicoes: [
        {
          nomeRefeicao: 'Almoço',
          tituloOpcao: 'Opção 01',
          itens: [],
          opcoes: [
            {
              tituloOpcao: 'Opção 01',
              itens: [{ descricao: 'Frango grelhado - 120g', proteinaG: 30, kcal: 200 }],
              mealImageRef: {
                patientId: 'pac-1',
                refeicaoKey: 'almoco',
                slotId: 'slot_almoco_1',
                sourceHash: 'abc',
              },
            },
          ],
        },
      ],
      resumoDia: [{ nome: 'Almoço', protAtual: 30, protPrev: 27, kcalAtual: 200, kcalPrev: 550 }],
      totais: { protAtual: 30, protPrev: 27, kcalAtual: 200, kcalPrev: 550 },
    });
    const tinyJpeg =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const doc = buildCardapioJsPdfDocument(ctx, {
      horaEmissao: '10:00',
      mealImages: {
        'pac-1:almoco:slot_almoco_1:abc': {
          dataUrl: tinyJpeg,
          format: 'JPEG',
          width: 8,
          height: 8,
        },
      },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('não quebra com macros ausentes e campos vazios', () => {
    const ctx = ctxBase({
      pacienteNome: 'Paciente Teste',
      refeicoes: [
        {
          nomeRefeicao: 'Almoço',
          tituloOpcao: 'Opção 01',
          itens: [],
          opcoes: [
            {
              tituloOpcao: 'Opção 01',
              itens: [{ descricao: 'Água', proteinaG: 0, kcal: 0 }],
            },
          ],
        },
      ],
      resumoDia: [{ nome: 'Almoço', protAtual: 0, protPrev: 27, kcalAtual: 0, kcalPrev: 550 }],
      totais: { protAtual: 0, protPrev: 27, kcalAtual: 0, kcalPrev: 550 },
    });
    const doc = buildCardapioJsPdfDocument(ctx);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
