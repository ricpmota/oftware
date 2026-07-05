'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { formatDomainPreview } from '@/lib/whiteLabel/cadastroMedicoConstants';
import type { CadastroMedicoWhiteLabel } from '@/types/cadastroMedicoWhiteLabel';

type ApiCadastro = CadastroMedicoWhiteLabel & {
  createdAt: string | null;
  updatedAt: string | null;
  concluidoAt: string | null;
};

type Kpis = { total: number; rascunhos: number; concluidos: number };

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

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function displayName(c: ApiCadastro) {
  const nome = [c.tratamento, c.nome, c.sobrenome].filter(Boolean).join(' ').trim();
  return nome || c.nomeMarca || c.nomeCompletoContrato || 'Sem nome';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-[#E8EDED]/50">{label}</span>
      <span className="text-sm text-[#E8EDED]/90 break-words">{value}</span>
    </div>
  );
}

function CadastroDetail({ cadastro }: { cadastro: ApiCadastro }) {
  const dominio =
    cadastro.dominioDesejado && cadastro.extensaoDominio
      ? formatDomainPreview(cadastro.dominioDesejado, cadastro.extensaoDominio)
      : '';

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Identidade pública
        </h4>
        <DetailRow label="Nome" value={displayName(cadastro)} />
        <DetailRow label="Marca" value={cadastro.nomeMarca} />
        <DetailRow label="Especialidade" value={cadastro.especialidade} />
        <DetailRow label="Cidade/UF" value={[cadastro.cidade, cadastro.estado].filter(Boolean).join(' / ')} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">Domínio</h4>
        <DetailRow label="Site" value={dominio} />
        <DetailRow label="Status" value={cadastro.statusDominio} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Endereço de entrega
        </h4>
        <DetailRow label="CEP" value={cadastro.cepEntrega} />
        <DetailRow
          label="Endereço"
          value={[cadastro.ruaEntrega, cadastro.numeroEntrega, cadastro.complementoEntrega].filter(Boolean).join(', ')}
        />
        <DetailRow label="Bairro" value={cadastro.bairroEntrega} />
        <DetailRow
          label="Cidade/UF"
          value={[cadastro.cidadeEntrega, cadastro.estadoEntrega].filter(Boolean).join(' / ')}
        />
        <DetailRow label="Recebedor" value={cadastro.nomeRecebedor} />
        <DetailRow label="Telefone" value={cadastro.telefoneEntrega} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Dados contratuais
        </h4>
        <DetailRow label="Nome completo" value={cadastro.nomeCompletoContrato} />
        <DetailRow label="CPF" value={cadastro.cpf} />
        <DetailRow label="CRM" value={`${cadastro.crm} / ${cadastro.crmUf}`} />
        <DetailRow label="E-mail" value={cadastro.emailContrato} />
        <DetailRow label="WhatsApp" value={cadastro.whatsappContrato} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">
          Personalização
        </h4>
        <DetailRow label="Instagram" value={cadastro.instagram} />
        <DetailRow label="Frase da marca" value={cadastro.fraseMarca} />
        <DetailRow label="Descrição" value={cadastro.descricaoProfissional} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4CCB7A] mb-2">Arquivos</h4>
        <DetailRow label="Enviar depois" value={cadastro.enviarDepois === 'true' ? 'Sim' : 'Não'} />
        <DetailRow label="Foto profissional" value={cadastro.fotoProfissionalUrl ? 'Anexado' : '—'} />
        <DetailRow label="Logo" value={cadastro.logoUrl ? 'Anexado' : '—'} />
      </div>
    </div>
  );
}

export default function CadastroMedicoMentoradosAdmin() {
  const [cadastros, setCadastros] = useState<ApiCadastro[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ total: 0, rascunhos: 0, concluidos: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'rascunho' | 'concluido'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/cadastro-medico-whitelabel');
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        cadastros?: ApiCadastro[];
        kpis?: Kpis;
      };
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar mentorados.');
      setCadastros(data.cadastros || []);
      setKpis(data.kpis || { total: 0, rascunhos: 0, concluidos: 0 });
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cadastros.filter((c) => {
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
      if (!q) return true;
      const hay = [
        displayName(c),
        c.nomeMarca,
        c.emailContrato,
        c.whatsappContrato,
        c.cidade,
        c.estado,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [busca, cadastros, filtroStatus]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este cadastro de onboarding?')) return;
    try {
      const res = await authFetch(`/api/metaadmingeral/cadastro-medico-whitelabel?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');
      setCadastros((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
      setMessage({ type: 'ok', text: 'Cadastro excluído.' });
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total', value: kpis.total },
          { label: 'Rascunhos', value: kpis.rascunhos },
          { label: 'Concluídos', value: kpis.concluidos },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-[#E8EDED]/50">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#E8EDED]">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E8EDED]/40" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail, cidade..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/40"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
          className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-[#E8EDED] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/40"
        >
          <option value="todos">Todos os status</option>
          <option value="rascunho">Rascunhos</option>
          <option value="concluido">Concluídos</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-[#E8EDED] hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'ok' ? 'text-[#4CCB7A]' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4CCB7A]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-[#E8EDED]/60">
          Nenhum cadastro de mentorado encontrado.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cadastro) => {
            const expanded = expandedId === cadastro.id;
            return (
              <div
                key={cadastro.id}
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : cadastro.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <UserCheck className="w-5 h-5 text-[#4CCB7A] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#E8EDED] truncate">{displayName(cadastro)}</p>
                    <p className="text-xs text-[#E8EDED]/50 truncate">
                      {cadastro.nomeMarca} · {cadastro.emailContrato || cadastro.whatsappContrato || '—'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                      cadastro.status === 'concluido'
                        ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {cadastro.status === 'concluido' ? 'Concluído' : `Rascunho · etapa ${(cadastro.currentStep ?? 0) + 1}`}
                  </span>
                  <span className="text-xs text-[#E8EDED]/40 shrink-0 hidden sm:block">
                    {formatDate(cadastro.updatedAt)}
                  </span>
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-[#E8EDED]/50 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#E8EDED]/50 shrink-0" />
                  )}
                </button>
                {expanded && (
                  <div className="px-4 pb-4">
                    <CadastroDetail cadastro={cadastro} />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleDelete(cadastro.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
