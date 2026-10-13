'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Clock,
  Eye,
  MessageSquare,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import type { SolicitacaoPsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import { SolicitacaoPsiquiatraService } from '@/services/solicitacaoPsiquiatraService';
import {
  PacientePsiquiatraService,
  type PacienteVisivelPsiquiatra,
} from '@/services/pacientePsiquiatraService';
import SolicitacoesPacientesCarousel from '@/components/metaadmin/SolicitacoesPacientesCarousel';
import { VinculoFotoAvatar } from '@/components/metaadmin/ProfissionalVinculoStats';
import MetaPsiPacienteWorkspaceModal from '@/components/metapsi/MetaPsiPacienteWorkspaceModal';
import { filterPacientesVisiveisPsi } from '@/lib/metapsi/filterPacientesVisiveisPsi';
import { buildPatientWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';

type Props = {
  userId: string;
  psiquiatra: PsiquiatraDoc;
  sidebarCollapsed?: boolean;
  onMessage?: (msg: string) => void;
};

function medicoTitulo(nome: string, genero?: 'M' | 'F') {
  const n = String(nome || '').trim();
  if (!n) return 'Médico responsável';
  if (genero === 'F') return `Dra. ${n}`;
  if (genero === 'M') return `Dr. ${n}`;
  return `Dr(a). ${n}`;
}

function formatDataCadastro(value: unknown): string {
  if (!value) return '-';
  try {
    if (value instanceof Date) return value.toLocaleDateString('pt-BR');
    if (typeof value === 'object' && value && 'toDate' in value) {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date ? d.toLocaleDateString('pt-BR') : '-';
    }
    const d = new Date(value as string | number);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

/**
 * Pacientes /metapsi — chrome visual alinhado ao MetaNutri (carousel + busca + tabela/cards).
 * ACL SoT: paciente_psiquiatra ativo. Workspace existente sem redesign (6.3.5).
 */
export default function MetaPsiPacientesPanel({
  userId,
  psiquiatra,
  sidebarCollapsed = false,
  onMessage,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [pendentes, setPendentes] = useState<SolicitacaoPsiquiatraDoc[]>([]);
  const [pacientes, setPacientes] = useState<PacienteVisivelPsiquiatra[]>([]);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [filtroMedico, setFiltroMedico] = useState('');
  const [aceitandoId, setAceitandoId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<PacienteVisivelPsiquiatra | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setMsg = (m: string) => onMessage?.(m);
  const verificado = psiquiatra.isVerificado === true;

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [pend, list] = await Promise.all([
        SolicitacaoPsiquiatraService.listPendingRequestsByPsiquiatra(userId),
        PacientePsiquiatraService.listPacientesVisiveisByPsiquiatra(userId),
      ]);
      setPendentes(pend);
      setPacientes(list.filter((p) => p.status === 'ativo'));
    } catch (e) {
      console.error(e);
      setMsg('Erro ao carregar pacientes.');
    } finally {
      setLoading(false);
    }
  }, [userId, onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const medicosUnicos = useMemo(() => {
    const map = new Map<string, { nome: string; genero?: 'M' | 'F' }>();
    for (const p of pacientes) {
      if (p.medicoId && p.medicoNome && !map.has(p.medicoId)) {
        map.set(p.medicoId, { nome: p.medicoNome, genero: p.medicoGenero });
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [pacientes]);

  const pacientesOrdenados = useMemo(
    () =>
      filterPacientesVisiveisPsi(pacientes, {
        busca: buscaPaciente,
        medicoId: filtroMedico,
      }),
    [pacientes, buscaPaciente, filtroMedico],
  );

  const handleAceitar = async (id: string) => {
    setAceitandoId(id);
    setLoading(true);
    try {
      await SolicitacaoPsiquiatraService.approveShareRequest(id);
      setMsg('Paciente aceito. Compartilhamento ativo.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao aceitar.');
    } finally {
      setAceitandoId(null);
      setLoading(false);
    }
  };

  const handleRecusar = async (id: string) => {
    setLoading(true);
    try {
      await SolicitacaoPsiquiatraService.rejectShareRequest(id);
      setMsg('Solicitação recusada.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao recusar.');
    } finally {
      setLoading(false);
    }
  };

  const handleEncerrar = async (item: PacienteVisivelPsiquiatra) => {
    const nome =
      item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'este paciente';
    if (
      !confirm(
        `Encerrar o acompanhamento de ${nome}?\n\n` +
          `- Encerrar o compartilhamento ativo\n` +
          `- O paciente sairá da sua lista\n` +
          `- O vínculo profissional com o médico NÃO será removido\n` +
          `- O histórico de mensagens não é apagado`,
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await SolicitacaoPsiquiatraService.endCompartilhamento(
        item.pacienteId,
        userId,
        item.medicoId,
      );
      setMsg('Compartilhamento encerrado.');
      if (workspace?.pacienteId === item.pacienteId) setWorkspace(null);
      if (expandedId === item.pacienteId) setExpandedId(null);
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao encerrar compartilhamento.');
    } finally {
      setLoading(false);
    }
  };

  const openWorkspace = (item: PacienteVisivelPsiquiatra) => {
    setWorkspace(item);
  };

  const medicoLabelFor = (item: PacienteVisivelPsiquiatra) =>
    medicoTitulo(item.medicoNome, item.medicoGenero);

  return (
    <div className="min-w-0 space-y-6" data-metapsi-pacientes-panel>
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Pacientes</h1>
        <p className="mb-6 text-gray-600">Pacientes compartilhados com você</p>

        {pendentes.length > 0 ? (
          <div className="mb-6 rounded-lg bg-white p-4 shadow sm:p-5" data-metapsi-pacientes-carousel>
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              Solicitações Pendentes
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                {pendentes.length}
              </span>
            </h3>
            <SolicitacoesPacientesCarousel
              items={pendentes.map((solicitacao) => ({
                id: solicitacao.id,
                nome:
                  solicitacao.pacienteNome ||
                  `Paciente ${String(solicitacao.pacienteId || '').substring(0, 8)}...`,
                criadoEm: solicitacao.criadoEm,
                chips: solicitacao.medicoNome
                  ? [
                      {
                        id: `medico-${solicitacao.id}`,
                        label: solicitacao.medicoNome,
                        variant: 'slate' as const,
                        icon: 'medico' as const,
                      },
                    ]
                  : undefined,
              }))}
              onAceitar={(id) => void handleAceitar(id)}
              onRejeitar={(id) => void handleRecusar(id)}
              aceitandoId={aceitandoId}
            />
          </div>
        ) : null}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row" data-metapsi-pacientes-busca>
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar paciente por nome ou email..."
              value={buscaPaciente}
              onChange={(e) => setBuscaPaciente(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </div>
          {medicosUnicos.length > 0 ? (
            <div className="sm:w-56">
              <select
                value={filtroMedico}
                onChange={(e) => setFiltroMedico(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos os médicos</option>
                {medicosUnicos.map(({ id, nome, genero }) => (
                  <option key={id} value={id}>
                    {genero === 'F' ? 'Dra.' : 'Dr.'} {nome}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {loading && pacientes.length === 0 && pendentes.length === 0 ? (
          <div className="py-8 text-center" data-metapsi-pacientes-skeleton>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
            <p className="mt-4 text-gray-600">Carregando pacientes...</p>
          </div>
        ) : !verificado ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-yellow-600" />
            <h3 className="mb-2 text-lg font-semibold text-yellow-900">Aguardando verificação</h3>
            <p className="text-yellow-700">
              Você precisa ser verificado pelo administrador para ver pacientes compartilhados.
            </p>
          </div>
        ) : pacientes.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Nenhum paciente compartilhado</h3>
            <p className="text-gray-600">Você ainda não possui pacientes compartilhados com você.</p>
          </div>
        ) : pacientesOrdenados.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Nenhum paciente encontrado</h3>
            <p className="text-gray-600">Nenhum paciente corresponde à sua busca.</p>
          </div>
        ) : (
          <>
            {/* Desktop — tabela (chrome Nutri; sem colunas de peso/semanas) */}
            <div
              className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white lg:block"
              data-metapsi-pacientes-table
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Compartilhado em
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Médico
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Telefone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {pacientesOrdenados.map((item, index) => {
                      const paciente = item.paciente;
                      const nomeCompleto =
                        paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Sem nome';
                      const telefone = paciente.dadosIdentificacao?.telefone || '';
                      const telefoneWhatsApp = telefone.replace(/\D/g, '');
                      const linkWhatsApp = buildPatientWhatsappUrl(paciente) ?? '#';
                      return (
                        <tr
                          key={item.vinculoId}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => openWorkspace(item)}
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{index + 1}</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center gap-3">
                              <VinculoFotoAvatar name={nomeCompleto} tone="medico" />
                              <div className="text-sm font-medium text-gray-900">{nomeCompleto}</div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-gray-700">{medicoLabelFor(item)}</div>
                          </td>
                          <td
                            className="whitespace-nowrap px-6 py-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {telefoneWhatsApp ? (
                              <a
                                href={linkWhatsApp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                              >
                                <MessageSquare size={14} />
                                {telefone}
                              </a>
                            ) : (
                              <div className="text-sm text-gray-500">-</div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                              Ativo
                            </span>
                          </td>
                          <td
                            className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openWorkspace(item)}
                                className="rounded-md bg-orange-50 p-2 text-orange-700 transition-colors hover:bg-orange-100"
                                title="Abrir paciente"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleEncerrar(item)}
                                disabled={loading}
                                className="rounded-md bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                                title="Encerrar acompanhamento"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile — cards */}
            <div className="space-y-3 lg:hidden" data-metapsi-pacientes-cards>
              {pacientesOrdenados.map((item) => {
                const paciente = item.paciente;
                const nomeCompleto =
                  paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Sem nome';
                const isExpanded = expandedId === item.pacienteId;
                const telefone = paciente.dadosIdentificacao?.telefone || '';
                return (
                  <div
                    key={item.vinculoId}
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                  >
                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <VinculoFotoAvatar name={nomeCompleto} tone="medico" />
                        <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">
                          {nomeCompleto}
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : item.pacienteId)
                          }
                          className="-mr-1 shrink-0 p-1 text-gray-500 transition-colors hover:text-gray-700"
                          aria-label={isExpanded ? 'Fechar detalhes' : 'Abrir detalhes'}
                        >
                          <ChevronDown
                            size={20}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          Ativo
                        </span>
                        <span className="text-xs text-gray-500">{medicoLabelFor(item)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openWorkspace(item)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <Eye size={14} />
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleEncerrar(item)}
                          disabled={loading}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Encerrar acompanhamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {isExpanded ? (
                        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600">
                          <p>
                            Compartilhado em:{' '}
                            {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                          </p>
                          {telefone ? <p>Telefone: {telefone}</p> : null}
                          <p>
                            Cadastro: {formatDataCadastro(paciente.dataCadastro)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {workspace ? (
        <MetaPsiPacienteWorkspaceModal
          open
          pacienteId={workspace.pacienteId}
          psiquiatraId={userId}
          medicoLabel={medicoLabelFor(workspace)}
          sidebarCollapsed={sidebarCollapsed}
          onClose={() => setWorkspace(null)}
          onDenied={() => {
            setMsg(
              'Acesso negado: compartilhamento inativo ou inexistente para este paciente.',
            );
            setWorkspace(null);
          }}
        />
      ) : null}
    </div>
  );
}
