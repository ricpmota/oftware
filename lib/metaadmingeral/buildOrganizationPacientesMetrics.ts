import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';

export type StatusTratamentoKey = 'pendente' | 'em_tratamento' | 'concluido' | 'abandono';

export type StatusCounts = {
  pendente: number;
  em_tratamento: number;
  concluido: number;
  abandono: number;
  total: number;
};

export type MedicoPacientesRow = StatusCounts & {
  medicoId: string;
  medicoNome: string;
  medicoEmail: string;
};

export type MonthlyStatusPoint = StatusCounts & {
  monthKey: string;
  label: string;
};

export type OrganizationPacientesMetrics = {
  totals: StatusCounts;
  months: MonthlyStatusPoint[];
  rows: MedicoPacientesRow[];
  totalMedicos: number;
  medicosFiltrados: number;
};

export type OrganizationPacientesMetricsInput = {
  medicos: Medico[];
  pacientes: Pick<
    PacienteCompleto,
    'medicoResponsavelId' | 'medicoResponsavelAnteriorId' | 'statusTratamento' | 'dataCadastro'
  >[];
  /**
   * `null`/`undefined` = todos os médicos;
   * `[]` = nenhum;
   * `[ids]` = apenas os selecionados.
   */
  selectedMedicoIds?: string[] | null;
  monthsBack?: number;
  referenceDate?: Date;
};

function emptyCounts(): StatusCounts {
  return { pendente: 0, em_tratamento: 0, concluido: 0, abandono: 0, total: 0 };
}

function bumpStatus(counts: StatusCounts, status: StatusTratamentoKey): void {
  counts[status] += 1;
  counts.total += 1;
}

function normalizeStatus(status: PacienteCompleto['statusTratamento'] | undefined): StatusTratamentoKey {
  if (status === 'em_tratamento' || status === 'concluido' || status === 'abandono') return status;
  return 'pendente';
}

/** Médico atual ou anterior (abandono). */
export function resolvePacienteMedicoId(
  paciente: Pick<PacienteCompleto, 'medicoResponsavelId' | 'medicoResponsavelAnteriorId'>,
): string | null {
  const atual = paciente.medicoResponsavelId?.trim();
  if (atual) return atual;
  const anterior = paciente.medicoResponsavelAnteriorId?.trim();
  return anterior || null;
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const withToDate = (value as { toDate?: () => Date })?.toDate?.();
  if (withToDate instanceof Date && !Number.isNaN(withToDate.getTime())) return withToDate;
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabelFromKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  return label.replace('.', '');
}

function buildMonthKeys(referenceDate: Date, monthsBack: number): string[] {
  const keys: string[] = [];
  const base = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    keys.push(monthKeyFromDate(d));
  }
  return keys;
}

function emptyRow(medico: Medico): MedicoPacientesRow {
  return {
    medicoId: medico.id,
    medicoNome: medico.nome,
    medicoEmail: medico.email,
    ...emptyCounts(),
  };
}

/**
 * Monitoramento de pacientes por médico e mês de cadastro (status atual).
 * Inclui abandonos atribuídos via medicoResponsavelAnteriorId.
 */
export function buildOrganizationPacientesMetrics(
  input: OrganizationPacientesMetricsInput,
): OrganizationPacientesMetrics {
  const monthsBack = Math.max(1, input.monthsBack ?? 12);
  const referenceDate = input.referenceDate ?? new Date();
  const selected = input.selectedMedicoIds;
  const medicosFiltrados =
    selected == null
      ? input.medicos
      : selected.length === 0
        ? []
        : input.medicos.filter((m) => selected.includes(m.id));

  const medicoIdsFiltrados = new Set(medicosFiltrados.map((m) => m.id));
  const byMedicoId = new Map<string, MedicoPacientesRow>();
  for (const medico of medicosFiltrados) {
    byMedicoId.set(medico.id, emptyRow(medico));
  }

  const monthKeys = buildMonthKeys(referenceDate, monthsBack);
  const monthMap = new Map<string, MonthlyStatusPoint>();
  for (const key of monthKeys) {
    monthMap.set(key, {
      monthKey: key,
      label: monthLabelFromKey(key),
      ...emptyCounts(),
    });
  }

  const totals = emptyCounts();

  for (const paciente of input.pacientes) {
    const medicoId = resolvePacienteMedicoId(paciente);
    if (!medicoId || !medicoIdsFiltrados.has(medicoId)) continue;

    const status = normalizeStatus(paciente.statusTratamento);
    const row = byMedicoId.get(medicoId);
    if (row) bumpStatus(row, status);
    bumpStatus(totals, status);

    const cadastro = toDateSafe(paciente.dataCadastro);
    if (!cadastro) continue;
    const key = monthKeyFromDate(cadastro);
    const point = monthMap.get(key);
    if (point) bumpStatus(point, status);
  }

  const rows = Array.from(byMedicoId.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.medicoNome.localeCompare(b.medicoNome, 'pt-BR');
  });

  return {
    totals,
    months: monthKeys.map((key) => monthMap.get(key)!),
    rows,
    totalMedicos: input.medicos.length,
    medicosFiltrados: medicosFiltrados.length,
  };
}
