'use client';

import { useCallback, useEffect, useState } from 'react';
import { Brain, Search, X, XCircle } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COL_PACIENTE_PSIQUIATRA,
  SOLICITACAO_PSIQUIATRA_STATUS,
} from '@/features/metaPsi/metaPsi.constants';
import type { PacientePsiquiatraDoc, PsiquiatraDoc, SolicitacaoPsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import { formatPsiquiatraRegistroAdmin, PsiquiatraService } from '@/services/psiquiatraService';
import { SolicitacaoPsiquiatraService } from '@/services/solicitacaoPsiquiatraService';
import type { PacienteCompleto } from '@/types/obesidade';
import { resolveSingleActivePsiquiatraVinculo } from '@/lib/psiquiatria/resolveSingleActivePsiquiatra';

export type PsiquiatraPacienteSharePanelProps = {
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome?: string;
  onFeedback?: (message: string) => void;
};

type VinculoAtivoView = Pick<
  PacientePsiquiatraDoc,
  'id' | 'pacienteId' | 'psiquiatraId' | 'medicoId' | 'status'
> & { dataCompartilhamento: Date };

/**
 * Painel de compartilhamento Paciente ↔ Psiquiatra.
 * Conteúdo clínico fica em PsiquiatriaContent (ETAPA 5+).
 */
export function PsiquiatraPacienteSharePanel({
  paciente,
  medicoId,
  medicoNome,
  onFeedback,
}: PsiquiatraPacienteSharePanelProps) {
  const pacienteId = paciente.id;
  const pacienteLabel =
    paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';

  const [elegiveis, setElegiveis] = useState<PsiquiatraDoc[]>([]);
  const [loadingElegiveis, setLoadingElegiveis] = useState(false);
  const [vinculosAtivos, setVinculosAtivos] = useState<VinculoAtivoView[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPsiquiatraDoc[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showBusca, setShowBusca] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [encerrandoId, setEncerrandoId] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [nomesById, setNomesById] = useState<Record<string, string>>({});

  const notify = useCallback(
    (msg: string, isError = false) => {
      if (isError) {
        setLocalError(msg);
        setLocalMessage(null);
      } else {
        setLocalMessage(msg);
        setLocalError(null);
      }
      onFeedback?.(msg);
    },
    [onFeedback]
  );

  const loadElegiveis = useCallback(async () => {
    if (!medicoId) return;
    setLoadingElegiveis(true);
    try {
      const list = await PsiquiatraService.getPsiquiatrasVinculadosAoMedico(medicoId);
      setElegiveis(list);
      const map: Record<string, string> = {};
      list.forEach((p) => {
        map[p.userId || p.id] = p.nome;
      });
      setNomesById((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.error(e);
      setElegiveis([]);
      notify('Erro ao carregar psiquiatras da equipe.', true);
    } finally {
      setLoadingElegiveis(false);
    }
  }, [medicoId, notify]);

  const loadStatus = useCallback(async () => {
    if (!medicoId || !pacienteId) return;
    setLoadingStatus(true);
    try {
      const q = query(
        collection(db, COL_PACIENTE_PSIQUIATRA),
        where('pacienteId', '==', pacienteId),
        where('status', '==', 'ativo')
      );
      const snap = await getDocs(q);
      const vinculos = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: String(data.pacienteId || ''),
          psiquiatraId: String(data.psiquiatraId || ''),
          medicoId: String(data.medicoId || ''),
          dataCompartilhamento: data.dataCompartilhamento?.toDate?.() || new Date(),
          status: (data.status || 'ativo') as VinculoAtivoView['status'],
        };
      });
      // Um paciente = no máx. 1 ativo. Conflito legado: fallback determinístico (sem auto-heal).
      const { activeVinculo } = resolveSingleActivePsiquiatraVinculo(vinculos);
      setVinculosAtivos(activeVinculo ? [activeVinculo] : []);

      const reqs = await SolicitacaoPsiquiatraService.listRequestsByPaciente(medicoId, pacienteId);
      setSolicitacoes(reqs);

      const ids = [
        ...vinculos.map((v) => v.psiquiatraId),
        ...reqs.map((r) => r.psiquiatraId),
      ];
      const unique = [...new Set(ids)];
      const fetched = await Promise.all(
        unique.map(async (id) => {
          const p = await PsiquiatraService.getPsiquiatraByUserId(id).catch(() => null);
          return p ? ([id, p.nome] as const) : null;
        })
      );
      const map: Record<string, string> = {};
      fetched.forEach((row) => {
        if (row) map[row[0]] = row[1];
      });
      setNomesById((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.error(e);
      setVinculosAtivos([]);
      setSolicitacoes([]);
      notify('Erro ao carregar status de Psiquiatria.', true);
    } finally {
      setLoadingStatus(false);
    }
  }, [medicoId, pacienteId, notify]);

  useEffect(() => {
    setVinculosAtivos([]);
    setSolicitacoes([]);
    setShowBusca(false);
    setLocalMessage(null);
    setLocalError(null);
    if (!medicoId || !pacienteId) return;
    void loadStatus();
    void loadElegiveis();
  }, [medicoId, pacienteId, loadStatus, loadElegiveis]);

  const pendentes = solicitacoes.filter((s) => s.status === SOLICITACAO_PSIQUIATRA_STATUS.PENDENTE);
  const busy = enviando || !!encerrandoId || !!cancelandoId;
  const temAtivo = vinculosAtivos.length > 0;
  const resolveNome = (id: string) => nomesById[id] || 'Psiquiatra';

  const handleSelect = async (psi: PsiquiatraDoc) => {
    if (!pacienteId || !medicoId || enviando) return;
    if (temAtivo) {
      notify(
        'Já existe um psiquiatra ativo neste paciente. Encerre o compartilhamento atual antes de compartilhar com outro.',
        true
      );
      return;
    }
    setEnviando(true);
    try {
      await SolicitacaoPsiquiatraService.createPacienteShareRequest(
        medicoId,
        psi.userId || psi.id,
        pacienteId,
        {
          pacienteNome: pacienteLabel,
          medicoNome: medicoNome || '',
          psiquiatraNome: psi.nome,
          psiquiatraEmail: psi.email,
        }
      );
      try {
        await fetch('/api/send-email-paciente-compartilhado-psi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicoId,
            psiquiatraId: psi.userId || psi.id,
            pacienteId,
          }),
        });
      } catch (e) {
        console.error('Erro ao enviar e-mail paciente compartilhado psi:', e);
      }
      notify('Solicitação de compartilhamento enviada ao psiquiatra.');
      setShowBusca(false);
      await loadStatus();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Erro ao compartilhar.', true);
    } finally {
      setEnviando(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (busy) return;
    setCancelandoId(id);
    try {
      await SolicitacaoPsiquiatraService.cancelShareRequest(id);
      notify('Solicitação cancelada.');
      await loadStatus();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Erro ao cancelar.', true);
    } finally {
      setCancelandoId(null);
    }
  };

  const handleEncerrar = async (vinculo: VinculoAtivoView) => {
    if (busy) return;
    const nome = resolveNome(vinculo.psiquiatraId);
    if (
      !confirm(
        `Encerrar o compartilhamento de ${pacienteLabel} com ${nome}?\n\nO vínculo profissional Médico ↔ Psiquiatra será mantido.`
      )
    ) {
      return;
    }
    setEncerrandoId(vinculo.id);
    try {
      await SolicitacaoPsiquiatraService.endCompartilhamento(
        pacienteId,
        vinculo.psiquiatraId,
        medicoId
      );
      notify('Compartilhamento encerrado.');
      await loadStatus();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Erro ao encerrar.', true);
    } finally {
      setEncerrandoId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Brain className="h-5 w-5 text-green-600" />
          Psiquiatria
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Compartilhe este paciente com um Psiquiatra da sua equipe. Um paciente pode ter apenas um
          psiquiatra ativo por vez.
        </p>
      </div>

      {localMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {localMessage}
        </div>
      ) : null}
      {localError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {localError}
        </div>
      ) : null}

      {loadingStatus ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : temAtivo ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Psiquiatra responsável
          </p>
          {vinculosAtivos.map((v) => (
            <div
              key={v.id}
              className="mt-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {resolveNome(v.psiquiatraId)}
                </p>
                <p className="text-sm text-green-700">Status: Ativo</p>
              </div>
              {v.medicoId === medicoId ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleEncerrar(v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  {encerrandoId === v.id ? 'Encerrando…' : 'Encerrar compartilhamento'}
                </button>
              ) : (
                <p className="max-w-[12rem] text-xs text-gray-500">
                  Compartilhamento de outro médico — sem ação de encerrar aqui.
                </p>
              )}
            </div>
          ))}
        </section>
      ) : pendentes.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Aguardando aceite
          </p>
          {pendentes.map((s) => (
            <div
              key={s.id}
              className="mt-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {s.psiquiatraNome || resolveNome(s.psiquiatraId)}
                </p>
                <p className="text-sm text-amber-800">Status: Aguardando aceite</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCancel(s.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50"
              >
                <X size={16} />
                {cancelandoId === s.id ? 'Cancelando…' : 'Cancelar'}
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-gray-900">
            Compartilhe este paciente com um Psiquiatra da sua equipe.
          </p>
          <button
            type="button"
            disabled={busy || loadingElegiveis}
            onClick={() => {
              setShowBusca(true);
              void loadElegiveis();
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Search size={16} />
            Selecionar psiquiatra
          </button>
        </section>
      )}

      {showBusca ? (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Brain size={18} className="text-green-600" />
                Psiquiatras da equipe
              </h3>
              <button type="button" onClick={() => setShowBusca(false)} className="text-gray-400">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              {loadingElegiveis ? (
                <p className="text-sm text-gray-500">Carregando…</p>
              ) : elegiveis.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum psiquiatra vinculado e aprovado na sua equipe.
                </p>
              ) : (
                elegiveis.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={enviando}
                    onClick={() => void handleSelect(p)}
                    className="flex w-full items-start justify-between rounded-xl border border-gray-200 px-3 py-3 text-left hover:border-green-400 hover:bg-green-50 disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.nome}</p>
                      <p className="text-xs text-gray-500">
                        CRM {formatPsiquiatraRegistroAdmin(p)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-green-700">Compartilhar</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PsiquiatraPacienteSharePanel;
