'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildWeeklyNutritionCheckInSlotsForRange,
  type WeeklyNutritionCheckInSlot,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import {
  listNutriWeeklyCheckInSchedulesByNutritionist,
  listNutriWeeklyCheckInSchedulesByPatientIds,
  loadWeeklyNutritionCheckInsForPatientsInWeekRange,
} from '@/lib/nutri/checkInSemanalNutriScheduleStore';
import {
  getNutritionTreatmentWindow,
  type NutritionTreatmentWindow,
} from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { previousWeekRecordOf } from '@/lib/nutri/checkInSemanalNutriOperational';
import { getNutritionWeek, getPreviousNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import type { PacienteCompleto } from '@/types/obesidade';
import { ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';
import {
  phoneFieldsFromPaciente,
  resolveWhatsappCanonicalDigits,
  type InternationalPhoneFields,
} from '@/lib/phone/buildWhatsappUrl';

export type WeeklyNutritionCheckInCalendarPatient = Pick<
  PacienteCompleto,
  'id' | 'nome' | 'telefone' | 'statusTratamento' | 'planoTerapeutico' | 'evolucaoSeguimento' | 'dadosIdentificacao'
>;

export type WeeklyNutritionCheckInCalendarItem = WeeklyNutritionCheckInSlot & {
  patientName: string;
  phoneDigits: string;
  phoneFields: InternationalPhoneFields;
  record?: CheckInSemanalNutri | null;
  previousRecord?: CheckInSemanalNutri | null;
};

function phoneFieldsOf(patient: WeeklyNutritionCheckInCalendarPatient): InternationalPhoneFields {
  return phoneFieldsFromPaciente(patient);
}

function phoneDigitsOf(patient: WeeklyNutritionCheckInCalendarPatient): string {
  return resolveWhatsappCanonicalDigits(phoneFieldsOf(patient)) ?? '';
}

function minYmd(a: string, b: string): string {
  return a < b ? a : b;
}

function maxYmd(a: string, b: string): string {
  return a > b ? a : b;
}

export function useWeeklyNutritionCheckInCalendar(input: {
  enabled: boolean;
  nutritionistId?: string;
  month: Date;
  /** Meses vizinhos incluídos no intervalo. 1 carrega o anterior e o seguinte. */
  monthsAround?: number;
  patients: WeeklyNutritionCheckInCalendarPatient[];
}): {
  slots: WeeklyNutritionCheckInCalendarItem[];
  loading: boolean;
  reload: (options?: { silent?: boolean }) => void;
} {
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<WeeklyNutritionCheckInCalendarItem[]>([]);
  const silentRef = useRef(false);

  const monthsAround = Math.max(0, Math.floor(input.monthsAround ?? 0));
  const monthStart = ymdLocal(new Date(input.month.getFullYear(), input.month.getMonth() - monthsAround, 1));
  const monthEnd = ymdLocal(new Date(input.month.getFullYear(), input.month.getMonth() + 1 + monthsAround, 0));
  const currentWeek = getNutritionWeek(new Date());
  const rangeStart = minYmd(monthStart, currentWeek.weekStart);
  const rangeEnd = maxYmd(monthEnd, currentWeek.weekEnd);
  const patientIdsKey = input.patients.map((p) => p.id).join(',');
  const namesKey = input.patients
    .map((p) => `${p.id}:${p.dadosIdentificacao?.nomeCompleto || p.nome || ''}:${phoneDigitsOf(p)}`)
    .join('|');
  const treatmentKey = input.patients
    .map((p) => {
      const plano = p.planoTerapeutico;
      const start = plano?.startDate || plano?.dataInicioTratamento;
      return `${p.id}:${p.statusTratamento || ''}:${String(start || '')}:${plano?.numeroSemanasTratamento || 0}:${plano?.injetaveisAplicacoes?.length || 0}`;
    })
    .join('|');

  const reload = useCallback((options?: { silent?: boolean }) => {
    silentRef.current = options?.silent === true;
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!input.enabled) {
      setSlots([]);
      return;
    }
    const visibleIds = [...new Set(input.patients.map((p) => p.id).filter(Boolean))];
    if (visibleIds.length === 0) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    const silent = silentRef.current;
    silentRef.current = false;
    if (!silent) setLoading(true);
    const visibleIdSet = new Set(visibleIds);
    const nameMap = new Map(
      input.patients.map((p) => [p.id, p.dadosIdentificacao?.nomeCompleto || p.nome || 'Paciente'] as const)
    );
    const phoneMap = new Map(input.patients.map((p) => [p.id, phoneDigitsOf(p)]));
    const phoneFieldsMap = new Map(input.patients.map((p) => [p.id, phoneFieldsOf(p)]));
    const eligibilityByPatient: Record<
      string,
      { statusTratamento?: string | null; window: NutritionTreatmentWindow | null }
    > = {};
    for (const patient of input.patients) {
      eligibilityByPatient[patient.id] = {
        statusTratamento: patient.statusTratamento,
        window: getNutritionTreatmentWindow(patient),
      };
    }
    const minWeekKey = getPreviousNutritionWeek(getNutritionWeek(rangeStart)).weekKey;
    const maxWeekKey = getNutritionWeek(rangeEnd).weekKey;

    const schedulesPromise = input.nutritionistId
      ? listNutriWeeklyCheckInSchedulesByNutritionist(input.nutritionistId).then((all) =>
          all.filter((s) => visibleIdSet.has(s.patientId))
        )
      : listNutriWeeklyCheckInSchedulesByPatientIds(visibleIds);

    schedulesPromise
      .then(async (schedules) => {
        const records = await loadWeeklyNutritionCheckInsForPatientsInWeekRange(
          schedules.map((s) => s.patientId),
          minWeekKey,
          maxWeekKey
        );
        if (cancelled) return;
        const built = buildWeeklyNutritionCheckInSlotsForRange({
          schedules,
          records,
          rangeStart,
          rangeEnd,
          eligibilityByPatient,
        });
        const recordMap = new Map(records.map((r) => [`${r.pacienteId}::${r.weekKey}`, r]));
        setSlots(
          built.map((slot) => ({
            ...slot,
            patientName: nameMap.get(slot.patientId) || 'Paciente',
            phoneDigits: phoneMap.get(slot.patientId) || '',
            phoneFields: phoneFieldsMap.get(slot.patientId) || {},
            record: recordMap.get(`${slot.patientId}::${slot.weekKey}`) ?? null,
            previousRecord: previousWeekRecordOf(records, slot.patientId, slot.weekKey),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled && !silent) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [input.enabled, input.nutritionistId, namesKey, patientIdsKey, rangeEnd, rangeStart, tick, treatmentKey]);

  return {
    slots,
    loading,
    reload,
  };
}
