'use client';

import CalendarioWhatsAppAplicacaoIcon from '@/components/metaadmin/CalendarioWhatsAppAplicacaoIcon';
import CalendarioPacienteAuthAvatar from '@/components/metaadmin/CalendarioPacienteAuthAvatar';
import type { WeeklyNutritionCheckInCalendarItem } from '@/components/nutri/checkin-semanal/useWeeklyNutritionCheckInCalendar';
import type { NutriCheckInEnvioInfo } from '@/lib/nutri/checkInSemanalNutriWhatsApp';
import { resolveWeeklyNutritionCheckInCardActions } from '@/lib/nutri/checkInSemanalNutriOperational';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';

type Props = {
  slot: WeeklyNutritionCheckInCalendarItem;
  todayYmd: string;
  envio?: NutriCheckInEnvioInfo;
  calD: boolean;
  isMobile: boolean;
  whatsappBusy: boolean;
  onOpen: () => void;
  onWhatsApp: () => void;
  photoUrl?: string | null;
};

function nomeExibicaoCardMobile(nome: string): string {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  const partes = limpo.split(' ').filter(Boolean);
  if (partes.length <= 2 || limpo.length <= 18) return limpo;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function envioLabel(envio: NutriCheckInEnvioInfo | undefined, scheduledTime: string): string {
  if (envio?.status === 'sent') {
    const hora = envio.sentAt ? getBrasilDateTimeParts(new Date(envio.sentAt)).hhmm : null;
    return hora ? `Mensagem enviada às ${hora}` : 'Mensagem enviada';
  }
  if (envio?.status === 'failed') return 'Falha no envio da mensagem';
  if (scheduledTime) return `Mensagem não enviada · prevista às ${scheduledTime}`;
  return 'Mensagem não enviada';
}

export default function MetaadminCalendarioCheckInCard({
  slot,
  todayYmd,
  envio,
  calD,
  isMobile,
  whatsappBusy,
  onOpen,
  onWhatsApp,
  photoUrl,
}: Props) {
  const done = slot.status === 'completed';
  const actions = resolveWeeklyNutritionCheckInCardActions({
    status: slot.status,
    scheduledDate: slot.scheduledDate,
    todayYmd,
    weekKey: slot.weekKey,
    hasPhone: Boolean(slot.phoneDigits),
    envio: envio?.status,
  });
  const iconSizeClass = isMobile
    ? 'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md p-1.5'
    : 'inline-flex items-center justify-center rounded-lg p-2';
  const iconEnabled = calD
    ? `${iconSizeClass} text-[#E8EDED] hover:bg-white/10`
    : `${iconSizeClass} text-teal-700 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/40`;
  const iconDisabled = calD
    ? `${iconSizeClass} text-[#E8EDED]/40`
    : `${iconSizeClass} text-gray-400 dark:text-gray-500`;

  return (
    <div
      className={`flex items-stretch gap-1 rounded-lg border text-sm ${
        calD ? 'border-[#2F8FA3] bg-[#0A1F44]' : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50'
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4CCB7A]/60"
        title="Abrir Evolução Nutricional do paciente"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <CalendarioPacienteAuthAvatar
              name={slot.patientName || 'Paciente'}
              photoUrl={photoUrl}
              compact={isMobile}
            />
            <span
              className={`min-w-0 truncate font-medium ${calD ? 'text-[#E8EDED]' : 'text-gray-800 dark:text-gray-100'}`}
              title={
                isMobile && nomeExibicaoCardMobile(slot.patientName) !== slot.patientName
                  ? slot.patientName
                  : undefined
              }
            >
              {isMobile ? nomeExibicaoCardMobile(slot.patientName) : slot.patientName}
            </span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              done
                ? calD
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-100 text-emerald-800'
                : calD
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {done ? 'Respondido' : 'Pendente'}
          </span>
        </span>
        <span className={`mt-1 block text-[11px] ${calD ? 'text-[#E8EDED]/70' : 'text-gray-600 dark:text-gray-400'}`}>
          {envioLabel(envio, slot.scheduledTime)}
        </span>
      </button>
      <div className="flex shrink-0 items-center pr-1.5">
        <CalendarioWhatsAppAplicacaoIcon
          loading={whatsappBusy}
          autoEnabled={false}
          autoSent={envio?.status === 'sent'}
          autoFailed={envio?.status === 'failed'}
          isMobile={isMobile}
          disabled={!actions.canMessage}
          title={actions.messageTitle}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!actions.canMessage) return;
            onWhatsApp();
          }}
          className={actions.canMessage ? iconEnabled : iconDisabled}
        />
      </div>
    </div>
  );
}
