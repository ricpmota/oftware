import { describe, expect, it, vi, afterEach } from 'vitest';
import { resolveSingleActivePsiquiatraVinculo } from '@/lib/psiquiatria/resolveSingleActivePsiquiatra';
import { COL_PACIENTE_PSIQUIATRA_SLOT } from '@/features/metaPsi/metaPsi.constants';
import { canAdministerPsiquiatriaShare } from '@/lib/psiquiatria/psiquiatriaModule';

describe('ETAPA 5.1 — um Psiquiatra ativo por paciente', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('A — 0 ativos: válido', () => {
    const r = resolveSingleActivePsiquiatraVinculo([]);
    expect(r.activeVinculo).toBeNull();
    expect(r.hasConflict).toBe(false);
    expect(r.activeCount).toBe(0);
  });

  it('B — 1 ativo: válido', () => {
    const r = resolveSingleActivePsiquiatraVinculo([
      { id: 'a', psiquiatraId: 'psi-X', dataCompartilhamento: new Date('2026-01-01') },
    ]);
    expect(r.activeVinculo?.psiquiatraId).toBe('psi-X');
    expect(r.hasConflict).toBe(false);
    expect(r.activeCount).toBe(1);
  });

  it('F — 2 ativos legado: UI não quebra, hasConflict true, fallback determinístico', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = resolveSingleActivePsiquiatraVinculo([
      {
        id: 'old',
        psiquiatraId: 'psi-X',
        dataCompartilhamento: new Date('2026-01-01'),
      },
      {
        id: 'new',
        psiquiatraId: 'psi-Y',
        dataCompartilhamento: new Date('2026-06-01'),
      },
    ]);
    expect(r.hasConflict).toBe(true);
    expect(r.activeCount).toBe(2);
    expect(r.activeVinculo?.psiquiatraId).toBe('psi-Y');
    expect(warn).toHaveBeenCalled();
  });

  it('E — slot atômico existe para serializar aceite concorrente', () => {
    expect(COL_PACIENTE_PSIQUIATRA_SLOT).toBe('paciente_psiquiatra_slot');
    expect(COL_PACIENTE_PSIQUIATRA_SLOT).not.toBe('paciente_psiquiatra');
  });

  it('mobile Psiquiatria só no metaadmin (share admin)', () => {
    expect(canAdministerPsiquiatriaShare('metaadmin')).toBe(true);
    expect(canAdministerPsiquiatriaShare('metanutri')).toBe(false);
  });
});
