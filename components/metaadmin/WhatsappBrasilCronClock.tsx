'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  formatBrasilClock,
  formatBrasilDateLabel,
  getBrasilDateTimeParts,
  horarioConfiguradoJaPassou,
} from '@/lib/time/brasilTimezone';

export type WhatsappBrasilClockDto = {
  timezone: string;
  timezoneLabel: string;
  dateKey: string;
  hhmm: string;
  configuredHorario: string;
  envioLiberado: boolean;
  cronVerifica: string;
};

type Props = {
  configuredHorario: string;
  autoEnabled: boolean;
  serverClock?: WhatsappBrasilClockDto | null;
};

export default function WhatsappBrasilCronClock({
  configuredHorario,
  autoEnabled,
  serverClock,
}: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const clientBrasil = useMemo(() => {
    void tick;
    return getBrasilDateTimeParts();
  }, [tick]);

  const clientClock = useMemo(() => {
    void tick;
    return formatBrasilClock();
  }, [tick]);

  const horario = configuredHorario.trim() || serverClock?.configuredHorario || '08:00';
  const envioLiberado = horarioConfiguradoJaPassou(clientBrasil.hhmm, horario);
  const serverMatchesClient =
    !serverClock || serverClock.hhmm === clientBrasil.hhmm;

  const deviceHhmm = useMemo(() => {
    void tick;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, [tick]);

  const deviceDiffersFromBrasil = deviceHhmm !== clientBrasil.hhmm;

  return (
    <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-800/80 dark:text-violet-300/80 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Relógio do cron · Brasília
        </span>
        {autoEnabled ? (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              envioLiberado
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
            }`}
          >
            {envioLiberado ? 'Janela aberta' : 'Aguardando horário'}
          </span>
        ) : null}
      </div>

      <p className="font-mono text-2xl font-bold tabular-nums text-violet-950 dark:text-violet-50 tracking-tight">
        {clientClock}
      </p>

      <div className="text-xs text-violet-900/70 dark:text-violet-200/70 space-y-1">
        <p>
          {formatBrasilDateLabel(clientBrasil.dateKey)} · O cron usa este fuso ({serverClock?.cronVerifica ?? 'a cada 1 minuto'})
        </p>
        {serverClock ? (
          <p>
            Servidor (última sync): <span className="font-mono font-medium">{serverClock.hhmm}</span>
            {!serverMatchesClient ? (
              <span className="text-amber-700 dark:text-amber-300"> · difere do relógio acima — aguarde sync</span>
            ) : null}
          </p>
        ) : null}
        {deviceDiffersFromBrasil ? (
          <p className="text-amber-800 dark:text-amber-200">
            Seu dispositivo: <span className="font-mono">{deviceHhmm}</span> — configure o lembrete pela hora de{' '}
            <strong>Brasília</strong>, não pela hora local do celular/PC.
          </p>
        ) : null}
        <p>
          Envio automático após <span className="font-mono font-semibold">{horario}</span> (Brasília), 1 paciente por
          minuto. Só roda em produção (www.oftware.com.br).
        </p>
      </div>
    </div>
  );
}
