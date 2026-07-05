import { describe, expect, it } from 'vitest';
import { buildPostReextractMessage } from '@/components/oftpay/laudoExamesWorkspace.helpers';

describe('buildPostReextractMessage', () => {
  it('resume melhora de cobertura após reprocessamento', () => {
    const message = buildPostReextractMessage({
      fileName: 'oct.pdf',
      examTypeLabel: 'OCT Mácula',
      previousChecklist: { filled: 1, total: 3, status: 'weak' },
      currentChecklist: { filled: 3, total: 3, status: 'good' },
      reviewStatus: 'attention',
    });

    expect(message).toContain('reprocessado com sucesso');
    expect(message).toContain('Cobertura melhorou (1/3 -> 3/3)');
    expect(message).toContain('Persistem pontos de atenção');
  });

  it('mantém mensagem útil sem snapshot anterior', () => {
    const message = buildPostReextractMessage({
      fileName: 'retina.jpg',
      examTypeLabel: 'Retinografia',
      previousChecklist: null,
      currentChecklist: { filled: 2, total: 3, status: 'partial' },
      reviewStatus: 'ok',
    });

    expect(message).toContain('Retinografia');
    expect(message).toContain('Campos-chave: 2/3');
  });
});
