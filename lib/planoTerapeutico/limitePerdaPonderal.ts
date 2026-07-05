/**
 * Teto clínico de perda ponderal no plano terapêutico.
 * Acima de 22% do peso inicial, o excedente é tratado como manutenção.
 */
export const PERDA_PONDERAL_MAX_PERCENTUAL = 22;

function arredondar1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function perdaPonderalMaximaKg(pesoKg: number): number {
  if (pesoKg <= 0) return 0;
  return arredondar1((pesoKg * PERDA_PONDERAL_MAX_PERCENTUAL) / 100);
}

export type MetaPerdaResolvida = {
  metaPacienteKg: number | null;
  metaPacientePercentual: number | null;
  /** Perda efetiva na fase ativa (máx. 22% do peso). */
  perdaEfetivaKg: number;
  perdaEfetivaPercentual: number;
  /** Excedente da meta do paciente além do teto → manutenção. */
  manutencaoKg: number;
  manutencaoPercentual: number;
  possuiFaseManutencao: boolean;
};

export function resolverMetaPerdaComLimite(
  pesoKg: number | null,
  metaKg: number | null | undefined,
  metaPercentual: number | null | undefined
): MetaPerdaResolvida {
  const vazio: MetaPerdaResolvida = {
    metaPacienteKg: metaKg ?? null,
    metaPacientePercentual: metaPercentual ?? null,
    perdaEfetivaKg: 0,
    perdaEfetivaPercentual: 0,
    manutencaoKg: 0,
    manutencaoPercentual: 0,
    possuiFaseManutencao: false,
  };

  if (pesoKg == null || pesoKg <= 0) return vazio;

  let metaPacienteKg = metaKg != null && metaKg > 0 ? metaKg : null;
  let metaPacientePercentual =
    metaPercentual != null && metaPercentual > 0 ? arredondar1(metaPercentual) : null;

  if (metaPacientePercentual == null && metaPacienteKg != null) {
    metaPacientePercentual = arredondar1((metaPacienteKg / pesoKg) * 100);
  }
  if (metaPacienteKg == null && metaPacientePercentual != null) {
    metaPacienteKg = arredondar1((pesoKg * metaPacientePercentual) / 100);
  }

  const perdaMaxKg = perdaPonderalMaximaKg(pesoKg);
  const metaKgNum = metaPacienteKg ?? 0;
  const metaPctNum =
    metaPacientePercentual ??
    (metaKgNum > 0 ? arredondar1((metaKgNum / pesoKg) * 100) : 0);

  const perdaEfetivaKg =
    metaKgNum > 0 ? Math.min(metaKgNum, perdaMaxKg) : perdaMaxKg;
  const perdaEfetivaPercentual = Math.min(
    metaPctNum > 0 ? metaPctNum : PERDA_PONDERAL_MAX_PERCENTUAL,
    PERDA_PONDERAL_MAX_PERCENTUAL
  );

  const manutencaoKg = Math.max(0, arredondar1(metaKgNum - perdaEfetivaKg));
  const manutencaoPercentual = Math.max(
    0,
    arredondar1(metaPctNum - perdaEfetivaPercentual)
  );

  return {
    metaPacienteKg,
    metaPacientePercentual,
    perdaEfetivaKg,
    perdaEfetivaPercentual,
    manutencaoKg,
    manutencaoPercentual,
    possuiFaseManutencao: manutencaoKg > 0.05,
  };
}

/** Limita kg de perda ao teto de 22% do peso. */
export function limitarPerdaKgAoTeto(pesoKg: number | null, perdaKg: number): number {
  if (pesoKg == null || pesoKg <= 0) return Math.max(0, perdaKg);
  return Math.min(Math.max(0, perdaKg), perdaPonderalMaximaKg(pesoKg));
}
