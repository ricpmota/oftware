'use client';

import { useCallback, useEffect, useState, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import { BarChart3, Calendar, CalendarDays, ChevronDown, FileText, Loader2, Minus, Plus, Syringe, Trash2, Wrench, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  PacienteCardMediaIcons,
  PacienteDepoimentoLeituraModal,
} from '@/components/profissional/pacienteMediaQuickActions';
import {
  dataPrevistaConclusaoComoEsquema,
  dataPrevistaSemanaTratamento,
  injectionDayKeyFromLocalDate,
  INJECTION_DAY_LABEL_PT,
  mesclarPlanoComDatasReconstruidas,
  primeiraDoseDoPlano,
  semanaIndexConclusao,
  ultimaSemanaNaoCancelada,
} from '@/utils/datasAplicacaoSemanaPlano';
import { NumeroSemanasTratamentoField } from '@/components/metaadmin/NumeroSemanasTratamentoField';
import { MetaadminMetasTratamentoBlock } from '@/components/metaadmin/MetaadminMetasTratamentoBlock';
import { EsquemaDosesPlanejadasChart } from '@/components/metaadmin/EsquemaDosesPlanejadasChart';
import { EsquemaDosesPorSemanaEditor } from '@/components/metaadmin/EsquemaDosesPorSemanaEditor';
import { MetaadminPlanoInjetaveisEditor } from '@/components/metaadmin/MetaadminPlanoInjetaveisEditor';
import { DoseMgTirzepatidaStepperField } from '@/components/tirzepatida/DoseMgTirzepatidaStepperField';
import {
  ajustarDoseMgTirzepatidaCustom,
  formatarDoseMgNumero,
  parseDoseMgInput,
} from '@/lib/tirzepatida/doseTitulacao';
import { buildSemanasEsquemaDoses, pacienteComNumeroSemanasAtualizado } from '@/utils/esquemaDosesSemana';
import {
  clampNumeroSemanasTratamento,
  limiteMinimoNumeroSemanasTratamento,
  MAX_SEMANAS_TRATAMENTO,
} from '@/utils/numeroSemanasTratamento';
import { PacienteService } from '@/services/pacienteService';
import { BarraFaixaAplicacoes } from '@/components/metaadmin/BarraFaixaAplicacoes';
import {
  apagarProtocoloTirzepatidaAtivo,
  criarNovoProtocoloTirzepatida,
  mensagemConfirmacaoApagarProtocolo,
  montarPacienteDoProtocoloArquivado,
  podeCriarNovoProtocoloTirzepatida,
} from '@/utils/tirzepatidaNovoProtocolo';
import {
  listarProtocolosTirzepatida,
  progressoAplicacoesDoProtocolo,
} from '@/utils/tirzepatidaProtocoloDisplay';

export type MetaadminPlanoTerapeuticoSectionMode = 'plano' | 'meta' | 'full';

type PlanoTerapeuticoSubpastaId = 'tirzepatida' | 'retatrutida' | 'injetaveis';

const PLANO_TERAPEUTICO_SUBPASTAS = [
  { id: 'tirzepatida' as const, label: 'Tirzepatida' },
  { id: 'retatrutida' as const, label: 'Retratutida' },
  { id: 'injetaveis' as const, label: 'Injetáveis' },
] as const;

function valorDataInicioIso(paciente: PacienteCompleto): string {
  const date = paciente?.planoTerapeutico?.startDate || paciente?.planoTerapeutico?.dataInicioTratamento;
  if (!date) return '';
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  } catch {
    return '';
  }
}

async function persistirApagarProtocolo(paciente: PacienteCompleto): Promise<PacienteCompleto> {
  const atualizado = apagarProtocoloTirzepatidaAtivo(paciente);
  await PacienteService.createOrUpdatePaciente(atualizado);
  if (atualizado.id) {
    try {
      await PacienteService.apagarFilaWhatsappAplicacao(atualizado.id);
    } catch (err) {
      console.error('Erro ao remover lembretes de WhatsApp:', err);
      window.alert(
        'O protocolo foi apagado, mas os lembretes de aplicação do WhatsApp não puderam ser removidos da fila. ' +
          (err instanceof Error ? err.message : 'Tente novamente.')
      );
    }
  }
  return atualizado;
}

const META_LABEL_CLASS =
  'flex items-center gap-1 text-[10px] leading-none text-[color:var(--text-secondary)] mb-0.5';
const FLATTEN_FIELD_CLASS =
  '[&_button]:min-h-0 [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:py-0 [&_button]:text-[13px] [&_button]:font-medium [&_button]:shadow-none [&_button]:ring-0 [&_button]:hover:border-transparent';
const META_KPI_CLASS = 'min-w-0 py-0.5';

function formatDatePtBr(value: Date | null | undefined): string {
  if (!value || isNaN(value.getTime())) return '—';
  return value.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const STATUS_PROTOCOLO: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/80' },
  em_tratamento: {
    label: 'Em tratamento',
    className: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80',
  },
  concluido: { label: 'Concluído', className: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200/80' },
  abandono: { label: 'Abandono', className: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200/80' },
};

/** Aplicações do ciclo deste card (protocolo vigente ou snapshot arquivado — não soma ciclos). */
function countAplicacoesDoCiclo(paciente: PacienteCompleto): {
  feitas: number;
  total: number;
  segmentos: ReturnType<typeof progressoAplicacoesDoProtocolo>['segmentos'];
} {
  const lista = listarProtocolosTirzepatida(paciente);
  const proto = lista.find((p) => p.ativo) ?? lista[lista.length - 1];
  if (!proto) return { feitas: 0, total: 0, segmentos: [] };
  const p = progressoAplicacoesDoProtocolo(paciente, proto);
  return { feitas: p.posicao, total: p.total, segmentos: p.segmentos };
}

function toLocalDateSafe(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value);
  const td = (value as { toDate?: () => Date })?.toDate?.();
  if (td && !isNaN(td.getTime())) return new Date(td);
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function MetadadosPlanoTirzepatidaBlock({
  paciente,
  setPaciente,
  titulo = 'Metadados do Plano',
  onPlanoApagado,
  readOnly = false,
  embedded = false,
  parts,
  appearance = 'default',
}: {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  titulo?: string;
  onPlanoApagado?: (paciente: PacienteCompleto) => void;
  readOnly?: boolean;
  embedded?: boolean;
  parts?: Array<'inicio' | 'duracao' | 'dia'>;
  appearance?: 'default' | 'header' | 'inline' | 'mini' | 'strip' | 'compact-side';
}) {
  const [apagando, setApagando] = useState(false);
  const isAbandono = paciente.statusTratamento === 'abandono';
  const temPlanoOuRegistros = Boolean(
    paciente.planoTerapeutico?.startDate ||
      paciente.planoTerapeutico?.dataInicioTratamento ||
      paciente.planoTerapeutico?.numeroSemanasTratamento ||
      (paciente.evolucaoSeguimento || []).length > 0
  );

  const handleApagarPlano = useCallback(async () => {
    if (readOnly || !paciente.id || isAbandono || apagando) return;
    const ok = window.confirm(mensagemConfirmacaoApagarProtocolo(paciente));
    if (!ok) return;
    setApagando(true);
    try {
      const atualizado = await persistirApagarProtocolo(paciente);
      setPaciente(atualizado);
      onPlanoApagado?.(atualizado);
    } catch (err) {
      console.error('Erro ao apagar plano terapêutico:', err);
      window.alert(
        'Erro ao apagar plano: ' + (err instanceof Error ? err.message : 'tente novamente')
      );
    } finally {
      setApagando(false);
    }
  }, [paciente, isAbandono, apagando, setPaciente, onPlanoApagado, readOnly]);

  const dataInicioFmt = (() => {
    const iso = valorDataInicioIso(paciente);
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  })();

  const dataInicioCompacta = (() => {
    const iso = valorDataInicioIso(paciente);
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y.slice(-2)}`;
  })();

  const diaAplicacao = (() => {
    const date =
      paciente.planoTerapeutico?.startDate || paciente.planoTerapeutico?.dataInicioTratamento;
    if (!date) return null;
    const d = date instanceof Date ? new Date(date) : new Date(date as Date | string);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    const key = injectionDayKeyFromLocalDate(d);
    const full = INJECTION_DAY_LABEL_PT[key] ?? key;
    return { full, short: full.replace('-feira', '') };
  })();

  const metaLabelClass = META_LABEL_CLASS;
  const flattenFieldClass = FLATTEN_FIELD_CLASS;
  const metaKpiClass = META_KPI_CLASS;

  const aplicarDataInicio = (value: string) => {
    if (!value) {
      setPaciente({
        ...paciente,
        planoTerapeutico: {
          ...paciente.planoTerapeutico,
          startDate: undefined,
          dataInicioTratamento: undefined,
          injectionDayOfWeek: undefined,
          datasAplicacaoIndividuais: undefined,
        },
      });
      return;
    }
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const inj = injectionDayKeyFromLocalDate(localDate) as
      | 'dom'
      | 'seg'
      | 'ter'
      | 'qua'
      | 'qui'
      | 'sex'
      | 'sab';
    setPaciente({
      ...paciente,
      planoTerapeutico: {
        metas: paciente.planoTerapeutico?.metas ?? {},
        ...mesclarPlanoComDatasReconstruidas(
          paciente.planoTerapeutico,
          {
            startDate: localDate,
            dataInicioTratamento: localDate,
            injectionDayOfWeek: inj,
          },
          paciente.evolucaoSeguimento
        ),
      },
    });
  };

  const inicioControl = readOnly ? (
    <div className="text-[13px] font-medium tabular-nums text-[color:var(--text-primary)]">
      <span className="md:hidden">{dataInicioCompacta}</span>
      <span className="hidden md:inline">{dataInicioFmt}</span>
    </div>
  ) : (
    <div className="flex items-center gap-0.5">
      <input
        type="date"
        value={valorDataInicioIso(paciente)}
        onChange={(e) => aplicarDataInicio(e.target.value)}
        className="min-w-0 w-full max-w-full border-0 bg-transparent p-0 text-[13px] font-medium tabular-nums text-[color:var(--text-primary)] focus:outline-none focus:ring-0"
      />
      {(paciente.planoTerapeutico?.startDate ||
        paciente.planoTerapeutico?.dataInicioTratamento) && (
        <button
          type="button"
          title="Limpar data de início"
          disabled={isAbandono || apagando}
          onClick={() => {
            setPaciente({
              ...paciente,
              planoTerapeutico: {
                ...paciente.planoTerapeutico,
                startDate: undefined,
                dataInicioTratamento: undefined,
                injectionDayOfWeek: undefined,
                datasAplicacaoIndividuais: undefined,
              },
            });
          }}
          className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded text-[color:var(--text-secondary)] hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-gray-800"
        >
          <X className="h-3 w-3" aria-hidden />
          <span className="sr-only">Limpar data de início</span>
        </button>
      )}
    </div>
  );

  const duracaoControl = readOnly ? (
    <div className="text-[13px] font-medium text-[color:var(--text-primary)]">
      {paciente.planoTerapeutico?.numeroSemanasTratamento != null
        ? `${paciente.planoTerapeutico.numeroSemanasTratamento} sem`
        : '—'}
    </div>
  ) : (
    <div className={flattenFieldClass}>
      <NumeroSemanasTratamentoField
        paciente={paciente}
        setPaciente={(next) => setPaciente(next)}
        disabled={isAbandono}
      />
    </div>
  );

  const diaControl = (
    <div className="text-[13px] font-medium text-[color:var(--text-primary)]">
      {diaAplicacao ? (
        <>
          <span className="md:hidden">{diaAplicacao.short.slice(0, 3)}</span>
          <span className="hidden md:inline">{diaAplicacao.full}</span>
        </>
      ) : (
        <span className="font-normal text-[color:var(--text-secondary)]">Defina o início</span>
      )}
    </div>
  );

  const showInicio = !parts || parts.includes('inicio');
  const showDuracao = !parts || parts.includes('duracao');
  const showDia = !parts || parts.includes('dia');

  if (embedded && appearance === 'strip') {
    return (
      <div className="min-w-0 shrink-0">
        <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-[color:var(--text-secondary)]">
          <Calendar className="h-3 w-3 opacity-70" aria-hidden />
          Início do tratamento
        </p>
        {inicioControl}
        {showDia ? (
          <p className="mt-0.5 text-[11px] text-[color:var(--text-secondary)]">
            {diaAplicacao ? diaAplicacao.full : ''}
          </p>
        ) : null}
      </div>
    );
  }

  if (embedded && appearance === 'compact-side') {
    const semDataInicio = !valorDataInicioIso(paciente);
    return (
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-medium text-[color:var(--text-secondary)]">Início</p>
        {!readOnly && semDataInicio ? (
          <label
            className={`relative flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-center text-[12px] font-semibold leading-tight text-emerald-800 ${
              isAbandono ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Data Início</span>
            <input
              type="date"
              value=""
              disabled={isAbandono}
              onChange={(e) => aplicarDataInicio(e.target.value)}
              aria-label="Selecionar data de início"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        ) : (
          inicioControl
        )}
        {showDia && diaAplicacao ? (
          <p className="mt-0.5 text-[11px] text-[color:var(--text-secondary)]">{diaAplicacao.full}</p>
        ) : null}
      </div>
    );
  }

  if (embedded && appearance === 'header') {
    return (
      <div className="flex max-w-[230px] items-start gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[color:var(--brand-primary)]">
          <Calendar className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] leading-none text-[color:var(--text-secondary)]">
            Início do tratamento
          </p>
          <div className="mt-1">{inicioControl}</div>
          {showDia ? (
            <p className="mt-0.5 text-[11px] text-[color:var(--text-secondary)]">
              {diaAplicacao ? diaAplicacao.full : ''}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (embedded && appearance === 'inline') {
    return (
      <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-[color:var(--text-secondary)]">
        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="shrink-0">Início</span>
        <div className="min-w-0 max-w-[9.5rem]">{inicioControl}</div>
        {showDia && diaAplicacao ? (
          <>
            <span className="text-gray-300" aria-hidden>
              •
            </span>
            <span className="shrink-0 text-[color:var(--text-primary)]">{diaAplicacao.short}</span>
          </>
        ) : null}
      </div>
    );
  }

  const duracaoMini = (
    <div className="w-[118px] min-w-[110px] rounded-xl border border-gray-200/70 bg-white px-2.5 py-2">
      <p className="mb-0.5 flex items-center gap-1 text-[10px] text-[color:var(--text-secondary)]">
        <CalendarDays className="h-3 w-3 opacity-70" aria-hidden />
        Duração
      </p>
      {duracaoControl}
    </div>
  );

  if (embedded && appearance === 'mini') {
    return showDuracao ? duracaoMini : null;
  }

  const metaItems = (
    <>
      {showInicio ? (
        <div className={metaKpiClass}>
          <label className={metaLabelClass}>
            <Calendar className="h-3 w-3 opacity-70" aria-hidden />
            Início
          </label>
          {inicioControl}
        </div>
      ) : null}
      {showDuracao ? (
        <div className={metaKpiClass}>
          <label className={metaLabelClass}>
            <CalendarDays className="h-3 w-3 opacity-70" aria-hidden />
            Duração
          </label>
          {duracaoControl}
        </div>
      ) : null}
      {showDia ? (
        <div className={metaKpiClass}>
          <p className={metaLabelClass}>
            <CalendarDays className="h-3 w-3 opacity-70" aria-hidden />
            Dia
          </p>
          {diaControl}
        </div>
      ) : null}
    </>
  );

  if (embedded) return metaItems;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{titulo}</h4>
        {!readOnly && (
          <button
            type="button"
            title="Apagar plano terapêutico"
            disabled={isAbandono || apagando || !temPlanoOuRegistros}
            onClick={() => void handleApagarPlano()}
            className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-red-800 dark:text-red-300 dark:bg-red-950/40 dark:hover:bg-red-900/50"
          >
            {apagando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            <span className="sr-only">Apagar plano terapêutico</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-x-3">{metaItems}</div>
    </div>
  );
}

function formatMgResumoTitulacao(n: number): string {
  return `${n.toFixed(1).replace('.', ',')} mg`;
}

const DOSE_STEP_BTN_CLASS =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-[color:var(--text-secondary)] hover:border-emerald-300 hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40';

function DoseInicialControl({
  doseAtual,
  doseParsed,
  readOnly,
  onApply,
  stacked = false,
}: {
  doseAtual: number | string;
  doseParsed: number | null;
  readOnly: boolean;
  onApply: (value: number) => void;
  stacked?: boolean;
}) {
  const num =
    doseAtual !== '' && doseAtual != null ? formatarDoseMgNumero(Number(doseAtual)) : '';
  const stepBtns = (
    <div className={stacked ? 'flex flex-col gap-0.5' : 'flex items-center gap-1.5'}>
      <button
        type="button"
        className={stacked ? `${DOSE_STEP_BTN_CLASS} h-8 w-8` : DOSE_STEP_BTN_CLASS}
        aria-label="Aumentar dose inicial"
        disabled={doseParsed == null}
        onClick={() => {
          if (doseParsed == null) return;
          onApply(ajustarDoseMgTirzepatidaCustom(doseParsed, 1));
        }}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        className={stacked ? `${DOSE_STEP_BTN_CLASS} h-8 w-8` : DOSE_STEP_BTN_CLASS}
        aria-label="Diminuir dose inicial"
        disabled={doseParsed == null}
        onClick={() => {
          if (doseParsed == null) return;
          onApply(ajustarDoseMgTirzepatidaCustom(doseParsed, -1));
        }}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
  return readOnly ? (
    <div
      className={`flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 ${
        stacked ? 'min-h-[4.25rem] max-w-none' : 'h-9 max-w-[220px]'
      }`}
    >
      <span
        className={`font-semibold tabular-nums text-[color:var(--text-primary)] ${
          stacked ? 'text-[22px]' : 'text-[15px]'
        }`}
      >
        {num || '—'}
      </span>
      <span className="text-[12px] font-normal text-[color:var(--text-secondary)]">mg</span>
    </div>
  ) : (
    <div
      className={
        stacked
          ? 'flex w-full items-stretch gap-1'
          : 'flex w-full max-w-[240px] items-center gap-1.5'
      }
    >
      <div
        className={`relative min-w-0 flex-1 ${stacked ? 'min-h-[4.25rem]' : 'h-9'}`}
      >
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-between px-2.5">
          <span
            className={`font-semibold tabular-nums text-[color:var(--text-primary)] ${
              stacked ? 'text-[22px]' : 'text-[15px]'
            }`}
          >
            {num}
          </span>
          <span className="text-[12px] font-normal text-[color:var(--text-secondary)]">mg</span>
        </div>
        <div
          className={`h-full [&_button]:h-full [&_button]:min-h-0 [&_button]:rounded-lg [&_button]:border-gray-200 [&_button]:bg-white [&_button]:px-2.5 [&_button]:py-0 [&_span]:opacity-0 ${
            stacked ? '[&_button]:min-h-[4.25rem]' : '[&_button]:h-9'
          }`}
        >
          <DoseMgTirzepatidaStepperField
            value={doseAtual === '' ? null : doseAtual}
            onChange={onApply}
            ariaLabel="Alterar dose inicial em miligramas"
          />
        </div>
      </div>
      {stepBtns}
    </div>
  );
}

const DURACAO_STEP_BTN_CLASS =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-[color:var(--text-secondary)] hover:border-emerald-300 hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40';

function DuracaoStepperControl({
  paciente,
  setPaciente,
  readOnly,
  stacked = false,
}: {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  readOnly: boolean;
  stacked?: boolean;
}) {
  const isAbandono = paciente.statusTratamento === 'abandono';
  const atual = paciente.planoTerapeutico?.numeroSemanasTratamento;
  const min = limiteMinimoNumeroSemanasTratamento(paciente);
  const current =
    typeof atual === 'number' && Number.isFinite(atual)
      ? clampNumeroSemanasTratamento(atual, min)
      : clampNumeroSemanasTratamento(18, min);

  const applyN = (n: number) => {
    setPaciente(pacienteComNumeroSemanasAtualizado(paciente, n));
  };

  const stepBtns = readOnly ? null : (
    <div className={stacked ? 'flex flex-col gap-0.5' : 'flex items-center gap-0.5'}>
      <button
        type="button"
        className={stacked ? `${DURACAO_STEP_BTN_CLASS} h-8 w-8` : DURACAO_STEP_BTN_CLASS}
        aria-label="Aumentar duração em semanas"
        disabled={current >= MAX_SEMANAS_TRATAMENTO}
        onClick={() => applyN(current + 1)}
      >
        <Plus className="h-3 w-3" aria-hidden />
      </button>
      <button
        type="button"
        className={stacked ? `${DURACAO_STEP_BTN_CLASS} h-8 w-8` : DURACAO_STEP_BTN_CLASS}
        aria-label="Diminuir duração em semanas"
        disabled={current <= min}
        onClick={() => applyN(current - 1)}
      >
        <Minus className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );

  const valueClass = stacked
    ? `${FLATTEN_FIELD_CLASS} [&_button]:min-h-[4.25rem] [&_button]:text-[22px] [&_button]:font-semibold`
    : `${FLATTEN_FIELD_CLASS} [&_button]:text-lg [&_button]:font-semibold`;

  return (
    <div className={stacked ? 'flex min-w-0 items-stretch gap-1' : 'flex min-w-0 items-center gap-1'}>
      <div className="min-w-0 flex-1">
        {readOnly ? (
          <div
            className={`font-semibold tabular-nums text-[color:var(--text-primary)] ${
              stacked ? 'text-[22px]' : 'text-lg'
            }`}
          >
            {atual != null ? `${atual} semanas` : '—'}
          </div>
        ) : (
          <div className={valueClass}>
            <NumeroSemanasTratamentoField
              paciente={paciente}
              setPaciente={(next) => setPaciente(next)}
              disabled={isAbandono}
            />
          </div>
        )}
      </div>
      {stepBtns}
    </div>
  );
}

function DoseTitulacaoBlock({
  paciente,
  setPaciente,
  readOnly = false,
  embedded = false,
}: {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  readOnly?: boolean;
  embedded?: boolean;
}) {
  const doseAtual =
    paciente?.planoTerapeutico?.currentDoseMg || paciente?.planoTerapeutico?.doseAtual?.quantidade || '';
  const built = buildSemanasEsquemaDoses(paciente);
  const semanasAtivas = built?.semanas.filter((s) => !s.isConclusao && !s.isCancelada) ?? [];
  const totalMg = built?.totalMiligramas;
  const mediaSemanal =
    semanasAtivas.length > 0 && totalMg != null ? totalMg / semanasAtivas.length : null;
  const doseParsed = parseDoseMgInput(doseAtual === '' ? null : doseAtual);

  const aplicarDoseInicial = (value: number) => {
    const now = new Date();
    setPaciente({
      ...paciente!,
      planoTerapeutico: {
        ...paciente?.planoTerapeutico,
        currentDoseMg: value,
        lastDoseChangeAt: now,
        nextReviewDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
        doseAtual: {
          quantidade: value,
          frequencia: 'semanal' as const,
          dataUltimaAjuste: now,
        },
      },
    });
  };

  return (
    <div className={`min-w-0 ${embedded ? '' : 'pt-1'}`}>
      <div className="md:hidden">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[color:var(--brand-primary)]">
            <Syringe className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className="text-xl font-bold leading-tight text-[color:var(--text-primary)]">
              Dose e Titulação
            </h4>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="rounded-xl bg-[color:color-mix(in_srgb,var(--state-success)_5%,white)] px-3.5 py-3 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-[1.15]">
                <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--text-secondary)]">
                  Dose inicial
                </label>
                <DoseInicialControl
                  doseAtual={doseAtual}
                  doseParsed={doseParsed}
                  readOnly={readOnly}
                  onApply={aplicarDoseInicial}
                  stacked
                />
              </div>
              <div className="min-w-0 flex-[0.85]">
                <MetadadosPlanoTirzepatidaBlock
                  paciente={paciente}
                  setPaciente={setPaciente}
                  readOnly={readOnly}
                  embedded
                  parts={['inicio', 'dia']}
                  appearance="compact-side"
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200/80 bg-white px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[color:var(--brand-primary)]">
                <BarChart3 className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[color:var(--text-secondary)]">
                  Total no tratamento
                </p>
                <p className="text-[28px] font-bold leading-none tabular-nums tracking-tight text-[color:var(--brand-primary)]">
                  {totalMg != null ? formatMgResumoTitulacao(totalMg) : '—'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="min-w-0 flex-1 rounded-xl border border-gray-200/70 bg-white px-2.5 py-2">
                <p className="mb-0.5 text-[10px] text-[color:var(--text-secondary)]">Duração</p>
                <DuracaoStepperControl
                  paciente={paciente}
                  setPaciente={setPaciente}
                  readOnly={readOnly}
                  stacked
                />
              </div>
              <div className="w-[38%] min-w-[96px] rounded-xl border border-gray-200/70 bg-white px-2.5 py-2">
                <p className="mb-0.5 text-[10px] text-[color:var(--text-secondary)]">Média semanal</p>
                <p className="text-[22px] font-semibold tabular-nums text-[color:var(--text-primary)]">
                  {mediaSemanal != null ? formatMgResumoTitulacao(mediaSemanal) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="mb-3 flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[color:var(--brand-primary)]">
            <Syringe className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className="text-[22px] font-bold leading-tight text-[color:var(--text-primary)]">
              Dose e Titulação
            </h4>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Defina a dose inicial e ajuste o esquema de aplicações semanais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-[color:color-mix(in_srgb,var(--state-success)_5%,white)] px-4 py-3 dark:bg-emerald-950/20">
          <MetadadosPlanoTirzepatidaBlock
            paciente={paciente}
            setPaciente={setPaciente}
            readOnly={readOnly}
            embedded
            parts={['inicio', 'dia']}
            appearance="strip"
          />
          <div className="h-12 w-px shrink-0 bg-gray-200/80" aria-hidden />
          <div className="w-[26%] min-w-0 shrink-0">
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--text-secondary)]">
              Dose inicial
            </label>
            <DoseInicialControl
              doseAtual={doseAtual}
              doseParsed={doseParsed}
              readOnly={readOnly}
              onApply={aplicarDoseInicial}
            />
          </div>
          <div className="h-12 w-px shrink-0 bg-gray-200/80" aria-hidden />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[color:var(--brand-primary)]">
              <BarChart3 className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[color:var(--text-secondary)]">
                Total no tratamento
              </p>
              <p className="text-[30px] font-bold leading-none tabular-nums tracking-tight text-[color:var(--brand-primary)] sm:text-[32px]">
                {totalMg != null ? formatMgResumoTitulacao(totalMg) : '—'}
              </p>
            </div>
          </div>
          <div className="h-12 w-px shrink-0 bg-gray-200/80" aria-hidden />
          <div className="w-[150px] min-w-[140px] shrink-0">
            <p className="mb-1 text-[11px] font-medium text-[color:var(--text-secondary)]">Duração</p>
            <DuracaoStepperControl
              paciente={paciente}
              setPaciente={setPaciente}
              readOnly={readOnly}
            />
          </div>
          <div className="w-[110px] min-w-[100px] shrink-0">
            <p className="mb-1 text-[11px] font-medium text-[color:var(--text-secondary)]">Média semanal</p>
            <p className="text-lg font-semibold tabular-nums text-[color:var(--text-primary)]">
              {mediaSemanal != null ? formatMgResumoTitulacao(mediaSemanal) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtocoloTirzepatidaCardItem({
  paciente,
  setPaciente,
  dataAplicacaoFocoRef,
  onPlanoApagado,
  readOnly = false,
  indice,
  defaultExpanded = false,
  hideDelete = false,
  arquivado = false,
  pacienteLive,
  temFoto = false,
  onOpenGrafico,
  onOpenFotos,
}: {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
  onPlanoApagado?: (paciente: PacienteCompleto) => void;
  readOnly?: boolean;
  indice: number;
  defaultExpanded?: boolean;
  hideDelete?: boolean;
  arquivado?: boolean;
  pacienteLive: PacienteCompleto;
  temFoto?: boolean;
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  onOpenFotos?: (paciente: PacienteCompleto) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [apagando, setApagando] = useState(false);
  const [depoimentoAberto, setDepoimentoAberto] = useState(false);
  const [abrindoRelatorio, setAbrindoRelatorio] = useState(false);
  const isAbandono = paciente.statusTratamento === 'abandono';
  const plano = paciente.planoTerapeutico;
  const temPlanoOuRegistros = Boolean(
    plano?.startDate ||
      plano?.dataInicioTratamento ||
      plano?.numeroSemanasTratamento ||
      (paciente.evolucaoSeguimento || []).length > 0
  );

  const primeira = plano ? primeiraDoseDoPlano(plano) : null;
  const dataInicio = primeira;
  const dataFinal =
    primeira && plano
      ? dataPrevistaSemanaTratamento(
          plano,
          ultimaSemanaNaoCancelada(plano),
          paciente.evolucaoSeguimento
        )
      : null;
  const dataConclusaoPreenchida = toLocalDateSafe(
    (plano?.conclusaoTratamento as { dataConclusao?: unknown } | undefined)?.dataConclusao
  );
  const dataConclusao =
    dataConclusaoPreenchida ||
    (primeira && plano
      ? dataPrevistaConclusaoComoEsquema(plano, paciente.evolucaoSeguimento)
      : null);

  const statusKey = arquivado
    ? 'concluido'
    : paciente.statusTratamento && paciente.statusTratamento in STATUS_PROTOCOLO
      ? paciente.statusTratamento
      : 'pendente';
  const statusBadge = STATUS_PROTOCOLO[statusKey] ?? STATUS_PROTOCOLO.pendente;
  const { feitas: aplicacoesFeitas, total: aplicacoesTotal, segmentos: segmentosAplicacoes } =
    countAplicacoesDoCiclo(paciente);

  const handleOpenRelatorio = useCallback(async () => {
    const pacienteId = pacienteLive.id;
    if (!pacienteId || abrindoRelatorio) return;
    setAbrindoRelatorio(true);
    try {
      const res = await fetch(
        `/api/relatorio-paciente/link?pacienteId=${encodeURIComponent(pacienteId)}`
      );
      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        window.alert('Não foi possível abrir o relatório do paciente.');
      }
    } catch (err) {
      console.error('Erro ao abrir relatório do paciente:', err);
      window.alert('Erro ao obter o link do relatório.');
    } finally {
      setAbrindoRelatorio(false);
    }
  }, [pacienteLive.id, abrindoRelatorio]);

  const handleApagarPlano = useCallback(async () => {
    if (readOnly || hideDelete || !paciente.id || isAbandono || apagando) return;
    const ok = window.confirm(mensagemConfirmacaoApagarProtocolo(paciente));
    if (!ok) return;
    setApagando(true);
    try {
      const atualizado = await persistirApagarProtocolo(paciente);
      setPaciente(atualizado);
      onPlanoApagado?.(atualizado);
    } catch (err) {
      console.error('Erro ao apagar plano terapêutico:', err);
      window.alert(
        'Erro ao apagar plano: ' + (err instanceof Error ? err.message : 'tente novamente')
      );
    } finally {
      setApagando(false);
    }
  }, [paciente, isAbandono, apagando, setPaciente, onPlanoApagado, readOnly, hideDelete]);

  const nomePaciente =
    paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';

  return (
    <div
      className={`min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 ${
        expanded ? 'p-3 sm:p-4 space-y-4' : 'px-3 py-2.5 sm:px-4 sm:py-3'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Protocolo {indice}
            </p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-0 shrink-0 -mr-1">
            <button
              type="button"
              title="Relatório do paciente"
              disabled={!pacienteLive.id || abrindoRelatorio}
              onClick={(e) => {
                e.stopPropagation();
                void handleOpenRelatorio();
              }}
              className="mr-0.5 hidden md:inline-flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-[11px] font-semibold leading-none text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
              aria-label="Abrir relatório do paciente"
            >
              {abrindoRelatorio ? (
                <Loader2 size={12} className="animate-spin" aria-hidden />
              ) : (
                'Relatório'
              )}
            </button>
            <button
              type="button"
              title="Relatório do paciente"
              disabled={!pacienteLive.id || abrindoRelatorio}
              onClick={(e) => {
                e.stopPropagation();
                void handleOpenRelatorio();
              }}
              className="p-1 rounded-md text-emerald-700 hover:bg-emerald-50 md:hidden disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              aria-label="Abrir relatório do paciente"
            >
              {abrindoRelatorio ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <FileText size={16} />
              )}
            </button>
            <PacienteCardMediaIcons
              paciente={paciente}
              temFoto={temFoto}
              size={16}
              onOpenGrafico={() => onOpenGrafico?.(pacienteLive)}
              onOpenFotos={() => onOpenFotos?.(pacienteLive)}
              onOpenDepoimento={() => setDepoimentoAberto(true)}
            />
            {!readOnly && !hideDelete && (
              <button
                type="button"
                title="Apagar plano terapêutico"
                disabled={isAbandono || apagando || !temPlanoOuRegistros}
                onClick={() => void handleApagarPlano()}
                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={`Apagar protocolo ${indice}`}
              >
                {apagando ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-expanded={expanded}
              aria-label={
                expanded ? `Recolher protocolo ${indice}` : `Expandir protocolo ${indice}`
              }
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-700 dark:text-gray-300">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Calendar size={12} className="text-gray-400" aria-hidden />
            <span className="text-gray-500 dark:text-gray-400">Início</span>
            <span className="font-medium tabular-nums text-gray-900 dark:text-white">
              {formatDatePtBr(dataInicio)}
            </span>
          </span>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden>
            →
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="text-gray-500 dark:text-gray-400">Fim</span>
            <span className="font-medium tabular-nums text-gray-900 dark:text-white">
              {formatDatePtBr(dataFinal)}
            </span>
          </span>
          {dataConclusaoPreenchida ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-gray-500 dark:text-gray-400">
              <span className="text-gray-300 dark:text-gray-600">·</span>
              Conc.{' '}
              <span className="font-medium tabular-nums text-gray-900 dark:text-white">
                {formatDatePtBr(dataConclusao)}
              </span>
            </span>
          ) : null}
        </p>

        {aplicacoesTotal > 0 && !expanded ? (
          <div
            className="flex items-center gap-2"
            title={`${aplicacoesFeitas} de ${aplicacoesTotal} aplicações`}
          >
            <BarraFaixaAplicacoes
              segmentos={segmentosAplicacoes}
              className="h-1 min-w-0 flex-1"
              trackClassName="bg-[color:color-mix(in_srgb,var(--state-success)_16%,var(--surface-card))]"
            />
            <span className="shrink-0 text-[10px] font-semibold tabular-nums leading-none text-[color:var(--state-success)]">
              {aplicacoesFeitas}/{aplicacoesTotal}
            </span>
          </div>
        ) : null}
      </div>

      <PacienteDepoimentoLeituraModal
        state={
          depoimentoAberto
            ? { pacienteNome: nomePaciente, paciente }
            : null
        }
        onFechar={() => setDepoimentoAberto(false)}
        overlayClassName="z-[90]"
      />

      {expanded && (
        <div className="min-w-0 space-y-5">
          <DoseTitulacaoBlock
            paciente={paciente}
            setPaciente={setPaciente}
            readOnly={readOnly}
            embedded
          />
          <EsquemaDosesPorSemanaEditor
            paciente={paciente}
            setPaciente={setPaciente}
            dataAplicacaoFocoRef={dataAplicacaoFocoRef}
            readOnly={readOnly}
            embedded
          />
          <EsquemaDosesPlanejadasChart paciente={paciente} />
          <MetaadminMetasTratamentoBlock
            paciente={paciente}
            setPaciente={setPaciente}
            readOnly={readOnly}
            sectionHeading="Metas do Tratamento"
            embedded
          />
        </div>
      )}
    </div>
  );
}

const noopSetPaciente: Dispatch<SetStateAction<PacienteCompleto | null>> = () => {};

export function MetaadminPlanoTirzepatidaProtocoloCard({
  paciente,
  setPaciente,
  dataAplicacaoFocoRef,
  onPlanoApagado,
  readOnly = false,
  temFoto = false,
  onOpenGrafico,
  onOpenFotos,
}: {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
  onPlanoApagado?: (paciente: PacienteCompleto) => void;
  readOnly?: boolean;
  temFoto?: boolean;
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  onOpenFotos?: (paciente: PacienteCompleto) => void;
}) {
  const historico = paciente.planoTerapeutico?.historicoProtocolosTirzepatida || [];
  const indiceAtivo = historico.length + 1;
  const ativoSemInicio = !primeiraDoseDoPlano(paciente.planoTerapeutico || {});
  const podeNovo = !readOnly && podeCriarNovoProtocoloTirzepatida(paciente);

  const handleNovoProtocolo = () => {
    if (readOnly) return;
    const plano = paciente.planoTerapeutico;
    if (!plano) return;
    const semConcl = semanaIndexConclusao(plano);
    const ok = window.confirm(
      `Arquivar o Protocolo ${indiceAtivo} e criar o Protocolo ${indiceAtivo + 1}?\n\n` +
        `O novo protocolo começa na semana ${semConcl + 1} (após a conclusão). ` +
        `Defina a data de início no card, como no protocolo anterior.`
    );
    if (!ok) return;
    setPaciente(criarNovoProtocoloTirzepatida(paciente));
  };

  return (
    <div className="space-y-4">
      {historico.map((snap) => (
        <ProtocoloTirzepatidaCardItem
          key={snap.id}
          indice={snap.indice || 1}
          paciente={montarPacienteDoProtocoloArquivado(paciente, snap)}
          setPaciente={noopSetPaciente}
          dataAplicacaoFocoRef={dataAplicacaoFocoRef}
          readOnly
          hideDelete
          arquivado
          pacienteLive={paciente}
          temFoto={temFoto}
          onOpenGrafico={onOpenGrafico}
          onOpenFotos={onOpenFotos}
        />
      ))}

      <ProtocoloTirzepatidaCardItem
        key={`ativo-${indiceAtivo}`}
        indice={indiceAtivo}
        paciente={paciente}
        setPaciente={setPaciente}
        dataAplicacaoFocoRef={dataAplicacaoFocoRef}
        onPlanoApagado={onPlanoApagado}
        readOnly={readOnly}
        defaultExpanded={ativoSemInicio && historico.length > 0}
        pacienteLive={paciente}
        temFoto={temFoto}
        onOpenGrafico={onOpenGrafico}
        onOpenFotos={onOpenFotos}
      />

      {podeNovo && (
        <button
          type="button"
          onClick={handleNovoProtocolo}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-700 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <Plus size={16} />
          Novo protocolo de Tirzepatida
        </button>
      )}
    </div>
  );
}

export type MetaadminPlanoTerapeuticoEditSectionsProps = {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
  mode: MetaadminPlanoTerapeuticoSectionMode;
  /** Quando true, omite o título "Meta" e o texto introdutório das metas (ex.: modal /meta com cabeçalho próprio). */
  hideMetaHeading?: boolean;
  /** Necessário para carregar Protocolos Salvos na subaba Injetáveis. */
  medicoId?: string;
  /** Chamado após apagar o plano (já persistido). */
  onPlanoApagado?: (paciente: PacienteCompleto) => void;
  /** Somente visualização: sem mutações de UI. */
  readOnly?: boolean;
  temFoto?: boolean;
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  onOpenFotos?: (paciente: PacienteCompleto) => void;
};

export function MetaadminPlanoTerapeuticoEditSections({
  paciente,
  setPaciente,
  dataAplicacaoFocoRef,
  mode,
  hideMetaHeading = false,
  medicoId,
  onPlanoApagado,
  readOnly = false,
  temFoto = false,
  onOpenGrafico,
  onOpenFotos,
}: MetaadminPlanoTerapeuticoEditSectionsProps) {
  const [planoSubpasta, setPlanoSubpasta] = useState<PlanoTerapeuticoSubpastaId>('tirzepatida');

  useEffect(() => {
    setPlanoSubpasta('tirzepatida');
  }, [paciente?.id]);

  if (mode === 'full') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plano Terapêutico</h3>
        <MetaadminPlanoTirzepatidaProtocoloCard
          paciente={paciente}
          setPaciente={setPaciente}
          dataAplicacaoFocoRef={dataAplicacaoFocoRef}
          onPlanoApagado={onPlanoApagado}
          readOnly={readOnly}
          temFoto={temFoto}
          onOpenGrafico={onOpenGrafico}
          onOpenFotos={onOpenFotos}
        />
      </div>
    );
  }

  if (mode === 'plano') {
    return (
      <div className="space-y-6">
        <div
          role="tablist"
          aria-label="Subpastas do plano terapêutico"
          className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 shadow-inner"
        >
          {PLANO_TERAPEUTICO_SUBPASTAS.map((sub) => {
            const ativa = planoSubpasta === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setPlanoSubpasta(sub.id)}
                className={`relative min-h-[2.75rem] flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 rounded-xl text-[11px] sm:text-sm font-bold leading-tight text-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                  ativa
                    ? 'bg-gradient-to-br from-green-600 via-green-600 to-emerald-700 text-white shadow-lg shadow-green-600/35 ring-2 ring-green-400/60 scale-[1.02] z-[1]'
                    : 'text-gray-600 dark:text-gray-300 bg-transparent hover:bg-white/90 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white hover:shadow-sm'
                }`}
              >
                {ativa && (
                  <span
                    className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-white/50"
                    aria-hidden
                  />
                )}
                <span className={ativa ? 'drop-shadow-sm' : ''}>{sub.label}</span>
              </button>
            );
          })}
        </div>

        {planoSubpasta === 'retatrutida' && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-800/30 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 mb-4">
              <Wrench className="h-7 w-7" aria-hidden />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Retratutida</p>
            <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
              Esta seção está em construção. Em breve você poderá configurar o plano terapêutico aqui.
            </p>
          </div>
        )}

        {planoSubpasta === 'injetaveis' &&
          (medicoId || readOnly ? (
            <MetaadminPlanoInjetaveisEditor
              paciente={paciente}
              setPaciente={setPaciente}
              medicoId={medicoId || ''}
              readOnly={readOnly}
            />
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Não foi possível carregar os Protocolos Salvos (médico não identificado).
              </p>
            </div>
          ))}

        {planoSubpasta === 'tirzepatida' && (
          <MetaadminPlanoTirzepatidaProtocoloCard
            paciente={paciente}
            setPaciente={setPaciente}
            dataAplicacaoFocoRef={dataAplicacaoFocoRef}
            onPlanoApagado={onPlanoApagado}
            readOnly={readOnly}
            temFoto={temFoto}
            onOpenGrafico={onOpenGrafico}
            onOpenFotos={onOpenFotos}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hideMetaHeading && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meta</h3>
      )}
      <MetaadminMetasTratamentoBlock
        paciente={paciente!}
        setPaciente={setPaciente}
        hideMetaHeading={hideMetaHeading}
        readOnly={readOnly}
      />
    </div>
  );
}
