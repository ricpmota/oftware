'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Check, CheckCircle, Copy, Loader2, X } from 'lucide-react';
import { CheckInSemanalNutriOverlay } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriOverlay';
import { copyNutriCheckInPublicLink } from '@/lib/nutri/copyNutriCheckInPublicLink';
import { openNutriCheckInWhatsApp } from '@/lib/nutri/openNutriCheckInWhatsApp';
import {
  phoneFieldsFromPaciente,
  resolveWhatsappCanonicalDigits,
} from '@/lib/phone/buildWhatsappUrl';
import {
  listPickerWeeklyNutritionCheckIns,
  type PickerWeeklyNutritionCheckIn,
} from '@/lib/nutri/listPendingWeeklyNutritionCheckIns';
import {
  loadNutriWeeklyCheckInScheduleForPatient,
  loadWeeklyNutritionCheckInsForPatientsInWeekRange,
} from '@/lib/nutri/checkInSemanalNutriScheduleStore';
import {
  getNutritionTreatmentWindow,
  getPlanoTerapeuticoTreatmentWeeks,
  type NutritionTreatmentPatientSlice,
} from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';
import {
  formatNutritionWeekLongLabel,
  getNutritionWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';

type Props = {
  pacienteId: string;
  nutritionistId?: string | null;
  patient: NutritionTreatmentPatientSlice & {
    nome?: string;
    telefone?: string;
    dadosIdentificacao?: {
      nomeCompleto?: string;
      telefone?: string;
      telefoneDdi?: string | null;
      telefoneE164?: string | null;
    };
  };
  onClose: () => void;
  onSelectWeek: (weekKey: string, answered: boolean) => void;
};

function patientNameOf(patient: Props['patient']): string {
  return String(patient.dadosIdentificacao?.nomeCompleto || patient.nome || 'Paciente').trim() || 'Paciente';
}

function phoneDigitsOf(patient: Props['patient']): string {
  return resolveWhatsappCanonicalDigits(phoneFieldsFromPaciente(patient)) ?? '';
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function formatScheduledDate(ymd: string): string {
  const [year, month, day] = ymd.split('-');
  if (!year || !month || !day) return ymd;
  return `${day}/${month}/${year}`;
}

export function CheckInSemanalNutriWeekPicker({
  pacienteId,
  nutritionistId,
  patient,
  onClose,
  onSelectWeek,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [items, setItems] = useState<PickerWeeklyNutritionCheckIn[]>([]);
  const [copyingWeekKey, setCopyingWeekKey] = useState<string | null>(null);
  const [copiedWeekKey, setCopiedWeekKey] = useState<string | null>(null);
  const [whatsappWeekKey, setWhatsappWeekKey] = useState<string | null>(null);
  const [actionErro, setActionErro] = useState<string | null>(null);
  const treatmentWeeks = getPlanoTerapeuticoTreatmentWeeks(patient);
  const treatmentWindow = getNutritionTreatmentWindow(patient);
  const phoneDigits = phoneDigitsOf(patient);
  const hasWhatsAppPhone = phoneDigits.length >= 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    const now = new Date();
    const current = getNutritionWeek(now);
    const lookbackStart = treatmentWeeks[0]?.start
      ? getNutritionWeek(treatmentWeeks[0].start).weekKey
      : treatmentWindow?.start
        ? getNutritionWeek(treatmentWindow.start).weekKey
        : current.weekKey;

    Promise.all([
      loadNutriWeeklyCheckInScheduleForPatient(pacienteId, nutritionistId),
      loadWeeklyNutritionCheckInsForPatientsInWeekRange([pacienteId], lookbackStart, current.weekKey),
    ])
      .then(([schedule, records]) => {
        if (cancelled) return;
        setItems(
          listPickerWeeklyNutritionCheckIns({
            answeredWeekKeys: records.map((record) => record.weekKey),
            schedule,
            treatmentWeeks,
            now,
          })
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setErro(err instanceof Error ? err.message : 'Não foi possível carregar os check-ins.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nutritionistId, pacienteId, treatmentWindow?.start, treatmentWindow?.end, treatmentWeeks.length]);

  const handleCopy = async (weekKey: string) => {
    setActionErro(null);
    setCopyingWeekKey(weekKey);
    try {
      await copyNutriCheckInPublicLink({ patientId: pacienteId, weekKey });
      setCopiedWeekKey(weekKey);
      window.setTimeout(() => {
        setCopiedWeekKey((current) => (current === weekKey ? null : current));
      }, 2000);
    } catch (err) {
      setActionErro(err instanceof Error ? err.message : 'Não foi possível copiar o link.');
    } finally {
      setCopyingWeekKey(null);
    }
  };

  const handleWhatsApp = async (weekKey: string, isCurrent: boolean) => {
    setActionErro(null);
    setWhatsappWeekKey(weekKey);
    try {
      const { href } = await openNutriCheckInWhatsApp({
        patientId: pacienteId,
        weekKey,
        patientName: patientNameOf(patient),
        phoneDigits,
        phoneFields: phoneFieldsFromPaciente(patient),
        kind: isCurrent ? 'd0' : 'atrasado',
      });
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setActionErro(err instanceof Error ? err.message : 'Não foi possível abrir o WhatsApp.');
    } finally {
      setWhatsappWeekKey(null);
    }
  };

  return (
    <CheckInSemanalNutriOverlay onClose={onClose} labelledBy="checkin-semana-picker-title">
      <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <h2 id="checkin-semana-picker-title" className="text-lg font-bold text-slate-900">
              Qual check-in responder?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Semanas do plano terapêutico. Copie o link ou envie no WhatsApp do paciente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Carregando" />
            </div>
          ) : erro ? (
            <p className="text-sm text-red-600">{erro}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma semana no prazo deste tratamento.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const copying = copyingWeekKey === item.week.weekKey;
                const copied = copiedWeekKey === item.week.weekKey;
                const whatsapping = whatsappWeekKey === item.week.weekKey;
                const answered = item.answered;
                return (
                  <li key={`${item.treatmentWeekNumber}-${item.week.weekKey}`}>
                    <div
                      className={`flex items-stretch gap-1 rounded-2xl border bg-white shadow-sm ${
                        answered ? 'border-emerald-200' : 'border-red-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectWeek(item.week.weekKey, answered)}
                        className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left ${
                          answered ? 'hover:bg-emerald-50/80' : 'hover:bg-red-50/70'
                        }`}
                      >
                        {answered ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                        ) : (
                          <CalendarDays className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900">
                            {item.treatmentWeekNumber > 0
                              ? `Semana ${item.treatmentWeekNumber} do tratamento`
                              : formatNutritionWeekLongLabel(item.week)}
                          </span>
                          <span
                            className={`mt-0.5 block text-xs font-medium ${
                              answered ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {item.isCurrent ? 'Semana atual · ' : ''}
                            {formatNutritionWeekLongLabel({
                              weekStart: item.treatmentWeekStart,
                              weekEnd: item.treatmentWeekEnd,
                            })}
                            {answered
                              ? ' · Respondido'
                              : ` · Não respondido · liberado em ${formatScheduledDate(item.scheduledDate)}`}
                          </span>
                        </span>
                      </button>
                      {!answered ? (
                        <div className="flex shrink-0 items-stretch border-l border-red-100">
                          <button
                            type="button"
                            onClick={() => void handleCopy(item.week.weekKey)}
                            disabled={copying}
                            className="flex w-11 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-emerald-700 disabled:opacity-60"
                            title="Copiar link do check-in para enviar ao paciente"
                            aria-label="Copiar link do check-in para enviar ao paciente"
                          >
                            {copying ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : copied ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleWhatsApp(item.week.weekKey, item.isCurrent)}
                            disabled={whatsapping || !hasWhatsAppPhone}
                            className="flex w-11 items-center justify-center rounded-r-2xl text-[#25D366] hover:bg-emerald-50 disabled:opacity-40"
                            title={
                              hasWhatsAppPhone
                                ? 'Abrir WhatsApp e enviar o link do check-in'
                                : 'Paciente sem telefone cadastrado'
                            }
                            aria-label="Abrir WhatsApp e enviar o link do check-in"
                          >
                            {whatsapping ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#25D366]" />
                            ) : (
                              <WhatsAppIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {actionErro ? <p className="mt-3 text-sm text-red-600">{actionErro}</p> : null}
        </div>
      </div>
    </CheckInSemanalNutriOverlay>
  );
}
