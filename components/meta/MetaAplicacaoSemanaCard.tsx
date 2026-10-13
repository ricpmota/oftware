'use client';

import { ChevronDown, ChevronUp, Edit, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { MetaAplicacaoDetalheLinha } from '@/components/meta/MetaAplicacaoDetalheLinha';
import { MetaAplicacaoResumoSection } from '@/components/meta/MetaAplicacaoResumoSection';
import { obterCheckInScoreParaAplicacao } from '@/lib/aplicacao/resolveCheckInSemanalScore';
import {
  aplicacaoFoiFeitaNoPaciente,
  labelLocalAplicacao,
  localPlanejadoParaSemana,
  obterRegistroSeguimentoDaAplicacao,
  obterUltimaVariacaoCompPaciente,
  obterUltimaVariacaoPesoPaciente,
  obterVariacaoCompAplicacao,
  obterVariacaoPesoAplicacao,
} from '@/utils/evolucaoAplicacaoHelpers';

export type MetaAplicacaoSemanaItem = {
  data: Date;
  semana: number;
  dose: number;
  status: 'tomada' | 'perdida' | 'hoje' | 'futura' | 'cancelada';
  adherence?: string | null;
  localAplicacao?: string | null;
};

type Props = {
  paciente: PacienteCompleto;
  aplicacao: MetaAplicacaoSemanaItem;
  index: number;
  total: number;
  aberto: boolean;
  onToggle: () => void;
  onEditar: () => void;
  onApagar: () => void;
  podeEditar: boolean;
  podeApagar: boolean;
  editando: boolean;
  apagando: boolean;
  podePreencher: boolean;
  preencherLoading: boolean;
  onPreencher: () => void;
};

function badgeStatus(status: MetaAplicacaoSemanaItem['status']) {
  if (status === 'tomada') {
    return { label: 'Aplicada', className: 'bg-green-600 text-white' };
  }
  if (status === 'perdida') {
    return { label: 'Não aplicada', className: 'bg-red-600 text-white' };
  }
  if (status === 'hoje') {
    return { label: 'Hoje', className: 'bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] text-white' };
  }
  if (status === 'cancelada') {
    return { label: 'Cancelada', className: 'bg-gray-500 text-white' };
  }
  return { label: 'Não aplicada', className: 'bg-gray-400/90 dark:bg-white/15 text-white' };
}

function formatarDelta(valor: number | null, unidade: string): string {
  if (valor == null) return '—';
  return `${valor > 0 ? '+' : ''}${valor.toFixed(1)} ${unidade}`;
}

function deltaClass(valor: number | null): string {
  if (valor == null) return 'text-gray-500 dark:text-[#E8EDED]/55';
  if (valor <= 0) return 'text-green-700 dark:text-green-400';
  return 'text-amber-700 dark:text-amber-400';
}

export function MetaAplicacaoSemanaCard({
  paciente,
  aplicacao,
  index,
  total,
  aberto,
  onToggle,
  onEditar,
  onApagar,
  podeEditar,
  podeApagar,
  editando,
  apagando,
  podePreencher,
  preencherLoading,
  onPreencher,
}: Props) {
  const registro: SeguimentoSemanal | null = obterRegistroSeguimentoDaAplicacao(
    paciente,
    aplicacao.data,
    aplicacao.semana
  );

  const foiFeita = aplicacaoFoiFeitaNoPaciente(paciente, aplicacao.data);
  const ehMarcoZeroSemana = aplicacao.semana === 1;
  const variacaoPeso = ehMarcoZeroSemana
    ? null
    : foiFeita
      ? obterVariacaoPesoAplicacao(paciente, aplicacao.data)
      : obterUltimaVariacaoPesoPaciente(paciente);
  const variacaoComp = ehMarcoZeroSemana
    ? null
    : foiFeita
      ? obterVariacaoCompAplicacao(paciente, aplicacao.data)
      : obterUltimaVariacaoCompPaciente(paciente);
  const localSugerido = localPlanejadoParaSemana(aplicacao.semana);
  const localCodigo = (aplicacao.localAplicacao as string | null) || registro?.localAplicacao || null;
  const score = obterCheckInScoreParaAplicacao(
    paciente,
    { semana: aplicacao.semana, data: aplicacao.data },
    foiFeita ? registro : null
  );
  const badge = badgeStatus(aplicacao.status);
  const dataLabel = aplicacao.data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      data-aplicacao-index={index}
      className={`rounded-xl border overflow-hidden transition-colors ${
        aplicacao.status === 'tomada'
          ? 'border-green-200 dark:border-green-800 bg-white dark:bg-[#0A1F44]/85'
          : aplicacao.status === 'hoje'
            ? 'border-blue-200 dark:border-blue-800 bg-white dark:bg-[#0A1F44]/85'
            : 'border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#0A1F44]/85'
      }`}
    >
      <div className="flex items-center gap-1 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center text-left"
          aria-expanded={aberto}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED] tabular-nums">
              Semana {index + 1}/{total}
            </span>
            <span className="text-xs text-gray-500 dark:text-[#E8EDED]/60">{dataLabel}</span>
            {score != null && (
              <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                Score {score}
              </span>
            )}
            <span
              className={`inline-flex px-2 py-px rounded-full text-[10px] font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onEditar}
          disabled={!podeEditar || editando}
          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 disabled:opacity-40 disabled:pointer-events-none"
          title="Editar"
          aria-label="Editar aplicação"
        >
          {editando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onApagar}
          disabled={!podeApagar || apagando}
          className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:pointer-events-none"
          title="Apagar"
          aria-label="Apagar aplicação"
        >
          {apagando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:text-[#E8EDED]/70 dark:hover:bg-white/10"
          aria-expanded={aberto}
          aria-label={aberto ? 'Recolher detalhes' : 'Abrir detalhes'}
        >
          {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {aberto && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-gray-200/80 dark:border-white/10">
          <MetaAplicacaoDetalheLinha label="Dose" value={`${aplicacao.dose} mg`} />
          <MetaAplicacaoDetalheLinha
            label="Local de aplicação"
            value={
              localCodigo
                ? labelLocalAplicacao(localCodigo)
                : `Sugerido: ${labelLocalAplicacao(localSugerido)}`
            }
          />
          {!ehMarcoZeroSemana && (
            <MetaAplicacaoDetalheLinha
              label="Δ Peso"
              value={formatarDelta(variacaoPeso, 'kg')}
              valueClassName={deltaClass(variacaoPeso)}
            />
          )}
          {!ehMarcoZeroSemana && (
            <MetaAplicacaoDetalheLinha
              label="Δ Circunferência abdominal"
              value={formatarDelta(variacaoComp, 'cm')}
              valueClassName={deltaClass(variacaoComp)}
            />
          )}
          {registro?.peso != null && typeof registro.peso === 'number' && (
            <MetaAplicacaoDetalheLinha
              label="Peso neste registro"
              value={
                <>
                  {registro.peso.toFixed(1)} kg
                  {registro.circunferenciaAbdominal != null &&
                    typeof registro.circunferenciaAbdominal === 'number' && (
                      <> · Cintura {registro.circunferenciaAbdominal.toFixed(1)} cm</>
                    )}
                </>
              }
            />
          )}
          {aplicacao.adherence && aplicacao.status === 'tomada' && (
            <p
              className={`text-xs font-medium py-2 ${
                aplicacao.adherence === 'ON_TIME'
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {aplicacao.adherence === 'ON_TIME'
                ? 'Aplicação pontual'
                : 'Aplicação registrada com atraso'}
            </p>
          )}

          <div className="pt-2">
            <MetaAplicacaoResumoSection
              paciente={paciente}
              registro={registro}
              semana={aplicacao.semana}
            />
          </div>

          {podePreencher && (
            <div className="pt-3">
              <button
                type="button"
                disabled={preencherLoading}
                onClick={onPreencher}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4CCB7A] hover:bg-[#45b86d] disabled:opacity-60 text-[#0A1F44] text-sm font-semibold transition-colors shadow-md shadow-[#4CCB7A]/25"
              >
                {preencherLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    Abrindo…
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    Preencher dados da aplicação
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
