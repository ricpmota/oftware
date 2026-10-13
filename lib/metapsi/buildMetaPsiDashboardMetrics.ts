/**
 * Agregação de KPIs do Início MetaPsi — só contagens reais (sem domínio clínico).
 * SoT pacientes: paciente_psiquiatra status ativo.
 */

export type MetaPsiDashboardVinculoInput = {
  status?: string;
  dataCompartilhamento?: Date | null;
};

export type MetaPsiDashboardMetricsInput = {
  /** Preferir apenas vínculos já filtrados como ativos; status extra é defesa. */
  vinculos: MetaPsiDashboardVinculoInput[];
  medicoVinculadoIds: string[];
  /** solicitacoes_psiquiatra pendentes (ação do Psi). */
  compartilhamentosPendentes: number;
  /** solicitacoes_vinculo_psiquiatra_medico recebidas do médico, pendentes. */
  vinculosPendentesRecebidos: number;
  /** Janela para “novos compartilhamentos” (paridade conceitual do sparkline Nutri). */
  recentDays?: number;
  now?: Date;
};

export type MetaPsiDashboardMetrics = {
  pacientesAtivos: number;
  /** Timestamps de dataCompartilhamento — alimenta DashboardHeroKpi. */
  compartilhamentoTimestamps: number[];
  medicosVinculados: number;
  compartilhamentosPendentes: number;
  vinculosPendentesRecebidos: number;
  /** Ações que exigem resposta do Psiquiatra (soma clara nos cards separados). */
  solicitacoesAguardandoAcao: number;
  novosCompartilhamentosRecentes: number;
  recentDays: number;
};

function isActiveVinculo(v: MetaPsiDashboardVinculoInput): boolean {
  const status = String(v.status || 'ativo').trim().toLowerCase();
  return status === 'ativo';
}

function toTime(value: Date | null | undefined): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : Number.NaN;
  return Number.isFinite(t) ? t : null;
}

/**
 * Conta pacientes ativos, médicos vinculados e pendências reais.
 * Paciente inativo/removido não entra. Solicitações não contam como vínculo.
 */
export function buildMetaPsiDashboardMetrics(
  input: MetaPsiDashboardMetricsInput,
): MetaPsiDashboardMetrics {
  const recentDays = Math.max(1, Math.floor(input.recentDays ?? 30));
  const now = input.now ?? new Date();
  const cutoff = now.getTime() - recentDays * 24 * 60 * 60 * 1000;

  const ativos = (input.vinculos || []).filter(isActiveVinculo);
  const timestamps = ativos
    .map((v) => toTime(v.dataCompartilhamento ?? null))
    .filter((t): t is number => t != null);

  const medicos = Array.from(
    new Set(
      (input.medicoVinculadoIds || [])
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  );

  const compartilhamentosPendentes = Math.max(0, Math.floor(input.compartilhamentosPendentes || 0));
  const vinculosPendentesRecebidos = Math.max(0, Math.floor(input.vinculosPendentesRecebidos || 0));
  const novosCompartilhamentosRecentes = timestamps.filter((t) => t >= cutoff).length;

  return {
    pacientesAtivos: ativos.length,
    compartilhamentoTimestamps: timestamps,
    medicosVinculados: medicos.length,
    compartilhamentosPendentes,
    vinculosPendentesRecebidos,
    solicitacoesAguardandoAcao: compartilhamentosPendentes + vinculosPendentesRecebidos,
    novosCompartilhamentosRecentes,
    recentDays,
  };
}
