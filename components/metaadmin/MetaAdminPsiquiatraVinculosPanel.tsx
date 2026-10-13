'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Check,
  Search,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import type { SolicitacaoVinculoPsiquiatraMedicoDoc } from '@/features/metaPsi/metaPsi.types';
import { SOLICITACAO_VINCULO_PSIQUIATRA_STATUS } from '@/features/metaPsi/metaPsi.constants';
import { formatPsiquiatraRegistroAdmin, PsiquiatraService } from '@/services/psiquiatraService';
import { SolicitacaoVinculoPsiquiatraMedicoService } from '@/services/solicitacaoVinculoPsiquiatraMedicoService';
import { estadosComPsiquiatrasCadastrados } from '@/lib/metaadmin/psiquiatrasEquipePage';

type Props = {
  medicoId: string;
  medicoNome?: string;
  isDarkPage?: boolean;
  onMessage?: (msg: string) => void;
};

export default function MetaAdminPsiquiatraVinculosPanel({
  medicoId,
  medicoNome,
  isDarkPage = false,
  onMessage,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [vinculados, setVinculados] = useState<PsiquiatraDoc[]>([]);
  const [recebidas, setRecebidas] = useState<SolicitacaoVinculoPsiquiatraMedicoDoc[]>([]);
  const [enviadas, setEnviadas] = useState<SolicitacaoVinculoPsiquiatraMedicoDoc[]>([]);
  const [estadoBusca, setEstadoBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [disponiveis, setDisponiveis] = useState<PsiquiatraDoc[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [estadosComPsiquiatras, setEstadosComPsiquiatras] = useState<string[]>([]);

  const card = isDarkPage
    ? 'rounded-2xl border border-white/10 bg-white/5 p-5'
    : 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';
  const title = isDarkPage ? 'text-[#E8EDED]' : 'text-gray-900';
  const muted = isDarkPage ? 'text-[#E8EDED]/60' : 'text-gray-500';
  const setMsg = (m: string) => onMessage?.(m);

  const loadAll = useCallback(async () => {
    if (!medicoId) return;
    setLoading(true);
    try {
      const [vinc, pendMedico, enviadasMed] = await Promise.all([
        PsiquiatraService.getPsiquiatrasVinculadosAoMedico(medicoId),
        SolicitacaoVinculoPsiquiatraMedicoService.listPendingVinculoRequestsByMedico(medicoId),
        SolicitacaoVinculoPsiquiatraMedicoService.listSentVinculoRequestsByMedico(medicoId),
      ]);
      setVinculados(vinc);
      setRecebidas(pendMedico);
      setEnviadas(enviadasMed);
    } catch (e) {
      console.error(e);
      setMsg('Erro ao carregar vínculos com psiquiatras.');
    } finally {
      setLoading(false);
    }
  }, [medicoId, onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await PsiquiatraService.getAllPsiquiatras();
        if (cancelled) return;
        const ufs = estadosComPsiquiatrasCadastrados(all);
        setEstadosComPsiquiatras(ufs);
        setEstadoBusca((prev) => (prev && !ufs.includes(prev) ? '' : prev));
      } catch {
        if (!cancelled) setEstadosComPsiquiatras([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBuscar = async () => {
    setLoadingBusca(true);
    try {
      const all = await PsiquiatraService.getPsiquiatrasElegiveisParaVinculo();
      const filtered = all.filter((p) => {
        if (!estadoBusca && !cidadeBusca) return true;
        const cidades = p.cidades || [];
        if (estadoBusca && cidadeBusca) {
          return cidades.some(
            (c) => c.estado === estadoBusca && c.cidade.toLowerCase() === cidadeBusca.toLowerCase()
          );
        }
        if (estadoBusca) {
          return cidades.some((c) => c.estado === estadoBusca);
        }
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

  const linkedIds = useMemo(() => new Set(vinculados.map((p) => p.userId || p.id)), [vinculados]);

  const isPending = (psiquiatraId: string) =>
    [...recebidas, ...enviadas].some(
      (s) =>
        s.psiquiatraId === psiquiatraId &&
        (s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE ||
          s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.ACEITA)
    );

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
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao solicitar vínculo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAceitar = async (id: string) => {
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.approveVinculoRequest(id);
      setMsg('Vínculo aceito.');
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
      setMsg('Solicitação rejeitada.');
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
      setMsg('Solicitação cancelada.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao cancelar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async (psi: PsiquiatraDoc) => {
    if (
      !confirm(
        `Remover o vínculo profissional com ${psi.nome}?\n\nSe houver pacientes ativos compartilhados, a remoção será bloqueada.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await SolicitacaoVinculoPsiquiatraMedicoService.removeVinculoCompleto(
        medicoId,
        psi.userId || psi.id
      );
      setMsg('Vínculo removido.');
      await loadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro ao remover vínculo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-bold ${title}`}>Psiquiatria</h2>
        <p className={`mt-1 text-sm ${muted}`}>
          Vínculo profissional Médico ↔ Psiquiatra. O compartilhamento de pacientes é feito no
          prontuário (aba Psiquiatria) ou na página Psiquiatria do menu.
        </p>
      </div>

      <section className={card}>
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${muted}`}>
          Solicitações recebidas
        </h3>
        {recebidas.length === 0 ? (
          <p className={`mt-3 text-sm ${muted}`}>Nenhuma solicitação pendente de psiquiatras.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recebidas.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
              >
                <div>
                  <p className={`text-sm font-medium ${title}`}>
                    {s.psiquiatraNome || s.psiquiatraId}
                  </p>
                  <p className={`text-xs ${muted}`}>Psiquiatra solicitou vínculo</p>
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
                    <XCircle size={14} /> Rejeitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${muted}`}>
          Solicitações enviadas
        </h3>
        {enviadas.length === 0 ? (
          <p className={`mt-3 text-sm ${muted}`}>Nenhuma solicitação enviada pendente.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {enviadas.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
              >
                <div>
                  <p className={`text-sm font-medium ${title}`}>
                    {s.psiquiatraNome || s.psiquiatraId}
                  </p>
                  <p className={`text-xs ${muted}`}>Status: {s.status}</p>
                </div>
                {s.status === SOLICITACAO_VINCULO_PSIQUIATRA_STATUS.PENDENTE && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleCancelar(s.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-white/10 disabled:opacity-50"
                  >
                    <X size={14} /> Cancelar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${muted}`}>
          Psiquiatras vinculados ({vinculados.length})
        </h3>
        {loading && vinculados.length === 0 ? (
          <p className={`mt-3 text-sm ${muted}`}>Carregando…</p>
        ) : vinculados.length === 0 ? (
          <p className={`mt-3 text-sm ${muted}`}>Nenhum psiquiatra vinculado ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {vinculados.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <Brain size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${title}`}>{p.nome}</p>
                    <p className={`text-xs ${muted}`}>
                      CRM {formatPsiquiatraRegistroAdmin(p)}
                      {p.rqe ? ` · RQE ${p.rqe}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleRemover(p)}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Remover vínculo
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${muted}`}>
          Buscar psiquiatras
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className={`mb-1 block text-xs font-medium ${muted}`}>Estado</label>
            <select
              value={estadoBusca}
              onChange={(e) => {
                setEstadoBusca(e.target.value);
                setCidadeBusca('');
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Todos</option>
              {estadosComPsiquiatras.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`mb-1 block text-xs font-medium ${muted}`}>Cidade</label>
            <input
              value={cidadeBusca}
              onChange={(e) => setCidadeBusca(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleBuscar()}
              disabled={loadingBusca}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Search size={16} />
              Buscar
            </button>
          </div>
        </div>

        {loadingBusca ? (
          <p className={`mt-4 text-sm ${muted}`}>Buscando…</p>
        ) : disponiveis.length === 0 ? (
          <p className={`mt-4 text-sm ${muted}`}>
            Busque psiquiatras verificados e ativos para solicitar vínculo.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {disponiveis.map((p) => {
              const id = p.userId || p.id;
              const linked = linkedIds.has(id);
              const pending = isPending(id);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-3"
                >
                  <div>
                    <p className={`text-sm font-semibold ${title}`}>{p.nome}</p>
                    <p className={`text-xs ${muted}`}>
                      CRM {formatPsiquiatraRegistroAdmin(p)}
                      {p.especialidade ? ` · ${p.especialidade}` : ''}
                    </p>
                  </div>
                  {linked ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-medium text-green-800">
                      Vinculado
                    </span>
                  ) : pending ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-800">
                      Pendente
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleSolicitar(p)}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <UserPlus size={14} /> Solicitar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
