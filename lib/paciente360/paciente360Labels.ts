import type { Paciente360RiskLevel, Paciente360StatusComposto, Paciente360Summary } from '@/types/paciente360';

export const PACIENTE360_STATUS_LABELS: Record<Paciente360StatusComposto, string> = {
  pendente: 'Pendente',
  em_tratamento: 'Em tratamento',
  aguardando_marco_zero: 'Aguardando marco zero',
  dose_atrasada: 'Dose atrasada',
  pausado: 'Pausado',
  concluido: 'Concluído',
  abandono: 'Abandono',
  indeterminado: 'Indeterminado',
};

export const PACIENTE360_RISCO_LABELS: Record<Paciente360RiskLevel, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
  indeterminado: 'Indeterminado',
};

export type Paciente360CardTone = 'neutral' | 'warning' | 'danger' | 'success';

export type Paciente360CardHighlight = {
  tone: Paciente360CardTone;
  title: string;
  subtitle?: string;
};

export function formatPaciente360DeltaKg(kg: number): string {
  const sign = kg > 0 ? '+' : '';
  return `${sign}${kg.toFixed(1).replace('.', ',')} kg`;
}

export function formatPaciente360DeltaCm(cm: number): string {
  const sign = cm > 0 ? '+' : '';
  return `${sign}${cm.toFixed(1).replace('.', ',')} cm`;
}

function pagamentoPendenteNoSummary(summary: Paciente360Summary): boolean {
  if (summary.proximaAcao?.tipo === 'cobrar_pagamento') return true;
  const fin = summary.financeiro;
  if (!fin) return false;
  return (
    fin.statusPagamento != null &&
    fin.statusPagamento !== 'pago' &&
    (fin.valorPendente ?? 0) > 0
  );
}

/** Resumo de uma linha para o card compacto do Kanban CRM. */
export function getPaciente360CardHighlight(summary: Paciente360Summary): Paciente360CardHighlight {
  const statusLabel = PACIENTE360_STATUS_LABELS[summary.statusComposto] ?? summary.statusComposto;
  const proximaAcaoLabel = summary.proximaAcao?.label ?? 'Acompanhar evolução';
  const proximaAcaoTipo = summary.proximaAcao?.tipo;

  if (summary.risco.nivel === 'alto') {
    return {
      tone: 'danger',
      title: '⚠️ Risco alto',
      subtitle: proximaAcaoLabel !== 'Acompanhar evolução' ? proximaAcaoLabel : 'Revisar paciente',
    };
  }

  if (pagamentoPendenteNoSummary(summary)) {
    return {
      tone: 'warning',
      title: '⚠️ Pagamento pendente',
      subtitle: 'Cobrar pagamento',
    };
  }

  if (summary.statusComposto === 'dose_atrasada' || summary.plano?.proximaAplicacao?.atrasada) {
    return {
      tone: 'warning',
      title: '⚠️ Dose atrasada',
      subtitle: proximaAcaoLabel.toLowerCase().includes('aplicação')
        ? proximaAcaoLabel
        : 'Avaliar aplicação',
    };
  }

  const alertaSevero = summary.alertas.find((a) => a.severidade === 'danger');
  if (alertaSevero) {
    return {
      tone: 'danger',
      title: `⚠️ ${alertaSevero.tipo}`,
      subtitle: proximaAcaoLabel,
    };
  }

  if (summary.alertas.length > 0) {
    const alerta = summary.alertas[0];
    return {
      tone: 'warning',
      title: `Alerta ativo`,
      subtitle: proximaAcaoLabel,
    };
  }

  if (summary.risco.nivel === 'medio') {
    return {
      tone: 'warning',
      title: statusLabel,
      subtitle: proximaAcaoLabel,
    };
  }

  if (
    proximaAcaoTipo &&
    proximaAcaoTipo !== 'acompanhar' &&
    proximaAcaoTipo !== 'sem_acao' &&
    proximaAcaoLabel !== 'Acompanhar evolução'
  ) {
    return {
      tone: 'neutral',
      title: statusLabel,
      subtitle: proximaAcaoLabel,
    };
  }

  if (summary.statusComposto === 'pendente' || summary.statusComposto === 'aguardando_marco_zero') {
    return {
      tone: 'neutral',
      title: statusLabel,
      subtitle: 'Iniciar acompanhamento',
    };
  }

  return {
    tone: 'neutral',
    title: statusLabel,
    subtitle: 'Acompanhar evolução',
  };
}

/** Tooltip com detalhes que ficam no sheet lateral. */
export function buildPaciente360CardTooltip(summary: Paciente360Summary): string {
  const parts: string[] = [];
  const plano = summary.plano;

  if (plano?.semanaAtual != null && plano.semanasTotal != null) {
    parts.push(`Semana ${plano.semanaAtual}/${plano.semanasTotal}`);
  }
  if (plano?.doseAtualMg != null) {
    parts.push(`Dose ${plano.doseAtualMg} mg`);
  }
  if (summary.resultado?.deltaPesoKg != null) {
    parts.push(`Peso: ${formatPaciente360DeltaKg(summary.resultado.deltaPesoKg)}`);
  }
  if (summary.resultado?.deltaCinturaCm != null) {
    parts.push(`Cintura: ${formatPaciente360DeltaCm(summary.resultado.deltaCinturaCm)}`);
  }
  if (summary.risco.nivel !== 'baixo') {
    parts.push(`Risco: ${PACIENTE360_RISCO_LABELS[summary.risco.nivel]}`);
  }
  if (summary.proximaAcao?.label) {
    parts.push(`Próxima ação: ${summary.proximaAcao.label}`);
  }
  if (summary.tagsAutomaticas?.length) {
    parts.push(summary.tagsAutomaticas.join(' · '));
  }

  return parts.join(' · ');
}
