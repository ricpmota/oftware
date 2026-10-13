'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  Loader2,
  MessageCircle,
  Save,
  Send,
  Settings2,
  User,
  UserRound,
} from 'lucide-react';
import WhiteLabelGoogleCalendarConnect from '@/components/metaadmingeral/WhiteLabelGoogleCalendarConnect';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { DEFAULT_PHONE_COUNTRY, DEFAULT_PHONE_DDI } from '@/lib/phone/callingCountries';
import {
  isValidIdentificacaoPhone,
  persistedPhoneForIdentificacao,
  type PersistedInternationalPhone,
} from '@/lib/phone/internationalPhoneValue';
import {
  buildWhiteLabelMeetingAvisoResponsavelMessage,
  buildWhiteLabelMeetingConfirmacaoLeadMessage,
} from '@/lib/whiteLabel/buildWhiteLabelMeetingWhatsAppMessages';
import {
  WHITELABEL_ALLOWED_DAYS_OPTIONS,
  WHITELABEL_BUFFER_OPTIONS,
  WHITELABEL_DURATION_OPTIONS,
  type WhiteLabelAgendaSettings,
} from '@/types/whiteLabelAgenda';

async function authFetch(url: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

const inputCls =
  'w-full bg-[#0A1F44] border border-white/20 rounded-lg px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:border-[#4CCB7A]/60';

type WhatsappSenderStatus = {
  email: string;
  doctorId: string | null;
  status: string;
  phone: string | null;
  profileName: string | null;
};

const DEFAULT_TEST_LEAD_PHONE: PersistedInternationalPhone = {
  telefone: '',
  telefoneDdi: DEFAULT_PHONE_DDI,
  telefonePais: DEFAULT_PHONE_COUNTRY,
};

export default function WhiteLabelAgendaSettingsPanel() {
  const [settings, setSettings] = useState<WhiteLabelAgendaSettings | null>(null);
  const [sender, setSender] = useState<WhatsappSenderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'lead' | 'responsavel' | null>(null);
  const [testLeadPhone, setTestLeadPhone] = useState<PersistedInternationalPhone>(DEFAULT_TEST_LEAD_PHONE);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/settings');
      const data = (await res.json()) as {
        settings?: WhiteLabelAgendaSettings;
        whatsappSender?: WhatsappSenderStatus;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar.');
      setSettings(data.settings || null);
      setSender(data.whatsappSender || null);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const previewLead = useMemo(
    () =>
      buildWhiteLabelMeetingConfirmacaoLeadMessage({
        leadNome: 'Maria Silva',
        leadEmail: 'maria@email.com',
        leadWhatsapp: '5511999999999',
        profissao: 'medico',
        date: new Date().toISOString().slice(0, 10),
        startTime: '10:00',
        endTime: '11:00',
        googleMeetLink: 'https://meet.google.com/abc-defg-hij',
      }),
    []
  );

  const previewResponsavel = useMemo(
    () =>
      buildWhiteLabelMeetingAvisoResponsavelMessage({
        leadNome: 'Maria Silva',
        leadEmail: 'maria@email.com',
        leadWhatsapp: '5511999999999',
        profissao: 'medico',
        date: new Date().toISOString().slice(0, 10),
        startTime: '10:00',
        endTime: '11:00',
        googleMeetLink: 'https://meet.google.com/abc-defg-hij',
      }),
    []
  );

  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as { error?: string; settings?: WhiteLabelAgendaSettings };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setSettings(data.settings || settings);
      setMessage({
        type: 'ok',
        text: 'Configurações salvas. Alertas de WhatsApp ativos para lead e responsável conforme marcado.',
      });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [load, settings]);

  const testSend = useCallback(
    async (target: 'lead' | 'responsavel') => {
      if (!settings) return;
      setTesting(target);
      setMessage(null);
      try {
        const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/whatsapp-test', {
          method: 'POST',
          body: JSON.stringify(
            target === 'lead'
              ? {
                  target,
                  telefone: testLeadPhone.telefone,
                  telefoneDdi: testLeadPhone.telefoneDdi,
                  telefonePais: testLeadPhone.telefonePais,
                }
              : {
                  target,
                  phone: settings.whatsappResponsavelPhone,
                }
          ),
        });
        const data = (await res.json()) as { error?: string; message?: string };
        if (!res.ok) throw new Error(data.error || 'Falha no teste.');
        setMessage({ type: 'ok', text: data.message || 'Teste enviado.' });
      } catch (err) {
        setMessage({ type: 'err', text: (err as Error).message });
      } finally {
        setTesting(null);
      }
    },
    [settings, testLeadPhone]
  );

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 animate-spin text-[#4CCB7A]" />
      </div>
    );
  }

  const whatsappConnected = sender?.status === 'connected';
  const leadPhoneValid = isValidIdentificacaoPhone(testLeadPhone);
  const leadTestEnabled =
    settings.whatsappConfirmacaoEnabled && settings.whatsappNotifyLead;

  return (
    <div className="space-y-4">
      <WhiteLabelGoogleCalendarConnect />

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#4CCB7A]" />
          <div>
            <h3 className="text-lg font-bold text-[#E8EDED]">Configurações da Agenda White Label</h3>
            <p className="text-sm text-[#E8EDED]/60">Define como os horários são gerados automaticamente</p>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              message.type === 'ok'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-300 border border-red-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#E8EDED]/50 mb-1">Duração padrão da reunião</label>
            <select
              value={settings.defaultDurationMinutes}
              onChange={(e) =>
                setSettings(
                  (s) =>
                    s && {
                      ...s,
                      defaultDurationMinutes: Number(
                        e.target.value
                      ) as WhiteLabelAgendaSettings['defaultDurationMinutes'],
                    }
                )
              }
              className={inputCls}
            >
              {WHITELABEL_DURATION_OPTIONS.map((v) => (
                <option key={v} value={v} style={{ backgroundColor: '#0A1F44' }}>
                  {v} min
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#E8EDED]/50 mb-1">Buffer entre reuniões</label>
            <select
              value={settings.bufferMinutes}
              onChange={(e) =>
                setSettings(
                  (s) =>
                    s && {
                      ...s,
                      bufferMinutes: Number(e.target.value) as WhiteLabelAgendaSettings['bufferMinutes'],
                    }
                )
              }
              className={inputCls}
            >
              {WHITELABEL_BUFFER_OPTIONS.map((v) => (
                <option key={v} value={v} style={{ backgroundColor: '#0A1F44' }}>
                  {v} min
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#E8EDED]/50 mb-1">Antecedência mínima (horas)</label>
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
            <label className="block text-xs text-[#E8EDED]/50 mb-1">Antecedência máxima (dias)</label>
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
            <label className="block text-xs text-[#E8EDED]/50 mb-1">Dias permitidos</label>
            <select
              value={settings.allowedDaysMode}
              onChange={(e) =>
                setSettings(
                  (s) =>
                    s && {
                      ...s,
                      allowedDaysMode: e.target.value as WhiteLabelAgendaSettings['allowedDaysMode'],
                    }
                )
              }
              className={inputCls}
            >
              {WHITELABEL_ALLOWED_DAYS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0A1F44' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-[#E8EDED]/80 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.slotGenerationEnabled}
                onChange={(e) => setSettings((s) => s && { ...s, slotGenerationEnabled: e.target.checked })}
                className="rounded border-white/30 bg-[#0A1F44] text-[#4CCB7A]"
              />
              Gerar slots automaticamente pelas regras recorrentes
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#4CCB7A]" />
            <div>
              <h3 className="text-lg font-bold text-[#E8EDED]">Alertas de envio por WhatsApp</h3>
              <p className="text-sm text-[#E8EDED]/60">
                Ao confirmar o horário, dispara automaticamente para quem se cadastrou e para você
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
              whatsappConnected
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {whatsappConnected
              ? `WhatsApp remetente conectado${sender?.phone ? ` · ${sender.phone}` : ''}`
              : 'WhatsApp remetente desconectado — conecte no MetaAdmin'}
          </span>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-[#E8EDED]/80 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.whatsappConfirmacaoEnabled}
            onChange={(e) =>
              setSettings((s) => s && { ...s, whatsappConfirmacaoEnabled: e.target.checked })
            }
            className="rounded border-white/30 bg-[#0A1F44] text-[#4CCB7A]"
          />
          Ativar alertas automáticos de confirmação
        </label>

        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">
            E-mail do médico remetente (sessão WhatsApp no MetaAdmin)
          </label>
          <input
            type="email"
            value={settings.whatsappSenderDoctorEmail}
            disabled={!settings.whatsappConfirmacaoEnabled}
            onChange={(e) =>
              setSettings((s) => s && { ...s, whatsappSenderDoctorEmail: e.target.value })
            }
            placeholder="ricpmota.med@gmail.com"
            className={`${inputCls} disabled:opacity-50 max-w-xl`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Alerta: quem se cadastrou */}
          <div
            className={`rounded-xl border p-4 space-y-3 ${
              settings.whatsappConfirmacaoEnabled && settings.whatsappNotifyLead
                ? 'border-[#4CCB7A]/40 bg-[#4CCB7A]/5'
                : 'border-white/10 bg-white/5 opacity-70'
            }`}
          >
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-[#4CCB7A] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-[#E8EDED]">Alerta para quem se cadastrou</h4>
                <p className="text-xs text-[#E8EDED]/50 mt-0.5">
                  Confirmação com data, horário e link do Meet no WhatsApp do lead
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-[#E8EDED]/80 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.whatsappNotifyLead}
                disabled={!settings.whatsappConfirmacaoEnabled}
                onChange={(e) => setSettings((s) => s && { ...s, whatsappNotifyLead: e.target.checked })}
                className="rounded border-white/30 bg-[#0A1F44] text-[#4CCB7A] disabled:opacity-40"
              />
              Enviar confirmação ao lead
            </label>

            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#E8EDED]/70 bg-[#0A1F44]/60 border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto">
              {previewLead}
            </pre>

            <div className="flex flex-col gap-2">
              <InternationalPhoneInput
                id="whitelabel-agenda-test-lead-phone"
                variant="dark"
                value={testLeadPhone}
                onChange={(next) => setTestLeadPhone(persistedPhoneForIdentificacao(next))}
                disabled={!leadTestEnabled}
              />
              <button
                type="button"
                disabled={
                  saving ||
                  testing !== null ||
                  !leadTestEnabled ||
                  !leadPhoneValid
                }
                onClick={() => void testSend('lead')}
                className="inline-flex items-center justify-center gap-1.5 shrink-0 px-3 py-2 rounded-lg border border-white/15 text-xs font-semibold text-[#E8EDED] hover:bg-white/10 disabled:opacity-40"
              >
                {testing === 'lead' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Testar lead
              </button>
            </div>
          </div>

          {/* Alerta: responsável (você) */}
          <div
            className={`rounded-xl border p-4 space-y-3 ${
              settings.whatsappConfirmacaoEnabled && settings.whatsappNotifyResponsavel
                ? 'border-[#4CCB7A]/40 bg-[#4CCB7A]/5'
                : 'border-white/10 bg-white/5 opacity-70'
            }`}
          >
            <div className="flex items-start gap-2">
              <UserRound className="w-4 h-4 text-[#4CCB7A] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-[#E8EDED]">Alerta para você (responsável)</h4>
                <p className="text-xs text-[#E8EDED]/50 mt-0.5">
                  Aviso interno com dados do lead e do horário agendado
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-[#E8EDED]/80 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.whatsappNotifyResponsavel}
                disabled={!settings.whatsappConfirmacaoEnabled}
                onChange={(e) =>
                  setSettings((s) => s && { ...s, whatsappNotifyResponsavel: e.target.checked })
                }
                className="rounded border-white/30 bg-[#0A1F44] text-[#4CCB7A] disabled:opacity-40"
              />
              Enviar aviso para mim
            </label>

            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                value={settings.whatsappResponsavelNome}
                disabled={!settings.whatsappConfirmacaoEnabled}
                onChange={(e) =>
                  setSettings((s) => s && { ...s, whatsappResponsavelNome: e.target.value })
                }
                placeholder="Nome"
                className={`${inputCls} disabled:opacity-50`}
              />
              <input
                type="email"
                value={settings.whatsappResponsavelEmail}
                disabled={!settings.whatsappConfirmacaoEnabled}
                onChange={(e) =>
                  setSettings((s) => s && { ...s, whatsappResponsavelEmail: e.target.value })
                }
                placeholder="E-mail"
                className={`${inputCls} disabled:opacity-50`}
              />
              <input
                type="tel"
                value={settings.whatsappResponsavelPhone}
                disabled={!settings.whatsappConfirmacaoEnabled}
                onChange={(e) =>
                  setSettings((s) => s && { ...s, whatsappResponsavelPhone: e.target.value })
                }
                placeholder="WhatsApp (83988192848)"
                className={`${inputCls} disabled:opacity-50`}
              />
            </div>

            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#E8EDED]/70 bg-[#0A1F44]/60 border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto">
              {previewResponsavel}
            </pre>

            <button
              type="button"
              disabled={
                saving ||
                testing !== null ||
                !settings.whatsappConfirmacaoEnabled ||
                !settings.whatsappNotifyResponsavel ||
                !settings.whatsappResponsavelPhone.trim()
              }
              onClick={() => void testSend('responsavel')}
              className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-white/15 text-xs font-semibold text-[#E8EDED] hover:bg-white/10 disabled:opacity-40"
            >
              {testing === 'responsavel' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Testar envio para mim ({settings.whatsappResponsavelPhone || 'sem número'})
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm hover:bg-[#45b86d] disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar configurações
      </button>
    </div>
  );
}
