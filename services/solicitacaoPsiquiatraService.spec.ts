import { describe, expect, it } from 'vitest';
import {
  COL_PACIENTE_PSIQUIATRA,
  COL_PACIENTE_PSIQUIATRA_SLOT,
  COL_SOLICITACOES_PSIQUIATRA,
  COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO,
} from '@/features/metaPsi/metaPsi.constants';
import { pacientePsiquiatraDocId } from '@/lib/metapsi/hasActivePsiquiatraAccess';
import { isPsiquiatraElegivelParaVinculo } from '@/services/psiquiatraService';
import { PSIQUIATRA_STATUS } from '@/features/metaPsi/metaPsi.constants';

describe('ETAPA 3 — compartilhamento paciente ↔ psiquiatra', () => {
  it('usa collections próprias (não Nutri/Personal)', () => {
    expect(COL_SOLICITACOES_PSIQUIATRA).toBe('solicitacoes_psiquiatra');
    expect(COL_PACIENTE_PSIQUIATRA).toBe('paciente_psiquiatra');
    expect(COL_PACIENTE_PSIQUIATRA_SLOT).toBe('paciente_psiquiatra_slot');
    expect(COL_SOLICITACOES_VINCULO_PSIQUIATRA_MEDICO).toBe(
      'solicitacoes_vinculo_psiquiatra_medico'
    );
    expect(COL_SOLICITACOES_PSIQUIATRA).not.toBe('solicitacoes_personal_trainer');
    expect(COL_PACIENTE_PSIQUIATRA).not.toBe('paciente_personal_trainer');
  });

  it('doc id ACL é pacienteId_psiquiatraId', () => {
    expect(pacientePsiquiatraDocId('pac-1', 'psi-9')).toBe('pac-1_psi-9');
  });

  it('elegibilidade exige verificado + ativo', () => {
    expect(
      isPsiquiatraElegivelParaVinculo({
        isVerificado: false,
        status: PSIQUIATRA_STATUS.INATIVO,
      })
    ).toBe(false);
    expect(
      isPsiquiatraElegivelParaVinculo({
        isVerificado: true,
        status: PSIQUIATRA_STATUS.ATIVO,
      })
    ).toBe(true);
  });
});
