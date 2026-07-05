'use client';

import type { ReactNode } from 'react';
import { Activity, AlertTriangle, Scale, Ruler, Syringe } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import {
  formatPaciente360DeltaCm,
  formatPaciente360DeltaKg,
  PACIENTE360_RISCO_LABELS,
  PACIENTE360_STATUS_LABELS,
} from '@/lib/paciente360/paciente360Labels';
import type { Paciente360AlertSeverity, Paciente360RiskLevel, Paciente360Summary } from '@/types/paciente360';

type Props = {
  summary: Paciente360Summary;
};

const RISCO_CHIP: Record<Paciente360RiskLevel, string> = {
  baixo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  medio: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  alto: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  indeterminado: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300',
};

const STATUS_TRATAMENTO_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_tratamento: 'Em tratamento',
  concluido: 'Concluído',
  abandono: 'Abandono',
};

const PAGAMENTO_LABELS: Record<string, string> = {
  negociacao: 'Em negociação',
  iniciou_pagamento: 'Pagamento parcial',
  em_aberto: 'Em aberto',
  pago: 'Pago',
};

const ALERTA_SEVERIDADE: Record<Paciente360AlertSeverity, string> = {
  info: 'text-sky-700 dark:text-sky-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
};

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

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useMedicoLeadsCrmTheme();
  return (
    <div className={`rounded-xl p-3 ${t.infoBox} space-y-1.5 ${className}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.label}`}>{title}</p>
      <div className={`text-xs ${t.textPrimary} space-y-1`}>{children}</div>
    </div>
  );
}

export default function Paciente360SheetSummary({ summary }: Props) {
  const t = useMedicoLeadsCrmTheme();
  const statusComposto = PACIENTE360_STATUS_LABELS[summary.statusComposto] ?? summary.statusComposto;
  const statusTratamento =
    STATUS_TRATAMENTO_LABELS[summary.statusTratamento ?? ''] ?? summary.statusTratamento ?? '—';
  const plano = summary.plano;
  const resultado = summary.resultado;
  const adesao = summary.adesao;
  const financeiro = summary.financeiro;
  const alertas = summary.alertas ?? [];
  const alertasVisiveis = alertas.slice(0, 5);
  const alertasRestantes = Math.max(0, alertas.length - alertasVisiveis.length);
  const tags = summary.tagsAutomaticas ?? [];

  const semanaDoseParts: string[] = [];
  if (plano?.semanaAtual != null && plano.semanasTotal != null) {
    semanaDoseParts.push(`Semana ${plano.semanaAtual}/${plano.semanasTotal}`);
  } else if (plano?.semanasTotal != null) {
    semanaDoseParts.push(`${plano.semanasTotal} semanas`);
  }
  if (plano?.doseAtualMg != null) {
    semanaDoseParts.push(`Dose ${plano.doseAtualMg} mg`);
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className={`text-sm font-bold ${t.textPrimary}`}>Paciente 360</h4>
        <p className={`text-[10px] ${t.textSubtle} mt-0.5`}>Resumo executivo do tratamento</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${t.badgeCount}`}>
          {statusComposto}
        </span>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${RISCO_CHIP[summary.risco.nivel]}`}
        >
          Risco {PACIENTE360_RISCO_LABELS[summary.risco.nivel]}
        </span>
      </div>

      <Section title="Status geral">
        <p>
          <span className={t.textMuted}>Tratamento: </span>
          {statusTratamento}
        </p>
        {semanaDoseParts.length > 0 && (
          <p className="inline-flex items-center gap-1">
            <Syringe className="w-3 h-3 opacity-60 shrink-0" aria-hidden />
            {semanaDoseParts.join(' · ')}
          </p>
        )}
        {plano?.titrationStatus && (
          <p>
            <span className={t.textMuted}>Titulação: </span>
            {plano.titrationStatus}
          </p>
        )}
        {plano?.proximaAplicacao && (
          <p>
            <span className={t.textMuted}>Próxima aplicação: </span>
            {plano.proximaAplicacao.data ?? '—'}
            {plano.proximaAplicacao.semana != null && ` (sem. ${plano.proximaAplicacao.semana})`}
            {plano.proximaAplicacao.atrasada && (
              <span className="ml-1 text-rose-600 dark:text-rose-400 font-medium">· Atrasada</span>
            )}
          </p>
        )}
      </Section>

      {(resultado?.pesoInicial != null ||
        resultado?.pesoAtual != null ||
        resultado?.deltaPesoKg != null ||
        resultado?.cinturaInicial != null ||
        resultado?.cinturaAtual != null ||
        resultado?.deltaCinturaCm != null) && (
        <Section title="Resultado">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Scale className="w-3 h-3 opacity-60" aria-hidden />
              {formatKg(resultado?.pesoInicial)} → {formatKg(resultado?.pesoAtual)}
              {resultado?.deltaPesoKg != null && (
                <span className={`font-medium ${resultado.deltaPesoKg < 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  ({formatPaciente360DeltaKg(resultado.deltaPesoKg)})
                </span>
              )}
            </span>
          </div>
          {(resultado?.cinturaInicial != null || resultado?.cinturaAtual != null) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Ruler className="w-3 h-3 opacity-60" aria-hidden />
                {formatCm(resultado?.cinturaInicial)} → {formatCm(resultado?.cinturaAtual)}
                {resultado?.deltaCinturaCm != null && (
                  <span className="font-medium">({formatPaciente360DeltaCm(resultado.deltaCinturaCm)})</span>
                )}
              </span>
            </div>
          )}
        </Section>
      )}

      {adesao &&
        (adesao.aplicacoesRealizadas != null ||
          adesao.aplicacoesAtrasadas != null ||
          adesao.aplicacoesPerdidas != null) && (
          <Section title="Adesão">
            <p>
              {adesao.aplicacoesRealizadas ?? 0} realizadas · {adesao.aplicacoesAtrasadas ?? 0} atrasadas ·{' '}
              {adesao.aplicacoesPerdidas ?? 0} perdidas
            </p>
            {adesao.percentualAdesao != null && (
              <p>
                <span className={t.textMuted}>Percentual: </span>
                <span className="font-medium">{adesao.percentualAdesao}%</span>
              </p>
            )}
          </Section>
        )}

      {financeiro && (
        <Section title="Financeiro">
          <p>
            <span className={t.textMuted}>Status: </span>
            {PAGAMENTO_LABELS[financeiro.statusPagamento ?? ''] ?? financeiro.statusPagamento ?? '—'}
          </p>
          {financeiro.valorPendente != null && financeiro.valorPendente > 0 && (
            <p>
              <span className={t.textMuted}>Pendente: </span>
              {formatBrl(financeiro.valorPendente)}
            </p>
          )}
          {financeiro.proximoVencimento && (
            <p>
              <span className={t.textMuted}>Próximo vencimento: </span>
              {financeiro.proximoVencimento}
            </p>
          )}
        </Section>
      )}

      {(summary.risco.motivos.length > 0 || summary.risco.nivel !== 'baixo') && (
        <Section title="Risco">
          <p className="font-medium">{PACIENTE360_RISCO_LABELS[summary.risco.nivel]}</p>
          {summary.risco.motivos.length > 0 && (
            <ul className={`list-disc list-inside space-y-0.5 ${t.textMuted}`}>
              {summary.risco.motivos.map((motivo) => (
                <li key={motivo}>{motivo}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {summary.proximaAcao && (
        <Section title="Próxima ação">
          <p className="inline-flex items-start gap-1.5">
            <Activity className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" aria-hidden />
            <span>
              {summary.proximaAcao.label}
              <span className={`block text-[10px] ${t.textSubtle} mt-0.5`}>
                Prioridade {summary.proximaAcao.prioridade}
              </span>
            </span>
          </p>
        </Section>
      )}

      {tags.length > 0 && (
        <Section title="Tags automáticas">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className={`rounded px-2 py-0.5 text-[10px] font-medium ${t.badgeCount}`}>
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {alertas.length > 0 && (
        <Section title="Alertas ativos">
          <ul className="space-y-1.5">
            {alertasVisiveis.map((alerta, idx) => (
              <li key={`${alerta.tipo}-${idx}`} className="flex items-start gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${ALERTA_SEVERIDADE[alerta.severidade]}`} aria-hidden />
                <span>
                  <span className={`font-medium ${ALERTA_SEVERIDADE[alerta.severidade]}`}>{alerta.tipo}</span>
                  <span className={`block ${t.textMuted}`}>{alerta.mensagem}</span>
                </span>
              </li>
            ))}
          </ul>
          {alertasRestantes > 0 && (
            <p className={`text-[10px] ${t.textSubtle} pt-1`}>+{alertasRestantes} alertas</p>
          )}
        </Section>
      )}

      {summary.ultimaInteracao?.label && (
        <p className={`text-[10px] ${t.textSubtle}`}>
          Última interação: {summary.ultimaInteracao.label}
          {summary.ultimaInteracao.data instanceof Date &&
            ` · ${summary.ultimaInteracao.data.toLocaleDateString('pt-BR')}`}
        </p>
      )}
    </div>
  );
}

export function Paciente360SheetUnavailable() {
  const t = useMedicoLeadsCrmTheme();
  return (
    <div className={`rounded-xl p-3 border border-dashed ${t.divider} ${t.infoBox}`}>
      <p className={`text-xs font-semibold ${t.textPrimary}`}>Paciente 360</p>
      <p className={`text-[11px] mt-1 ${t.textMuted}`}>
        Paciente 360 ainda não disponível. Esse lead ainda não possui paciente vinculado.
      </p>
    </div>
  );
}
