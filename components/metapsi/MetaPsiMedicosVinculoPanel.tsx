'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  ChevronDown,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import type { SolicitacaoVinculoPsiquiatraMedicoDoc } from '@/features/metaPsi/metaPsi.types';
import { SOLICITACAO_VINCULO_PSIQUIATRA_STATUS } from '@/features/metaPsi/metaPsi.constants';
import { SolicitacaoVinculoPsiquiatraMedicoService } from '@/services/solicitacaoVinculoPsiquiatraMedicoService';
import { MedicoService } from '@/services/medicoService';
import { PsiquiatraService } from '@/services/psiquiatraService';
import {
  PacientePsiquiatraService,
  type PacienteVisivelPsiquiatra,
} from '@/services/pacientePsiquiatraService';
import type { Medico } from '@/types/medico';
import { ESTADOS_BR_OPTIONS } from '@/lib/whiteLabel/cadastroMedicoConstants';
import { VinculoFotoAvatar } from '@/components/metaadmin/ProfissionalVinculoStats';
import MetaPsiPacienteWorkspaceModal from '@/components/metapsi/MetaPsiPacienteWorkspaceModal';

type Props = {
  userId: string;
  psiquiatra: PsiquiatraDoc;
  onPsiquiatraRefresh: () => Promise<void> | void;
  onMessage?: (msg: string) => void;
};

type AbaMedicos = 'vinculados' | 'solicitacoes' | 'buscar';

type MedicoVinculadoRow = {
  id: string;
  nome: string;
  genero?: 'M' | 'F';
  email?: string;
  telefone?: string;
  crmLabel?: string;
  fotoPerfilUrl?: string | null;
  cidades?: { cidade: string; estado: string }[];
  nomeLocal?: string;
  endereco?: string;
  instagramUsuario?: string;
  qtdPacientes: number;
};

const STATUS_BADGE: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aceita: 'bg-green-600 text-white',
  rejeitada: 'bg-red-100 text-red-800',
  cancelada: 'bg-gray-100 text-gray-800',
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  rejeitada: 'Rejeitada',
  cancelada: 'Cancelada',
};

function displayNomeMedico(m: { genero?: 'M' | 'F'; nome: string }) {
  return `${m.genero === 'F' ? 'Dra.' : 'Dr.'} ${m.nome}`;
}

function crmFromMedico(m: Medico): string | undefined {
  if (!m.crm) return undefined;
  return `${m.crm.estado} ${m.crm.numero}`;
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" data-metapsi-medicos-skeleton>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[72px] animate-pulse rounded-xl border border-gray-100 bg-gray-50"
        />
      ))}
    </div>
  );
}

/**
 * Médicos /metapsi — chrome visual alinhado ao MetaNutri (tabs + cards),
 * services Psi (solicitacoes_vinculo_psiquiatra_medico + paciente_psiquiatra).
 */
export default function MetaPsiMedicosVinculoPanel({
  userId,
  psiquiatra,
  onPsiquiatraRefresh,
  onMessage,
}: Props) {
  const [aba, setAba] = useState<AbaMedicos>('vinculados');
  const [loading, setLoading] = useState(false);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [aceitandoId, setAceitandoId] = useState<string | null>(null);
  const [medicosVinculados, setMedicosVinculados] = useState<MedicoVinculadoRow[]>([]);
  const [recebidas, setRecebidas] = useState<SolicitacaoVinculoPsiquiatraMedicoDoc[]>([]);
  const [enviadas, setEnviadas] = useState<SolicitacaoVinculoPsiquiatraMedicoDoc[]>([]);
  const [estadoBusca, setEstadoBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [estadoFiltroVinculados, setEstadoFiltroVinculados] = useState('');
  const [cidadeFiltroVinculados, setCidadeFiltroVinculados] = useState('');
  const [medicosDisponiveis, setMedicosDisponiveis] = useState<Medico[]>([]);
  const [buscaExecutada, setBuscaExecutada] = useState(false);
  const [medicoExpandidoId, setMedicoExpandidoId] = useState<string | null>(null);
  const [medicoDisponivelExpandidoId, setMedicoDisponivelExpandidoId] = useState<string | null>(null);
  const [pacientesPorMedico, setPacientesPorMedico] = useState<
    Map<string, PacienteVisivelPsiquiatra[]>
  >(new Map());
  const [loadingPacientesMedico, setLoadingPacientesMedico] = useState<Set<string>>(new Set());
  const [workspace, setWorkspace] = useState<PacienteVisivelPsiquiatra | null>(null);

  const setMsg = (m: string) => onMessage?.(m);
  const verificado = psiquiatra.isVerificado === true;
  const pendenciasCount =
    recebidas.filter((s) => s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE).length +
    enviadas.filter((s) => s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE).length;

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const fresh = await PsiquiatraService.getPsiquiatraByUserId(userId);
      const ids = fresh?.medicoVinculadoIds || psiquiatra.medicoVinculadoIds || [];
      const [medicosRaw, pacientesVisiveis, rec, env] = await Promise.all([
        Promise.all(
          ids.map(async (id) => {
            const byId = await MedicoService.getMedicoById(id).catch(() => null);
            if (byId) return byId;
            return MedicoService.getMedicoByUserId(id).catch(() => null);
          }),
        ),
        PacientePsiquiatraService.listPacientesVisiveisByPsiquiatra(userId),
        SolicitacaoVinculoPsiquiatraMedicoService.listPendingVinculoRequestsByPsiquiatra(userId),
        SolicitacaoVinculoPsiquiatraMedicoService.listSentVinculoRequestsByPsiquiatra(userId),
      ]);

      const medicos = medicosRaw.filter((m): m is Medico => Boolean(m));
      const byDoc = new Map<string, Medico>();
      for (const m of medicos) byDoc.set(m.id, m);
      const unique = Array.from(byDoc.values());

      const byMedico = new Map<string, PacienteVisivelPsiquiatra[]>();
      for (const p of pacientesVisiveis) {
        if (p.status !== 'ativo') continue;
        const list = byMedico.get(p.medicoId) || [];
        list.push(p);
        byMedico.set(p.medicoId, list);
      }
      setPacientesPorMedico(byMedico);

      setMedicosVinculados(
        unique.map((m) => ({
          id: m.id,
          nome: m.nome,
          genero: m.genero,
          email: m.email,
          telefone: m.telefone,
          crmLabel: crmFromMedico(m),
          fotoPerfilUrl: m.fotoPerfilUrl ?? null,
          cidades: m.cidades,
          nomeLocal: m.localizacao?.nomeLocal,
          endereco: m.localizacao?.endereco,
          instagramUsuario: m.instagramUsuario || undefined,
          qtdPacientes: byMedico.get(m.id)?.length ?? 0,
        })),
      );

      setRecebidas(rec);
      setEnviadas(env);
    } catch (e) {
      console.error(e);
      setMsg('Erro ao carregar vínculos com médicos.');
    } finally {
      setLoading(false);
    }
  }, [userId, psiquiatra.medicoVinculadoIds, onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadPacientesDoMedico = useCallback(
    async (medicoId: string) => {
      const mid = String(medicoId || '').trim();
      if (!mid || !userId) return;
      if (pacientesPorMedico.has(mid)) return;
      setLoadingPacientesMedico((prev) => new Set(prev).add(mid));
      try {
        const all = await PacientePsiquiatraService.listPacientesVisiveisByPsiquiatra(userId);
        const forMedico = all.filter((p) => p.medicoId === mid && p.status === 'ativo');
        setPacientesPorMedico((prev) => {
          const next = new Map(prev);
          next.set(mid, forMedico);
          return next;
        });
        setMedicosVinculados((prev) =>
          prev.map((m) => (m.id === mid ? { ...m, qtdPacientes: forMedico.length } : m)),
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPacientesMedico((prev) => {
          const next = new Set(prev);
          next.delete(mid);
          return next;
        });
      }
    },
    [userId, pacientesPorMedico],
  );
  const estadosVinculados = useMemo(() => {
    const set = new Set<string>();
    for (const m of medicosVinculados) {
      for (const c of m.cidades || []) {
        if (c.estado) set.add(c.estado);
      }
    }
    return Array.from(set).sort();
  }, [medicosVinculados]);

  const cidadesVinculados = useMemo(() => {
    if (!estadoFiltroVinculados) return [] as string[];
    const set = new Set<string>();
    for (const m of medicosVinculados) {
      for (const c of m.cidades || []) {
        if (c.estado === estadoFiltroVinculados && c.cidade) set.add(c.cidade);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [medicosVinculados, estadoFiltroVinculados]);

  const medicosFiltrados = useMemo(() => {
    return medicosVinculados.filter((m) => {
      const matchEstado =
        !estadoFiltroVinculados ||
        (m.cidades || []).some((c) => c.estado === estadoFiltroVinculados);
      const matchCidade =
        !cidadeFiltroVinculados ||
        (m.cidades || []).some(
          (c) =>
            c.estado === estadoFiltroVinculados &&
            c.cidade.toLowerCase() === cidadeFiltroVinculados.toLowerCase(),
        );
      return matchEstado && matchCidade;
    });
  }, [medicosVinculados, estadoFiltroVinculados, cidadeFiltroVinculados]);

  const handleBuscar = async () => {
    if (!estadoBusca || !cidadeBusca.trim()) return;
    setLoadingBusca(true);
    setBuscaExecutada(true);
    try {
      const list = await MedicoService.getMedicosByCidade(cidadeBusca.trim(), estadoBusca);
      setMedicosDisponiveis(list.filter((m) => m.isVerificado && m.status === 'ativo'));
    } catch (e) {
      console.error(e);
      setMsg('Erro ao buscar médicos.');
      setMedicosDisponiveis([]);
    } finally {
      setLoadingBusca(false);
    }
  };

  const jaVinculado = (medicoId: string) =>
    medicosVinculados.some((m) => m.id === medicoId) ||
    (psiquiatra.medicoVinculadoIds || []).includes(medicoId);

  const jaPendente = (medicoId: string) =>
    [...recebidas, ...enviadas].some(
      (s) =>
        s.medicoId === medicoId &&
        (s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE ||
          s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA),
    );

  const handleSolicitar = async (medicoId: string) => {
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.createVinculoRequest(
        userId,
        medicoId,
        'psiquiatra',
        { psiquiatraNome: psiquiatra.nome, psiquiatraEmail: psiquiatra.email },
      );
      try {
        await fetch('/api/send-email-psi-pediu-vinculo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicoId, psiquiatraId: userId }),
        });
      } catch (e) {
        console.error('Erro ao enviar e-mail psi pediu vínculo:', e);
      }
      setMsg('Solicitação de vínculo enviada ao médico.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao solicitar vínculo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAceitar = async (requestId: string) => {
    setAceitandoId(requestId);
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.approveVinculoRequest(requestId);
      setMsg('Vínculo aceito.');
      await onPsiquiatraRefresh();
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao aceitar vínculo.');
    } finally {
      setAceitandoId(null);
      setLoading(false);
    }
  };

  const handleRejeitar = async (requestId: string) => {
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.rejectVinculoRequest(requestId);
      setMsg('Solicitação rejeitada.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao rejeitar.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (requestId: string) => {
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.cancelVinculoRequest(requestId);
      setMsg('Solicitação cancelada.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao cancelar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async (medicoId: string, nome: string) => {
    if (
      !confirm(
        `Remover o vínculo profissional com ${nome}?\n\nSe houver pacientes ativos compartilhados, a remoção será bloqueada.`,
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.removeVinculoCompleto(medicoId, userId);
      setMsg('Vínculo removido.');
      if (medicoExpandidoId === medicoId) setMedicoExpandidoId(null);
      await onPsiquiatraRefresh();
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao remover vínculo.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandVinculado = (medicoId: string, qtd: number) => {
    if (qtd === 0) return;
    const next = medicoExpandidoId === medicoId ? null : medicoId;
    setMedicoExpandidoId(next);
    if (next) void loadPacientesDoMedico(next);
  };

  const tabClass = (id: AbaMedicos) =>
    `whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      aba === id
        ? 'border-green-600 text-green-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="min-w-0 space-y-6" data-metapsi-medicos-panel>
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Médicos</h1>

        <div className="mb-6 overflow-x-auto border-b border-gray-200" data-metapsi-medicos-tabs>
          <nav className="flex min-w-max space-x-4" aria-label="Tabs">
            <button type="button" onClick={() => setAba('vinculados')} className={tabClass('vinculados')}>
              Médicos Vinculados
              {medicosVinculados.length > 0 ? (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                  {medicosVinculados.length}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={() => setAba('solicitacoes')} className={tabClass('solicitacoes')}>
              Solicitações
              {pendenciasCount > 0 ? (
                <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                  {pendenciasCount}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={() => setAba('buscar')} className={tabClass('buscar')}>
              Buscar Médicos
            </button>
          </nav>
        </div>

        {!verificado ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-yellow-600" />
            <h3 className="mb-2 text-lg font-semibold text-yellow-900">Aguardando verificação</h3>
            <p className="text-yellow-700">
              Você precisa ser verificado pelo administrador para acessar esta seção.
            </p>
          </div>
        ) : (
          <>
            {aba === 'buscar' ? (
              <div className="space-y-6">
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-[120px_1fr] items-end gap-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Estado</label>
                      <select
                        value={estadoBusca}
                        onChange={(e) => {
                          setEstadoBusca(e.target.value);
                          setCidadeBusca('');
                          setBuscaExecutada(false);
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Estado</option>
                        {ESTADOS_BR_OPTIONS.filter((e) => e.sigla).map((e) => (
                          <option key={e.sigla} value={e.sigla}>
                            {e.sigla}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Cidade</label>
                      <input
                        value={cidadeBusca}
                        onChange={(e) => {
                          setCidadeBusca(e.target.value);
                          setBuscaExecutada(false);
                        }}
                        disabled={!estadoBusca}
                        placeholder="Digite a cidade"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleBuscar()}
                    disabled={!estadoBusca || !cidadeBusca.trim() || loadingBusca}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    <Search size={18} />
                    Buscar
                  </button>
                </div>

                {loadingBusca ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
                    <p className="mt-4 text-gray-600">Carregando médicos disponíveis...</p>
                  </div>
                ) : !buscaExecutada ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Buscar médicos</h3>
                    <p className="text-gray-600">Selecione estado e cidade para encontrar médicos verificados.</p>
                  </div>
                ) : medicosDisponiveis.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Nenhum médico encontrado</h3>
                    <p className="text-gray-600">Nenhum médico disponível corresponde à sua busca.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {medicosDisponiveis.map((medico) => {
                      const linked = jaVinculado(medico.id);
                      const pending = jaPendente(medico.id);
                      const primeiraCidade =
                        medico.cidades && medico.cidades.length > 0
                          ? `${medico.cidades[0].cidade}, ${medico.cidades[0].estado}`
                          : null;
                      const isExpanded = medicoDisponivelExpandidoId === medico.id;
                      return (
                        <div
                          key={medico.id}
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                                <Stethoscope className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="mb-0.5 truncate text-sm font-semibold text-gray-900">
                                  {displayNomeMedico(medico)}
                                </h3>
                                {medico.crm ? (
                                  <p className="text-xs text-gray-500">
                                    CRM {medico.crm.estado} {medico.crm.numero}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {linked ? (
                                <span className="whitespace-nowrap rounded-full bg-green-600 px-2 py-1 text-[10px] font-medium text-white">
                                  Vinculado
                                </span>
                              ) : pending ? (
                                <span className="whitespace-nowrap rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-medium text-yellow-700">
                                  Pendente
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleSolicitar(medico.id)}
                                  disabled={loading}
                                  className="flex items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-green-600 px-2.5 py-1.5 text-[10px] font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <UserPlus size={11} />
                                  Solicitar
                                </button>
                              )}
                              {(primeiraCidade || medico.email || medico.telefone) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMedicoDisponivelExpandidoId(isExpanded ? null : medico.id)
                                  }
                                  className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                  title={isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                                >
                                  <ChevronDown
                                    size={16}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                          {isExpanded && (primeiraCidade || medico.email || medico.telefone) ? (
                            <div className="mb-1 space-y-1.5 border-t border-gray-100 pt-2">
                              {medico.cidades && medico.cidades.length > 0 ? (
                                <div>
                                  <p className="mb-1.5 text-xs font-medium text-gray-700">
                                    Cidades de Atendimento:
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {medico.cidades.map((cidade, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                                      >
                                        {cidade.cidade}, {cidade.estado}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {medico.email ? (
                                <p className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <Mail className="h-3.5 w-3.5" /> {medico.email}
                                </p>
                              ) : null}
                              {medico.telefone ? (
                                <p className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <Phone className="h-3.5 w-3.5" /> {medico.telefone}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {aba === 'solicitacoes' ? (
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <Clock size={20} className="text-yellow-600" />
                      Solicitações Recebidas
                    </h3>
                    {loading && recebidas.length === 0 ? (
                      <SkeletonList />
                    ) : recebidas.length === 0 ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center">
                        <UserPlus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                        <p className="text-gray-600">Nenhuma solicitação de vínculo pendente.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recebidas.map((solicitacao) => {
                          const status = solicitacao.status || 'pendente';
                          return (
                            <div
                              key={solicitacao.id}
                              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                            >
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-base font-semibold text-gray-900">
                                    {solicitacao.medicoNome || 'Médico'}
                                  </h3>
                                  <p className="mt-2 text-xs text-gray-500">
                                    Solicitado em:{' '}
                                    {solicitacao.criadoEm?.toLocaleDateString?.('pt-BR') || '-'}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE[status] || STATUS_BADGE.pendente}`}
                                >
                                  {STATUS_LABEL[status] || 'Pendente'}
                                </span>
                              </div>
                              {status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE ? (
                                <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                                  <button
                                    type="button"
                                    onClick={() => void handleAceitar(solicitacao.id)}
                                    disabled={!!aceitandoId || loading}
                                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {aceitandoId === solicitacao.id ? (
                                      <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Aceitando
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={14} />
                                        Aceitar
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleRejeitar(solicitacao.id)}
                                    disabled={loading}
                                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                  >
                                    <XCircle size={14} />
                                    Rejeitar
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <UserPlus size={20} className="text-green-600" />
                      Solicitações Enviadas
                    </h3>
                    {loading && enviadas.length === 0 ? (
                      <SkeletonList />
                    ) : enviadas.length === 0 ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center">
                        <Stethoscope className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                        <p className="text-gray-600">Nenhuma solicitação enviada pendente.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {enviadas.map((solicitacao) => {
                          const status = solicitacao.status || 'pendente';
                          return (
                            <div
                              key={solicitacao.id}
                              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                            >
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-base font-semibold text-gray-900">
                                    {solicitacao.medicoNome || 'Médico'}
                                  </h3>
                                  <p className="mt-2 text-xs text-gray-500">
                                    Enviado em:{' '}
                                    {solicitacao.criadoEm?.toLocaleDateString?.('pt-BR') || '-'}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE[status] || STATUS_BADGE.pendente}`}
                                >
                                  {STATUS_LABEL[status] || 'Pendente'}
                                </span>
                              </div>
                              {status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE ? (
                                <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                                  <button
                                    type="button"
                                    onClick={() => void handleCancelar(solicitacao.id)}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Cancelar solicitação
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {aba === 'vinculados' ? (
              <div className="space-y-6">
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Estado</label>
                      <select
                        value={estadoFiltroVinculados}
                        onChange={(e) => {
                          setEstadoFiltroVinculados(e.target.value);
                          setCidadeFiltroVinculados('');
                        }}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Todos os estados</option>
                        {estadosVinculados.map((estado) => {
                          const info = ESTADOS_BR_OPTIONS.find((e) => e.sigla === estado);
                          return (
                            <option key={estado} value={estado}>
                              {info?.nome || estado}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Cidade</label>
                      <select
                        value={cidadeFiltroVinculados}
                        onChange={(e) => setCidadeFiltroVinculados(e.target.value)}
                        disabled={!estadoFiltroVinculados}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        <option value="">Todas as cidades</option>
                        {cidadesVinculados.map((cidade) => (
                          <option key={cidade} value={cidade}>
                            {cidade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {loading && medicosVinculados.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
                    <p className="mt-4 text-gray-600">Carregando médicos...</p>
                  </div>
                ) : medicosVinculados.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <Stethoscope className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      Nenhum médico vinculado ainda
                    </h3>
                    <p className="text-gray-600">Você ainda não possui vínculos com médicos.</p>
                  </div>
                ) : medicosFiltrados.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Nenhum médico encontrado</h3>
                    <p className="text-gray-600">Nenhum médico corresponde à sua busca.</p>
                  </div>
                ) : (
                  <div className="space-y-3" data-metapsi-medicos-vinculados>
                    {medicosFiltrados.map((medico) => {
                      const isExpanded = medicoExpandidoId === medico.id;
                      const pacientesList = pacientesPorMedico.get(medico.id) || [];
                      const isLoadingPacientes = loadingPacientesMedico.has(medico.id);
                      const nome = displayNomeMedico(medico);
                      return (
                        <div
                          key={medico.id}
                          className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <VinculoFotoAvatar
                              name={nome}
                              photoUrl={medico.fotoPerfilUrl}
                              tone="medico"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold text-gray-900">{nome}</h3>
                              {medico.crmLabel ? (
                                <p className="mt-0.5 text-xs text-gray-500">CRM {medico.crmLabel}</p>
                              ) : null}
                              {medico.cidades && medico.cidades[0] ? (
                                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  {medico.cidades[0].cidade}, {medico.cidades[0].estado}
                                  {medico.cidades.length > 1
                                    ? ` +${medico.cidades.length - 1}`
                                    : ''}
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                                  Ativo
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                  <Users className="h-3.5 w-3.5" />
                                  {medico.qtdPacientes}{' '}
                                  {medico.qtdPacientes === 1 ? 'paciente' : 'pacientes'}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandVinculado(medico.id, medico.qtdPacientes)}
                                disabled={medico.qtdPacientes === 0}
                                className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title={isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                              >
                                <ChevronDown
                                  size={20}
                                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemover(medico.id, nome)}
                                disabled={loading}
                                className="rounded p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                title="Excluir vínculo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="mt-2 border-t border-gray-100 pt-2">
                              {isLoadingPacientes ? (
                                <div className="py-4 text-center">
                                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-green-600" />
                                  <p className="mt-2 text-sm text-gray-600">Carregando pacientes...</p>
                                </div>
                              ) : pacientesList.length === 0 ? (
                                <div className="py-4 text-center text-sm text-gray-500">
                                  Nenhum paciente compartilhado
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {pacientesList.map((item) => {
                                    const nomePaciente =
                                      item.paciente.dadosIdentificacao?.nomeCompleto ||
                                      item.paciente.nome ||
                                      'Paciente sem nome';
                                    return (
                                      <button
                                        key={item.pacienteId}
                                        type="button"
                                        onClick={() => setWorkspace(item)}
                                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-left transition-shadow hover:shadow-sm"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <h4 className="truncate text-sm font-medium text-gray-900">
                                            {nomePaciente}
                                          </h4>
                                          <p className="mt-1 text-xs text-gray-500">
                                            Compartilhado em:{' '}
                                            {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                        <span className="ml-3 shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                                          Ativo
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {workspace ? (
        <MetaPsiPacienteWorkspaceModal
          open
          pacienteId={workspace.pacienteId}
          psiquiatraId={userId}
          medicoLabel={`${workspace.medicoGenero === 'F' ? 'Dra.' : 'Dr.'} ${workspace.medicoNome}`}
          onClose={() => setWorkspace(null)}
          onDenied={() => {
            setMsg('Acesso negado: compartilhamento inativo ou inexistente para este paciente.');
            setWorkspace(null);
          }}
        />
      ) : null}
    </div>
  );
}
