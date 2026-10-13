'use client';

import { ClipboardList, History } from 'lucide-react';
import {
  compactWeeklyNutritionAttentionFlags,
  getWeeklyCheckInDelay,
  getWeeklyCheckInScheduledAt,
  resolveWeeklyNutritionCheckInCardActions,
  resolveWeeklyNutritionCheckInOperationalStatus,
} from '@/lib/nutri/checkInSemanalNutriOperational';
import { compareWeeklyNutritionCheckIns, getWeeklyNutritionCheckInFlags } from '@/lib/nutri/checkInSemanalNutriFlags';
import { NUTRI_WEEKDAY_LABELS, type NutriWeekdaySunday0 } from '@/lib/nutri/checkInSemanalNutriSchedule';
import { formatNutritionWeekShortLabel, getNutritionWeek, parseNutritionYmdLocal } from '@/lib/nutri/checkInSemanalNutriWeek';
import type { WeeklyNutritionCheckInCalendarItem } from '@/components/nutri/checkin-semanal/useWeeklyNutritionCheckInCalendar';
import CalendarioWhatsAppAplicacaoIcon from '@/components/metaadmin/CalendarioWhatsAppAplicacaoIcon';

type WhatsAppBadge = 'pending' | 'sent' | 'failed' | 'skipped';

type Props = {
  slot: WeeklyNutritionCheckInCalendarItem;
  todayYmd: string;
  now?: Date;
  isMobile: boolean;
  envio?: WhatsAppBadge;
  autoEnabled: boolean;
  whatsappBusy: boolean;
  onOpenPatient?: () => void;
  onFill: () => void;
  onView: () => void;
  onHistory: () => void;
  onWhatsApp: () => void;
};

function nomeExibicaoCardMobile(nome: string): string {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  const partes = limpo.split(' ').filter(Boolean);
  if (partes.length <= 2 || limpo.length <= 18) return limpo;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function formatDelta(delta: number | null, suffix = ''): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  return `${delta > 0 ? '↑' : '↓'} ${sign}${delta}${suffix}`;
}

export function WeeklyNutritionCheckInOperationalCard({
  slot,
  todayYmd,
  now,
  isMobile,
  envio,
  autoEnabled,
  whatsappBusy,
  onOpenPatient,
  onFill,
  onView,
  onHistory,
  onWhatsApp,
}: Props) {
  const completed = slot.status === 'completed';
  const operational = resolveWeeklyNutritionCheckInOperationalStatus({
    hasRecord: completed,
    scheduledDate: slot.scheduledDate,
    todayYmd,
  });
  const actions = resolveWeeklyNutritionCheckInCardActions({
    status: slot.status,
    scheduledDate: slot.scheduledDate,
    weekKey: slot.weekKey,
    todayYmd,
    hasPhone: Boolean(slot.phoneDigits),
    autoEnabled,
    envio,
  });
  const weekday = parseNutritionYmdLocal(slot.scheduledDate).getDay() as NutriWeekdaySunday0;
  const week = getNutritionWeek(slot.weekStart);
  const scheduledAt = getWeeklyCheckInScheduledAt(slot.scheduledDate, slot.scheduledTime);
  const delay =
    !completed && scheduledAt.getTime() < (now ?? new Date()).getTime()
      ? getWeeklyCheckInDelay(scheduledAt, now)
      : null;
  const flags = completed && slot.record ? getWeeklyNutritionCheckInFlags(slot.record) : [];
  const compact = compactWeeklyNutritionAttentionFlags(flags, 3);
  const comparison =
    completed && slot.record
      ? compareWeeklyNutritionCheckIns(slot.record, slot.previousRecord)
      : null;
  const scoreDelta = formatDelta(comparison?.score.delta ?? null);
  const aderenciaDelta = formatDelta(comparison?.aderencia.delta ?? null, '%');
  const iconSize = isMobile ? 16 : 18;
  const actionCls = isMobile
    ? 'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md p-1.5 text-gray-700 hover:bg-black/5'
    : operational === 'completed'
      ? 'inline-flex items-center justify-center rounded-lg p-2 text-green-700 hover:bg-green-200/80 transition-colors'
      : operational === 'upcoming'
        ? 'inline-flex items-center justify-center rounded-lg p-2 text-orange-700 hover:bg-orange-200/80 transition-colors'
        : 'inline-flex items-center justify-center rounded-lg p-2 text-red-700 hover:bg-red-200/80 transition-colors';
  const disabledCls = isMobile
    ? 'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md p-1.5 text-gray-400'
    : 'inline-flex items-center justify-center rounded-lg p-2 text-gray-400 bg-black/5 cursor-default';

  const cardStyle =
    operational === 'completed'
      ? {
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)',
          border: '1px solid #86efac',
          borderLeft: `${isMobile ? 3 : 4}px solid #16a34a`,
        }
      : operational === 'upcoming'
        ? {
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)',
            border: '1px solid #fdba74',
            borderLeft: `${isMobile ? 3 : 4}px solid #ea580c`,
          }
        : {
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
            border: '1px solid #fca5a5',
            borderLeft: `${isMobile ? 3 : 4}px solid #dc2626`,
          };

  const nameClass = 'text-sm font-semibold text-gray-900 text-left hover:underline min-w-0 truncate';
  const nomeCompleto = slot.patientName || 'Paciente';
  const nomeVisivel = isMobile ? nomeExibicaoCardMobile(nomeCompleto) : nomeCompleto;

  return (
    <div
      className={
        isMobile
          ? `rounded-lg p-2.5 shadow-sm ${completed ? 'cursor-pointer' : ''}`
          : `rounded-xl p-3 transition-all hover:shadow-md ${completed ? 'cursor-pointer' : ''}`
      }
      style={cardStyle}
      onClick={completed ? onView : undefined}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {onOpenPatient ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenPatient();
              }}
              className={nameClass}
              title={nomeVisivel === nomeCompleto ? 'Abrir paciente' : nomeCompleto}
            >
              {completed ? `✓ ${nomeVisivel}` : nomeVisivel}
            </button>
          ) : (
            <p className="truncate text-sm font-semibold text-gray-900" title={nomeVisivel === nomeCompleto ? undefined : nomeCompleto}>
              {completed ? `✓ ${nomeVisivel}` : nomeVisivel}
            </p>
          )}
          <p className="mt-0.5 text-xs font-medium text-gray-700">
            {operational === 'overdue' ? 'Check-in atrasado' : 'Check-in Semanal'}
          </p>
        </div>
        <div
          className={`flex shrink-0 items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}
          onClick={(event) => event.stopPropagation()}
        >
          {actions.canFill ? (
            <button
              type="button"
              onClick={onFill}
              className={actionCls}
              title={actions.fillTitle}
              aria-label={actions.fillTitle}
            >
              <ClipboardList size={iconSize} />
            </button>
          ) : (
            <span className={disabledCls} title={actions.fillTitle} aria-label={actions.fillTitle}>
              <ClipboardList size={iconSize} />
            </span>
          )}
          <CalendarioWhatsAppAplicacaoIcon
            loading={whatsappBusy}
            autoEnabled={autoEnabled}
            autoSent={envio === 'sent'}
            autoFailed={envio === 'failed'}
            isMobile={isMobile}
            disabled={!actions.canMessage}
            title={actions.messageTitle}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!actions.canMessage) return;
              onWhatsApp();
            }}
            className={actions.canMessage ? actionCls : disabledCls}
          />
          <button
            type="button"
            onClick={onHistory}
            className={actionCls}
            title={actions.historyTitle}
            aria-label={actions.historyTitle}
          >
            <History size={iconSize} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        {completed
          ? `Semana ${formatNutritionWeekShortLabel(week)}`
          : operational === 'overdue'
            ? `Programado: ${NUTRI_WEEKDAY_LABELS[weekday]} · ${slot.scheduledTime}`
            : `${NUTRI_WEEKDAY_LABELS[weekday]} · ${slot.scheduledTime}`}
      </p>

      {completed && slot.record ? (
        <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
          <div>
            <dt className="text-gray-500">Score</dt>
            <dd className="font-semibold tabular-nums">
              {slot.record.score ?? '—'}
              {scoreDelta ? (
                <span className={`ml-1 ${comparison?.score.delta && comparison.score.delta > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {scoreDelta}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Aderência</dt>
            <dd className="font-semibold tabular-nums">
              {slot.record.aderenciaPlano ?? '—'}%
              {aderenciaDelta ? (
                <span className={`ml-1 ${comparison?.aderencia.delta && comparison.aderencia.delta > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {aderenciaDelta}
                </span>
              ) : null}
            </dd>
          </div>
          {slot.record.diasProteinaMeta != null ? (
            <div>
              <dt className="text-gray-500">Proteína</dt>
              <dd className="font-semibold">{slot.record.diasProteinaMeta}/7</dd>
            </div>
          ) : null}
          {slot.record.diasMetaAgua != null ? (
            <div>
              <dt className="text-gray-500">Água</dt>
              <dd className="font-semibold">{slot.record.diasMetaAgua}/7</dd>
            </div>
          ) : null}
        </dl>
      ) : operational === 'upcoming' ? (
        <p className="mt-1 text-xs font-semibold text-gray-700">Programado</p>
      ) : (
        <p className="mt-1 text-xs font-semibold text-gray-700">Aguardando resposta</p>
      )}

      {operational === 'overdue' ? (
        <p className="mt-0.5 text-xs font-semibold text-red-800">{delay || 'Não respondido'}</p>
      ) : !completed && delay ? (
        <p className="mt-0.5 text-xs font-medium text-gray-600">{delay}</p>
      ) : null}

      {compact.shown.length > 0 ? (
        <div className="mt-2 rounded-lg bg-amber-50/90 px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Atenção</p>
          <p className="text-xs text-amber-950">
            {compact.shown.map((flag) => flag.label).join(' · ')}
            {compact.extra > 0 ? ` · +${compact.extra}` : ''}
          </p>
        </div>
      ) : null}

      {!completed && envio === 'sent' ? (
        <p className="mt-1 text-[11px] font-medium text-emerald-800">✓ WhatsApp enviado</p>
      ) : null}
      {!completed && envio === 'failed' ? (
        <p className="mt-1 text-[11px] font-medium text-red-800">Falha no WhatsApp</p>
      ) : null}
      {!completed && !slot.phoneDigits ? (
        <p className="mt-1 text-[11px] font-medium text-gray-600">Paciente sem WhatsApp cadastrado</p>
      ) : null}
    </div>
  );
}
