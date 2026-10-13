/**
 * Resolução canônica: no máximo 1 Psiquiatra ativo por paciente.
 * Múltiplos ativos = inconsistência legada; fallback só para leitura (não altera dados).
 */

export type ActivePsiquiatraVinculoLike = {
  id?: string;
  psiquiatraId: string;
  status?: string;
  dataCompartilhamento?: Date | null;
};

export type ResolveSingleActivePsiquiatraResult<T extends ActivePsiquiatraVinculoLike> = {
  /** Único ativo válido, ou escolha determinística se houver conflito. */
  activeVinculo: T | null;
  /** true se length > 1 — estado inválido (legado/corrida). */
  hasConflict: boolean;
  activeCount: number;
};

function compartilhamentoMs(v: ActivePsiquiatraVinculoLike): number {
  const d = v.dataCompartilhamento;
  if (!d) return 0;
  try {
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  } catch {
    return 0;
  }
}

/**
 * Escolhe no máximo um vínculo ativo.
 * Regra de negócio: 0 ou 1. Se >1, fallback determinístico (mais recente, depois id)
 * SEM mutar documentos — apenas para UI não quebrar.
 */
export function resolveSingleActivePsiquiatraVinculo<T extends ActivePsiquiatraVinculoLike>(
  ativos: T[]
): ResolveSingleActivePsiquiatraResult<T> {
  const list = Array.isArray(ativos) ? ativos.filter(Boolean) : [];
  if (list.length === 0) {
    return { activeVinculo: null, hasConflict: false, activeCount: 0 };
  }
  if (list.length === 1) {
    return { activeVinculo: list[0], hasConflict: false, activeCount: 1 };
  }

  const sorted = [...list].sort((a, b) => {
    const diff = compartilhamentoMs(b) - compartilhamentoMs(a);
    if (diff !== 0) return diff;
    return String(a.psiquiatraId || '').localeCompare(String(b.psiquiatraId || ''));
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[psiquiatria] inconsistência: múltiplos ACLs ativos no mesmo paciente (fallback de leitura; estado inválido)',
      {
        count: sorted.length,
        psiquiatraIds: sorted.map((v) => v.psiquiatraId),
      }
    );
  }

  return {
    activeVinculo: sorted[0] ?? null,
    hasConflict: true,
    activeCount: sorted.length,
  };
}
