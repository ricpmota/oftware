'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  HeartHandshake,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import type {
  MatchBroadcastPatient,
  MatchBroadcastResultRow,
  MatchMonitorSnapshot,
  MatchMonitorStage,
} from '@/lib/match/matchAdminTypes';
import { renderMatchCanalChatTemplate } from '@/lib/match/matchCanalChatMessage';

type MatchSaudavelAdminPanelProps = {
  user: User;
};

type TabId = 'monitor' | 'conexoes' | 'mensagem' | 'disparo';
type PeopleFilter = 'all' | 'today' | 'onboarding' | 'active' | 'paused' | 'nophone' | 'connected';

const TABS: { id: TabId; label: string }[] = [
  { id: 'monitor', label: 'Quem entrou' },
  { id: 'conexoes', label: 'Conexões' },
  { id: 'mensagem', label: 'Mensagem automática' },
  { id: 'disparo', label: 'Disparo' },
];

const FILTERS: { id: PeopleFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'today', label: 'Hoje' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'active', label: 'No ar' },
  { id: 'paused', label: 'Pausados' },
  { id: 'connected', label: 'Com conexão' },
  { id: 'nophone', label: 'Sem telefone' },
];

const STAGE_LABEL: Record<MatchMonitorStage, string> = {
  visit: 'Entrou',
  onboarding: 'Onboarding',
  active: 'No ar',
  paused: 'Pausado',
};

const DELIVERY_LABEL = {
  sent: 'Enviada',
  no_phone: 'Sem telefone',
  failed: 'Falhou',
  channel_offline: 'Canal offline',
  untracked: 'Sem registro',
} as const;

async function authFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Não autenticado.');
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const sameDay =
    date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) ===
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  if (sameDay) {
    return `hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`;
  }
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  return (
    new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) ===
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  );
}

function stageClass(stage: MatchMonitorStage): string {
  if (stage === 'active') return 'bg-[#4CCB7A]/15 text-[#4CCB7A]';
  if (stage === 'onboarding') return 'bg-amber-400/15 text-amber-200';
  if (stage === 'paused') return 'bg-white/10 text-[#E8EDED]/55';
  return 'bg-sky-400/15 text-sky-200';
}

function previewBroadcast(message: string, name: string): string {
  const first = name.trim().split(/\s+/).filter(Boolean)[0] || 'você';
  return message.split('{{nome}}').join(first);
}

export default function MatchSaudavelAdminPanel({ user }: MatchSaudavelAdminPanelProps) {
  const [tab, setTab] = useState<TabId>('monitor');
  const [snapshot, setSnapshot] = useState<MatchMonitorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PeopleFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateText, setTemplateText] = useState('');
  const [templateReady, setTemplateReady] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateNote, setTemplateNote] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastReady, setBroadcastReady] = useState(false);
  const lastSavedDraft = useRef<string | null>(null);
  const latestDraft = useRef(broadcastText);
  latestDraft.current = broadcastText;
  const [draftNote, setDraftNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendResults, setSendResults] = useState<MatchBroadcastResultRow[] | null>(null);
  const [patients, setPatients] = useState<MatchBroadcastPatient[] | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState<'all' | 'phone' | 'nophone'>('all');
  const patientsRequested = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/metaadmingeral/match-saudavel');
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        snapshot?: MatchMonitorSnapshot;
      };
      if (!res.ok || !data.snapshot) throw new Error(data.error || 'Não foi possível carregar o Match.');
      setSnapshot(data.snapshot);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, user.uid]);

  useEffect(() => {
    if (!snapshot || templateReady) return;
    setTemplateText(snapshot.template);
    setTemplateReady(true);
  }, [snapshot, templateReady]);

  useEffect(() => {
    if (!snapshot || broadcastReady) return;
    setBroadcastText(snapshot.broadcastDraft);
    lastSavedDraft.current = snapshot.broadcastDraft;
    setBroadcastReady(true);
  }, [snapshot, broadcastReady]);

  useEffect(() => {
    if (!broadcastReady || broadcastText === lastSavedDraft.current) return;
    const saving = broadcastText;
    const handle = window.setTimeout(() => {
      void authFetch('/api/metaadmingeral/match-saudavel', {
        method: 'PUT',
        body: JSON.stringify({ broadcastDraft: saving }),
      })
        .then((res) => {
          if (!res.ok || latestDraft.current !== saving) return;
          lastSavedDraft.current = saving;
          setDraftNote('Rascunho guardado');
        })
        .catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(handle);
  }, [broadcastText, broadcastReady]);

  const filtered = useMemo(() => {
    const people = snapshot?.people || [];
    const needle = query.trim().toLocaleLowerCase('pt-BR');
    return people.filter((person) => {
      if (filter === 'today' && !isToday(person.lastSeenAt) && !isToday(person.firstSeenAt)) return false;
      if (filter === 'onboarding' && person.stage !== 'onboarding') return false;
      if (filter === 'active' && person.stage !== 'active') return false;
      if (filter === 'paused' && person.stage !== 'paused') return false;
      if (filter === 'nophone' && person.hasPhone) return false;
      if (filter === 'connected' && person.connections < 1) return false;
      if (!needle) return true;
      const haystack = `${person.displayName} ${person.city || ''} ${person.phoneTail || ''}`.toLocaleLowerCase('pt-BR');
      return haystack.includes(needle);
    });
  }, [snapshot, query, filter]);

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    setPatientsError('');
    try {
      const res = await authFetch('/api/metaadmingeral/match-saudavel/pacientes');
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        patients?: MatchBroadcastPatient[];
      };
      if (!res.ok || !data.patients) throw new Error(data.error || 'Não foi possível listar os pacientes.');
      setPatients(data.patients);
    } catch (err) {
      setPatientsError((err as Error).message);
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'disparo' || patientsRequested.current) return;
    patientsRequested.current = true;
    void loadPatients();
  }, [tab, loadPatients]);

  const filteredPatients = useMemo(() => {
    const needle = patientQuery.trim().toLocaleLowerCase('pt-BR');
    return (patients || []).filter((person) => {
      if (patientFilter === 'phone' && !person.hasPhone) return false;
      if (patientFilter === 'nophone' && person.hasPhone) return false;
      if (!needle) return true;
      const haystack = `${person.name} ${person.city || ''} ${person.phoneTail || ''}`.toLocaleLowerCase('pt-BR');
      return haystack.includes(needle);
    });
  }, [patients, patientQuery, patientFilter]);

  const selectedPeople = useMemo(() => {
    const byId = new Map((patients || []).map((person) => [person.id, person]));
    return [...selected].map((id) => byId.get(id)).filter((person): person is MatchBroadcastPatient => Boolean(person));
  }, [patients, selected]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSendResults(null);
  }

  const visibleSelectionFull =
    filteredPatients.length > 0 &&
    (filteredPatients.every((person) => selected.has(person.id)) ||
      (filteredPatients.filter((person) => selected.has(person.id)).length >= 40 &&
        selected.size === filteredPatients.filter((person) => selected.has(person.id)).length));

  function toggleVisiblePatients() {
    setSelected((current) => {
      const next = new Set(current);
      const visibleIds = filteredPatients.map((person) => person.id);
      const selectedVisible = visibleIds.filter((id) => next.has(id));
      const full =
        visibleIds.length > 0 &&
        (selectedVisible.length === visibleIds.length ||
          (selectedVisible.length >= 40 && next.size === selectedVisible.length));
      if (full) {
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      for (const id of visibleIds) {
        if (next.has(id)) continue;
        if (next.size >= 40) break;
        next.add(id);
      }
      return next;
    });
    setSendResults(null);
  }

  async function saveTemplate() {
    setSavingTemplate(true);
    setTemplateNote('');
    try {
      const res = await authFetch('/api/metaadmingeral/match-saudavel', {
        method: 'PUT',
        body: JSON.stringify({ connectionTemplate: templateText }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; connectionTemplate?: string };
      if (!res.ok || !data.connectionTemplate) throw new Error(data.error || 'Não foi possível guardar.');
      setTemplateText(data.connectionTemplate);
      setTemplateNote('Mensagem automática atualizada. As próximas conexões usam este texto.');
      await load();
    } catch (err) {
      setTemplateNote((err as Error).message);
    } finally {
      setSavingTemplate(false);
    }
  }

  async function sendBroadcast() {
    setSending(true);
    setSendError('');
    setSendResults(null);
    try {
      const res = await authFetch('/api/metaadmingeral/match-saudavel/disparo', {
        method: 'POST',
        body: JSON.stringify({ patientIds: [...selected], message: broadcastText }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        results?: MatchBroadcastResultRow[];
      };
      if (!res.ok || !data.results) throw new Error(data.error || 'Não foi possível disparar.');
      setSendResults(data.results);
      setConfirming(false);
      setSelected((current) => {
        const next = new Set(current);
        for (const row of data.results || []) {
          if (row.status === 'sent') next.delete(row.uid);
        }
        return next;
      });
      await load();
    } catch (err) {
      setSendError((err as Error).message);
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  const stats = snapshot?.stats;
  const previewName = selectedPeople[0]?.name || 'Ana';
  const templatePreview = renderMatchCanalChatTemplate(templateText, 'Ana', [
    'Caminhada',
    'Mesma cidade: João Pessoa',
  ]);
  const templatePreviewEmpty = renderMatchCanalChatTemplate(templateText, 'Lia', []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#4CCB7A]">
            <HeartHandshake className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Patrimônio Global</p>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-[#E8EDED]">Match Saudável</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#E8EDED]/60">
            Quem entrou em /match, em que ponto da jornada está, o que o Canal Chat disse quando duas pessoas se
            conectaram — e um disparo para quem você escolher.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              snapshot?.canalChatConnected
                ? 'border-[#4CCB7A]/30 bg-[#4CCB7A]/10 text-[#4CCB7A]'
                : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
            }`}
          >
            {snapshot?.canalChatConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            Canal Chat {snapshot?.canalChatConnected ? 'conectado' : 'desconectado'}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-[#E8EDED] hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      {loading && !snapshot ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#4CCB7A]" />
        </div>
      ) : snapshot && stats ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Entraram hoje" value={stats.enteredToday} hint={`${stats.entered} no total`} />
            <Metric label="No ar" value={stats.discoverable} hint={`${stats.onboardingDone} concluíram o onboarding`} />
            <Metric label="Conexões" value={stats.connections} hint={`${stats.connectionsWeek} nos últimos 7 dias`} />
            <Metric
              label="Sem telefone"
              value={stats.withoutPhone}
              hint={stats.pending ? `${stats.pending} pedidos em aberto` : 'não recebem o Canal Chat'}
            />
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E8EDED]/45">Funil</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                ['Entraram', stats.entered],
                ['Perfil', stats.profiles],
                ['Onboarding', stats.onboardingDone],
                ['No ar', stats.discoverable],
                ['Com conexão', stats.peopleConnected],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#4CCB7A]"
                      style={{
                        width:
                          Number(value) === 0
                            ? '0%'
                            : `${Math.max(8, Math.round((Number(value) / Math.max(1, stats.entered)) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xl font-semibold text-[#E8EDED]">{value}</p>
                  <p className="text-xs text-[#E8EDED]/50">{label}</p>
                </div>
              ))}
            </div>
            {snapshot.cities.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {snapshot.cities.map((city) => (
                  <span key={city.city} className="rounded-full bg-black/20 px-2.5 py-1 text-xs text-[#E8EDED]/75">
                    {city.city} · {city.count}
                  </span>
                ))}
              </div>
            ) : null}
            {snapshot.partial || snapshot.people.length < snapshot.totalPeople ? (
              <p className="mt-3 text-xs text-[#E8EDED]/45">
                Mostrando {snapshot.people.length} de {snapshot.totalPeople}. O telefone é lido do cadastro, sem gravar o
                número aqui.
              </p>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  tab === item.id ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]' : 'text-[#E8EDED]/65 hover:bg-white/5 hover:text-[#E8EDED]'
                }`}
              >
                {item.label}
                {item.id === 'disparo' && selected.size ? ` (${selected.size})` : ''}
              </button>
            ))}
          </div>

          {tab === 'monitor' ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E8EDED]/35" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar nome, cidade ou final do telefone"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-[#E8EDED] outline-none placeholder:text-[#E8EDED]/35 focus:border-[#4CCB7A]/50"
                  />
                </label>
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      filter === item.id ? 'bg-white/15 text-[#E8EDED]' : 'text-[#E8EDED]/50 hover:text-[#E8EDED]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-[#E8EDED]/45">
                    <tr>
                      <th className="px-3 py-3 font-medium">Pessoa</th>
                      <th className="px-3 py-3 font-medium">Estágio</th>
                      <th className="px-3 py-3 font-medium">Atividade</th>
                      <th className="px-3 py-3 font-medium">Conexões</th>
                      <th className="px-3 py-3 font-medium">Canal Chat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-[#E8EDED]/45">
                          Ninguém nesta visão ainda. A entrada passa a contar quando a pessoa abre /match logada.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((person) => (
                        <tr key={person.uid} className="border-t border-white/5">
                          <td className="px-3 py-3">
                            <p className="font-medium text-[#E8EDED]">{person.displayName}</p>
                            <p className="text-xs text-[#E8EDED]/45">{person.city || 'Cidade não informada'}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageClass(person.stage)}`}>
                              {STAGE_LABEL[person.stage]}
                            </span>
                            {person.stage === 'onboarding' && person.onboardingStep > 0 ? (
                              <p className="mt-1 text-[11px] text-[#E8EDED]/40">passo {person.onboardingStep}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-[#E8EDED]/75">
                            <p>{formatWhen(person.lastSeenAt)}</p>
                            <p className="text-[11px] text-[#E8EDED]/40">
                              {person.visitCount ? `${person.visitCount} entradas` : 'pelo perfil'}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-[#E8EDED]/75">
                            {person.connections}
                            {person.pendingIn || person.pendingOut ? (
                              <p className="text-[11px] text-[#E8EDED]/40">
                                {person.pendingIn ? `${person.pendingIn} recebidos` : ''}
                                {person.pendingIn && person.pendingOut ? ' · ' : ''}
                                {person.pendingOut ? `${person.pendingOut} enviados` : ''}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-xs text-[#E8EDED]/70">
                            {person.hasPhone ? (
                              <>
                                ···{person.phoneTail}{' '}
                                <span className="text-[#E8EDED]/40">
                                  {person.phoneSource === 'medico' ? 'médico' : 'paciente'}
                                </span>
                              </>
                            ) : (
                              <span className="text-amber-200/80">sem telefone</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === 'conexoes' ? (
            <section className="space-y-4">
              {snapshot.connections.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-[#E8EDED]/50">
                  Nenhuma conexão ainda. Quando duas pessoas se conectarem, as duas mensagens do Canal Chat aparecem aqui.
                </p>
              ) : (
                snapshot.connections.map((pair) => (
                  <article key={pair.pairKey} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-[#E8EDED]">
                        {pair.left.name} e {pair.right.name}
                      </h3>
                      <p className="text-xs text-[#E8EDED]/45">{formatWhen(pair.connectedAt)}</p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <MessageBubble
                        who={pair.left.name}
                        text={pair.messageForLeft}
                        status={pair.delivery.find((item) => item.uid === pair.left.uid)}
                      />
                      <MessageBubble
                        who={pair.right.name}
                        text={pair.messageForRight}
                        status={pair.delivery.find((item) => item.uid === pair.right.uid)}
                      />
                    </div>
                  </article>
                ))
              )}

              {snapshot.requests.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-[#E8EDED]">Pedidos em aberto</h3>
                  <ul className="mt-3 space-y-2">
                    {snapshot.requests.map((request) => (
                      <li key={request.id} className="flex flex-wrap justify-between gap-2 text-sm text-[#E8EDED]/75">
                        <span>
                          {request.fromName} → {request.toName}
                        </span>
                        <span className="text-xs text-[#E8EDED]/40">{formatWhen(request.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {snapshot.recentSends.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-[#E8EDED]">Últimos envios do Canal Chat</h3>
                  <ul className="mt-3 space-y-2">
                    {snapshot.recentSends.map((send) => (
                      <li key={send.id} className="text-sm text-[#E8EDED]/75">
                        <span className="text-[#E8EDED]">{send.name}</span>
                        <span className="text-[#E8EDED]/40">
                          {' '}
                          · {send.kind === 'broadcast' ? 'disparo' : 'conexão'} · {DELIVERY_LABEL[send.status]} ·{' '}
                          {formatWhen(send.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === 'mensagem' ? (
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold text-[#E8EDED]">Quando duas pessoas se conectam</h3>
                <p className="mt-1 text-sm text-[#E8EDED]/55">
                  Cada uma recebe o texto pelo Canal Chat. Use <code className="text-[#4CCB7A]">{'{{nome}}'}</code> para
                  quem deu match e <code className="text-[#4CCB7A]">{'{{comuns}}'}</code> para a lista. Se não houver
                  pontos em comum, o cabeçalho dessa lista some.
                </p>
                <textarea
                  value={templateText}
                  onChange={(event) => {
                    setTemplateText(event.target.value);
                    setTemplateNote('');
                  }}
                  rows={10}
                  className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-[#E8EDED] outline-none focus:border-[#4CCB7A]/50"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={savingTemplate || !templateText.trim()}
                    onClick={() => void saveTemplate()}
                    className="rounded-lg bg-[#4CCB7A] px-3 py-2 text-sm font-semibold text-[#062015] disabled:opacity-50"
                  >
                    {savingTemplate ? 'Guardando…' : 'Guardar mensagem'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateText(snapshot.defaultTemplate);
                      setTemplateNote('');
                    }}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-[#E8EDED]/75 hover:bg-white/5"
                  >
                    Restaurar padrão
                  </button>
                  {templateNote ? <p className="text-xs text-[#E8EDED]/60">{templateNote}</p> : null}
                </div>
              </div>
              <div className="space-y-3">
                <MessageBubble who="exemplo com pontos em comum" text={templatePreview} />
                <MessageBubble who="exemplo sem pontos em comum" text={templatePreviewEmpty} />
                <p className="text-xs text-[#E8EDED]/40">
                  O preview usa o texto ainda não salvo. As conexões já feitas continuam com o que foi enviado na hora.
                </p>
              </div>
            </section>
          ) : null}

          {tab === 'disparo' ? (
            <section className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#4CCB7A]" />
                  <h3 className="font-semibold text-[#E8EDED]">Disparo pelo Canal Chat</h3>
                </div>
                <p className="mt-1 text-sm text-[#E8EDED]/55">
                  A lista abaixo é a base inteira de pacientes, estejam ou não no Match. Marque quem recebe e{' '}
                  <code className="text-[#4CCB7A]">{'{{nome}}'}</code> vira o primeiro nome de cada um.
                </p>
                <textarea
                  value={broadcastText}
                  onChange={(event) => {
                    setBroadcastText(event.target.value);
                    setDraftNote('');
                    setConfirming(false);
                    setSendResults(null);
                  }}
                  rows={8}
                  placeholder="Oi {{nome}}, passa no Match Saudável hoje — tem gente nova por perto."
                  className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-[#E8EDED] outline-none placeholder:text-[#E8EDED]/30 focus:border-[#4CCB7A]/50"
                />
                <p className="mt-2 text-xs text-[#E8EDED]/40">{draftNote || 'O rascunho fica guardado nesta página.'}</p>
                {!snapshot.canalChatConnected ? (
                  <p className="mt-3 text-sm text-amber-200">
                    O Canal Chat está desconectado. Conecte em Automações → Canal Chat antes de disparar.
                  </p>
                ) : null}
                {selected.size > 40 ? (
                  <p className="mt-3 text-sm text-amber-200">Dá para disparar até 40 pessoas por vez. Tire algumas da seleção.</p>
                ) : null}
                {sendError ? <p className="mt-3 text-sm text-red-200">{sendError}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {confirming ? (
                    <>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => void sendBroadcast()}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#4CCB7A] px-3 py-2 text-sm font-semibold text-[#062015] disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {sending ? 'Enviando…' : `Enviar agora para ${selected.size}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="rounded-lg px-3 py-2 text-sm text-[#E8EDED]/70"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={!broadcastText.trim() || selected.size === 0 || selected.size > 40 || !snapshot.canalChatConnected}
                      onClick={() => setConfirming(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#4CCB7A] px-3 py-2 text-sm font-semibold text-[#062015] disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      Disparar para {selected.size || '…'}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-[#E8EDED]">Selecionados neste disparo</h3>
                  {selectedPeople.length === 0 ? (
                    <p className="mt-2 text-sm text-[#E8EDED]/45">Marque pacientes na lista da base.</p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {selectedPeople.map((person) => (
                        <li key={person.id}>
                          <button
                            type="button"
                            onClick={() => toggle(person.id)}
                            className="rounded-full bg-black/25 px-2.5 py-1 text-xs text-[#E8EDED]/80 hover:bg-black/40"
                          >
                            {person.name}
                            {person.hasPhone ? '' : ' · sem telefone'} ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {broadcastText.trim() ? (
                  <MessageBubble who={previewName} text={previewBroadcast(broadcastText, previewName)} />
                ) : null}
                {sendResults ? (
                  <ul className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                    {sendResults.map((row) => (
                      <li key={row.uid} className="flex justify-between gap-3 py-1 text-[#E8EDED]/80">
                        <span>{row.name}</span>
                        <span className={row.status === 'sent' ? 'text-[#4CCB7A]' : 'text-amber-200'}>
                          {DELIVERY_LABEL[row.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {snapshot.broadcasts.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-[#E8EDED]">Disparos anteriores</h3>
                    <ul className="mt-3 space-y-3">
                      {snapshot.broadcasts.map((item) => (
                        <li key={item.id} className="text-sm text-[#E8EDED]/70">
                          <p className="line-clamp-2 whitespace-pre-wrap text-[#E8EDED]/85">{item.message}</p>
                          <p className="mt-1 text-xs text-[#E8EDED]/40">
                            {formatWhen(item.createdAt)} · {item.sent} enviadas
                            {item.noPhone ? ` · ${item.noPhone} sem telefone` : ''}
                            {item.failed ? ` · ${item.failed} falharam` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E8EDED]/35" />
                    <input
                      value={patientQuery}
                      onChange={(event) => setPatientQuery(event.target.value)}
                      placeholder="Buscar na base de pacientes"
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-[#E8EDED] outline-none placeholder:text-[#E8EDED]/35 focus:border-[#4CCB7A]/50"
                    />
                  </label>
                  {(
                    [
                      ['all', 'Todos'],
                      ['phone', 'Com telefone'],
                      ['nophone', 'Sem telefone'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPatientFilter(id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        patientFilter === id ? 'bg-white/15 text-[#E8EDED]' : 'text-[#E8EDED]/50 hover:text-[#E8EDED]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <p className="text-xs text-[#E8EDED]/45">
                    {patients ? `${filteredPatients.length} de ${patients.length}` : 'Carregando a base'}
                  </p>
                </div>
                {patientsError ? (
                  <p className="mt-3 text-sm text-red-200">
                    {patientsError}{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        patientsRequested.current = false;
                        setPatients(null);
                        void loadPatients();
                      }}
                    >
                      Tentar de novo
                    </button>
                  </p>
                ) : null}
                {patientsLoading && !patients ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4CCB7A]" />
                  </div>
                ) : (
                  <div className="mt-3 max-h-[32rem] overflow-auto rounded-xl border border-white/10">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-[#0d1c33] text-xs uppercase tracking-wide text-[#E8EDED]/45">
                        <tr>
                          <th className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={visibleSelectionFull}
                              onChange={toggleVisiblePatients}
                              aria-label="Selecionar pacientes visíveis"
                            />
                          </th>
                          <th className="px-3 py-3 font-medium">Paciente</th>
                          <th className="px-3 py-3 font-medium">Cidade</th>
                          <th className="px-3 py-3 font-medium">Telefone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPatients.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-[#E8EDED]/45">
                              Nenhum paciente nesta busca.
                            </td>
                          </tr>
                        ) : (
                          filteredPatients.map((person) => (
                            <tr
                              key={person.id}
                              onClick={() => toggle(person.id)}
                              className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                            >
                              <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selected.has(person.id)}
                                  onChange={() => toggle(person.id)}
                                  aria-label={`Selecionar ${person.name}`}
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-[#E8EDED]">{person.name}</p>
                                {patientMark(person) ? (
                                  <p className="text-[11px] text-[#E8EDED]/40">{patientMark(person)}</p>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 text-[#E8EDED]/70">{person.city || '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-[#E8EDED]/70">
                                {person.hasPhone ? `···${person.phoneTail}` : <span className="text-amber-200/80">sem telefone</span>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function patientMark(person: MatchBroadcastPatient): string | null {
  if (person.treatment === 'abandono') return 'Abandono';
  if (person.status === 'arquivado') return 'Arquivado';
  if (person.status === 'inativo') return 'Inativo';
  return null;
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-[#E8EDED]/45">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#E8EDED]">{value}</p>
      <p className="mt-1 text-xs text-[#E8EDED]/45">{hint}</p>
    </div>
  );
}

function MessageBubble({
  who,
  text,
  status,
}: {
  who: string;
  text: string;
  status?: { status: keyof typeof DELIVERY_LABEL; sentMessage: string | null } | undefined;
}) {
  const changed = Boolean(status?.sentMessage && status.sentMessage !== text);
  return (
    <div className="rounded-2xl rounded-tl-md bg-[#073528] px-3 py-3 text-sm text-[#E8EDED]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#4CCB7A]">Para {who}</p>
      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{text || '—'}</p>
      {status ? (
        <p className="mt-2 text-[11px] text-[#E8EDED]/55">
          {DELIVERY_LABEL[status.status]}
          {changed ? ' · o texto atual é diferente do que foi enviado' : ''}
        </p>
      ) : null}
      {changed && status?.sentMessage ? (
        <p className="mt-2 whitespace-pre-wrap border-t border-white/10 pt-2 text-xs text-[#E8EDED]/55">{status.sentMessage}</p>
      ) : null}
    </div>
  );
}
