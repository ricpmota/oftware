'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BodyScanPublicView } from '@/lib/bodyscan/bodyScanSerialize';
import { sortBodyScansByWeekAsc } from '@/lib/bodyscan/bodyScanSerialize';
import {
  bioCalendarDayKey,
  buildBioRegistroFromBodyScan,
  findBioRegistrosSameDay,
} from '@/lib/bodyscan/bodyScanToBioImpedancia';
import {
  buscarBioImpedanciaRegistros,
  salvarBioImpedanciaRegistros,
} from '@/services/bioImpedanciaService';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { formatBioDateInputLocal, formatBioRegistroPtBr } from '@/utils/bioImpedanciaDate';
import { ensureBioRegistroId, ensureBioRegistrosIds, replaceRegistroById } from '@/utils/bioImpedanciaRegistroId';

export type BodyScanBioStore = {
  load: () => Promise<BioImpedanciaRegistro[]>;
  save: (registros: BioImpedanciaRegistro[]) => Promise<void>;
};

type MetricKey =
  | 'bodyFat'
  | 'fatMass'
  | 'fatFreeMass'
  | 'weight'
  | 'abdominal'
  | 'bmi';

export type BodyScanWeekStatus = {
  week: number;
  eligible: boolean;
  reason?: string;
  hasFront?: boolean;
  hasSide?: boolean;
  needsGeneration?: boolean;
  alreadyCompletedSamePhotos?: boolean;
};

export type BodyScanBackfillSummary = {
  foundPhotoWeeks: number;
  weeksWithFrontAndSide?: number;
  eligibleWeeks: number;
  alreadyCompleted: number;
  pendingGeneration: number;
  generated?: number;
  skipped?: number;
  failed?: number;
  consentAccepted?: boolean;
  weeks?: BodyScanWeekStatus[];
};

function weekStatusLabel(info: BodyScanWeekStatus | undefined): string | null {
  if (!info) return null;
  if (info.needsGeneration) return 'pronta para analisar';
  if (info.reason === 'falta perfil') return 'falta a foto de perfil';
  if (info.reason === 'falta frontal') return 'falta a foto frontal';
  if (info.reason === 'peso da semana ausente') return 'falta o peso da semana';
  if (info.reason === 'altura inválida') return 'falta a altura';
  if (info.reason) return info.reason;
  return null;
}

type Props = {
  aberto: boolean;
  onFechar: () => void;
  scans?: BodyScanPublicView[];
  loading?: boolean;
  onLoad?: () => Promise<BodyScanPublicView[]>;
  /**
   * Semana deste registro (check-in ou conclusão).
   * O modal abre nela. Sem o valor, continua no último BodyScan concluído.
   */
  semanaAtual?: number | null;
  viewerLabel?: string;
  /** paciente | profissional — mesmo fluxo de histórico (sem gate de consentimento). */
  viewer?: 'paciente' | 'profissional';
  /** Necessário para anexar estimativas à bioimpedância do paciente. */
  pacienteId?: string;
  /**
   * Leitura/gravação da bioimpedância sem Firestore do cliente.
   * Usado no link público (/aplicacao), onde o paciente não está autenticado.
   */
  bioStore?: BodyScanBioStore;
  /** Callback após salvar bioimpedância (para sincronizar estado do pai). */
  onBioImpedanciaSalva?: (registros: BioImpedanciaRegistro[]) => void;
  /** Descoberta dry-run (sem Gemini). */
  onDiscoverHistorical?: () => Promise<BodyScanBackfillSummary>;
  /** @deprecated Use onBackfillHistorical — consentimento separado não é mais exigido. */
  onAcceptConsentAndBackfill?: () => Promise<{
    summary: BodyScanBackfillSummary;
    scans: BodyScanPublicView[];
  }>;
  /** Dispara backfill histórico. */
  onBackfillHistorical?: () => Promise<{
    summary: BodyScanBackfillSummary;
    scans: BodyScanPublicView[];
  }>;
};

const METRIC_OPTIONS: { key: MetricKey; label: string; button: string }[] = [
  { key: 'bodyFat', label: 'Gordura corporal estimada', button: 'Gordura %' },
  { key: 'fatMass', label: 'Massa gorda estimada', button: 'Massa gorda' },
  { key: 'fatFreeMass', label: 'Massa livre de gordura estimada', button: 'Massa magra' },
  { key: 'weight', label: 'Peso', button: 'Peso' },
  { key: 'abdominal', label: 'Circunferência abdominal', button: 'Cintura' },
  { key: 'bmi', label: 'IMC', button: 'IMC' },
];

function fmt1(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(1).replace('.', ',');
}

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return String(Math.round(n));
}

function confidenceLabel(v?: string | null): string {
  if (v === 'high') return 'Alta';
  if (v === 'moderate') return 'Moderada';
  if (v === 'low') return 'Baixa';
  return '—';
}

function delta(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  return b - a;
}

function formatDelta(n: number | null, unit: string, points = false): string {
  if (n == null) return '—';
  const sinal = n > 0 ? '+' : '';
  if (points) return `${sinal}${n.toFixed(0)} p.p.`;
  return `${sinal}${n.toFixed(1).replace('.', ',')} ${unit}`;
}

type Phase =
  | 'loading'
  | 'history_found'
  | 'processing'
  | 'ready'
  | 'error';

type BioConflictState = {
  dayKey: string;
  existing: BioImpedanciaRegistro[];
  scan: BodyScanPublicView;
};

export function BodyScanModal({
  aberto,
  onFechar,
  scans: scansProp,
  loading: loadingProp = false,
  onLoad,
  semanaAtual = null,
  viewerLabel,
  viewer = 'paciente',
  pacienteId,
  bioStore,
  onBioImpedanciaSalva,
  onDiscoverHistorical,
  onAcceptConsentAndBackfill,
  onBackfillHistorical,
}: Props) {
  const [scansInternal, setScansInternal] = useState<BodyScanPublicView[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('bodyFat');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [discovery, setDiscovery] = useState<BodyScanBackfillSummary | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [salvandoBio, setSalvandoBio] = useState(false);
  const [bioFeedback, setBioFeedback] = useState<string | null>(null);
  const [bioConflict, setBioConflict] = useState<BioConflictState | null>(null);
  const [outraDataYmd, setOutraDataYmd] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const semanaEscolhidaPeloUsuario = useRef(false);

  const applyScans = useCallback((list: BodyScanPublicView[]) => {
    setScansInternal(sortBodyScansByWeekAsc(list));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      setBioConflict(null);
      setBioFeedback(null);
      setOutraDataYmd('');
      setSelectedWeek(null);
      semanaEscolhidaPeloUsuario.current = false;
      return;
    }
    let cancelled = false;

    async function bootstrap() {
      setLoadError(null);
      setDiscovery(null);
      setProcessingMessage(null);
      setBioConflict(null);
      setBioFeedback(null);
      setPhase('loading');
      setLoadingInternal(true);

      try {
        if (onDiscoverHistorical) {
          const summary = await onDiscoverHistorical();
          if (cancelled) return;
          setDiscovery(summary);

          let existing: BodyScanPublicView[] = [];
          if (onLoad) {
            existing = await onLoad();
          } else if (scansProp) {
            existing = scansProp;
          }
          if (cancelled) return;
          applyScans(existing);

          if (summary.pendingGeneration > 0 && existing.length === 0) {
            setPhase('history_found');
            return;
          }
          setPhase('ready');
          return;
        }

        if (scansProp) {
          applyScans(scansProp);
          setPhase('ready');
          return;
        }
        if (onLoad) {
          const list = await onLoad();
          if (!cancelled) {
            applyScans(list);
            setPhase('ready');
          }
        } else {
          setPhase('ready');
        }
      } catch {
        if (!cancelled) {
          setLoadError('Não foi possível carregar o BodyScan.');
          setPhase('error');
        }
      } finally {
        if (!cancelled) setLoadingInternal(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, viewer]);

  const runBackfill = async () => {
    setPhase('processing');
    setProcessingMessage(
      discovery && discovery.pendingGeneration > 0
        ? `Analisando suas fotos de evolução… (${discovery.pendingGeneration} semana${discovery.pendingGeneration > 1 ? 's' : ''})`
        : 'Preparando seu histórico BodyScan…'
    );
    setLoadingInternal(true);
    setLoadError(null);
    try {
      const runner = onBackfillHistorical || onAcceptConsentAndBackfill;
      if (!runner) throw new Error('Backfill indisponível');
      const result = await runner();
      setDiscovery(result.summary);
      applyScans(result.scans);
      setPhase('ready');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Não foi possível preparar o BodyScan.');
      setPhase('error');
    } finally {
      setLoadingInternal(false);
      setProcessingMessage(null);
    }
  };

  const loading = loadingProp || loadingInternal;
  const scans = scansProp && phase === 'ready' && !onDiscoverHistorical
    ? sortBodyScansByWeekAsc(scansProp)
    : scansInternal;

  const completedWithAnalysis = useMemo(
    () => scans.filter((s) => s.status === 'completed' && s.analysisAvailable),
    [scans]
  );

  const weeksDisponiveis = useMemo(() => {
    const fromScans = scans.map((s) => s.week);
    const fromPhotos = (discovery?.weeks ?? []).map((w) => w.week);
    const atual = semanaAtual != null && semanaAtual > 0 ? [semanaAtual] : [];
    const weeks = Array.from(
      new Set([...fromScans, ...fromPhotos, ...atual].filter((w) => Number.isFinite(w)))
    );
    return weeks.sort((a, b) => a - b);
  }, [scans, discovery, semanaAtual]);

  const latestWeekDefault = useMemo(() => {
    if (completedWithAnalysis.length > 0) {
      return completedWithAnalysis[completedWithAnalysis.length - 1]!.week;
    }
    if (weeksDisponiveis.length > 0) return weeksDisponiveis[weeksDisponiveis.length - 1]!;
    return null;
  }, [completedWithAnalysis, weeksDisponiveis]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (semanaEscolhidaPeloUsuario.current) return;
    if (semanaAtual != null && semanaAtual > 0) {
      setSelectedWeek(semanaAtual);
      return;
    }
    if (selectedWeek != null && weeksDisponiveis.includes(selectedWeek)) return;
    setSelectedWeek(latestWeekDefault);
  }, [phase, selectedWeek, weeksDisponiveis, latestWeekDefault, semanaAtual]);

  const selectedScan = useMemo(() => {
    if (selectedWeek == null) return null;
    return scans.find((s) => s.week === selectedWeek) ?? null;
  }, [scans, selectedWeek]);

  const selectedWeekInfo = useMemo(() => {
    if (selectedWeek == null) return undefined;
    return discovery?.weeks?.find((w) => w.week === selectedWeek);
  }, [discovery, selectedWeek]);

  const selectWeek = (week: number) => {
    semanaEscolhidaPeloUsuario.current = true;
    setSelectedWeek(week);
    setBioConflict(null);
    setBioFeedback(null);
  };

  const first = completedWithAnalysis[0] ?? null;
  const last = completedWithAnalysis[completedWithAnalysis.length - 1] ?? null;

  const chartData = useMemo(() => {
    return completedWithAnalysis.map((s) => ({
      week: s.week,
      label: `S${s.week}`,
      bodyFat: s.bodyFat?.estimatedCentralPercent ?? null,
      bodyFatMin: s.bodyFat?.estimatedMinPercent ?? null,
      bodyFatMax: s.bodyFat?.estimatedMaxPercent ?? null,
      fatMass: s.estimatedFatMassKg?.central ?? null,
      fatFreeMass: s.estimatedFatFreeMassKg?.central ?? null,
      weight: s.input.weightKg,
      abdominal: s.input.abdominalCircumferenceCm ?? null,
      bmi: s.input.bmi,
    }));
  }, [completedWithAnalysis]);

  const yKey =
    metric === 'bodyFat'
      ? 'bodyFat'
      : metric === 'fatMass'
        ? 'fatMass'
        : metric === 'fatFreeMass'
          ? 'fatFreeMass'
          : metric === 'weight'
            ? 'weight'
            : metric === 'abdominal'
              ? 'abdominal'
              : 'bmi';

  const persistBio = async (
    scan: BodyScanPublicView,
    mode: 'create' | 'replace',
    dataRegistroYmd?: string,
    replaceTarget?: BioImpedanciaRegistro
  ) => {
    if (!pacienteId && !bioStore) throw new Error('Paciente não informado');
    const novo = buildBioRegistroFromBodyScan(scan, { dataRegistroYmd });
    if (!novo) throw new Error('BodyScan sem dados suficientes para bioimpedância.');

    const carregar = bioStore?.load ?? (() => buscarBioImpedanciaRegistros(pacienteId!));
    const gravar = bioStore?.save ?? ((regs: BioImpedanciaRegistro[]) => salvarBioImpedanciaRegistros(pacienteId!, regs));

    const existentes = ensureBioRegistrosIds(await carregar());
    let novos: BioImpedanciaRegistro[];

    if (mode === 'replace' && replaceTarget?.id) {
      novos = replaceRegistroById(existentes, replaceTarget.id, { ...novo, id: replaceTarget.id });
    } else {
      novos = [ensureBioRegistroId(novo), ...existentes];
    }

    await gravar(novos);
    onBioImpedanciaSalva?.(novos);
    setBioConflict(null);
    setOutraDataYmd('');
    setBioFeedback(
      mode === 'replace'
        ? `Bioimpedância da semana ${scan.week} substituída.`
        : `Dados do BodyScan (semana ${scan.week}) adicionados à bioimpedância.`
    );
  };

  const handleAdicionarBio = async () => {
    if ((!pacienteId && !bioStore) || !selectedScan || selectedScan.status !== 'completed' || !selectedScan.analysisAvailable) {
      return;
    }
    setSalvandoBio(true);
    setBioFeedback(null);
    try {
      const dayKey = bioCalendarDayKey(selectedScan.date || new Date());
      const carregar = bioStore?.load ?? (() => buscarBioImpedanciaRegistros(pacienteId!));
      const existentes = await carregar();
      const sameDay = findBioRegistrosSameDay(existentes, dayKey);
      if (sameDay.length > 0) {
        setBioConflict({ dayKey, existing: sameDay, scan: selectedScan });
        setOutraDataYmd(dayKey);
        return;
      }
      await persistBio(selectedScan, 'create');
    } catch (err) {
      setBioFeedback(err instanceof Error ? err.message : 'Não foi possível salvar a bioimpedância.');
    } finally {
      setSalvandoBio(false);
    }
  };

  const handleSubstituirBio = async () => {
    if (!bioConflict) return;
    setSalvandoBio(true);
    setBioFeedback(null);
    try {
      const target = [...bioConflict.existing].sort(
        (a, b) =>
          new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime()
      )[0];
      await persistBio(bioConflict.scan, 'replace', bioConflict.dayKey, target);
    } catch (err) {
      setBioFeedback(err instanceof Error ? err.message : 'Não foi possível substituir a bioimpedância.');
    } finally {
      setSalvandoBio(false);
    }
  };

  const handleIncluirOutraData = async () => {
    if (!bioConflict) return;
    const ymd = outraDataYmd.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      setBioFeedback('Informe uma data válida.');
      return;
    }
    setSalvandoBio(true);
    setBioFeedback(null);
    try {
      const carregar = bioStore?.load ?? (() => buscarBioImpedanciaRegistros(pacienteId!));
      const existentes = await carregar();
      const sameDay = findBioRegistrosSameDay(existentes, ymd);
      if (sameDay.length > 0 && ymd === bioConflict.dayKey) {
        setBioFeedback('Escolha outra data ou substitua o registro existente.');
        return;
      }
      if (sameDay.length > 0) {
        setBioConflict({ dayKey: ymd, existing: sameDay, scan: bioConflict.scan });
        setBioFeedback('Já existe bioimpedância nesta data. Substitua ou escolha outra.');
        return;
      }
      await persistBio(bioConflict.scan, 'create', ymd);
    } catch (err) {
      setBioFeedback(err instanceof Error ? err.message : 'Não foi possível salvar a bioimpedância.');
    } finally {
      setSalvandoBio(false);
    }
  };

  if (!aberto || !mounted) return null;

  const showChart = completedWithAnalysis.length >= 2;
  const processingSelected = selectedScan?.status === 'processing';
  const failedOnly =
    phase === 'ready' &&
    scans.length > 0 &&
    completedWithAnalysis.length === 0 &&
    scans.every((s) => s.status === 'failed' || (s.status === 'completed' && !s.analysisAvailable));

  const canAddBio =
    Boolean(pacienteId || bioStore) &&
    phase === 'ready' &&
    selectedScan?.status === 'completed' &&
    selectedScan.analysisAvailable;

  const modal = (
    <div
      className="fixed inset-0 z-[10060] flex flex-col bg-white dark:bg-gray-900 md:items-center md:justify-center md:bg-black/50 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="BodyScan"
      onClick={onFechar}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-900 md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-2xl md:border md:border-gray-200 dark:md:border-gray-700 md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-700 bg-white/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:bg-gray-900/95 backdrop-blur">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">BodyScan</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Evolução da composição corporal estimada por imagem
              {viewerLabel ? ` · ${viewerLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            aria-label="Fechar BodyScan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {phase === 'loading' || (loading && phase !== 'ready' && phase !== 'history_found') ? (
            <div className="py-12 flex flex-col items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              {processingMessage || 'Carregando BodyScan…'}
            </div>
          ) : phase === 'error' || loadError ? (
            <p className="text-sm text-center text-gray-600 dark:text-gray-300 py-8">
              {loadError || 'Não foi possível carregar o BodyScan.'}
            </p>
          ) : phase === 'history_found' ? (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Encontramos o histórico de evolução
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Identificamos fotos de evolução corporal já registradas no acompanhamento. O BodyScan
                pode utilizar essas imagens para reconstruir a evolução corporal ao longo do
                tratamento.
              </p>
              {discovery ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    {discovery.foundPhotoWeeks} semana{discovery.foundPhotoWeeks === 1 ? '' : 's'} com
                    fotografias encontradas
                    {' · '}
                    {discovery.eligibleWeeks} elegível{discovery.eligibleWeeks === 1 ? '' : 'eis'} para
                    BodyScan
                    {discovery.pendingGeneration > 0
                      ? ` · ${discovery.pendingGeneration} ainda sem análise`
                      : ''}
                  </p>
                  {discovery.weeks && discovery.weeks.length > 0 ? (
                    <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      {discovery.weeks.map((week) => {
                        const label = weekStatusLabel(week);
                        return (
                          <li key={week.week}>
                            Semana {week.week}
                            {label ? ` — ${label}` : week.alreadyCompletedSamePhotos ? ' — já analisada' : ''}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void runBackfill()}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5"
              >
                Preparar histórico BodyScan
              </button>
            </div>
          ) : phase === 'processing' ? (
            <div className="py-12 flex flex-col items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              {processingMessage || 'Analisando suas fotos de evolução…'}
            </div>
          ) : scans.length === 0 && weeksDisponiveis.length === 0 ? (
            <p className="text-sm text-center text-gray-600 dark:text-gray-300 py-8">
              Ainda não há análises BodyScan disponíveis.
            </p>
          ) : failedOnly && weeksDisponiveis.length <= scans.length ? (
            <p className="text-sm text-center text-gray-600 dark:text-gray-300 py-8">
              {selectedScan?.unavailableReason ||
                'Não foi possível gerar o BodyScan destas semanas.'}
            </p>
          ) : (
            <>
              {discovery && discovery.pendingGeneration > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {discovery.pendingGeneration === 1
                      ? 'Há 1 semana com fotos prontas para BodyScan.'
                      : `Há ${discovery.pendingGeneration} semanas com fotos prontas para BodyScan.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => void runBackfill()}
                    className="mt-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5"
                  >
                    Analisar semanas pendentes
                  </button>
                </div>
              ) : null}

              {weeksDisponiveis.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Semana analisada
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {weeksDisponiveis.map((week) => {
                      const scan = scans.find((s) => s.week === week);
                      const info = discovery?.weeks?.find((w) => w.week === week);
                      const ok = scan?.status === 'completed' && scan.analysisAvailable;
                      const blocked = Boolean(info && !info.eligible);
                      const active = selectedWeek === week;
                      return (
                        <button
                          key={week}
                          type="button"
                          onClick={() => selectWeek(week)}
                          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            active
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : ok
                                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                                : blocked
                                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200'
                          }`}
                          aria-pressed={active}
                        >
                          S{week}
                          {!ok ? (
                            <span className="ml-1 text-[10px] opacity-80">
                              {scan?.status === 'processing' ? '…' : blocked ? '·' : '!'}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {selectedWeekInfo && !selectedWeekInfo.eligible ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 px-3 py-3">
                  Semana {selectedWeekInfo.week}: {weekStatusLabel(selectedWeekInfo)}. O BodyScan usa a foto frontal e a de perfil da mesma semana.
                </p>
              ) : null}

              {processingSelected && !selectedScan?.analysisAvailable ? (
                <p className="text-sm text-center text-gray-600 dark:text-gray-300 py-6">
                  BodyScan da semana {selectedScan?.week} está sendo processado.
                </p>
              ) : selectedScan &&
                selectedScan.status === 'completed' &&
                selectedScan.analysisAvailable ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-3">
                    Estimativa por imagem · Semana {selectedScan.week}
                    {selectedScan.date
                      ? ` · ${formatBioRegistroPtBr(selectedScan.date)}`
                      : ''}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[11px] text-gray-500">Gordura corporal estimada</p>
                      <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {fmtInt(selectedScan.bodyFat?.estimatedMinPercent)}–
                        {fmtInt(selectedScan.bodyFat?.estimatedMaxPercent)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Estimativa central</p>
                      <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {fmtInt(selectedScan.bodyFat?.estimatedCentralPercent)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Massa gorda estimada</p>
                      <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {fmt1(selectedScan.estimatedFatMassKg?.central)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Massa livre de gordura estimada</p>
                      <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {fmt1(selectedScan.estimatedFatFreeMassKg?.central)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Confiança da análise</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {confidenceLabel(selectedScan.confidence?.overall)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedScan?.status === 'completed' && !selectedScan.analysisAvailable ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-3">
                    {selectedScan.unavailableReason ||
                      'Não foi possível estimar a composição corporal com segurança suficiente a partir destas fotos.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void runBackfill()}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5"
                  >
                    Tentar BodyScan da semana {selectedScan.week} novamente
                  </button>
                </div>
              ) : selectedScan?.status === 'failed' ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-gray-600 dark:text-gray-300 py-2">
                    {selectedScan.unavailableReason ||
                      `Não foi possível gerar o BodyScan da semana ${selectedScan.week}.`}
                  </p>
                  {selectedWeekInfo?.needsGeneration ? (
                    <button
                      type="button"
                      onClick={() => void runBackfill()}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5"
                    >
                      Tentar BodyScan da semana {selectedScan.week} novamente
                    </button>
                  ) : null}
                </div>
              ) : selectedWeekInfo?.needsGeneration && !selectedScan ? (
                <button
                  type="button"
                  onClick={() => void runBackfill()}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5"
                >
                  Analisar BodyScan da semana {selectedWeekInfo.week}
                </button>
              ) : null}

              {canAddBio ? (
                <div className="space-y-2">
                  {!bioConflict ? (
                    <button
                      type="button"
                      disabled={salvandoBio}
                      onClick={() => void handleAdicionarBio()}
                      className="w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-900 hover:bg-cyan-100 disabled:opacity-60 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200"
                    >
                      {salvandoBio ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando…
                        </span>
                      ) : (
                        `Adicionar à bioimpedância · Semana ${selectedScan!.week}`
                      )}
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3 dark:border-amber-800 dark:bg-amber-950/20">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        Já existe bioimpedância em {formatBioRegistroPtBr(bioConflict.dayKey)}
                      </p>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        {bioConflict.existing.length === 1
                          ? `Deseja substituir o registro desse dia pelos dados da semana ${bioConflict.scan.week} ou incluir em outra data?`
                          : `Há ${bioConflict.existing.length} registros neste dia. Substituir o mais recente pelos dados da semana ${bioConflict.scan.week} ou incluir em outra data?`}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          disabled={salvandoBio}
                          onClick={() => void handleSubstituirBio()}
                          className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2.5 disabled:opacity-60"
                        >
                          Substituir
                        </button>
                        <button
                          type="button"
                          disabled={salvandoBio}
                          onClick={() => setBioConflict(null)}
                          className="rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200"
                        >
                          Cancelar
                        </button>
                      </div>
                      <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-white/70 dark:bg-gray-900/40 p-3 space-y-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Incluir em outra data
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="date"
                            value={outraDataYmd || formatBioDateInputLocal(new Date())}
                            onChange={(e) => setOutraDataYmd(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={salvandoBio}
                            onClick={() => void handleIncluirOutraData()}
                            className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold px-3 py-2.5 disabled:opacity-60"
                          >
                            Incluir nesta data
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {bioFeedback ? (
                    <p className="text-xs text-center text-gray-600 dark:text-gray-300">{bioFeedback}</p>
                  ) : null}
                </div>
              ) : null}

              {first && last && first.week !== last.week ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      label: 'Peso',
                      from: first.input.weightKg,
                      to: last.input.weightKg,
                      unit: 'kg',
                      points: false,
                    },
                    {
                      label: 'Gordura estimada',
                      from: first.bodyFat?.estimatedCentralPercent,
                      to: last.bodyFat?.estimatedCentralPercent,
                      unit: '%',
                      points: true,
                    },
                    {
                      label: 'Massa gorda estimada',
                      from: first.estimatedFatMassKg?.central,
                      to: last.estimatedFatMassKg?.central,
                      unit: 'kg',
                      points: false,
                    },
                    {
                      label: 'Massa livre de gordura estimada',
                      from: first.estimatedFatFreeMassKg?.central,
                      to: last.estimatedFatFreeMassKg?.central,
                      unit: 'kg',
                      points: false,
                    },
                  ].map((card) => {
                    const d = delta(card.from, card.to);
                    return (
                      <div
                        key={card.label}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          {card.label}
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white mt-1">
                          {card.points ? fmtInt(card.from) : fmt1(card.from)}
                          {card.points ? '%' : ` ${card.unit}`}
                          {' → '}
                          {card.points ? fmtInt(card.to) : fmt1(card.to)}
                          {card.points ? '%' : ` ${card.unit}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDelta(d, card.unit, card.points)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {showChart ? (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {METRIC_OPTIONS.map((o) => {
                      const active = metric === o.key;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => setMetric(o.key)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                            active
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                          }`}
                          aria-pressed={active}
                        >
                          {o.button}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {METRIC_OPTIONS.find((m) => m.key === metric)?.label}
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={40} />
                        <Tooltip />
                        <Legend />
                        {metric === 'bodyFat' ? (
                          <Area
                            type="monotone"
                            dataKey="bodyFatMax"
                            stroke="none"
                            fill="#86efac"
                            fillOpacity={0.25}
                            name="Máx. estimado"
                          />
                        ) : null}
                        {metric === 'bodyFat' ? (
                          <Area
                            type="monotone"
                            dataKey="bodyFatMin"
                            stroke="none"
                            fill="#ffffff"
                            fillOpacity={1}
                            name="Mín. estimado"
                          />
                        ) : null}
                        <Line
                          type="monotone"
                          dataKey={yKey}
                          stroke="#059669"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          activeDot={{
                            r: 5,
                            onClick: (_: unknown, point: { payload?: { week?: number } }) => {
                              const week = point?.payload?.week;
                              if (typeof week === 'number') selectWeek(week);
                            },
                          }}
                          name={METRIC_OPTIONS.find((m) => m.key === metric)?.label}
                          connectNulls
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : completedWithAnalysis.length === 1 ? (
                <p className="text-xs text-center text-gray-500">
                  Com mais BodyScans ao longo das semanas, a evolução aparece aqui em gráfico.
                </p>
              ) : null}
            </>
          )}

          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
            O BodyScan fornece estimativas de composição corporal baseadas em imagens e dados
            antropométricos. Os resultados não correspondem a bioimpedância, DXA ou outro exame de
            composição corporal e devem ser interpretados como acompanhamento estimado de evolução.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default BodyScanModal;
