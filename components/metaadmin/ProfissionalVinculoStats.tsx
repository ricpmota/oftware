'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, Clock3, Users } from 'lucide-react';
import { labPatientInitials } from '@/components/LabResultCard';
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
import { normalizeAuthPhotoUrl } from '@/lib/firebase/resolvePacienteAuthUidForPhoto';
import type { PacienteCompleto } from '@/types/obesidade';

export type ProfissionalStats = {
  total: number;
  pendente: number | null;
  ativo: number | null;
  loading: boolean;
};

export function nutriCardapioPronto(cardapio?: CardapioResumo): boolean {
  if (!cardapio) return false;
  return cardapio.temPlano && cardapio.refeicoes.every((refeicao) => refeicao.preenchida);
}

export function personalTreinoPronto(treino?: TreinoResumo): boolean {
  if (!treino) return false;
  return treino.total > 0 && treino.dias.some((dia) => dia.temTreino);
}

export function profissionalEstaAtivo(
  kind: 'nutricionista' | 'personal',
  cardapio?: CardapioResumo,
  treino?: TreinoResumo
): boolean {
  return kind === 'nutricionista' ? nutriCardapioPronto(cardapio) : personalTreinoPronto(treino);
}

export function pluralPt(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

export function ativoHintForKind(kind: 'nutricionista' | 'personal'): string {
  return kind === 'nutricionista' ? 'cardápio pronto' : 'treino pronto';
}

export type FiltroVinculoMobile = 'todos' | 'pendente' | 'ativo';

function normalizePhotoUrl(url?: string | null): string | null {
  return normalizeAuthPhotoUrl(url);
}

export function VinculoFotoAvatar({
  name,
  photoUrl,
  tone,
}: {
  name: string;
  photoUrl?: string | null;
  tone: 'nutri' | 'personal' | 'medico';
}) {
  const src = normalizePhotoUrl(photoUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const ring =
    tone === 'nutri'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : tone === 'personal'
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : 'bg-sky-50 text-sky-700 ring-sky-100';
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        src={src}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover object-center ring-2 ring-white shadow-sm"
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ${ring}`}
      aria-hidden
    >
      {labPatientInitials(name)}
    </div>
  );
}

export function VinculoMobileFiltro({
  value,
  onChange,
  className = '',
}: {
  value: FiltroVinculoMobile;
  onChange: (value: FiltroVinculoMobile) => void;
  className?: string;
}) {
  const opcoes: { id: FiltroVinculoMobile; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'ativo', label: 'Ativos' },
  ];
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {opcoes.map((opcao) => {
        const ativo = value === opcao.id;
        const selected =
          opcao.id === 'pendente'
            ? 'bg-amber-100 text-amber-800 ring-amber-200'
            : opcao.id === 'ativo'
              ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
              : 'bg-slate-800 text-white ring-slate-800';
        return (
          <button
            key={opcao.id}
            type="button"
            onClick={() => onChange(opcao.id)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 transition-colors ${
              ativo ? selected : 'bg-white text-slate-600 ring-slate-200'
            }`}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}

export type VinculoPacienteRenderResumo = {
  cardapio?: CardapioResumo;
  treino?: TreinoResumo;
  consulta?: ConsultaAgendaResumo;
  photoUrl?: string | null;
  loading: boolean;
  loadingConsulta: boolean;
};

export function VinculoMobilePacientesList<T extends { paciente: PacienteCompleto }>({
  kind,
  professionalId,
  patients,
  filtro,
  onFiltroChange,
  renderItem,
}: {
  kind: 'nutricionista' | 'personal';
  professionalId?: string;
  patients: T[];
  filtro: FiltroVinculoMobile;
  onFiltroChange: (value: FiltroVinculoMobile) => void;
  renderItem: (item: T, resumo: VinculoPacienteRenderResumo) => ReactNode;
}) {
  const { loading, cardapios, treinos } = useAndamentoServicoStats(kind, patients, patients.length);
  const photosByPacienteId = usePacienteAuthPhotos(patients.map((item) => item.paciente));
  const [consultas, setConsultas] = useState<Record<string, ConsultaAgendaResumo>>({});
  const [loadingConsulta, setLoadingConsulta] = useState(false);

  useEffect(() => {
    if (kind !== 'nutricionista' || !professionalId) {
      setConsultas({});
      setLoadingConsulta(false);
      return;
    }
    let cancelled = false;
    setLoadingConsulta(true);
    void (async () => {
      const data = await loadConsultasPorNutri(professionalId);
      if (cancelled) return;
      setConsultas(data);
      setLoadingConsulta(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, professionalId]);

  const filtered = patients.filter((item) => {
    if (filtro === 'todos') return true;
    if (loading) return false;
    const ativo = profissionalEstaAtivo(kind, cardapios[item.paciente.id], treinos[item.paciente.id]);
    return filtro === 'ativo' ? ativo : !ativo;
  });

  return (
    <div className="space-y-2">
      <VinculoMobileFiltro value={filtro} onChange={onFiltroChange} className="mb-1" />
      {filtro !== 'todos' && loading ? (
        <p className="py-3 text-center text-xs text-gray-500">Filtrando pacientes…</p>
      ) : (
        <>
          {filtered.map((item) => (
            <Fragment key={item.paciente.id}>
              {renderItem(item, {
                cardapio: cardapios[item.paciente.id],
                treino: treinos[item.paciente.id],
                consulta: consultaResumoForPaciente(consultas, item.paciente),
                photoUrl: photosByPacienteId[item.paciente.id] ?? null,
                loading,
                loadingConsulta: kind === 'nutricionista' && loadingConsulta,
              })}
            </Fragment>
          ))}
          {filtro !== 'todos' && !loading && filtered.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-500">
              {filtro === 'pendente' ? 'Nenhum paciente pendente' : 'Nenhum paciente ativo'}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function StatsCompact({ stats }: { stats: ProfissionalStats }) {
  return (
    <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">
      <span>
        {stats.total} {pluralPt(stats.total, 'paciente', 'pacientes')}
      </span>
      {stats.loading ? (
        <span className="text-slate-400"> · …</span>
      ) : stats.pendente != null && stats.ativo != null ? (
        <>
          <span className="text-amber-700">
            {' '}
            · {stats.pendente} {pluralPt(stats.pendente, 'pendente', 'pendentes')}
          </span>
          <span className="text-emerald-700">
            {' '}
            · {stats.ativo} {pluralPt(stats.ativo, 'ativo', 'ativos')}
          </span>
        </>
      ) : null}
    </p>
  );
}

const STAT_TONES = {
  slate: {
    wrap: 'bg-white/90 ring-slate-200/80',
    bar: 'bg-gradient-to-r from-slate-400 to-slate-300',
    iconWrap: 'bg-slate-100 text-slate-600',
    value: 'text-slate-900',
    label: 'text-slate-500',
  },
  amber: {
    wrap: 'bg-amber-50/90 ring-amber-200/70',
    bar: 'bg-gradient-to-r from-amber-400 to-amber-300',
    iconWrap: 'bg-amber-100 text-amber-700',
    value: 'text-amber-950',
    label: 'text-amber-700/90',
  },
  emerald: {
    wrap: 'bg-emerald-50/90 ring-emerald-200/70',
    bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    value: 'text-emerald-950',
    label: 'text-emerald-700/90',
  },
} as const;

function StatTile({
  label,
  value,
  hint,
  tone,
  icon: Icon,
  loading,
  compact,
  fill,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: keyof typeof STAT_TONES;
  icon: typeof Users;
  loading?: boolean;
  compact?: boolean;
  fill?: boolean;
}) {
  const t = STAT_TONES[tone];
  return (
    <div
      title={hint}
      className={`relative overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_20px_-12px_rgba(15,23,42,0.18)] ring-1 backdrop-blur-sm ${t.wrap} ${
        fill ? 'min-w-0 w-full px-2.5 py-2.5' : compact ? 'w-[4.5rem] px-2 py-2' : 'w-[5.6rem] px-3 py-2.5'
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${t.bar}`} />
      <span
        className={`mb-1.5 inline-flex items-center justify-center rounded-lg ${t.iconWrap} ${
          compact && !fill ? 'h-5 w-5' : 'h-6 w-6'
        }`}
      >
        <Icon className={compact && !fill ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.25} />
      </span>
      <p
        className={`font-semibold leading-none tabular-nums tracking-tight ${t.value} ${
          compact && !fill ? 'text-lg' : 'text-[1.375rem]'
        } ${loading ? 'animate-pulse text-slate-300' : ''}`}
      >
        {value}
      </p>
      <p className={`mt-1 font-semibold uppercase tracking-[0.08em] ${t.label} ${compact && !fill ? 'text-[9px]' : 'text-[10px]'}`}>
        {label}
      </p>
    </div>
  );
}

export function StatsCards({
  stats,
  ativoHint,
  className = '',
  compact,
  fill,
}: {
  stats: ProfissionalStats;
  ativoHint: string;
  className?: string;
  compact?: boolean;
  fill?: boolean;
}) {
  const value = (n: number | null) => (stats.loading || n == null ? '—' : String(n));
  return (
    <div className={`${fill ? 'grid w-full grid-cols-3 gap-2' : 'flex shrink-0 items-stretch gap-2'} ${className}`}>
      <StatTile
        label="Pacientes"
        value={String(stats.total)}
        tone="slate"
        icon={Users}
        compact={compact}
        fill={fill}
      />
      <StatTile
        label="Pendentes"
        value={value(stats.pendente)}
        tone="amber"
        icon={Clock3}
        loading={stats.loading}
        compact={compact}
        fill={fill}
      />
      <StatTile
        label="Ativos"
        value={value(stats.ativo)}
        hint={ativoHint}
        tone="emerald"
        icon={CircleCheck}
        loading={stats.loading}
        compact={compact}
        fill={fill}
      />
    </div>
  );
}

export function useAndamentoServicoStats(
  kind: 'nutricionista' | 'personal',
  patients: { paciente: PacienteCompleto }[] | undefined,
  totalFallback: number
): ProfissionalStats & {
  cardapios: Record<string, CardapioResumo>;
  treinos: Record<string, TreinoResumo>;
} {
  const [cardapios, setCardapios] = useState<Record<string, CardapioResumo>>({});
  const [treinos, setTreinos] = useState<Record<string, TreinoResumo>>({});
  const patientsRef = useRef(patients);
  patientsRef.current = patients;
  const idsKey = useMemo(
    () => (patients ?? []).map((item) => item.paciente.id).join('|'),
    [patients]
  );

  useEffect(() => {
    const list = patientsRef.current;
    if (!list || list.length === 0) return;
    let cancelled = false;
    void (async () => {
      if (kind === 'nutricionista') {
        const entries = await mapPool(list, 4, async (item) => {
          const data = await loadCardapioResumo(item.paciente.id);
          return [item.paciente.id, data] as const;
        });
        if (!cancelled) setCardapios(Object.fromEntries(entries));
        return;
      }
      const entries = await mapPool(list, 3, async (item) => {
        const data = await loadTreinoResumo(item.paciente);
        return [item.paciente.id, data] as const;
      });
      if (!cancelled) setTreinos(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, idsKey]);

  if (!patients) {
    return {
      total: totalFallback,
      pendente: null,
      ativo: null,
      loading: false,
      cardapios,
      treinos,
    };
  }
  if (patients.length === 0) {
    return { total: 0, pendente: 0, ativo: 0, loading: false, cardapios, treinos };
  }
  const ready = patients.every((item) =>
    kind === 'nutricionista'
      ? Object.prototype.hasOwnProperty.call(cardapios, item.paciente.id)
      : Object.prototype.hasOwnProperty.call(treinos, item.paciente.id)
  );
  if (!ready) {
    return {
      total: patients.length,
      pendente: null,
      ativo: null,
      loading: true,
      cardapios,
      treinos,
    };
  }
  let ativo = 0;
  for (const item of patients) {
    if (profissionalEstaAtivo(kind, cardapios[item.paciente.id], treinos[item.paciente.id])) {
      ativo += 1;
    }
  }
  return {
    total: patients.length,
    ativo,
    pendente: patients.length - ativo,
    loading: false,
    cardapios,
    treinos,
  };
}

export function MedicoAndamentoStatsBlock({
  kind,
  patients,
  totalFallback,
}: {
  kind: 'nutricionista' | 'personal';
  patients?: { paciente: PacienteCompleto }[];
  totalFallback: number;
}) {
  const stats = useAndamentoServicoStats(kind, patients, totalFallback);
  return <StatsCompact stats={stats} />;
}
