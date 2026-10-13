'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertCircle, BadgeCheck, Loader2, RefreshCw, Search } from 'lucide-react';
import { AutomacoesInfoNote } from '@/components/metaadmingeral/automacoes/automacoesCenterUi';

type Props = {
  user: User | null;
};

type VerifiedPatient = {
  id: string;
  nome: string;
  phone?: string;
  verifiedAt?: string;
};

type DoctorGroup = {
  medicoId: string;
  medicoNome: string;
  patients: VerifiedPatient[];
};

function formatVerifiedAt(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CanalChatVerificacaoPanel({ user }: Props) {
  const [groups, setGroups] = useState<DoctorGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const load = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/canal-chat/verificacoes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        groups?: DoctorGroup[];
        total?: number;
      } | null;
      if (!res.ok || data?.ok === false || !Array.isArray(data?.groups)) {
        throw new Error(data?.error || 'Não foi possível carregar as verificações.');
      }
      setGroups(data.groups);
      setTotal(typeof data.total === 'number' ? data.total : data.groups.reduce((n, g) => n + g.patients.length, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar verificações.');
      setGroups([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        patients: group.patients.filter((patient) => {
          const hay = [patient.nome, patient.phone, group.medicoNome, group.medicoId]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((group) => group.patients.length > 0);
  }, [busca, groups]);

  const totalFiltrado = filtrados.reduce((n, group) => n + group.patients.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#E8EDED]">Verificação do Canal Chat</h3>
          <p className="mt-1 text-sm text-[#E8EDED]/60">
            Pacientes que responderam OK e confirmaram o canal, agrupados por médico.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !user}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#E8EDED] hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <AutomacoesInfoNote>
        Só entram nesta lista pacientes com <strong className="font-semibold text-[#E8EDED]">Canal Chat confirmado</strong>.
        A confirmação vale para cobranças e avisos futuros.
      </AutomacoesInfoNote>

      <label className="relative block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E8EDED]/40" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar médico, paciente ou telefone…"
          className="w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/40"
        />
      </label>

      {!user ? (
        <p className="text-sm text-[#E8EDED]/60">Faça login para ver as verificações.</p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60 py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando verificações…
        </div>
      ) : error ? (
        <p className="flex items-center gap-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
          <BadgeCheck className="h-8 w-8 text-[#E8EDED]/30 mx-auto mb-3" />
          <p className="text-sm text-[#E8EDED]/60">
            {total === 0
              ? 'Nenhum paciente confirmou o Canal Chat ainda.'
              : 'Nenhum resultado para essa busca.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-[#E8EDED]/45">
            {totalFiltrado} paciente{totalFiltrado === 1 ? '' : 's'} confirmado
            {totalFiltrado === 1 ? '' : 's'} · {filtrados.length} médico
            {filtrados.length === 1 ? '' : 's'}
          </p>
          {filtrados.map((group) => (
            <section
              key={group.medicoId}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
            >
              <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-[#E8EDED]">{group.medicoNome}</h4>
                  {group.medicoId !== '__sem_medico__' ? (
                    <p className="truncate text-[11px] font-mono text-[#E8EDED]/35">{group.medicoId}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-[#4CCB7A]/15 px-2.5 py-0.5 text-xs font-medium text-[#4CCB7A]">
                  {group.patients.length}
                </span>
              </header>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-[#E8EDED]/45">
                      <th className="px-4 py-2 font-medium">Paciente</th>
                      <th className="px-4 py-2 font-medium">Telefone</th>
                      <th className="px-4 py-2 font-medium">Confirmado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {group.patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5 font-medium text-[#E8EDED]">
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#4CCB7A]" />
                            {patient.nome}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[#E8EDED]/70">
                          {patient.phone || '—'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-[#E8EDED]/80">
                          {formatVerifiedAt(patient.verifiedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
