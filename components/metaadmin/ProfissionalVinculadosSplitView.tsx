'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dumbbell,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Search,
  Stethoscope,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { labPatientInitials } from '@/components/LabResultCard';
import { PacienteVinculoListItem } from '@/components/metaadmin/PacienteVinculoListItem';
import {
  ativoHintForKind,
  profissionalEstaAtivo,
  StatsCards,
  StatsCompact,
  type ProfissionalStats,
} from '@/components/metaadmin/ProfissionalVinculoStats';
import { normalizeAuthPhotoUrl } from '@/lib/firebase/resolvePacienteAuthUidForPhoto';
import {
  consultaResumoForPaciente,
  loadCardapioResumo,
  loadConsultasPorNutri,
  loadTreinoResumo,
  mapPool,
  type CardapioResumo,
  type ConsultaAgendaResumo,
  type TreinoResumo,
} from '@/lib/metaadmin/profissionalPacienteResumo';
import { usePacienteAuthPhotos } from '@/lib/metaadmin/usePacienteAuthPhotos';
import type { PacienteCompleto } from '@/types/obesidade';

export type ProfissionalVinculadoListItem = {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  registroNumero?: string;
  fotoPerfilUrl?: string | null;
  cidades?: { cidade: string; estado: string }[];
  instagramUsuario?: string;
  nomeLocal?: string;
  endereco?: string;
  qtdPacientes: number;
};

export type PacienteCompartilhadoItem = {
  paciente: PacienteCompleto;
  dataCompartilhamento: Date;
  status?: string;
};

type Props = {
  kind: 'nutricionista' | 'personal';
  listKind?: 'profissional' | 'medico';
  professionals: ProfissionalVinculadoListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  patients: PacienteCompartilhadoItem[];
  loadingPatients: boolean;
  patientPhotoByUserId?: Record<string, string | null>;
  onViewPatient: (paciente: PacienteCompleto) => void;
  onEndShare?: (pacienteId: string, professionalId: string) => void;
  onRemoveVinculo?: (professionalId: string) => void;
  loadingAction?: boolean;
  patientsByProfessional?: Map<string, PacienteCompartilhadoItem[]>;
  onEnsurePatients?: (professionalId: string) => void;
};

function formatPhone(phone?: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return phone?.trim() || null;
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone?.trim() || null;
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  try {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (
      typeof value === 'object' &&
      value &&
      'toDate' in value &&
      typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
      const d = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function dataSolicitacaoPaciente(paciente: PacienteCompleto, fallback?: Date): Date | null {
  return (
    toDateSafe(paciente.dataCadastro) ||
    toDateSafe(paciente.dadosIdentificacao?.dataCadastro) ||
    toDateSafe(fallback) ||
    null
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesCadastro(date: Date | null, query: string): boolean {
  if (!date || !query.trim()) return false;
  const br = date.toLocaleDateString('pt-BR');
  if (normalizeSearch(br).includes(normalizeSearch(query))) return true;
  const qDigits = query.replace(/\D/g, '');
  if (qDigits.length < 2) return false;
  const dmy = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return dmy.includes(qDigits) || ymd.includes(qDigits);
}

type FiltroStatusLista = 'todos' | 'ativo' | 'pendente';

function Avatar({
  name,
  photoUrl,
  size = 'md',
  tone,
}: {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  tone: 'nutri' | 'personal' | 'medico';
}) {
  const dim = size === 'lg' ? 'h-16 w-16 text-lg' : size === 'md' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
  const ring =
    tone === 'nutri'
      ? 'ring-emerald-100 bg-emerald-50 text-emerald-700'
      : tone === 'personal'
        ? 'ring-amber-100 bg-amber-50 text-amber-700'
        : 'ring-sky-100 bg-sky-50 text-sky-700';
  const src = normalizeAuthPhotoUrl(photoUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover object-center ring-2 ring-white shadow-sm`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ${ring}`}
      aria-hidden
    >
      {labPatientInitials(name)}
    </div>
  );
}

export default function ProfissionalVinculadosSplitView({
  kind,
  listKind = 'profissional',
  professionals,
  selectedId,
  onSelect,
  patients,
  loadingPatients,
  onViewPatient,
  onEndShare,
  onRemoveVinculo,
  loadingAction,
  patientsByProfessional,
  onEnsurePatients,
}: Props) {
  const isNutri = kind === 'nutricionista';
  const isMedicoList = listKind === 'medico';
  const avatarTone = isMedicoList ? 'medico' : isNutri ? 'nutri' : 'personal';
  const listTitle = isMedicoList ? 'Médicos' : isNutri ? 'Nutricionistas' : 'Personal trainers';
  const registroLabel = isMedicoList ? 'CRM' : isNutri ? 'CRN' : 'CREF';
  const selected = professionals.find((p) => p.id === selectedId) ?? null;
  const [cardapios, setCardapios] = useState<Record<string, CardapioResumo>>({});
  const [treinos, setTreinos] = useState<Record<string, TreinoResumo>>({});
  const [consultas, setConsultas] = useState<Record<string, ConsultaAgendaResumo>>({});
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [buscaPacientes, setBuscaPacientes] = useState('');
  const [filtroStatusLista, setFiltroStatusLista] = useState<FiltroStatusLista>('todos');
  const ensuredRef = useRef(new Set<string>());
  const cardapiosRef = useRef(cardapios);
  const treinosRef = useRef(treinos);
  cardapiosRef.current = cardapios;
  treinosRef.current = treinos;
  const authPhotosByPacienteId = usePacienteAuthPhotos(patients.map((item) => item.paciente));

  const patientsByPro = useMemo(() => {
    if (patientsByProfessional) return patientsByProfessional;
    const fallback = new Map<string, PacienteCompartilhadoItem[]>();
    if (selectedId) fallback.set(selectedId, patients);
    return fallback;
  }, [patientsByProfessional, selectedId, patients]);

  const allPatientItems = useMemo(() => {
    const out: PacienteCompartilhadoItem[] = [];
    const seen = new Set<string>();
    for (const list of patientsByPro.values()) {
      for (const item of list) {
        const id = item.paciente?.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(item);
      }
    }
    return out;
  }, [patientsByPro]);

  const allPatientKey = useMemo(
    () => allPatientItems.map((item) => item.paciente.id).join('|'),
    [allPatientItems]
  );

  useEffect(() => {
    setBuscaPacientes('');
    setFiltroStatusLista('todos');
  }, [selectedId]);

  const pacientesFiltrados = useMemo(() => {
    const q = normalizeSearch(buscaPacientes);
    return patients.filter((item) => {
      if (!item.paciente) return false;
      const p = item.paciente;
      const ativo = profissionalEstaAtivo(kind, cardapios[p.id], treinos[p.id]);
      const pendente = !ativo;
      const matchStatus =
        filtroStatusLista === 'todos' ||
        (filtroStatusLista === 'pendente' && pendente) ||
        (filtroStatusLista === 'ativo' && ativo);
      if (!matchStatus) return false;
      if (!q) return true;
      const nome = normalizeSearch(p.dadosIdentificacao?.nomeCompleto || p.nome || '');
      const cadastro = dataSolicitacaoPaciente(p, item.dataCompartilhamento);
      return nome.includes(q) || matchesCadastro(cadastro, buscaPacientes);
    });
  }, [patients, buscaPacientes, filtroStatusLista, kind, cardapios, treinos]);

  const statsByProfessionalId = useMemo(() => {
    const result = new Map<string, ProfissionalStats>();
    for (const pro of professionals) {
      const list = patientsByPro.get(pro.id);
      const total = list ? list.length : pro.qtdPacientes;
      if (!list) {
        result.set(pro.id, {
          total,
          pendente: null,
          ativo: null,
          loading: pro.qtdPacientes > 0,
        });
        continue;
      }
      if (list.length === 0) {
        result.set(pro.id, { total: 0, pendente: 0, ativo: 0, loading: false });
        continue;
      }
      const ready = list.every((item) =>
        isNutri
          ? Object.prototype.hasOwnProperty.call(cardapios, item.paciente.id)
          : Object.prototype.hasOwnProperty.call(treinos, item.paciente.id)
      );
      if (!ready) {
        result.set(pro.id, {
          total: list.length,
          pendente: null,
          ativo: null,
          loading: true,
        });
        continue;
      }
      let ativo = 0;
      for (const item of list) {
        if (profissionalEstaAtivo(kind, cardapios[item.paciente.id], treinos[item.paciente.id])) {
          ativo += 1;
        }
      }
      result.set(pro.id, {
        total: list.length,
        ativo,
        pendente: list.length - ativo,
        loading: false,
      });
    }
    return result;
  }, [professionals, patientsByPro, isNutri, kind, cardapios, treinos]);

  const selectedMissingResumo = patients.some((item) =>
    isNutri
      ? !Object.prototype.hasOwnProperty.call(cardapios, item.paciente.id)
      : !Object.prototype.hasOwnProperty.call(treinos, item.paciente.id)
  );

  useEffect(() => {
    if (!onEnsurePatients) return;
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) return;
    for (const pro of professionals) {
      if (ensuredRef.current.has(pro.id)) continue;
      ensuredRef.current.add(pro.id);
      onEnsurePatients(pro.id);
    }
  }, [professionals, onEnsurePatients]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    const firstId = professionals[0]?.id;
    if (!firstId) return;
    const stillThere = selectedId ? professionals.some((p) => p.id === selectedId) : false;
    if (!stillThere) {
      onSelect(firstId);
    }
    // onSelect é recriado no pai; selecionar só quando a lista/id mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, professionals]);

  useEffect(() => {
    let cancelled = false;
    const items = allPatientItems;
    if (items.length === 0) {
      return;
    }
    const missing = items.filter((item) =>
      isNutri
        ? !Object.prototype.hasOwnProperty.call(cardapiosRef.current, item.paciente.id)
        : !Object.prototype.hasOwnProperty.call(treinosRef.current, item.paciente.id)
    );
    if (missing.length === 0) {
      return;
    }
    void (async () => {
      if (isNutri) {
        const entries = await mapPool(missing, 4, async (item) => {
          const data = await loadCardapioResumo(item.paciente.id);
          return [item.paciente.id, data] as const;
        });
        if (!cancelled) {
          setCardapios((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        }
        return;
      }
      const entries = await mapPool(missing, 3, async (item) => {
        const data = await loadTreinoResumo(item.paciente);
        return [item.paciente.id, data] as const;
      });
      if (!cancelled) {
        setTreinos((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNutri, allPatientKey, allPatientItems]);

  useEffect(() => {
    if (!isNutri || !selectedId) {
      setConsultas({});
      setLoadingConsultas(false);
      return;
    }
    let cancelled = false;
    setLoadingConsultas(true);
    void (async () => {
      const data = await loadConsultasPorNutri(selectedId);
      if (cancelled) return;
      setConsultas(data);
      setLoadingConsultas(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNutri, selectedId]);

  const accent = isNutri
    ? {
        selected: 'border-emerald-200 bg-emerald-50',
        icon: 'text-emerald-600',
        chip: 'bg-emerald-100 text-emerald-800',
      }
    : {
        selected: 'border-amber-200 bg-amber-50',
        icon: 'text-amber-600',
        chip: 'bg-amber-100 text-amber-800',
      };

  const phone = formatPhone(selected?.telefone);

  return (
    <div className="hidden lg:grid min-h-[calc(100vh-16rem)] grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50/70">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">
            {listTitle}
          </h3>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
            {professionals.length}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {professionals.map((pro) => {
            const active = pro.id === selectedId;
            return (
              <button
                key={pro.id}
                type="button"
                onClick={() => onSelect(pro.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? accent.selected
                    : 'border-transparent bg-white hover:border-slate-200 hover:bg-white'
                }`}
              >
                <Avatar
                  name={pro.nome}
                  photoUrl={pro.fotoPerfilUrl}
                  size="md"
                  tone={avatarTone}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{pro.nome}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {pro.registroNumero ? `${registroLabel} ${pro.registroNumero}` : pro.email || 'Sem registro'}
                  </p>
                  <StatsCompact
                    stats={
                      statsByProfessionalId.get(pro.id) ?? {
                        total: pro.qtdPacientes,
                        pendente: null,
                        ativo: null,
                        loading: pro.qtdPacientes > 0,
                      }
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-slate-500">
            {isMedicoList ? (
              <Stethoscope className="mb-3 h-10 w-10 text-slate-300" />
            ) : isNutri ? (
              <UtensilsCrossed className="mb-3 h-10 w-10 text-slate-300" />
            ) : (
              <Dumbbell className="mb-3 h-10 w-10 text-slate-300" />
            )}
            <p className="text-sm font-medium">
              {isMedicoList ? 'Selecione um médico na lista' : 'Selecione um profissional na lista'}
            </p>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-slate-200 bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/30 px-6 py-5">
              <div className="flex items-start justify-between gap-5">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <Avatar
                    name={selected.nome}
                    photoUrl={selected.fotoPerfilUrl}
                    size="lg"
                    tone={avatarTone}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold tracking-tight text-slate-900">
                      {selected.nome}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                      {selected.registroNumero ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${accent.chip}`}>
                          {registroLabel} {selected.registroNumero}
                        </span>
                      ) : null}
                      {selected.email ? (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{selected.email}</span>
                        </span>
                      ) : null}
                      {phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {phone}
                        </span>
                      ) : null}
                      {selected.instagramUsuario ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Instagram className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          @{selected.instagramUsuario.replace(/^@/, '')}
                        </span>
                      ) : null}
                    </div>
                    {selected.cidades && selected.cidades.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selected.cidades.slice(0, 6).map((c, i) => (
                          <span
                            key={`${c.cidade}-${c.estado}-${i}`}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            <MapPin className="h-3 w-3 opacity-70" />
                            {c.cidade}, {c.estado}
                          </span>
                        ))}
                        {selected.cidades.length > 6 ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            +{selected.cidades.length - 6}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {selected.nomeLocal || selected.endereco ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {[selected.nomeLocal, selected.endereco].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <StatsCards
                    stats={
                      statsByProfessionalId.get(selected.id) ?? {
                        total: selected.qtdPacientes,
                        pendente: null,
                        ativo: null,
                        loading: selected.qtdPacientes > 0,
                      }
                    }
                    ativoHint={ativoHintForKind(kind)}
                  />
                  {onRemoveVinculo ? (
                    <button
                      type="button"
                      onClick={() => onRemoveVinculo(selected.id)}
                      disabled={loadingAction}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-500 ring-1 ring-rose-100 hover:bg-rose-50 disabled:opacity-50"
                      title="Excluir vínculo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <Users className={`h-4 w-4 ${accent.icon}`} />
                <h4 className="text-sm font-semibold text-slate-800">
                  Pacientes compartilhados
                </h4>
                <span className="text-xs text-slate-400">
                  {buscaPacientes.trim() || filtroStatusLista !== 'todos'
                    ? `(${pacientesFiltrados.length} de ${patients.length})`
                    : `(${patients.length})`}
                </span>
              </div>

              {patients.length > 0 ? (
                <div className="mb-4 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={buscaPacientes}
                      onChange={(e) => setBuscaPacientes(e.target.value)}
                      placeholder="Buscar por nome ou data de cadastro"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                    />
                    {buscaPacientes ? (
                      <button
                        type="button"
                        onClick={() => setBuscaPacientes('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Limpar busca"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'todos', label: 'Todos' },
                        { id: 'ativo', label: 'Ativo' },
                        { id: 'pendente', label: 'Pendente' },
                      ] as const
                    ).map((opt) => {
                      const active = filtroStatusLista === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFiltroStatusLista(opt.id)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            active
                              ? accent.chip
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {loadingPatients ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-500">
                  <div className={`mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 ${isNutri ? 'border-t-emerald-500' : 'border-t-amber-500'}`} />
                  Carregando pacientes…
                </div>
              ) : patients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Nenhum paciente compartilhado com este profissional.
                </div>
              ) : pacientesFiltrados.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Nenhum paciente encontrado com esse filtro.
                </div>
              ) : (
                <div className="space-y-2">
                  {pacientesFiltrados.map((item) => {
                    const p = item.paciente;
                    return (
                      <PacienteVinculoListItem
                        key={p.id}
                        kind={kind}
                        paciente={p}
                        dataCompartilhamento={item.dataCompartilhamento}
                        shareStatus={item.status}
                        photoUrl={authPhotosByPacienteId[p.id] ?? null}
                        cardapio={cardapios[p.id]}
                        treino={treinos[p.id]}
                        consulta={consultaResumoForPaciente(consultas, p)}
                        loadingResumo={selectedMissingResumo}
                        loadingConsulta={isNutri && loadingConsultas}
                        onOpenPatient={() => onViewPatient(p)}
                        onEndShare={
                          onEndShare && item.status === 'ativo' && selected
                            ? () => onEndShare(p.id, selected.id)
                            : undefined
                        }
                        loadingAction={loadingAction}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
