import { describe, expect, it } from 'vitest';
import { inferLeadStatusFromSolicitacao } from '@/lib/metaadmin/inferLeadStatusFromSolicitacao';

describe('inferLeadStatusFromSolicitacao', () => {
  it('solicitações pendentes entram como Não Qualificado', () => {
    expect(inferLeadStatusFromSolicitacao({ status: 'pendente' })).toBe('nao_qualificado');
  });

  it('aceitar a solicitação não coloca o lead em Tratamento', () => {
    expect(
      inferLeadStatusFromSolicitacao(
        { status: 'aceita' },
        { statusTratamento: 'pendente' }
      )
    ).toBe('nao_qualificado');
  });

  it('paciente já em tratamento no cadastro entra na coluna Tratamento', () => {
    expect(
      inferLeadStatusFromSolicitacao(
        { status: 'aceita' },
        { statusTratamento: 'em_tratamento' }
      )
    ).toBe('em_tratamento');
  });

  it('rejeitada ou desistiu vão para Excluídos', () => {
    expect(inferLeadStatusFromSolicitacao({ status: 'rejeitada' })).toBe('excluido');
    expect(inferLeadStatusFromSolicitacao({ status: 'desistiu' })).toBe('excluido');
  });
});
