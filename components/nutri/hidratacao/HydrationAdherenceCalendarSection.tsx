'use client';

import { useEffect, useState } from 'react';
import { Droplets } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { hydrationTodayYmd } from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationAdherenceAlertType } from '@/lib/nutri/hidratacao/hydrationAdherence';

type AlertRow = {
  id: string;
  patientId: string;
  type: HydrationAdherenceAlertType;
  copy: { title: string; body: string };
};

type Props = {
  selectedDate: Date | null;
  patientNameById: Record<string, string>;
  onOpenPatient?: (patientId: string) => void;
};

async function authFetch(url: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

function isToday(date: Date | null): boolean {
  if (!date) return false;
  const today = hydrationTodayYmd();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` === today;
}

export function HydrationAdherenceCalendarSection({
  selectedDate,
  patientNameById,
  onOpenPatient,
}: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/hidratacao/adherence-alerts')
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as
          | { ok?: boolean; alerts?: AlertRow[] }
          | null;
        if (!cancelled && res.ok && payload?.ok && Array.isArray(payload.alerts)) {
          setAlerts(payload.alerts);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  if (!isToday(selectedDate) || alerts.length === 0) return null;

  const visible = alerts.filter((alert) => patientNameById[alert.patientId]);
  if (visible.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Droplets className="h-4 w-4" />
        </span>
        Hidratação ({visible.length})
      </h4>
      <div className="space-y-2">
        {visible.map((alert) => (
          <div key={alert.id} className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2.5">
            <p className="text-sm font-semibold text-gray-900">
              {patientNameById[alert.patientId] || 'Paciente'}
            </p>
            <p className="text-sm font-medium text-sky-900">{alert.copy.title}</p>
            <p className="mt-0.5 text-xs text-gray-600">{alert.copy.body}</p>
            {onOpenPatient ? (
              <button
                type="button"
                onClick={() => onOpenPatient(alert.patientId)}
                className="mt-2 text-xs font-semibold text-sky-800 hover:underline"
              >
                Ver hidratação
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
