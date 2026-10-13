'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Check,
  ChevronDown,
  Search,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import type { SolicitacaoVinculoPsiquiatraMedicoDoc } from '@/features/metaPsi/metaPsi.types';
import { SOLICITACAO_VINCULO_PSIQUIATRA_STATUS } from '@/features/metaPsi/metaPsi.constants';
import { PSIQUIATRA_STATUS } from '@/features/metaPsi/metaPsi.constants';
import { formatPsiquiatraRegistroAdmin, PsiquiatraService } from '@/services/psiquiatraService';
import { SolicitacaoVinculoPsiquiatraMedicoService } from '@/services/solicitacaoVinculoPsiquiatraMedicoService';
import { PacientePsiquiatraService } from '@/services/pacientePsiquiatraService';
import { PacienteService } from '@/services/pacienteService';
import { SolicitacaoPsiquiatraService } from '@/services/solicitacaoPsiquiatraService';
import {
  countActiveSharesForMedicoPsiquiatra,
  estadosComPsiquiatrasCadastrados,
  filterPsiquiatrasEquipeByQuery,
} from '@/lib/metaadmin/psiquiatrasEquipePage';

type Aba = 'vinculados' | 'solicitacoes' | 'buscar';

type PsiquiatraComContagem = PsiquiatraDoc & { qtdPacientes: number };

type PacienteShareItem = {
  paciente: PacienteCompleto;
  dataCompartilhamento: Date;
  status: string;
};

type Props = {
  medicoId: string;
  medicoNome?: string;
  onMessage?: (msg: string) => void;
  onOpenPatient: (paciente: PacienteCompleto) => void;
};

/**
 * PÃ¡gina operacional /metaadmin â†’ Psiquiatria.
 * Shell alinhado a Nutricionistas. SoT: solicitacoes_vinculo_psiquiatra_medico + paciente_psiquiatra.
 */
export default function MetaAdminPsiquiatrasPage({
  medicoId,
  medicoNome,
  onMessage,
  onOpenPatient,
}: Props) {
  const [aba, setAba] = useState<Aba>('vinculados');
  const [loading, setLoading] = useState(false);
  const [vinculados, setVinculados] = useState<PsiquiatraComContagem[]>([]);
  const [recebidas, setRecebidas] = useState<SolicitacaoVinculoPsiquiatraMedicoDoc[]>([]);
  const [enviadas, setEnviadas] = useState<SolicitacaoVinculoPsiquiatraMedicoDoc[]>([]);
  const [buscaEquipe, setBuscaEquipe] = useState('');
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [pacientesPorPsi, setPacientesPorPsi] = useState<Map<string, PacienteShareItem[]>>(
    () => new Map()
  );
  const [loadingPacientes, setLoadingPacientes] = useState<Set<string>>(() => new Set());

  // Buscar
  const [estadoBusca, setEstadoBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [disponiveis, setDisponiveis] = useState<PsiquiatraDoc[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [estadosComPsiquiatras, setEstadosComPsiquiatras] = useState<string[]>([]);
  const [loadingEstadosBusca, setLoadingEstadosBusca] = useState(false);

  const setMsg = (m: string) => onMessage?.(m);

  const loadAll = useCallback(async () => {
    if (!medicoId) return;
    setLoading(true);
    try {
      const [vinc, pendMedico, enviadasMed, sharesMedico] = await Promise.all([
        PsiquiatraService.getPsiquiatrasVinculadosAoMedico(medicoId),
        SolicitacaoVinculoPsiquiatraMedicoService.listPendingVinculoRequestsByMedico(medicoId),
        SolicitacaoVinculoPsiquiatraMedicoService.listSentVinculoRequestsByMedico(medicoId),
        PacientePsiquiatraService.listActiveVinculosByMedico(medicoId),
      ]);

      const shareLikes = sharesMedico.map((s) => ({
        medicoId: s.medicoId,
        psiquiatraId: s.psiquiatraId,
        status: s.status,
        pacienteId: s.pacienteId,
      }));

      const comContagem: PsiquiatraComContagem[] = vinc.map((p) => {
        const psiId = p.userId || p.id;
        return {
          ...p,
          qtdPacientes: countActiveSharesForMedicoPsiquiatra(shareLikes, medicoId, psiId),
        };
      });
      setVinculados(comContagem);
      setRecebidas(pendMedico);
      setEnviadas(enviadasMed);
    } catch (e) {
      console.error(e);
      setMsg('Erro ao carregar equipe de Psiquiatria.');
    } finally {
      setLoading(false);
    }
  }, [medicoId, onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /** Estados do select = somente UFs com psiquiatra cadastrado (campo cidades). */
  useEffect(() => {
    if (aba !== 'buscar') return;
    let cancelled = false;
    (async () => {
      setLoadingEstadosBusca(true);
      try {
        const all = await PsiquiatraService.getAllPsiquiatras();
        if (cancelled) return;
        const ufs = estadosComPsiquiatrasCadastrados(all);
        setEstadosComPsiquiatras(ufs);
        setEstadoBusca((prev) => (prev && !ufs.includes(prev) ? '' : prev));
      } catch (e) {
        console.error(e);
        if (!cancelled) setEstadosComPsiquiatras([]);
      } finally {
        if (!cancelled) setLoadingEstadosBusca(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aba]);

  const vinculadosFiltrados = useMemo(
    () =>
      filterPsiquiatrasEquipeByQuery(vinculados, buscaEquipe) as PsiquiatraComContagem[],
    [vinculados, buscaEquipe]
  );

  const linkedIds = useMemo(
    () => new Set(vinculados.map((p) => p.userId || p.id)),
    [vinculados]
  );

  const loadPacientesDoPsi = async (psiquiatraId: string) => {
    if (pacientesPorPsi.has(psiquiatraId)) return;
    setLoadingPacientes((prev) => new Set(prev).add(psiquiatraId));
    try {
      const vinculos =
        await PacientePsiquiatraService.listActiveVinculosByMedicoAndPsiquiatra(
          medicoId,
          psiquiatraId
        );
      const items: PacienteShareItem[] = [];
      for (const v of vinculos) {
        const paciente = await PacienteService.getPacienteById(v.pacienteId);
        if (!paciente) continue;
        items.push({
          paciente,
          dataCompartilhamento: v.dataCompartilhamento,
          status: v.status,
        });
      }
      setPacientesPorPsi((prev) => {
        const next = new Map(prev);
        next.set(psiquiatraId, items);
        return next;
      });
    } catch (e) {
      console.error(e);
      setMsg('Erro ao carregar pacientes do psiquiatra.');
    } finally {
      setLoadingPacientes((prev) => {
        const next = new Set(prev);
        next.delete(psiquiatraId);
        return next;
      });
    }
  };

  const toggleExpand = async (psi: PsiquiatraComContagem) => {
    const id = psi.userId || psi.id;
    if (expandidoId === id) {
      setExpandidoId(null);
      return;
    }
    setExpandidoId(id);
    await loadPacientesDoPsi(id);
  };

  const handleAceitar = async (id: string) => {
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.approveVinculoRequest(id);
      setMsg('VÃ­nculo aceito.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao aceitar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitar = async (id: string) => {
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.rejectVinculoRequest(id);
      setMsg('SolicitaÃ§Ã£o rejeitada.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao rejeitar.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (id: string) => {
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.cancelVinculoRequest(id);
      setMsg('SolicitaÃ§Ã£o cancelada.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao cancelar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async (psi: PsiquiatraComContagem) => {
    const psiId = psi.userId || psi.id;
    if (psi.qtdPacientes > 0) {
      setMsg(
        'Este Psiquiatra ainda possui pacientes ativos compartilhados. Encerre os compartilhamentos antes de remover o vÃ­nculo.'
      );
      return;
    }
    if (
      !confirm(
        `Remover o vÃ­nculo profissional com ${psi.nome}?\n\nPacientes compartilhados nÃ£o sÃ£o removidos em cascata â€” encerre-os antes, se houver.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.removeVinculoCompleto(medicoId, psiId);
      setMsg('VÃ­nculo removido.');
      setPacientesPorPsi((prev) => {
        const next = new Map(prev);
        next.delete(psiId);
        return next;
      });
      if (expandidoId === psiId) setExpandidoId(null);
      await loadAll();
    } catch (e: unknown) {
      setMsg(
        e instanceof Error
          ? e.message
          : 'NÃ£o foi possÃ­vel remover o vÃ­nculo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEncerrarShare = async (pacienteId: string, psiquiatraId: string) => {
    const nomePac =
      pacientesPorPsi.get(psiquiatraId)?.find((p) => p.paciente.id === pacienteId)?.paciente
        .dadosIdentificacao?.nomeCompleto ||
      pacientesPorPsi.get(psiquiatraId)?.find((p) => p.paciente.id === pacienteId)?.paciente
        .nome ||
      'este paciente';
    if (
      !confirm(
        `Encerrar o compartilhamento de ${nomePac} com este Psiquiatra?\n\nO vÃ­nculo profissional MÃ©dico â†” Psiquiatra serÃ¡ mantido.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await SolicitacaoPsiquiatraService.endCompartilhamento(pacienteId, psiquiatraId, medicoId);
      setMsg('Compartilhamento encerrado.');
      setPacientesPorPsi((prev) => {
        const next = new Map(prev);
        next.delete(psiquiatraId);
        return next;
      });
      await loadAll();
      if (expandidoId === psiquiatraId) {
        await loadPacientesDoPsi(psiquiatraId);
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao encerrar compartilhamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async () => {
    setLoadingBusca(true);
    try {
      const all = await PsiquiatraService.getPsiquiatrasElegiveisParaVinculo();
      const filtered = all.filter((p) => {
        if (!estadoBusca && !cidadeBusca) return true;
        const cidades = p.cidades || [];
        if (estadoBusca && cidadeBusca) {
          return cidades.some(
            (c) =>
              c.estado === estadoBusca &&
              c.cidade.toLowerCase() === cidadeBusca.toLowerCase()
          );
        }
        if (estadoBusca) return cidades.some((c) => c.estado === estadoBusca);
        return true;
      });
      setDisponiveis(filtered);
    } catch (e) {
      console.error(e);
      setMsg('Erro ao buscar psiquiatras.');
      setDisponiveis([]);
    } finally {
      setLoadingBusca(false);
    }
  };

  const handleSolicitar = async (psi: PsiquiatraDoc) => {
    setLoading(true);
    try {
      const psiId = psi.userId || psi.id;
      await SolicitacaoVinculoPsiquiatraMedicoService.createVinculoRequest(
        psiId,
        medicoId,
        'medico',
        {
          psiquiatraNome: psi.nome,
          psiquiatraEmail: psi.email,
          medicoNome,
        }
      );
      try {
        await fetch('/api/send-email-medico-pediu-vinculo-psi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicoId, psiquiatraId: psiId }),
        });
      } catch (e) {
        console.error('Erro ao enviar e-mail médico pediu vínculo psi:', e);
      }
      setMsg('Solicitação enviada ao psiquiatra.');
      await loadAll();
      setAba('solicitacoes');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao solicitar vínculo.');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (psi: PsiquiatraDoc) => {
    const ativo = psi.status === PSIQUIATRA_STATUS.ATIVO;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}
      >
        {ativo ? 'Ativo' : 'Inativo'}
        {psi.isVerificado ? ' Â· Verificado' : ''}
      </span>
    );
  };

  const cidadeLabel = (psi: PsiquiatraDoc) => {
    const c = psi.cidades?.[0];
    if (!c) return null;
    return `${c.cidade}/${c.estado}`;
  };

  const pendentesCount = recebidas.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Psiquiatria</h2>

        <div className="mb-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          <nav className="flex min-w-max space-x-4" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setAba('vinculados')}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                aba === 'vinculados'
                  ? 'border-green-600 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Psiquiatras Vinculados
            </button>
            <button
              type="button"
              onClick={() => setAba('solicitacoes')}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                aba === 'solicitacoes'
                  ? 'border-green-600 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              SolicitaÃ§Ãµes
              {pendentesCount > 0 ? (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-red-100">
                  {pendentesCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setAba('buscar')}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                aba === 'buscar'
                  ? 'border-green-600 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Buscar Psiquiatras
            </button>
          </nav>
        </div>
      </div>

      {aba === 'vinculados' && (
        <div className="space-y-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white lg:hidden">
            <Brain size={20} className="text-green-600" />
            Psiquiatras Vinculados
          </h3>

          {vinculados.length > 0 ? (
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={buscaEquipe}
                onChange={(e) => setBuscaEquipe(e.target.value)}
                placeholder="Buscar por nome, CRM ou cidadeâ€¦"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          ) : null}

          {loading && vinculados.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400" />
              <p className="mt-2 text-gray-600">Carregando psiquiatras...</p>
            </div>
          ) : vinculados.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <Brain className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Nenhum psiquiatra vinculado ainda.</p>
            </div>
          ) : vinculadosFiltrados.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum psiquiatra corresponde Ã  busca.</p>
          ) : (
            <ul className="space-y-3">
              {vinculadosFiltrados.map((psi) => {
                const psiId = psi.userId || psi.id;
                const expanded = expandidoId === psiId;
                const pacientes = pacientesPorPsi.get(psiId) || [];
                const loadingP = loadingPacientes.has(psiId);
                const disponivelNovoShare =
                  psi.status === PSIQUIATRA_STATUS.ATIVO && psi.isVerificado;

                return (
                  <li
                    key={psiId}
                    className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        <Brain size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {psi.nome}
                          </h4>
                          {statusBadge(psi)}
                          {!disponivelNovoShare ? (
                            <span className="text-[10px] font-medium text-amber-700">
                              IndisponÃ­vel para novos compartilhamentos
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          CRM {formatPsiquiatraRegistroAdmin(psi)}
                          {psi.rqe ? ` Â· RQE ${psi.rqe}` : ''}
                          {cidadeLabel(psi) ? ` Â· ${cidadeLabel(psi)}` : ''}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          <Users size={12} />
                          {psi.qtdPacientes} paciente{psi.qtdPacientes === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => void toggleExpand(psi)}
                          disabled={psi.qtdPacientes === 0}
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                          title={expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                        >
                          <ChevronDown
                            size={20}
                            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void handleRemover(psi)}
                          className="rounded p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          title="Excluir vÃ­nculo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                        {loadingP ? (
                          <div className="py-4 text-center">
                            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-green-600" />
                            <p className="mt-2 text-sm text-gray-600">Carregando pacientes...</p>
                          </div>
                        ) : pacientes.length === 0 ? (
                          <div className="py-4 text-center text-sm text-gray-500">
                            Nenhum paciente compartilhado
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {pacientes.map((item) => {
                              const nome =
                                item.paciente.dadosIdentificacao?.nomeCompleto ||
                                item.paciente.nome ||
                                'Paciente';
                              const statusTrat = item.paciente.statusTratamento || 'â€”';
                              return (
                                <li
                                  key={item.paciente.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40"
                                >
                                  <button
                                    type="button"
                                    onClick={() => onOpenPatient(item.paciente)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-80"
                                  >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 dark:bg-gray-800">
                                      <User size={14} />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                        {nome}
                                      </p>
                                      <p className="text-[11px] text-gray-500">
                                        Status: {statusTrat} Â· Compartilhado em{' '}
                                        {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                                      </p>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() =>
                                      void handleEncerrarShare(item.paciente.id, psiId)
                                    }
                                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Encerrar
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <p className="mt-3 text-[11px] text-gray-400">
                          Novo compartilhamento: abra o paciente â†’ aba Psiquiatria.
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {aba === 'solicitacoes' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              SolicitaÃ§Ãµes recebidas
            </h3>
            {recebidas.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                Nenhuma solicitaÃ§Ã£o pendente de psiquiatras.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recebidas.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {s.psiquiatraNome || s.psiquiatraId}
                      </p>
                      <p className="text-xs text-gray-500">Psiquiatra solicitou vÃ­nculo</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleAceitar(s.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check size={14} /> Aceitar
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleRejeitar(s.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle size={14} /> Recusar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              SolicitaÃ§Ãµes enviadas
            </h3>
            {enviadas.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Nenhuma solicitaÃ§Ã£o enviada pendente.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {enviadas.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {s.psiquiatraNome || s.psiquiatraId}
                      </p>
                      <p className="text-xs text-gray-500">Status: {s.status}</p>
                    </div>
                    {s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleCancelar(s.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {aba === 'buscar' && (
        <div className="space-y-6">
          <div className="mb-6 flex flex-wrap items-end gap-2 lg:gap-3">
            <div className="w-[80px] min-w-0 flex-shrink-0 lg:w-[100px]">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado
              </label>
              <select
                value={estadoBusca}
                onChange={(e) => {
                  setEstadoBusca(e.target.value);
                  setCidadeBusca('');
                }}
                disabled={loadingEstadosBusca}
                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white lg:px-3"
              >
                <option value="">Estado</option>
                {estadosComPsiquiatras.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1 lg:w-[180px] lg:flex-none">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cidade
              </label>
              <input
                type="text"
                value={cidadeBusca}
                onChange={(e) => setCidadeBusca(e.target.value)}
                placeholder="Cidade"
                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white lg:px-3"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleBuscar()}
              disabled={loadingBusca}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 lg:h-[38px] lg:w-auto lg:px-4 lg:py-2"
              title="Buscar"
            >
              <Search size={20} className="lg:h-[18px] lg:w-[18px]" />
              <span className="ml-1.5 hidden text-sm font-medium lg:inline">Buscar</span>
            </button>
          </div>

          {loadingBusca ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Carregando psiquiatras disponÃ­veis...
              </p>
            </div>
          ) : disponiveis.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <Brain className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                Nenhum psiquiatra encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Nenhum psiquiatra disponÃ­vel corresponde Ã  sua busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {disponiveis.map((p) => {
                const id = p.userId || p.id;
                const jaVinculado = linkedIds.has(id);
                const jaPendente = [...recebidas, ...enviadas].some(
                  (s) =>
                    s.psiquiatraId === id &&
                    (s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE ||
                      s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA)
                );
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                          <Brain className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {p.nome}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            CRM {formatPsiquiatraRegistroAdmin(p)}
                            {p.rqe ? ` Â· RQE ${p.rqe}` : ''}
                          </p>
                        </div>
                      </div>
                      {jaVinculado ? (
                        <span className="whitespace-nowrap rounded-full bg-green-600 px-2 py-1 text-[10px] font-medium text-white">
                          Vinculado
                        </span>
                      ) : jaPendente ? (
                        <span className="whitespace-nowrap rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200">
                          Pendente
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={loading || p.status !== PSIQUIATRA_STATUS.ATIVO}
                          onClick={() => void handleSolicitar(p)}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Solicitar vÃ­nculo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
