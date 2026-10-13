import { describe, expect, it } from 'vitest';
import { buildPlanoTerapeuticoPublicPath } from './planoTerapeuticoPublicPath';

describe('buildPlanoTerapeuticoPublicPath', () => {
  it('usa só o código curto no path', () => {
    expect(buildPlanoTerapeuticoPublicPath('pt_1_abc', 'x23kmd7p')).toBe('/plano/X23KMD7P');
  });

  it('mantém o formato legado com query quando o token é hex longo', () => {
    const token = 'ab'.repeat(24);
    expect(buildPlanoTerapeuticoPublicPath('pt_1_abc', token)).toBe(
      `/plano/pt_1_abc?t=${token}`
    );
  });
});
