import { describe, expect, it } from 'vitest';
import { isPsiquiatraElegivelParaVinculo } from '@/services/psiquiatraService';
import { PSIQUIATRA_STATUS } from '@/features/metaPsi/metaPsi.constants';
import { COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO } from '@/features/metaPsi/metaPsi.constants';

describe('vínculo Médico ↔ Psiquiatra — elegibilidade', () => {
  it('recusa psiquiatra não verificado / inativo', () => {
    expect(
      isPsiquiatraElegivelParaVinculo({
        isVerificado: false,
        status: PSIQUIATRA_STATUS.INATIVO,
      })
    ).toBe(false);
    expect(
      isPsiquiatraElegivelParaVinculo({
        isVerificado: true,
        status: PSIQUIATRA_STATUS.INATIVO,
      })
    ).toBe(false);
    expect(
      isPsiquiatraElegivelParaVinculo({
        isVerificado: false,
        status: PSIQUIATRA_STATUS.ATIVO,
      })
    ).toBe(false);
  });

  it('aceita psiquiatra verificado e ativo', () => {
    expect(
      isPsiquiatraElegivelParaVinculo({
        isVerificado: true,
        status: PSIQUIATRA_STATUS.ATIVO,
      })
    ).toBe(true);
  });

  it('collection oficial é solicitacoes_vinculo_psiquiatra_medico', () => {
    expect(COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO).toBe(
      'solicitacoes_vinculo_psiquiatra_medico'
    );
  });
});
