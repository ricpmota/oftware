'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  FileText,
  Gauge,
  Loader2,
  Send,
  Stethoscope,
  UtensilsCrossed,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { DEFAULT_PHONE_COUNTRY, DEFAULT_PHONE_DDI } from '@/lib/phone/callingCountries';
import {
  isValidIdentificacaoPhone,
  persistedPhoneForIdentificacao,
  type PersistedInternationalPhone,
} from '@/lib/phone/internationalPhoneValue';
import {
  AutomacoesChannelBadge,
  AutomacoesConstructionBanner,
  AutomacoesInfoNote,
  AutomacoesPageHeader,
  AutomacoesPlaceholderTable,
  AutomacoesStatusBadge,
  AutomacoesSummaryCard,
} from '@/components/metaadmingeral/automacoes/automacoesCenterUi';
import {
  doctorGovernanceStatusLabel,
  doctorGovernanceStatusTone,
  automationMotorLabel,
  opsReadinessLabel,
  opsReadinessTone,
} from '@/lib/metaadmingeral/automationDoctorGovernance';
import {
  channelLabel,
  statusLabel,
  statusTone,
} from '@/lib/metaadmingeral/automationCenterLabels';
import type {
  AutomationDashboardDto,
  DoctorAutomationGovernanceDto,
  DoctorAutomationOpsChecklistDto,
} from '@/types/automationCenter';

type Props = {
  user: User | null;
};

function OpsToggleRow({
  label,
  on,
  detail,
  warn,
}: {
  label: string;
  on: boolean;
  detail?: string;
  warn?: boolean;
}) {
  const toneClass = on
    ? warn
      ? 'bg-amber-500/15 text-amber-300'
      : 'bg-[#4CCB7A]/15 text-[#4CCB7A]'
    : 'bg-white/5 text-[#E8EDED]/50';
  const Icon = on ? (warn ? AlertCircle : CheckCircle2) : XCircle;
  const status = on ? (warn ? 'Atenção' : 'Ligado') : 'Desligado';

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#E8EDED]">{label}</p>
        {detail ? <p className="mt-0.5 text-xs text-[#E8EDED]/55 break-words">{detail}</p> : null}
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
        <Icon className="h-3.5 w-3.5" />
        {status}
      </span>
    </div>
  );
}

const DEFAULT_WHATSAPP_TEST_PHONE: PersistedInternationalPhone = {
  telefone: '',
  telefoneDdi: DEFAULT_PHONE_DDI,
  telefonePais: DEFAULT_PHONE_COUNTRY,
};

function DoctorWhatsAppTestPanel({
  doctorId,
  doctorName,
  whatsappConnected,
  legacyFlagInSync,
  user,
  onSynced,
}: {
  doctorId: string;
  doctorName: string;
  whatsappConnected: boolean;
  legacyFlagInSync: boolean;
  user: User;
  onSynced: () => void;
}) {
  const [destPhone, setDestPhone] = useState<PersistedInternationalPhone>(DEFAULT_WHATSAPP_TEST_PHONE);
  const [message, setMessage] = useState(
    `Teste de envio automático — MetaAdmin Geral (Oftware).\nMédico: ${doctorName}`,
  );
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setMessage(`Teste de envio automático — MetaAdmin Geral (Oftware).\nMédico: ${doctorName}`);
    setFeedback(null);
  }, [doctorId, doctorName]);

  const phoneIsValid = isValidIdentificacaoPhone(destPhone);

  const sendTest = async () => {
    if (!phoneIsValid) return;
    setSending(true);
    setFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/whatsapp/send-test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId,
          telefone: destPhone.telefone,
          telefoneDdi: destPhone.telefoneDdi,
          telefonePais: destPhone.telefonePais,
          message,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
        mock?: boolean;
      } | null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? 'Falha ao enviar mensagem de teste.');
      }

      setFeedback({
        ok: true,
        text: data.message ?? (data.mock ? 'Mensagem simulada (mock).' : 'Enviado com sucesso.'),
      });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Erro ao enviar mensagem de teste.',
      });
    } finally {
      setSending(false);
    }
  };

  const syncLegacyFlag = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/whatsapp/sync-legacy-flag', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctorId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? 'Falha ao sincronizar flag legado.');
      }

      setFeedback({
        ok: true,
        text: 'Flag autoAplicacaoEnabled sincronizado com o flap do médico.',
      });
      onSynced();
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Erro ao sincronizar flag legado.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3 border-b border-white/10 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">
          Teste de envio WhatsApp
        </p>
        {!legacyFlagInSync ? (
          <button
            type="button"
            onClick={() => void syncLegacyFlag()}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Sincronizar flag legado
          </button>
        ) : null}
      </div>

      {!whatsappConnected ? (
        <AutomacoesInfoNote>
          O WhatsApp deste médico não está conectado. Conecte a sessão antes de enviar um teste.
        </AutomacoesInfoNote>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-[#E8EDED]/70">Número do WhatsApp</span>
          <div className="mt-1">
            <InternationalPhoneInput
              id="automacoes-whatsapp-test-phone"
              variant="dark"
              value={destPhone}
              onChange={(next) => setDestPhone(persistedPhoneForIdentificacao(next))}
            />
          </div>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-[#E8EDED]/70">Mensagem</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/35 focus:border-[#4CCB7A]/50 focus:outline-none resize-y"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void sendTest()}
        disabled={sending || !whatsappConnected || !phoneIsValid}
        className="inline-flex items-center gap-2 rounded-lg bg-[#4CCB7A] px-4 py-2 text-sm font-medium text-[#0B1414] hover:bg-[#5fd688] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar teste
      </button>

      {feedback ? (
        <p
          className={`text-sm ${feedback.ok ? 'text-[#4CCB7A]' : 'text-red-300'}`}
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}

function DoctorOpsChecklist({ ops }: { ops: DoctorAutomationOpsChecklistDto }) {
  return (
    <div className="space-y-4 border-b border-white/10 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">
          Checklist operacional
        </p>
        <AutomacoesStatusBadge
          label={opsReadinessLabel(ops.readiness)}
          tone={opsReadinessTone(ops.readiness)}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <OpsToggleRow
          label="WhatsApp conectado"
          on={ops.whatsappConnected}
          detail={
            ops.whatsappConnected
              ? [ops.whatsappPhone, ops.whatsappStatus].filter(Boolean).join(' · ')
              : `Status: ${ops.whatsappStatus ?? 'sem conexão'}`
          }
        />
        <OpsToggleRow
          label="Flap: aplicação do dia (médico)"
          on={ops.aplicacaoDiaDoctorEnabled}
        />
        <OpsToggleRow
          label="Org. liberou aplicação do dia"
          on={ops.aplicacaoDiaOrgReleased}
        />
        <OpsToggleRow
          label="Cron legado autorizado"
          on={ops.aplicacaoDiaAuthorized}
          detail="Flap + org OU flag legado autoAplicacaoEnabled"
        />
        <OpsToggleRow
          label="Flag legado autoAplicacaoEnabled"
          on={ops.autoAplicacaoLegacyEnabled}
          warn={!ops.legacyFlagInSync}
          detail={
            ops.legacyFlagInSync
              ? 'Sincronizado com o flap'
              : 'Dessincronizado — cron pode ignorar o médico'
          }
        />
        <OpsToggleRow
          label="Horário do dia já passou (Brasília)"
          on={ops.horarioJaPassouHoje}
          detail={`Horário configurado: ${ops.autoAplicacaoHorario ?? '—'}`}
        />
        <OpsToggleRow
          label="Elegível no cron de aplicação"
          on={ops.cronEligible}
          detail="Autorizado + WhatsApp conectado"
        />
        <OpsToggleRow
          label="Fila WhatsApp com itens vencidos"
          on={ops.queueDueNow > 0}
          detail={`${ops.queuePending} pendente(s) · ${ops.queueDueNow} vencido(s) agora`}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-sm">
        <div>
          <p className="text-xs text-[#E8EDED]/50">Aplicações hoje</p>
          <p className="mt-1 text-lg font-semibold text-[#E8EDED]">{ops.aplicacoesHoje}</p>
        </div>
        <div>
          <p className="text-xs text-[#E8EDED]/50">Pendentes envio</p>
          <p className="mt-1 text-lg font-semibold text-sky-300">{ops.aplicacoesHojePendentes}</p>
        </div>
        <div>
          <p className="text-xs text-[#E8EDED]/50">Sem telefone</p>
          <p className="mt-1 text-lg font-semibold text-amber-300">{ops.aplicacoesHojeIgnoradas}</p>
        </div>
      </div>

      {ops.bloqueios.length > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90 mb-2">
            Bloqueios / diagnóstico
          </p>
          <ul className="space-y-1.5 text-xs text-amber-100/90">
            {ops.bloqueios.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-amber-300 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function GovernanceStatusRow({
  label,
  active,
  detail,
  warnWhenActive,
}: {
  label: string;
  active: boolean;
  detail?: string;
  warnWhenActive?: boolean;
}) {
  const showWarn = warnWhenActive && active;
  const showSuccess = active && !warnWhenActive;
  const toneClass = showSuccess
    ? 'bg-[#4CCB7A]/15 text-[#4CCB7A]'
    : showWarn
      ? 'bg-amber-500/15 text-amber-300'
      : 'bg-white/5 text-[#E8EDED]/50';

  const statusText = showSuccess ? 'Ativo' : showWarn ? 'Atenção' : 'Inativo';
  const Icon = showSuccess ? CheckCircle2 : showWarn ? AlertCircle : XCircle;

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#E8EDED]">{label}</p>
        {detail ? <p className="mt-0.5 text-xs text-[#E8EDED]/55">{detail}</p> : null}
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
        <Icon className="h-3.5 w-3.5" />
        {statusText}
      </span>
    </div>
  );
}

export default function AutomacoesDashboardPanel({ user }: Props) {
  const [dashboard, setDashboard] = useState<AutomationDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type DetailKind = 'doctors' | 'nutri' | 'personal';
  const [showDetail, setShowDetail] = useState<DetailKind | null>(null);
  const [professionals, setProfessionals] = useState<DoctorAutomationGovernanceDto[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const [professionalsError, setProfessionalsError] = useState<string | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedOwnerDetail, setSelectedOwnerDetail] = useState<DoctorAutomationGovernanceDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const activationsEndpoint = (kind: DetailKind) => {
    if (kind === 'nutri') return '/api/metaadmingeral/automacoes/nutri-activations';
    if (kind === 'personal') return '/api/metaadmingeral/automacoes/personal-activations';
    return '/api/metaadmingeral/automacoes/doctor-activations';
  };

  const detailLabels: Record<
    DetailKind,
    { card: string; title: string; empty: string; person: string; queryParam: string }
  > = {
    doctors: {
      card: 'Médicos com automações',
      title: 'Médicos com automações ativas',
      empty: 'Nenhum médico com automação ativa no momento.',
      person: 'Médico',
      queryParam: 'doctorId',
    },
    nutri: {
      card: 'Nutricionistas com automações',
      title: 'Nutricionistas com automações ativas',
      empty: 'Nenhum nutricionista com automação ativa no momento.',
      person: 'Nutricionista',
      queryParam: 'ownerId',
    },
    personal: {
      card: 'Personal com automações',
      title: 'Personais com automações ativas',
      empty: 'Nenhum personal com automação ativa no momento.',
      person: 'Personal',
      queryParam: 'ownerId',
    },
  };

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        dashboard?: AutomationDashboardDto;
      } | null;

      if (!res.ok || !data?.ok || !data.dashboard) {
        throw new Error(data?.error ?? 'Não foi possível carregar o dashboard.');
      }

      setDashboard(data.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadProfessionals = useCallback(
    async (kind: DetailKind) => {
      if (!user) {
        setProfessionals([]);
        return;
      }

      setProfessionalsLoading(true);
      setProfessionalsError(null);

      try {
        const token = await user.getIdToken();
        const res = await fetch(activationsEndpoint(kind), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          doctors?: DoctorAutomationGovernanceDto[];
        } | null;

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? `Não foi possível carregar ${detailLabels[kind].card}.`);
        }

        setProfessionals(data.doctors ?? []);
      } catch (err) {
        setProfessionalsError(
          err instanceof Error ? err.message : `Erro ao carregar ${detailLabels[kind].card}.`,
        );
        setProfessionals([]);
      } finally {
        setProfessionalsLoading(false);
      }
    },
    [user],
  );

  const handleProfessionalsCardClick = useCallback(
    (kind: DetailKind) => {
      setShowDetail((prev) => {
        const next = prev === kind ? null : kind;
        if (next) {
          setSelectedOwnerId(null);
          setSelectedOwnerDetail(null);
          setDetailError(null);
          void loadProfessionals(next);
        } else {
          setSelectedOwnerId(null);
          setSelectedOwnerDetail(null);
          setDetailError(null);
          setProfessionals([]);
        }
        return next;
      });
    },
    [loadProfessionals],
  );

  const loadOwnerDetail = useCallback(
    async (kind: DetailKind, ownerId: string) => {
      if (!user) return;
      setDetailLoading(true);
      setDetailError(null);
      setSelectedOwnerDetail(null);

      try {
        const token = await user.getIdToken();
        const param = detailLabels[kind].queryParam;
        const res = await fetch(
          `${activationsEndpoint(kind)}?${param}=${encodeURIComponent(ownerId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          doctor?: DoctorAutomationGovernanceDto;
        } | null;

        if (!res.ok || !data?.ok || !data.doctor) {
          throw new Error(data?.error ?? 'Não foi possível carregar o diagnóstico.');
        }

        setSelectedOwnerDetail(data.doctor);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : 'Erro ao carregar diagnóstico.');
      } finally {
        setDetailLoading(false);
      }
    },
    [user],
  );

  const handleOwnerRowClick = useCallback(
    (rowIndex: number) => {
      if (!showDetail) return;
      const row = professionals[rowIndex];
      if (!row) return;
      const nextId = selectedOwnerId === row.doctorId ? null : row.doctorId;
      setSelectedOwnerId(nextId);
      if (nextId) {
        void loadOwnerDetail(showDetail, nextId);
      } else {
        setSelectedOwnerDetail(null);
        setDetailError(null);
      }
    },
    [professionals, selectedOwnerId, loadOwnerDetail, showDetail],
  );

  const selectedOwner =
    selectedOwnerDetail ?? professionals.find((item) => item.doctorId === selectedOwnerId) ?? null;
  const activeLabels = showDetail ? detailLabels[showDetail] : null;

  return (
    <div className="space-y-6">
      <AutomacoesPageHeader
        title="Centro de Automações — Dashboard"
        subtitle="Governança global das automações da plataforma Oftware"
      />

      <AutomacoesConstructionBanner />

      <AutomacoesInfoNote>
        Visão consolidada do catálogo, templates, liberações por organização e ativações por médico.
        Dados combinam Firestore com seeds de fallback. Nenhum envio é disparado a partir daqui.
      </AutomacoesInfoNote>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Operações
        </h3>
        <a
          href="/metaadmingeral?menu=automation-ops"
          className="group block rounded-2xl border border-[#4CCB7A]/25 bg-gradient-to-br from-[#4CCB7A]/10 via-white/5 to-transparent p-6 transition hover:border-[#4CCB7A]/45 hover:from-[#4CCB7A]/15"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/15">
                <Gauge className="h-5 w-5 text-[#4CCB7A]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#E8EDED]">Operations Center</h3>
                  <span className="inline-flex rounded-full bg-[#4CCB7A]/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#4CCB7A]">
                    Novo
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#E8EDED]/65">
                  Monitore filas, crons, falhas, SLA, Shadow Validation, circuit breakers e consumo
                  operacional das automações.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#4CCB7A]/35 bg-[#4CCB7A]/15 px-4 py-2.5 text-sm font-medium text-[#4CCB7A] transition group-hover:bg-[#4CCB7A]/25">
              Abrir painel operacional
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </a>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando métricas…
        </div>
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {dashboard ? (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Resumo</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <AutomacoesSummaryCard
                label="Automações globais"
                value={dashboard.globalActiveAutomations}
                hint={`${dashboard.catalogTotal} no catálogo`}
                icon={Zap}
              />
              <AutomacoesSummaryCard
                label="Templates publicados"
                value={dashboard.publishedTemplates}
                hint={`${dashboard.templatesTotal} templates no total`}
                icon={FileText}
              />
              <AutomacoesSummaryCard
                label="Organizações usando"
                value={dashboard.organizationsWithAutomations}
                hint={`${dashboard.organizationReleasesTotal} liberações ativas`}
                icon={Building2}
              />
              <AutomacoesSummaryCard
                label="Médicos com automações"
                value={dashboard.doctorsWithAutomations}
                hint={`${dashboard.doctorActivationsTotal} ativações no total · clique para detalhes`}
                icon={Stethoscope}
                onClick={() => handleProfessionalsCardClick('doctors')}
                active={showDetail === 'doctors'}
              />
              <AutomacoesSummaryCard
                label="Nutricionistas com automações"
                value={dashboard.nutricionistasWithAutomations}
                hint={`${dashboard.nutricionistaActivationsTotal} ativações no total · clique para detalhes`}
                icon={UtensilsCrossed}
                onClick={() => handleProfessionalsCardClick('nutri')}
                active={showDetail === 'nutri'}
              />
              <AutomacoesSummaryCard
                label="Personal com automações"
                value={dashboard.personalWithAutomations}
                hint={`${dashboard.personalActivationsTotal} ativações no total · clique para detalhes`}
                icon={Dumbbell}
                onClick={() => handleProfessionalsCardClick('personal')}
                active={showDetail === 'personal'}
              />
            </div>
          </section>

          {showDetail && activeLabels ? (
            <section className="space-y-3 rounded-2xl border border-[#4CCB7A]/20 bg-[#4CCB7A]/5 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#4CCB7A]">
                    {activeLabels.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#E8EDED]/65">
                    Clique em um registro para ver o checklist ligado/desligado e por que o envio funciona ou não.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleProfessionalsCardClick(showDetail)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#E8EDED]/70 transition hover:bg-white/10 hover:text-[#E8EDED]"
                >
                  <X className="h-3.5 w-3.5" />
                  Fechar
                </button>
              </div>

              {professionalsLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[#E8EDED]/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando…
                </div>
              ) : null}

              {professionalsError ? (
                <p className="flex items-center gap-2 text-sm text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {professionalsError}
                </p>
              ) : null}

              {!professionalsLoading && !professionalsError ? (
                professionals.length === 0 ? (
                  <p className="py-6 text-sm text-[#E8EDED]/55">{activeLabels.empty}</p>
                ) : (
                  <>
                    <AutomacoesPlaceholderTable
                      headers={[
                        activeLabels.person,
                        'Organização',
                        'Automações ativas',
                        'WhatsApp',
                        'E-mail',
                        'Status',
                      ]}
                      onRowClick={handleOwnerRowClick}
                      rows={professionals.map((doctor) => {
                        const isSelected = doctor.doctorId === selectedOwnerId;
                        return [
                          <div key={`${doctor.doctorId}-name`}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#E8EDED]">{doctor.doctorName}</span>
                              {isSelected ? (
                                <ChevronUp className="h-3.5 w-3.5 text-[#4CCB7A]" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-[#E8EDED]/35" />
                              )}
                            </div>
                            {doctor.doctorEmail ? (
                              <p className="mt-0.5 text-xs text-[#E8EDED]/50">{doctor.doctorEmail}</p>
                            ) : null}
                            <p className="mt-0.5 text-xs font-mono text-[#E8EDED]/40">{doctor.doctorId}</p>
                          </div>,
                          <div key={`${doctor.doctorId}-org`}>
                            <span className="text-[#E8EDED]/85">
                              {doctor.organizationName ?? doctor.organizationId}
                            </span>
                            <p className="mt-0.5 text-xs font-mono text-[#E8EDED]/40">
                              {doctor.organizationId}
                            </p>
                          </div>,
                          `${doctor.enabledCount} / ${doctor.totalAvailable}`,
                          String(doctor.whatsappEnabled),
                          String(doctor.emailEnabled),
                          <AutomacoesStatusBadge
                            key={`${doctor.doctorId}-status`}
                            label={doctorGovernanceStatusLabel(doctor.governanceStatus)}
                            tone={doctorGovernanceStatusTone(doctor.governanceStatus)}
                          />,
                        ];
                      })}
                    />

                    {selectedOwner ? (
                      <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
                          <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">
                            Diagnóstico
                          </p>
                          <h4 className="mt-1 text-base font-semibold text-[#E8EDED]">
                            {selectedOwner.doctorName}
                          </h4>
                          <p className="mt-1 text-sm text-[#E8EDED]/60">
                            {selectedOwner.enabledCount} ativa
                            {selectedOwner.enabledCount === 1 ? '' : 's'} de{' '}
                            {selectedOwner.totalAvailable} liberada
                            {selectedOwner.totalAvailable === 1 ? '' : 's'}
                            {selectedOwner.ops ? (
                              <span className="ml-2">
                                ·{' '}
                                <AutomacoesStatusBadge
                                  label={opsReadinessLabel(selectedOwner.ops.readiness)}
                                  tone={opsReadinessTone(selectedOwner.ops.readiness)}
                                />
                              </span>
                            ) : null}
                          </p>
                        </div>

                        {detailLoading ? (
                          <div className="flex items-center gap-2 px-4 py-8 text-sm text-[#E8EDED]/60 sm:px-5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Carregando checklist operacional…
                          </div>
                        ) : null}

                        {detailError ? (
                          <p className="flex items-center gap-2 px-4 py-4 text-sm text-red-300 sm:px-5">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {detailError}
                          </p>
                        ) : null}

                        {selectedOwner.ops ? (
                          showDetail === 'doctors' ? (
                            <DoctorOpsChecklist ops={selectedOwner.ops} />
                          ) : (
                            <div className="space-y-4 border-b border-white/10 px-4 py-4 sm:px-5">
                              <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">
                                Checklist operacional
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <OpsToggleRow
                                  label="WhatsApp conectado"
                                  on={selectedOwner.ops.whatsappConnected}
                                  detail={
                                    selectedOwner.ops.whatsappConnected
                                      ? [selectedOwner.ops.whatsappPhone, selectedOwner.ops.whatsappStatus]
                                          .filter(Boolean)
                                          .join(' · ')
                                      : `Status: ${selectedOwner.ops.whatsappStatus ?? 'sem conexão'}`
                                  }
                                />
                                <OpsToggleRow
                                  label="Fila WhatsApp com itens vencidos"
                                  on={selectedOwner.ops.queueDueNow > 0}
                                  detail={`${selectedOwner.ops.queuePending} pendente(s) · ${selectedOwner.ops.queueDueNow} vencido(s) agora`}
                                />
                              </div>
                              {selectedOwner.ops.bloqueios.length > 0 ? (
                                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90 mb-2">
                                    Bloqueios / diagnóstico
                                  </p>
                                  <ul className="space-y-1.5 text-xs text-amber-100/90">
                                    {selectedOwner.ops.bloqueios.map((item) => (
                                      <li key={item} className="flex gap-2">
                                        <span className="text-amber-300 shrink-0">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          )
                        ) : null}

                        {selectedOwnerId && user && showDetail === 'doctors' ? (
                          <DoctorWhatsAppTestPanel
                            doctorId={selectedOwnerId}
                            doctorName={selectedOwner.doctorName}
                            whatsappConnected={selectedOwner.ops?.whatsappConnected ?? false}
                            legacyFlagInSync={selectedOwner.ops?.legacyFlagInSync ?? true}
                            user={user}
                            onSynced={() => void loadOwnerDetail('doctors', selectedOwnerId)}
                          />
                        ) : null}

                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
                                <th className="px-4 py-3 font-medium sm:px-5">Automação</th>
                                <th className="px-3 py-3 font-medium">Canal</th>
                                <th className="px-3 py-3 font-medium">Global</th>
                                <th className="px-3 py-3 font-medium">Org.</th>
                                <th className="px-3 py-3 font-medium">Ativo</th>
                                <th className="px-3 py-3 font-medium">Horário</th>
                                <th className="px-3 py-3 font-medium">Motor</th>
                                <th className="px-3 py-3 font-medium">Pronto?</th>
                                <th className="px-4 py-3 font-medium sm:px-5">Motivo se não</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOwner.automations.map((row) => (
                                <tr
                                  key={row.automationId}
                                  className={`border-b border-white/5 last:border-0 ${
                                    row.enabledByDoctor ? 'bg-[#4CCB7A]/5' : ''
                                  } ${row.readyToSend ? 'ring-1 ring-inset ring-[#4CCB7A]/20' : ''}`}
                                >
                                  <td className="px-4 py-3 text-[#E8EDED] sm:px-5">
                                    <div className="font-medium">{row.automationName}</div>
                                    <div className="mt-0.5 text-xs font-mono text-[#E8EDED]/45">
                                      {row.automationId}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <AutomacoesChannelBadge channel={channelLabel(row.channel)} />
                                  </td>
                                  <td className="px-3 py-3">
                                    <AutomacoesStatusBadge
                                      label={statusLabel(row.globalStatus)}
                                      tone={statusTone(row.globalStatus)}
                                    />
                                  </td>
                                  <td className="px-3 py-3">
                                    <AutomacoesStatusBadge
                                      label={row.organizationReleased ? 'Ligado' : 'Desligado'}
                                      tone={row.organizationReleased ? 'success' : 'muted'}
                                    />
                                  </td>
                                  <td className="px-3 py-3">
                                    <AutomacoesStatusBadge
                                      label={row.enabledByDoctor ? 'Ligado' : 'Desligado'}
                                      tone={row.enabledByDoctor ? 'success' : 'muted'}
                                    />
                                  </td>
                                  <td className="px-3 py-3 text-[#E8EDED]/85 whitespace-nowrap">
                                    {row.horario ?? '—'}
                                  </td>
                                  <td className="px-3 py-3 text-xs text-[#E8EDED]/70 max-w-[140px]">
                                    {row.motor ? automationMotorLabel(row.motor) : '—'}
                                  </td>
                                  <td className="px-3 py-3">
                                    {row.readyToSend === undefined ? (
                                      <span className="text-[#E8EDED]/40">…</span>
                                    ) : (
                                      <AutomacoesStatusBadge
                                        label={row.readyToSend ? 'Sim' : 'Não'}
                                        tone={row.readyToSend ? 'success' : 'warn'}
                                      />
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[#E8EDED]/65 max-w-[220px] sm:px-5">
                                    {row.blockReason ?? (row.readyToSend ? '—' : '—')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#E8EDED]/45">
                        Selecione um registro na tabela acima para ver o checklist completo.
                      </p>
                    )}
                  </>
                )
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Canais</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {dashboard.channels.map((item) => (
                <div
                  key={item.channel}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <AutomacoesChannelBadge channel={item.label} />
                  <p className="mt-3 text-2xl font-bold text-[#E8EDED]">{item.automationCount}</p>
                  <p className="mt-1 text-xs text-[#E8EDED]/55">
                    {item.automationCount === 1 ? 'automação' : 'automações'} no catálogo
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
              Status da governança
            </h3>
            <div className="space-y-2">
              <GovernanceStatusRow
                label="Catálogo carregado"
                active={dashboard.governance.catalogLoaded}
                detail={`${dashboard.catalogTotal} automações registradas`}
              />
              <GovernanceStatusRow
                label="Templates carregados"
                active={dashboard.governance.templatesLoaded}
                detail={`${dashboard.templatesTotal} templates disponíveis`}
              />
              <GovernanceStatusRow
                label="Liberação por organização ativa"
                active={dashboard.governance.organizationReleaseActive}
                detail={`${dashboard.organizationsWithAutomations} organizações com ao menos 1 automação liberada`}
              />
              <GovernanceStatusRow
                label="Ativação por médico ativa"
                active={dashboard.governance.doctorActivationActive}
                detail={`${dashboard.doctorsWithAutomations} médicos · ${dashboard.nutricionistasWithAutomations} nutricionistas · ${dashboard.personalWithAutomations} personais com ao menos 1 automação ativa`}
              />
              <GovernanceStatusRow
                label="Envio real integrado (WhatsApp)"
                active={dashboard.governance.realSendingIntegrated}
                detail="Lembrete no dia, D-1, aplicação atrasada, aniversário e conclusão disparam com base neste hub"
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
