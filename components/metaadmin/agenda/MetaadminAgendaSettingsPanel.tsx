'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, MessageCircle, Bell, Save, Settings2 } from 'lucide-react';
import { medicoAgendaAuthFetch } from '@/lib/metaadmin/agenda/medicoAgendaAuthFetch';
import { weekdaysFromRecurringRules } from '@/lib/nutri/agenda/recurringWeekdays';
import { normalizeMedicoConfirmacaoTemplate } from '@/lib/metaadmin/agenda/welcomeMessage';
import {
  WHITELABEL_BUFFER_OPTIONS,
  WHITELABEL_DURATION_OPTIONS,
  WHITELABEL_WEEKDAYS,
  type WhiteLabelAvailabilityRule,
} from '@/types/whiteLabelAgenda';
import {
  MEDICO_CONSULTA_DATA_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER,
  MEDICO_CONSULTA_REMINDER_OPTIONS,
  type MedicoAgendaSettings,
  type MedicoConsultaReminderAviso,
} from '@/types/medicoAgenda';

const inputCls =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500';

export default function MetaadminAgendaSettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const [settings, setSettings] = useState<MedicoAgendaSettings | null>(null);
  const [allowedWeekdays, setAllowedWeekdays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, rulesRes] = await Promise.all([
        medicoAgendaAuthFetch('/api/metaadmin/agenda/settings'),
        medicoAgendaAuthFetch('/api/metaadmin/agenda/rules'),
      ]);
      const data = (await settingsRes.json()) as { settings?: MedicoAgendaSettings; error?: string };
      if (!settingsRes.ok) throw new Error(data.error || 'Falha ao carregar.');
      setSettings(data.settings || null);

      const rulesData = (await rulesRes.json()) as { rules?: WhiteLabelAvailabilityRule[]; error?: string };
      if (rulesRes.ok) {
        setAllowedWeekdays(weekdaysFromRecurringRules(rulesData.rules || []));
      }
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await medicoAgendaAuthFetch('/api/metaadmin/agenda/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          defaultDurationMinutes: settings.defaultDurationMinutes,
          bufferMinutes: settings.bufferMinutes,
          minAdvanceHours: settings.minAdvanceHours,
          maxAdvanceDays: settings.maxAdvanceDays,
          slotGenerationEnabled: settings.slotGenerationEnabled,
          welcomeMessageTemplate: normalizeMedicoConfirmacaoTemplate(settings.welcomeMessageTemplate),
          consultaReminderAviso: settings.consultaReminderAviso,
        }),
      });
      const data = (await res.json()) as { settings?: MedicoAgendaSettings; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setSettings(data.settings || settings);
      setMessage({ type: 'ok', text: 'Configurações salvas.' });
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 animate-spin text-green-600" />
      </div>
    );
  }

  const consultaReminderAviso = settings.consultaReminderAviso || '30_min_antes';

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
            <Settings2 className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900">Agenda de consultas</h3>
            <p className="text-sm text-gray-500">Duração, antecedência e geração automática de horários</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duração padrão</label>
            <select
              value={settings.defaultDurationMinutes}
              onChange={(e) =>
                setSettings((s) => s && { ...s, defaultDurationMinutes: Number(e.target.value) as 15 | 30 | 45 | 60 })
              }
              className={inputCls}
            >
              {WHITELABEL_DURATION_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Intervalo entre horários</label>
            <select
              value={settings.bufferMinutes}
              onChange={(e) =>
                setSettings((s) => s && { ...s, bufferMinutes: Number(e.target.value) as 0 | 5 | 10 | 15 | 30 })
              }
              className={inputCls}
            >
              {WHITELABEL_BUFFER_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Antecedência mínima (horas)</label>
            <input
              type="number"
              min={0}
              max={168}
              value={settings.minAdvanceHours}
              onChange={(e) => setSettings((s) => s && { ...s, minAdvanceHours: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Antecedência máxima (dias)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={settings.maxAdvanceDays}
              onChange={(e) => setSettings((s) => s && { ...s, maxAdvanceDays: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dias permitidos</label>
            <div className="flex flex-wrap gap-1.5 min-h-[42px] items-center">
              {WHITELABEL_WEEKDAYS.map((day) => {
                const active = allowedWeekdays.includes(day.weekday);
                return (
                  <span
                    key={day.weekday}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                      active
                        ? 'border-green-600 bg-green-50 text-green-800'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                    }`}
                  >
                    {day.short}
                  </span>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">
              {allowedWeekdays.length > 0
                ? 'Vêm da aba Recorrente — só esses dias geram horário automático.'
                : 'Nenhum dia com horário na aba Recorrente. Configure lá os dias e períodos.'}
            </p>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.slotGenerationEnabled}
                onChange={(e) => setSettings((s) => s && { ...s, slotGenerationEnabled: e.target.checked })}
                className="rounded border-gray-300 text-green-600"
              />
              Gerar horários automaticamente pelas regras recorrentes
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
            <Bell className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900">Alerta da consulta</h3>
            <p className="text-sm text-gray-500">
              Quando um paciente agendar, o Canal Chat avisa você. O paciente recebe a confirmação na
              hora e um lembrete 30 minutos antes, pelo seu WhatsApp conectado.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {MEDICO_CONSULTA_REMINDER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                consultaReminderAviso === option.value
                  ? 'border-green-500 bg-green-50 text-green-900'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="consultaReminderAviso"
                value={option.value}
                checked={consultaReminderAviso === option.value}
                onChange={() =>
                  setSettings(
                    (s) =>
                      s && {
                        ...s,
                        consultaReminderAviso: option.value as MedicoConsultaReminderAviso,
                      }
                  )
                }
                className="mt-0.5 accent-green-600"
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-gray-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          O alerta para você vai ao telefone do perfil (Canal Chat Oftware). A confirmação e o
          lembrete de 30 minutos do paciente saem do WhatsApp conectado do médico.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
            <MessageCircle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900">Mensagem de Confirmação de Agendamento</h3>
            <p className="text-sm text-gray-500">
              Enviada no WhatsApp do paciente quando ele confirma um horário na sua agenda.
            </p>
          </div>
        </div>

        <textarea
          value={settings.welcomeMessageTemplate}
          onChange={(e) => setSettings((s) => s && { ...s, welcomeMessageTemplate: e.target.value })}
          rows={12}
          className={`${inputCls} font-mono text-xs leading-relaxed`}
        />

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold inline-flex items-center gap-1.5">
            <Lock className="w-4 h-4" />
            Placeholders disponíveis
          </p>
          <p className="mt-1 font-mono text-xs break-all">
            {MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER} · {MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER} ·{' '}
            {MEDICO_CONSULTA_DATA_PLACEHOLDER} · {MEDICO_CONSULTA_HORARIO_PLACEHOLDER}
          </p>
          <p className="mt-1 text-xs text-amber-800/80">
            A data e o horário da consulta escolhida pelo paciente entram automaticamente nesses campos.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 ${
          embedded ? 'w-full sm:w-auto' : ''
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar configurações
      </button>
    </div>
  );
}
