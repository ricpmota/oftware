'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  ClipboardList,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AutomacoesInfoNote, AutomacoesStatusBadge } from '@/components/metaadmingeral/automacoes/automacoesCenterUi';

type Props = {
  user: User | null;
};

type CanalChatLogEnvio = {
  id: string;
  medicoId: string;
  pacienteId: string;
  pacienteNome?: string;
  medicoNome?: string;
  organizationId?: string;
  organizationName?: string;
  phone?: string;
  valorAberto?: number;
  relatorioUrl?: string;
  tipo: 'avulsa' | 'automatica';
  status: 'sent' | 'failed';
  errorMessage?: string;
  sentAt: string;
};

function formatMoney(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CanalChatLogPanel({ user }: Props) {
  const [envios, setEnvios] = useState<CanalChatLogEnvio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'avulsa' | 'automatica'>('todos');

  const load = useCallback(async () => {
    if (!user) {
      setEnvios([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/canal-chat/logs?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        envios?: CanalChatLogEnvio[];
      } | null;

      if (!res.ok || !data?.ok || !Array.isArray(data.envios)) {
        throw new Error(data?.error ?? 'Não foi possível carregar o log.');
      }

      setEnvios(data.envios);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar log.');
      setEnvios([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return envios.filter((envio) => {
      if (filtroTipo !== 'todos' && envio.tipo !== filtroTipo) return false;
      if (!q) return true;
      const hay = [
        envio.medicoNome,
        envio.medicoId,
        envio.pacienteNome,
        envio.pacienteId,
        envio.organizationName,
        envio.organizationId,
        envio.phone,
        envio.relatorioUrl,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [busca, envios, filtroTipo]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#E8EDED]">Log de cobranças</h3>
          <p className="mt-1 text-sm text-[#E8EDED]/60">
            Registros enviados pelo Canal Chat — dia, hora, médico, organização, paciente e link.
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
        Inclui cobrança avulsa (botão no Financeiro) e cobrança automática (dia do vencimento).
      </AutomacoesInfoNote>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E8EDED]/40" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar médico, paciente, organização…"
            className="w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/40"
          />
        </label>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as 'todos' | 'avulsa' | 'automatica')}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/40"
        >
          <option value="todos">Todos os tipos</option>
          <option value="avulsa">Avulsa</option>
          <option value="automatica">Automática</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60 py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando log…
        </div>
      ) : error ? (
        <p className="flex items-center gap-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
          <ClipboardList className="h-8 w-8 text-[#E8EDED]/30 mx-auto mb-3" />
          <p className="text-sm text-[#E8EDED]/60">Nenhum registro de cobrança encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-xs uppercase tracking-wider text-[#E8EDED]/50">
                <th className="px-3 py-2.5 font-medium">Dia</th>
                <th className="px-3 py-2.5 font-medium">Hora</th>
                <th className="px-3 py-2.5 font-medium">Tipo</th>
                <th className="px-3 py-2.5 font-medium">Médico</th>
                <th className="px-3 py-2.5 font-medium">Organização</th>
                <th className="px-3 py-2.5 font-medium">Paciente</th>
                <th className="px-3 py-2.5 font-medium">Valor</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-black/20">
              {filtrados.map((envio) => (
                <tr key={envio.id} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5 whitespace-nowrap text-[#E8EDED]/90">
                    {formatDia(envio.sentAt)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[#E8EDED]/80">
                    {formatHora(envio.sentAt)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[#E8EDED]/75">
                    {envio.tipo === 'automatica' ? 'Automática' : 'Avulsa'}
                  </td>
                  <td className="px-3 py-2.5 text-[#E8EDED]">
                    <div className="font-medium">{envio.medicoNome || '—'}</div>
                    <div className="text-[11px] font-mono text-[#E8EDED]/35">{envio.medicoId}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[#E8EDED]/80">
                    {envio.organizationName || envio.organizationId || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-[#E8EDED]">
                    <div className="font-medium">{envio.pacienteNome || '—'}</div>
                    {envio.phone ? (
                      <div className="text-[11px] font-mono text-[#E8EDED]/35">{envio.phone}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-[#E8EDED]/90">
                    {typeof envio.valorAberto === 'number' ? formatMoney(envio.valorAberto) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <AutomacoesStatusBadge
                      label={envio.status === 'sent' ? 'Enviado' : 'Falhou'}
                      tone={envio.status === 'sent' ? 'success' : 'warn'}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {envio.relatorioUrl ? (
                      <a
                        href={envio.relatorioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#4CCB7A] hover:underline"
                        title={envio.relatorioUrl}
                      >
                        Abrir
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-[#E8EDED]/35">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 px-3 py-2 text-xs text-[#E8EDED]/45">
            {filtrados.length} registro{filtrados.length === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}
