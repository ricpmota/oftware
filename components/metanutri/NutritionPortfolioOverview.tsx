'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CalendarDays, Minus, TrendingUp, Users, X } from 'lucide-react';
import DashboardKpiCard from '@/components/metaadmin/dashboard/DashboardKpiCard';
import { CheckInSemanalNutriEvolucao } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriEvolucao';
import { CheckInSemanalNutriOverlay } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriOverlay';
import { CheckInSemanalNutriView } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriView';
import {
  buildWeeklyNutritionPortfolioSummary,
  isActiveWeeklyNutritionPortfolioStatus,
  mergeEligiblePatientsWithPortfolioRows,
  type WeeklyNutritionPortfolioPatient,
  type WeeklyNutritionPortfolioSummary,
} from '@/lib/nutri/checkInSemanalNutriPortfolio';
import {
  backfillWeeklyNutritionPortfolioSummaries,
  listWeeklyNutritionPortfolioSummariesByNutritionist,
  portfolioSummaryToPatient,
  refreshWeeklyNutritionPortfolioSummary,
} from '@/lib/nutri/checkInSemanalNutriPortfolioSummaryStore';
import {
  getNutritionCheckInReferenceWeek,
  getNutritionWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';
import type { PacienteVisivelNutri } from '@/services/pacienteNutricionistaService';
import { calcularSemanaAtualTratamento } from '@/utils/tratamentoUtils';

type OverlayIntent = 'history' | 'create' | 'edit';

type OverlayState = {
  patientId: string;
  patientName: string;
  weekKey: string;
  intent: OverlayIntent;
};

type Props = {
  nutritionistId: string;
  nutritionistName?: string;
  patients: PacienteVisivelNutri[];
  loadingPatients?: boolean;
  onOpenCalendar: () => void;
};

function formatScore(patient: WeeklyNutritionPortfolioPatient): string {
  if (patient.latestScore == null) return '—';
  const rounded = Math.round(patient.latestScore);
  if (patient.scoreDelta == null || patient.scoreDelta === 0) return `Score ${rounded}`;
  const delta = Math.round(Math.abs(patient.scoreDelta));
  return `Score ${rounded} ${patient.scoreDelta > 0 ? '↑' : '↓'}${delta}`;
}

function percentOf(part: number, total: number): string | null {
  if (total <= 0) return null;
  return `${Math.round((part / total) * 100)}%`;
}

function DashboardPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="border bg-[var(--surface-card)]"
      style={{
        borderColor: 'var(--border-default)',
        borderRadius: 18,
      }}
    >
      {children}
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-label="Carregando visão da carteira">
      <div className="h-10 w-56 animate-pulse rounded-xl bg-gray-100" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[148px] animate-pulse border bg-[var(--surface-card)]"
            style={{ borderColor: 'var(--border-default)', borderRadius: 18 }}
          />
        ))}
      </div>
    </section>
  );
}

function PatientRow({
  patient,
  accent,
  onOpen,
}: {
  patient: WeeklyNutritionPortfolioPatient;
  accent: 'attention' | 'improving';
  onOpen: () => void;
}) {
  return (
    <article className="flex flex-wrap items-start justify-between gap-3 border-t py-4 first:border-t-0 first:pt-0 last:pb-0" style={{ borderColor: 'var(--border-default)' }}>
      <div className="min-w-0">
        <h4 className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{patient.patientName}</h4>
        <p className="mt-1 text-[13px] font-medium tabular-nums text-[var(--text-secondary)]">{formatScore(patient)}</p>
        {accent === 'improving' ? (
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">Tendência: Melhorando</p>
        ) : null}
        {patient.reasons.length > 0 && accent === 'attention' ? (
          <ul className="mt-2 space-y-1">
            {patient.reasons.map((reason) => (
              <li key={reason.id} className="text-[13px] text-[var(--text-secondary)]">
                • {reason.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-11 shrink-0 items-center justify-center border px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)]"
        style={{ borderColor: 'var(--border-default)', borderRadius: 14 }}
      >
        Ver evolução
      </button>
    </article>
  );
}

export default function NutritionPortfolioOverview({
  nutritionistId,
  nutritionistName,
  patients,
  loadingPatients = false,
  onOpenCalendar,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WeeklyNutritionPortfolioSummary | null>(null);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  const eligiblePatients = useMemo(
    () =>
      patients
        .filter((item) => isActiveWeeklyNutritionPortfolioStatus(item.paciente.statusTratamento))
        .map((item) => ({
          patientId: item.pacienteId || item.paciente.id,
          patientName: item.paciente.nome || 'Paciente',
          paciente: item.paciente,
        })),
    [patients]
  );

  const loadPortfolio = useCallback(async () => {
    if (!nutritionistId) {
      setSummary(null);
      setEligibleCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const eligible = eligiblePatients.map((item) => ({
        patientId: item.patientId,
        patientName: item.patientName,
      }));
      setEligibleCount(eligible.length);
      if (eligible.length === 0) {
        setSummary(buildWeeklyNutritionPortfolioSummary([]));
        return;
      }
      const existing = await listWeeklyNutritionPortfolioSummariesByNutritionist(nutritionistId);
      const written = await backfillWeeklyNutritionPortfolioSummaries({
        nutritionistId,
        patients: eligible,
        existing,
      });
      const rows = [...existing, ...written].map((doc) =>
        portfolioSummaryToPatient(
          doc,
          eligible.find((item) => item.patientId === doc.patientId)?.patientName || 'Paciente'
        )
      );
      setSummary(
        buildWeeklyNutritionPortfolioSummary(
          mergeEligiblePatientsWithPortfolioRows({
            eligiblePatients: eligible,
            rows,
          })
        )
      );
    } catch (err) {
      console.warn('[nutri-portfolio] falha ao carregar carteira', err);
      setError('Não foi possível carregar a visão da carteira.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [eligiblePatients, nutritionistId]);

  useEffect(() => {
    if (loadingPatients) return;
    void loadPortfolio();
  }, [loadPortfolio, loadingPatients]);

  const openEvolution = useCallback((patient: WeeklyNutritionPortfolioPatient) => {
    const week = patient.latestWeekKey
      ? getNutritionWeek(patient.latestWeekKey)
      : getNutritionCheckInReferenceWeek();
    setOverlay({
      patientId: patient.patientId,
      patientName: patient.patientName,
      weekKey: week.weekKey,
      intent: 'history',
    });
  }, []);

  const closeOverlay = useCallback(() => {
    const current = overlay;
    setOverlay(null);
    if (!current || !nutritionistId) return;
    void refreshWeeklyNutritionPortfolioSummary({
      patientId: current.patientId,
      nutritionistId,
    })
      .then(() => loadPortfolio())
      .catch(() => undefined);
  }, [loadPortfolio, nutritionistId, overlay]);

  const overlayPatient = overlay
    ? eligiblePatients.find((item) => item.patientId === overlay.patientId)?.paciente ?? null
    : null;
  const improvingShare = summary ? percentOf(summary.improving, summary.total) : null;

  if (loadingPatients || loading) {
    return <PortfolioSkeleton />;
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Visão da carteira</h3>
        <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
          {eligibleCount === 1
            ? '1 paciente em acompanhamento nutricional'
            : `${eligibleCount} pacientes em acompanhamento nutricional`}
        </p>
      </div>

      {error ? (
        <DashboardPanel>
          <p className="px-4 py-4 text-[13px] text-[var(--text-secondary)] sm:px-5">{error}</p>
        </DashboardPanel>
      ) : null}

      {!error && eligibleCount === 0 ? (
        <DashboardPanel>
          <p className="px-4 py-4 text-[13px] text-[var(--text-secondary)] sm:px-5">
            Nenhum paciente em acompanhamento no momento.
          </p>
        </DashboardPanel>
      ) : null}

      {!error && summary && eligibleCount > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <DashboardKpiCard
              label="Em acompanhamento"
              value={summary.total}
              description="Check-in Semanal"
              icon={Users}
              tone="blue"
            />
            <DashboardKpiCard
              label="Evoluindo"
              value={summary.improving}
              description={improvingShare ? `${improvingShare} da carteira` : 'Tendência positiva'}
              icon={TrendingUp}
              tone="green"
            />
            <DashboardKpiCard
              label="Estáveis"
              value={summary.stable}
              description="Sem alerta relevante"
              icon={Minus}
              tone="amber"
            />
            <DashboardKpiCard
              label="Precisam de atenção"
              value={summary.attention}
              description="Prioridade operacional"
              icon={AlertTriangle}
              tone="red"
            />
          </div>

          {summary.insufficientData > 0 ? (
            <p className="text-[12px] text-[var(--text-secondary)]">
              {summary.insufficientData === 1
                ? '1 paciente ainda não possui dados suficientes para análise.'
                : `${summary.insufficientData} pacientes ainda não possuem dados suficientes para análise.`}
            </p>
          ) : null}

          {summary.attention === 0 &&
          summary.improving === 0 &&
          summary.stable === 0 &&
          summary.insufficientData === summary.total ? (
            <DashboardPanel>
              <p className="px-4 py-4 text-[13px] text-[var(--text-secondary)] sm:px-5">
                Sua carteira ainda não possui Check-ins Semanais suficientes para análise de evolução.
              </p>
            </DashboardPanel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <DashboardPanel>
                <div className="p-4 sm:px-5 sm:py-[18px]">
                  <h4 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    Pacientes que precisam de atenção
                  </h4>
                  <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">Prioridade do Check-in Semanal</p>
                  <div className="mt-4">
                    {summary.priorityPatients.length === 0 ? (
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        Nenhum paciente precisa de atenção agora.
                      </p>
                    ) : (
                      summary.priorityPatients.map((patient) => (
                        <PatientRow
                          key={patient.patientId}
                          patient={patient}
                          accent="attention"
                          onOpen={() => openEvolution(patient)}
                        />
                      ))
                    )}
                  </div>
                  {summary.attention > summary.priorityPatients.length ? (
                    <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                      E mais {summary.attention - summary.priorityPatients.length}{' '}
                      {summary.attention - summary.priorityPatients.length === 1
                        ? 'paciente precisa'
                        : 'pacientes precisam'}{' '}
                      de atenção.
                    </p>
                  ) : null}
                </div>
              </DashboardPanel>

              <DashboardPanel>
                <div className="p-4 sm:px-5 sm:py-[18px]">
                  <h4 className="text-[15px] font-semibold text-[var(--text-primary)]">Evolução positiva</h4>
                  <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">Destaques recentes</p>
                  <div className="mt-4">
                    {summary.positiveHighlights.length === 0 ? (
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        Ainda não há destaques positivos nesta carteira.
                      </p>
                    ) : (
                      summary.positiveHighlights.map((patient) => (
                        <PatientRow
                          key={patient.patientId}
                          patient={patient}
                          accent="improving"
                          onOpen={() => openEvolution(patient)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </DashboardPanel>
            </div>
          )}

          <DashboardPanel>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Pendências e atrasos do Check-in Semanal ficam no Calendário.
              </p>
              <button
                type="button"
                onClick={onOpenCalendar}
                className="inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)]"
                style={{ borderColor: 'var(--border-default)', borderRadius: 14 }}
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                Ver Calendário
              </button>
            </div>
          </DashboardPanel>
        </>
      ) : null}

      {overlay ? (
        <CheckInSemanalNutriOverlay onClose={closeOverlay} labelledBy="nutrition-portfolio-evolucao" size="wide">
          {overlay.intent === 'history' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="flex justify-end px-4 pt-4">
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mx-auto w-full max-w-5xl px-4 pb-8">
                <h2 id="nutrition-portfolio-evolucao" className="sr-only">
                  Evolução nutricional
                </h2>
                <CheckInSemanalNutriEvolucao
                  pacienteId={overlay.patientId}
                  pacienteNome={overlay.patientName}
                  tratamentoSemana={calcularSemanaAtualTratamento(overlayPatient)}
                  canFill
                  canDelete
                  hasLegacyDaily={false}
                  focusWeekKey={overlay.weekKey}
                  viewerRole="nutritionist"
                  nutritionistId={nutritionistId}
                  onStartCheckIn={() => {
                    const week = getNutritionCheckInReferenceWeek();
                    setOverlay({ ...overlay, weekKey: week.weekKey, intent: 'create' });
                  }}
                  onOpenWeek={(weekKey) => {
                    setOverlay({ ...overlay, weekKey, intent: 'edit' });
                  }}
                  onDeleted={() => {
                    void refreshWeeklyNutritionPortfolioSummary({
                      patientId: overlay.patientId,
                      nutritionistId,
                    }).then(() => loadPortfolio());
                  }}
                />
              </div>
            </div>
          ) : (
            <CheckInSemanalNutriView
              pacienteId={overlay.patientId}
              pacienteNome={overlay.patientName}
              nutricionistaNome={nutritionistName}
              nutritionistId={nutritionistId}
              mode="nutritionist"
              answeredBy="nutritionist"
              source="nutritionist"
              answeredById={nutritionistId}
              week={getNutritionWeek(overlay.weekKey)}
              intent={overlay.intent === 'create' ? 'create' : 'edit'}
              viewerRole="nutritionist"
              onClose={closeOverlay}
              onGoToHistory={() => setOverlay({ ...overlay, intent: 'history' })}
            />
          )}
        </CheckInSemanalNutriOverlay>
      ) : null}
    </section>
  );
}
