'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Cake,
  CheckCircle2,
  ClipboardList,
  Clock,
  Heart,
  Loader2,
  RefreshCw,
  Send,
  Zap,
} from 'lucide-react';
import { formatBrasilDateLabel } from '@/lib/time/brasilTimezone';
import type {
  WhatsappDailyAgendaDto,
  WhatsappDailyAgendaItemDto,
  WhatsappDailyAgendaKind,
} from '@/types/whatsappDailyAgenda';
import { whatsappDailyAgendaKindLabel } from '@/types/whatsappDailyAgenda';
import type { WhatsappMessageLogDto } from '@/types/whatsappMessageLog';

type Props = {
  disabled?: boolean;
  getAuthToken: () => Promise<string | null>;
  refreshKey?: number;
  /** Base das rotas WhatsApp (ex.: /api/metanutri/whatsapp). Default: metaadmin. */
  apiBasePath?: string;
};

type LogFilter =
  | 'todas'
  | 'aplicacao'
  | 'd1'
  | 'atrasada'
  | 'injetaveis'
  | 'aniversario'
  | 'conclusao'
  | 'lembretes'
  | 'financeiro'
  | 'boas_vindas';

const LOG_FILTERS: { id: LogFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'aplicacao', label: 'Aplicação' },
  { id: 'd1', label: 'D-1' },
  { id: 'atrasada', label: 'Atrasada' },
  { id: 'injetaveis', label: 'Injetáveis' },
  { id: 'aniversario', label: 'Aniversário' },
  { id: 'conclusao', label: 'Conclusão' },
  { id: 'lembretes', label: 'Lembretes' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'boas_vindas', label: 'Boas-vindas' },
];

function formatLogDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLogTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function dateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function capitalizeFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Rótulo do dia: "Hoje", "Ontem" ou data por extenso. */
function logDayHeading(dayKey: string, iso: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayKey === dateKeyLocal(today)) return 'Hoje';
  if (dayKey === dateKeyLocal(yesterday)) return 'Ontem';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return dayKey;
  return capitalizeFirst(
    date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  );
}

type LogDayGroup = {
  dayKey: string;
  heading: string;
  logs: WhatsappMessageLogDto[];
};

/** Agrupa os logs por dia, preservando a ordem (mais recente primeiro). */
function groupLogsByDay(logs: WhatsappMessageLogDto[]): LogDayGroup[] {
  const groups: LogDayGroup[] = [];
  const byKey = new Map<string, LogDayGroup>();

  for (const log of logs) {
    const date = new Date(log.sentAt);
    const dayKey = Number.isNaN(date.getTime()) ? 'sem-data' : dateKeyLocal(date);

    let group = byKey.get(dayKey);
    if (!group) {
      group = { dayKey, heading: logDayHeading(dayKey, log.sentAt), logs: [] };
      byKey.set(dayKey, group);
      groups.push(group);
    }
    group.logs.push(log);
  }

  return groups;
}

function formatAplicacaoData(dateKey?: string): string | null {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const AUTOMATION_LOG_TYPES: WhatsappMessageLogDto['type'][] = [
  'auto_aplicacao',
  'aplicacao_d1',
  'aplicacao_atrasada',
  'injetavel_dia',
  'injetavel_d1',
  'aniversario',
  'conclusao',
  'nutri_checkin',
  'calendario_lembrete',
];

/** Mapeia o chip de filtro para os tipos de log correspondentes (quando houver). */
const FILTER_LOG_TYPES: Partial<Record<LogFilter, WhatsappMessageLogDto['type'][]>> = {
  aplicacao: ['auto_aplicacao'],
  d1: ['aplicacao_d1'],
  atrasada: ['aplicacao_atrasada'],
  injetaveis: ['injetavel_dia', 'injetavel_d1'],
  aniversario: ['aniversario'],
  conclusao: ['conclusao'],
  lembretes: ['calendario_lembrete'],
};

const FILTER_AGENDA_KINDS: Partial<Record<LogFilter, WhatsappDailyAgendaKind[]>> = {
  aplicacao: ['aplicacao_dia'],
  d1: ['aplicacao_d1'],
  atrasada: ['aplicacao_atrasada'],
  injetaveis: ['injetavel_dia', 'injetavel_d1'],
  aniversario: ['aniversario'],
  conclusao: ['conclusao'],
  lembretes: ['calendario_lembrete'],
};

function isAutomationLog(type: WhatsappMessageLogDto['type']): boolean {
  return AUTOMATION_LOG_TYPES.includes(type);
}

function typeLabel(type: WhatsappMessageLogDto['type']): string {
  switch (type) {
    case 'auto_aplicacao':
      return 'Aplicação automática';
    case 'aplicacao_d1':
      return 'Lembrete D-1';
    case 'aplicacao_atrasada':
      return 'Aplicação atrasada';
    case 'injetavel_dia':
      return 'Injetável (dia)';
    case 'injetavel_d1':
      return 'Injetável D-1';
    case 'aniversario':
      return 'Aniversário';
    case 'conclusao':
      return 'Conclusão de tratamento';
    case 'nutri_checkin':
      return 'Check-in Semanal Nutri';
    case 'calendario_lembrete':
      return 'Lembrete do calendário';
    case 'compartilhamento_equipe':
      return 'Compartilhamento nutri/personal';
    case 'prontuario_consulta_nutri':
      return 'Consulta no prontuário (nutri)';
    case 'prontuario_consulta_personal':
      return 'Consulta no prontuário (personal)';
    case 'whitelabel_meeting':
      return 'Confirmação reunião WL';
    case 'financeiro_cobranca':
      return 'Cobrança financeira';
    case 'cobranca_automatica':
      return 'Cobrança automática';
    case 'boas_vindas_tratamento':
      return 'Boas-vindas ao tratamento';
    case 'solicitacao_acompanhamento':
      return 'Solicitação de acompanhamento';
    case 'cadastro_link':
      return 'Link de cadastro';
    case 'exames_laboratoriais':
      return 'Exames laboratoriais';
    case 'exames_imagem':
      return 'Exames de imagem';
    case 'bioimpedancia':
      return 'Bioimpedância';
    case 'plano_terapeutico':
      return 'Plano terapêutico';
    case 'cardapio_nutri':
      return 'Cardápio (nutri)';
    case 'orientacoes_nutri':
      return 'Orientações (nutri)';
    case 'treino_personal':
      return 'Treino (personal)';
    default:
      return 'Teste manual';
  }
}

function typeIcon(type: WhatsappMessageLogDto['type']) {
  switch (type) {
    case 'aplicacao_d1':
    case 'injetavel_d1':
      return Clock;
    case 'aplicacao_atrasada':
      return AlertCircle;
    case 'aniversario':
      return Cake;
    case 'boas_vindas_tratamento':
      return Heart;
    case 'conclusao':
    case 'exames_laboratoriais':
    case 'exames_imagem':
    case 'bioimpedancia':
    case 'plano_terapeutico':
    case 'cardapio_nutri':
    case 'orientacoes_nutri':
    case 'treino_personal':
    case 'prontuario_consulta_personal':
      return ClipboardList;
    case 'auto_aplicacao':
    case 'injetavel_dia':
    case 'nutri_checkin':
      return Zap;
    case 'calendario_lembrete':
    case 'whitelabel_meeting':
      return CalendarDays;
    default:
      return Send;
  }
}

function PainelStatusBadge({ status }: { status: WhatsappDailyAgendaItemDto['status'] }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Enviado
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 px-2.5 py-1 text-xs font-semibold">
        <AlertCircle className="h-3.5 w-3.5" />
        Falhou
      </span>
    );
  }
  if (status === 'pending' || status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-200 px-2.5 py-1 text-xs font-semibold">
        <Clock className="h-3.5 w-3.5" />
        {status === 'processing' ? 'Enviando' : 'Pendente'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 text-gray-700 dark:text-gray-300 px-2.5 py-1 text-xs font-semibold">
      <AlertCircle className="h-3.5 w-3.5" />
      Não enviado
    </span>
  );
}

export default function WhatsappMessageLogPanel({
  disabled,
  getAuthToken,
  refreshKey = 0,
  apiBasePath = '/api/metaadmin/whatsapp',
}: Props) {
  const logsBase = apiBasePath.replace(/\/$/, '');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WhatsappMessageLogDto[]>([]);
  const [agenda, setAgenda] = useState<WhatsappDailyAgendaDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogFilter>('todas');
  const [selectedDate, setSelectedDate] = useState<string>(() => dateKeyLocal(new Date()));
  const [forcingId, setForcingId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const res = await fetch(`${logsBase}/logs?limit=100&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        logs?: WhatsappMessageLogDto[];
        agenda?: WhatsappDailyAgendaDto;
      } | null;

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? 'Não foi possível carregar os logs.');
      }

      setLogs(data?.logs ?? []);
      setAgenda(data?.agenda ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar logs.';
      setError(message);
      setLogs([]);
      setAgenda(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, selectedDate, logsBase]);

  const forceCalendarioLembrete = useCallback(
    async (agendaItemId: string) => {
      const lembreteId = agendaItemId.startsWith('calendario_lembrete:')
        ? agendaItemId.slice('calendario_lembrete:'.length)
        : '';
      if (!lembreteId) return;

      setForcingId(agendaItemId);
      setError(null);
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão expirada. Faça login novamente.');

        const res = await fetch('/api/metaadmin/automacoes/whatsapp/calendario-lembretes/process', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ lembreteId }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          result?: { error?: string; status?: string };
        } | null;

        if (!res.ok || data?.ok === false) {
          throw new Error(
            data?.result?.error || data?.error || 'Não foi possível enviar o lembrete agora.',
          );
        }
        await loadLogs();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao enviar lembrete.');
      } finally {
        setForcingId(null);
      }
    },
    [getAuthToken, loadLogs],
  );

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshKey]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadLogs();
    }, 60_000);
    return () => clearInterval(id);
  }, [loadLogs]);

  const agendaDateLabel = agenda ? formatBrasilDateLabel(agenda.dateKey) : null;
  const isHoje = agenda ? agenda.dateKey === agenda.brasilDateKey : false;

  const agendaKindFilter = FILTER_AGENDA_KINDS[filter];
  const filteredAgendaItems =
    !agenda
      ? []
      : filter === 'todas'
        ? agenda.items
        : agendaKindFilter
          ? agenda.items.filter((item) => agendaKindFilter.includes(item.kind))
          : [];

  // Envio manual de teste foi descontinuado — não exibir na Central.
  const nonTestLogs = logs.filter((log) => log.type !== 'test');
  // Histórico limitado à janela recente carregada; filtra pela data escolhida no calendário.
  const dateScopedLogs = nonTestLogs.filter(
    (log) => dateKeyLocal(new Date(log.sentAt)) === selectedDate,
  );
  const filterLogTypes = FILTER_LOG_TYPES[filter];
  const filteredLogs =
    filter === 'todas'
      ? dateScopedLogs
      : filterLogTypes
        ? dateScopedLogs.filter((log) => filterLogTypes.includes(log.type))
        : []; // financeiro / boas-vindas: ainda sem registros
  const logDayGroups = groupLogsByDay(filteredLogs);
  const todayKey = dateKeyLocal(new Date());
  const showLiveAgenda = filter === 'todas' || Boolean(agendaKindFilter);
  const activatedLabels =
    agenda?.activatedKinds.map((kind) => whatsappDailyAgendaKindLabel(kind)).join(', ') ?? '';

  return (
    <div className="space-y-6">
      {/* Filtros por tipo de comunicação */}
      <div className="flex flex-wrap gap-2">
        {LOG_FILTERS.map((option) => {
          const active = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {!showLiveAgenda ? (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm px-6 py-14 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sem registros</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Ainda não há comunicações deste tipo para exibir.
          </p>
        </div>
      ) : (
        <>
      {/* Agenda ao vivo do dia — todas as automações ativas */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700/80 bg-violet-50/40 dark:bg-violet-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700 dark:text-violet-300">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Agenda de envios {isHoje ? '— hoje' : ''}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {agendaDateLabel ?? '—'}
                {agenda ? ` · Agora ${agenda.brasilHhmm} (Brasília)` : ''}
                {activatedLabels ? ` · Ativas: ${activatedLabels}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                max={todayKey}
                onChange={(e) => setSelectedDate(e.target.value || todayKey)}
                className="bg-transparent text-sm text-gray-800 dark:text-gray-100 outline-none [color-scheme:light] dark:[color-scheme:dark]"
              />
            </label>
            {selectedDate !== todayKey && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayKey)}
                className="rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                Hoje
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadLogs()}
              disabled={disabled || loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {loading && !agenda ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
          </div>
        ) : filteredAgendaItems.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nenhum envio previsto para {isHoje ? 'hoje' : 'este dia'}
              {agendaKindFilter ? ` (${whatsappDailyAgendaKindLabel(agendaKindFilter)})` : ''}.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {agenda && agenda.activatedKinds.length === 0
                ? 'Nenhuma automação WhatsApp está ativa no momento.'
                : 'Quando houver envios previstos, o status aparece aqui.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/80">
                  <th className="px-5 sm:px-6 py-3 font-semibold">Paciente</th>
                  <th className="px-3 py-3 font-semibold">Automação</th>
                  <th className="px-3 py-3 font-semibold">Referência</th>
                  <th className="px-3 py-3 font-semibold">Horário</th>
                  <th className="px-3 py-3 font-semibold">Enviado em</th>
                  <th className="px-3 py-3 font-semibold">Motivo / detalhe</th>
                  <th className="px-5 sm:px-6 py-3 font-semibold text-right">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredAgendaItems.map((item) => {
                  const aplicacaoFmt = formatAplicacaoData(item.dateKey);
                  const canForceLembrete =
                    item.kind === 'calendario_lembrete' &&
                    (item.status === 'pending' || item.status === 'failed');
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-5 sm:px-6 py-3.5">
                        <div className="text-gray-800 dark:text-gray-200 font-medium">{item.pacienteNome}</div>
                        {item.telefone && (
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                            {item.telefone}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex rounded-full bg-violet-500/10 text-violet-800 dark:text-violet-200 px-2.5 py-1 text-xs font-semibold">
                          {item.automationLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-700 dark:text-gray-300">
                        {aplicacaoFmt}
                        {item.semana != null && item.semana > 0 ? ` · Sem. ${item.semana}` : ''}
                        {item.dose != null && item.dose > 0 ? ` · ${item.dose} mg` : ''}
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {item.horarioConfigurado}
                      </td>
                      <td className="px-3 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {item.enviadoEm ? formatLogDate(item.enviadoEm) : '—'}
                      </td>
                      <td className="px-3 py-3.5 max-w-xs">
                        {item.motivo ? (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">{item.motivo}</p>
                        ) : item.status === 'sent' ? (
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">Mensagem enviada.</p>
                        ) : item.kind === 'calendario_lembrete' && !item.telefone ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Usa o número da sessão conectada.
                          </p>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-right">
                        <PainelStatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {canForceLembrete ? (
                          <button
                            type="button"
                            disabled={disabled || forcingId === item.id}
                            onClick={() => void forceCalendarioLembrete(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50"
                          >
                            {forcingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Enviar agora
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico de envios */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-600/10 text-slate-600 dark:text-slate-300">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Histórico de envios</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedDate === todayKey
                  ? 'Envios de hoje'
                  : `Envios de ${formatBrasilDateLabel(selectedDate)}`}
              </p>
            </div>
          </div>
        </div>

        {loading && filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 text-sm text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedDate === todayKey
                ? 'Nenhum envio registrado hoje'
                : `Nenhum envio em ${formatBrasilDateLabel(selectedDate)}`}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {selectedDate === todayKey
                ? 'Os registros aparecerão aqui após os envios automáticos.'
                : 'Sem envios nesta data — o histórico exibe apenas os últimos 100 registros mais recentes.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/80">
                  <th className="px-5 sm:px-6 py-3 font-semibold">Horário</th>
                  <th className="px-3 py-3 font-semibold">Tipo</th>
                  <th className="px-3 py-3 font-semibold">Destino</th>
                  <th className="px-3 py-3 font-semibold">Detalhes</th>
                  <th className="px-5 sm:px-6 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logDayGroups.map((group) => (
                  <Fragment key={group.dayKey}>
                    <tr className="bg-gray-50/80 dark:bg-gray-800/40">
                      <td
                        colSpan={5}
                        className="px-5 sm:px-6 py-2 border-y border-gray-100 dark:border-gray-700/80"
                      >
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                          {group.heading}
                        </span>
                        <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                          {group.logs.length} envio{group.logs.length === 1 ? '' : 's'}
                        </span>
                      </td>
                    </tr>
                    {group.logs.map((log) => {
                      const Icon = typeIcon(log.type);
                      const aplicacaoFmt = formatAplicacaoData(log.aplicacaoData);

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-5 sm:px-6 py-3.5 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {formatLogTime(log.sentAt)}
                          </td>
                          <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                          <Icon
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isAutomationLog(log.type) ? 'text-violet-600' : 'text-sky-600'
                            }`}
                          />
                          <span className="text-xs font-medium">{typeLabel(log.type)}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="text-gray-800 dark:text-gray-200 font-mono text-xs">
                          {log.phone ?? '—'}
                        </div>
                        {log.pacienteNome && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[180px]">
                            {log.pacienteNome}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5 max-w-xs">
                        {isAutomationLog(log.type) && aplicacaoFmt && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Aplicação {aplicacaoFmt}
                            {log.semana != null ? ` · Sem. ${log.semana}` : ''}
                            {log.dose != null ? ` · ${log.dose} mg` : ''}
                          </p>
                        )}
                        {log.messagePreview && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                            {log.messagePreview}
                          </p>
                        )}
                        {log.errorMessage && log.status === 'failed' && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-2">{log.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-right">
                        {log.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Enviado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 px-2.5 py-1 text-xs font-semibold">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Falhou
                          </span>
                        )}
                      </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
