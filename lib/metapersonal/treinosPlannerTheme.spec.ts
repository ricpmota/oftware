import { describe, expect, it } from 'vitest';
import {
  TREINO_COLOR_BY_KEY,
  TREINO_COLOR_PALETTE,
  hashVisualSignature,
  resolveTreinoColor,
  suggestTreinoColorKey,
  treinoColorFromSignature,
} from '@/lib/metapersonal/treinosPlannerTheme';

describe('treinoColorFromSignature', () => {
  it('mesma assinatura produz a mesma cor, independente do dia', () => {
    const costas = 'costas::0025:10~';
    expect(treinoColorFromSignature(costas)).toEqual(treinoColorFromSignature(costas));
    expect(treinoColorFromSignature(costas)).toBe(
      TREINO_COLOR_PALETTE[hashVisualSignature(costas) % TREINO_COLOR_PALETTE.length]
    );
  });

  it('assinaturas diferentes podem receber tons diferentes', () => {
    const a = treinoColorFromSignature('costas::a');
    const b = treinoColorFromSignature('peito::b');
    expect(TREINO_COLOR_PALETTE).toContain(a);
    expect(TREINO_COLOR_PALETTE).toContain(b);
  });
});

describe('resolveTreinoColor', () => {
  it('prioriza a cor salva do treino e cai no hash se não houver chave', () => {
    expect(resolveTreinoColor('rose', 'costas::a')).toEqual(TREINO_COLOR_BY_KEY.rose);
    expect(resolveTreinoColor(undefined, 'costas::a')).toEqual(treinoColorFromSignature('costas::a'));
    expect(resolveTreinoColor('not-a-color', 'costas::a')).toEqual(
      treinoColorFromSignature('costas::a')
    );
  });

  it('sugere a primeira cor ainda não usada', () => {
    expect(suggestTreinoColorKey(['emerald', 'blue'])).toBe('violet');
    expect(suggestTreinoColorKey([])).toBe('emerald');
  });
});
