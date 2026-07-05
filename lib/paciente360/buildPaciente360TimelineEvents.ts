import {
  formatPaciente360DeltaCm,
  formatPaciente360DeltaKg,
  PACIENTE360_RISCO_LABELS,
  PACIENTE360_STATUS_LABELS,
} from '@/lib/paciente360/paciente360Labels';
import { formatYmd, startOfDay, toDateValue } from '@/lib/paciente360/paciente360DateUtils';
import type { LeadMedico } from '@/types/leadMedico';
import { LEAD_MEDICO_CRM_STAGES } from '@/types/leadMedicoCrm';
import type { Lembrete } from '@/types/lembrete';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import type {
  Paciente360DateQuality,
  Paciente360Summary,
  Paciente360TimelineBuildResult,
  Paciente360TimelineEvent,
  Paciente360TimelineTone,
} from '@/types/paciente360';
import {
  contaComoDoseAplicada,
  dataRealAplicacaoSeguimento,
  semanaIndexFromRegistro,
  toDateLocalEvolucao,
} from '@/utils/evolucaoAplicacaoHelpers';

export type BuildPaciente360TimelineEventsInput = {
  summary: Paciente360Summary;
  lead: LeadMedico;
  paciente?: PacienteCompleto | null;
  pagamento?: PagamentoPaciente | null;
  lembretes?: Lembrete[];
  includeCrmBasics?: boolean;
  now?: Date;
};

const PAGAMENTO_LABELS: Record<string, string> = {
  negociacao: 'Em negociação',
  iniciou_pagamento: 'Pagamento parcial',
  em_aberto: 'Em aberto',
  pago: 'Pago',
  atrasado: 'Atrasado',
};

function stageLabel(status: LeadMedico['status']): string {
  return LEAD_MEDICO_CRM_STAGES.find((s) => s.value === status)?.label || status;
}

function formatKg(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1).replace('.', ',')} kg`;
}

function formatCm(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1).replace('.', ',')} cm`;
}

function formatBrl(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseProximaAplicacaoDate(data?: string): Date | null {
  if (!data) return null;
  const br = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  return toDateValue(data);
}

function eventTime(date?: Date | string | null): number {
  const d = toDateValue(date);
  return d?.getTime() ?? 0;
}

function isAdesaoPerdida(reg: SeguimentoSemanal): boolean {
  return reg.adherence === 'MISSED' || reg.adesao === 'esquecida';
}

function isAdesaoAtrasada(reg: SeguimentoSemanal): boolean {
  return reg.adherence === 'LATE_<96H' || reg.adesao === 'atrasada';
}

function registroTemAplicacao(reg: SeguimentoSemanal): boolean {
  return contaComoDoseAplicada(reg) || isAdesaoPerdida(reg) || isAdesaoAtrasada(reg);
}

function aplicacaoTone(reg: SeguimentoSemanal): Paciente360TimelineTone {
  if (isAdesaoPerdida(reg)) return 'danger';
  if (isAdesaoAtrasada(reg)) return 'warning';
  if (contaComoDoseAplicada(reg)) return 'success';
  return 'neutral';
}

function resolveTreatmentStartDate(paciente?: PacienteCompleto | null): {
  date: Date | null;
  quality: Paciente360DateQuality;
} {
  const pt = paciente?.planoTerapeutico;
  if (!pt) return { date: null, quality: 'snapshot' };

  const start = toDateValue(pt.startDate) ?? toDateValue(pt.dataInicioTratamento);
  if (start) return { date: start, quality: 'real' };

  const firstDose = pt.historicoDoses?.[0]?.data;
  const fromHist = toDateValue(firstDose);
  if (fromHist) return { date: fromHist, quality: 'real' };

  return { date: null, quality: 'snapshot' };
}

function buildCheckInEvent(
  reg: SeguimentoSemanal,
  resultado: Paciente360Summary['resultado']
): Paciente360TimelineEvent | null {
  const hasPeso = reg.peso != null && reg.peso > 0;
  const hasCintura = reg.circunferenciaAbdominal != null && reg.circunferenciaAbdominal > 0;
  if (!hasPeso && !hasCintura) return null;

  const date = toDateLocalEvolucao(reg.dataRegistro);
  if (!date) return null;

  const semana = semanaIndexFromRegistro(reg);
  const parts: string[] = [];
  if (hasPeso) {
    let pesoPart = formatKg(reg.peso);
    if (resultado?.deltaPesoKg != null) {
      pesoPart += ` · variação total: ${formatPaciente360DeltaKg(resultado.deltaPesoKg)}`;
    }
    parts.push(pesoPart);
  }
  if (hasCintura) {
    let cPart = formatCm(reg.circunferenciaAbdominal);
    if (resultado?.deltaCinturaCm != null) {
      cPart += ` · variação total: ${formatPaciente360DeltaCm(resultado.deltaCinturaCm)}`;
    }
    parts.push(cPart);
  }
  if (semana > 0) parts.push(`Semana ${semana}`);

  const sameReg = hasPeso && hasCintura;
  return {
    id: `p360-checkin-${reg.id}`,
    date,
    type: sameReg ? 'system' : hasPeso ? 'weight' : 'waist',
    title: sameReg ? 'Check-in registrado' : hasPeso ? 'Peso registrado' : 'Cintura registrada',
    description: parts.join(' · '),
    tone:
      resultado?.deltaPesoKg != null
        ? resultado.deltaPesoKg < 0
          ? 'success'
          : resultado.deltaPesoKg > 0
            ? 'warning'
            : 'neutral'
        : 'neutral',
    sourceDateQuality: 'real',
  };
}

function buildApplicationEvents(paciente?: PacienteCompleto | null): Paciente360TimelineEvent[] {
  const regs = [...(paciente?.evolucaoSeguimento ?? [])]
    .filter(registroTemAplicacao)
    .sort((a, b) => eventTime(dataRealAplicacaoSeguimento(b)) - eventTime(dataRealAplicacaoSeguimento(a)))
    .slice(0, 3);

  return regs.map((reg) => {
    const semana = semanaIndexFromRegistro(reg);
    const dose = reg.doseAplicada?.quantidade;
    const desc: string[] = [];
    if (semana > 0) desc.push(`Semana ${semana}`);
    if (dose != null) desc.push(`Dose ${dose} mg`);

    return {
      id: `p360-dose-${reg.id}`,
      date: dataRealAplicacaoSeguimento(reg),
      type: 'dose',
      title: 'Aplicação registrada',
      description: desc.length > 0 ? desc.join(' · ') : undefined,
      tone: aplicacaoTone(reg),
      sourceDateQuality: 'real',
    };
  });
}

function buildPaymentEvents(
  pagamento?: PagamentoPaciente | null,
  now = new Date()
): Paciente360TimelineEvent[] {
  const parcelas = pagamento?.parcelas ?? [];
  if (parcelas.length === 0) return [];

  const hoje = startOfDay(now).getTime();
  const items: Paciente360TimelineEvent[] = [];

  for (const parcela of parcelas) {
    if (parcela.status === 'paga') {
      const paidAt = toDateValue(parcela.dataPagamento);
      if (!paidAt) continue;
      items.push({
        id: `p360-pay-paid-${parcela.numero}`,
        date: paidAt,
        type: 'payment',
        title: 'Parcela paga',
        description: `Valor ${formatBrl(parcela.valor)}`,
        tone: 'success',
        sourceDateQuality: 'real',
      });
      continue;
    }

    const venc = toDateValue(parcela.dataVencimento);
    if (!venc) continue;

    const vencida =
      parcela.status === 'atrasada' ||
      (parcela.status === 'pendente' && startOfDay(venc).getTime() < hoje);

    if (vencida || parcela.status === 'pendente') {
      items.push({
        id: `p360-pay-due-${parcela.numero}`,
        date: venc,
        type: 'payment',
        title: vencida ? 'Parcela vencida' : 'Parcela pendente',
        description: `Valor ${formatBrl(parcela.valor)} · ${parcela.status === 'atrasada' ? 'atrasada' : 'pendente'}`,
        tone: vencida ? 'danger' : 'warning',
        sourceDateQuality: 'real',
      });
    }
  }

  return items.sort((a, b) => eventTime(b.date) - eventTime(a.date)).slice(0, 3);
}

function buildLembreteEvents(lembretes: Lembrete[] | undefined, now = new Date()): Paciente360TimelineEvent[] {
  const hojeYmd = formatYmd(startOfDay(now));
  const sorted = [...(lembretes ?? [])].sort(
    (a, b) => eventTime(b.criadoEm) - eventTime(a.criadoEm) || b.data.localeCompare(a.data)
  );

  return sorted.slice(0, 5).map((l) => {
    const atrasado = !l.concluido && l.data < hojeYmd;
    const statusLabel = l.concluido ? 'concluído' : atrasado ? 'atrasado' : 'pendente';
    return {
      id: `p360-lembrete-${l.id}`,
      date: toDateValue(l.criadoEm) ?? toDateValue(l.data),
      type: 'reminder',
      title: `Lembrete: ${l.texto}`,
      description: `Tag ${l.tag} · ${statusLabel}`,
      tone: l.concluido ? 'success' : atrasado ? 'warning' : 'neutral',
      sourceDateQuality: 'real',
    };
  });
}

function buildAlertEvents(paciente?: PacienteCompleto | null): Paciente360TimelineEvent[] {
  const alertas = [...(paciente?.alertas ?? [])]
    .filter((a) => a.status === 'ACTIVE')
    .sort((a, b) => eventTime(b.generatedAt) - eventTime(a.generatedAt))
    .slice(0, 5);

  return alertas.map((a) => ({
    id: `p360-alert-${a.id}`,
    date: toDateValue(a.generatedAt),
    type: 'alert',
    title: 'Alerta clínico',
    description: a.description,
    tone: a.severity === 'CRITICAL' ? 'danger' : a.severity === 'MODERATE' ? 'warning' : 'info',
    sourceDateQuality: 'real',
  }));
}

function buildCurrentState(summary: Paciente360Summary, hasPaymentEvents: boolean): Paciente360TimelineEvent | undefined {
  const parts: string[] = [];

  if (summary.risco.nivel === 'alto' || summary.risco.nivel === 'medio') {
    parts.push(`Risco ${PACIENTE360_RISCO_LABELS[summary.risco.nivel].toLowerCase()}`);
  }

  const fin = summary.financeiro;
  if (fin && !hasPaymentEvents) {
    if (fin.statusPagamento === 'atrasado' || (fin.valorPendente ?? 0) > 0) {
      const label = PAGAMENTO_LABELS[fin.statusPagamento ?? ''] ?? 'pagamento pendente';
      parts.push(label.toLowerCase());
    }
  } else if (fin?.statusPagamento === 'atrasado' || (fin?.valorPendente ?? 0) > 0) {
    parts.push('pagamento atrasado');
  }

  if (summary.proximaAcao?.label) {
    parts.push(`próxima ação: ${summary.proximaAcao.label.toLowerCase()}`);
  }

  const statusLabel = PACIENTE360_STATUS_LABELS[summary.statusComposto] ?? summary.statusComposto;
  if (summary.statusComposto === 'pendente' || summary.statusComposto === 'aguardando_marco_zero') {
    parts.push(`status: ${statusLabel.toLowerCase()}`);
  }

  if (parts.length === 0) return undefined;

  let tone: Paciente360TimelineTone = 'info';
  if (summary.risco.nivel === 'alto' || fin?.statusPagamento === 'atrasado') tone = 'danger';
  else if (summary.risco.nivel === 'medio' || (fin?.valorPendente ?? 0) > 0) tone = 'warning';

  return {
    id: 'p360-current-state',
    type: 'system',
    title: 'Estado atual',
    description: parts.join(' · '),
    tone,
    isSnapshot: true,
    sourceDateQuality: 'snapshot',
  };
}

export function buildPaciente360TimelineEvents({
  summary,
  lead,
  paciente,
  pagamento,
  lembretes,
  includeCrmBasics = false,
  now = new Date(),
}: BuildPaciente360TimelineEventsInput): Paciente360TimelineBuildResult {
  const events: Paciente360TimelineEvent[] = [];
  const { plano, resultado } = summary;

  if (includeCrmBasics && lead.createdAt) {
    events.push({
      id: 'p360-lead-created',
      date: lead.createdAt,
      type: 'lead_created',
      title: 'Lead captado',
      description: 'Paciente entrou no funil pelo CRM.',
      tone: 'neutral',
      sourceDateQuality: 'real',
    });
  }

  if (includeCrmBasics) {
    const stageDate = lead.updatedAt ?? lead.dataStatus ?? lead.createdAt;
    events.push({
      id: 'p360-stage-current',
      date: stageDate,
      type: 'stage_changed',
      title: `Estágio atual: ${stageLabel(lead.status)}`,
      tone: 'info',
      sourceDateQuality: 'real',
    });
  }

  if (plano?.tratamentoIniciado) {
    const { date: startDate, quality } = resolveTreatmentStartDate(paciente);
    if (startDate) {
      const descParts: string[] = [];
      if (plano.semanasTotal != null) descParts.push(`Plano de ${plano.semanasTotal} semanas`);
      if (plano.doseAtualMg != null) descParts.push(`dose atual ${plano.doseAtualMg} mg`);

      events.push({
        id: 'p360-treatment-started',
        date: startDate,
        type: 'treatment_started',
        title: 'Tratamento iniciado',
        description: descParts.length > 0 ? descParts.join(' · ') : undefined,
        tone: 'success',
        sourceDateQuality: quality,
      });
    }
  }

  if (plano?.proximaAplicacao) {
    const pa = plano.proximaAplicacao;
    const parsed = parseProximaAplicacaoDate(pa.data);
    if (parsed) {
      const descParts: string[] = [];
      if (pa.semana != null) descParts.push(`Semana ${pa.semana}`);
      if (pa.data) descParts.push(`prevista ${pa.data}`);
      events.push({
        id: 'p360-next-dose',
        date: parsed,
        type: 'dose',
        title: 'Próxima aplicação prevista',
        description: descParts.length > 0 ? descParts.join(' · ') : undefined,
        tone: pa.atrasada ? 'warning' : 'info',
        sourceDateQuality: 'estimated',
      });
    }
  }

  const paymentEvents = buildPaymentEvents(pagamento, now);
  events.push(...paymentEvents);

  events.push(...buildApplicationEvents(paciente));

  const evolucao = [...(paciente?.evolucaoSeguimento ?? [])].sort(
    (a, b) => eventTime(b.dataRegistro) - eventTime(a.dataRegistro)
  );
  const latestMeasure = evolucao.find(
    (r) => (r.peso != null && r.peso > 0) || (r.circunferenciaAbdominal != null && r.circunferenciaAbdominal > 0)
  );
  if (latestMeasure) {
    const checkIn = buildCheckInEvent(latestMeasure, resultado);
    if (checkIn) events.push(checkIn);
  }

  events.push(...buildLembreteEvents(lembretes, now));
  events.push(...buildAlertEvents(paciente));

  const datedEvents = events
    .filter((e) => eventTime(e.date) > 0 && !e.isSnapshot)
    .sort((a, b) => eventTime(b.date) - eventTime(a.date));

  const currentState = buildCurrentState(summary, paymentEvents.length > 0);

  return { currentState, events: datedEvents };
}
