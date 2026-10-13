'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Dumbbell, Search, X, XCircle } from 'lucide-react';
import { PersonalPageContent } from '@/app/meta/personal/page';
import MetapersonalPacienteTreinoPanel from '@/components/metapersonal/treinos/MetapersonalPacienteTreinoPanel';
import { db } from '@/lib/firebase';
import {
  COL_PACIENTE_PERSONAL_TRAINER,
  SOLICITACAO_STATUS,
} from '@/features/metaPersonal/metaPersonal.constants';
import type {
  PacientePersonalTrainerDoc,
  PersonalTrainerDoc,
  SolicitacaoPersonalTrainerDoc,
} from '@/features/metaPersonal/metaPersonal.types';
import PacienteModalHeader from '@/components/metaadmin/paciente-modal/PacienteModalHeader';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { SolicitacaoPersonalTrainerService } from '@/services/solicitacaoPersonalTrainerService';
import { useCompartilhamentoEnvio } from '@/components/metaadmin/compartilhamento/CompartilhamentoEnvioModal';
import type { PacienteCompleto } from '@/types/obesidade';

export type PersonalPacienteSharePanelProps = {
  paciente: PacienteCompleto;
  medicoId: string;
  /** Nome do médico para denormalizar na solicitação (opcional; o serviço busca se ausente). */
  medicoNome?: string;
  /** URL da foto do paciente (Google photoURL já resolvida). */
  patientPhotoUrl?: string | null;
  /** @deprecated Calendário agora vem do PersonalPageContent espelhado. */
  showCalendar?: boolean;
  /**
   * Estilo compacto do modal mobile (textos menores / densos).
   * Na aba desktop do Editar Paciente, omitir ou passar false.
   */
  compact?: boolean;
  /** Mobile: tela cheia igual ao metapersonal; vínculo no cabeçalho. */
  fullscreen?: boolean;
  onClose?: () => void;
  /** Feedback global do portal (banner `setMessage` do metaadmin). */
  onFeedback?: (message: string) => void;
  /** Nutri vê o mesmo quadro, sem buscar ou cancelar o vínculo do médico. */
  canManageLink?: boolean;
};

type VinculoAtivoView = Pick<
  PacientePersonalTrainerDoc,
  'id' | 'pacienteId' | 'personalTrainerId' | 'medicoId' | 'status'
> & {
  dataCompartilhamento: Date;
};

function formatDateBr(value?: Date | string | null): string {
  if (!value) return '-';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

/**
 * Painel Personal do médico: vínculo/escolha do personal.
 * No desktop, o treino do paciente é só consulta (mesmo quadro do metapersonal).
 * No mobile em tela cheia, permanece a página do aluno.
 */
export function PersonalPacienteSharePanel({
  paciente,
  medicoId,
  medicoNome,
  patientPhotoUrl,
  showCalendar: _showCalendar = true,
  compact = false,
  fullscreen = false,
  onClose,
  onFeedback,
  canManageLink = true,
}: PersonalPacienteSharePanelProps) {
  void _showCalendar;
  const pacienteId = paciente.id;
  const pacienteLabel =
    paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';

  const [elegiveis, setElegiveis] = useState<PersonalTrainerDoc[]>([]);
  const [loadingElegiveis, setLoadingElegiveis] = useState(false);
  const [vinculosAtivos, setVinculosAtivos] = useState<VinculoAtivoView[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPersonalTrainerDoc[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showBusca, setShowBusca] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const compartilhamentoEnvio = useCompartilhamentoEnvio();
  const [encerrandoId, setEncerrandoId] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

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
      const todos = await PersonalTrainerService.getAllPersonalTrainers();
      const filtrados = todos.filter(
        (personal) =>
          personal.isVerificado &&
          personal.status === 'ativo' &&
          personal.medicoVinculadoIds.includes(medicoId)
      );
      setElegiveis(filtrados);
    } catch (error) {
      console.error('Erro ao carregar personal trainers elegíveis:', error);
      setElegiveis([]);
      notify('Erro ao carregar personal trainers elegíveis.', true);
    } finally {
      setLoadingElegiveis(false);
    }
  }, [medicoId, notify]);

  const loadStatus = useCallback(async () => {
    if (!medicoId || !pacienteId) return;
    setLoadingStatus(true);
    try {
      const q = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('pacienteId', '==', pacienteId),
        where('status', '==', 'ativo')
      );
      const snap = await getDocs(q);
      const vinculos = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId as string,
          personalTrainerId: data.personalTrainerId as string,
          medicoId: data.medicoId as string,
          dataCompartilhamento: data.dataCompartilhamento?.toDate?.() || new Date(),
          status: (data.status || 'ativo') as VinculoAtivoView['status'],
        };
      });
      setVinculosAtivos(vinculos.filter((v) => v.medicoId === medicoId));

      const reqs = await SolicitacaoPersonalTrainerService.listRequestsByPaciente(
        medicoId,
        pacienteId
      );
      setSolicitacoes(reqs);
    } catch (error) {
      console.error('Erro ao carregar status de compartilhamento com Personal Trainer:', error);
      setVinculosAtivos([]);
      setSolicitacoes([]);
      notify('Erro ao carregar status de compartilhamento com personal.', true);
    } finally {
      setLoadingStatus(false);
    }
  }, [medicoId, pacienteId, notify]);

  // Troca de paciente / médico: limpa e recarrega (evita stale state)
  useEffect(() => {
    setVinculosAtivos([]);
    setSolicitacoes([]);
    setElegiveis([]);
    setShowBusca(false);
    setEnviando(false);
    setEncerrandoId(null);
    setCancelandoId(null);
    setLocalMessage(null);
    setLocalError(null);

    if (!medicoId || !pacienteId) return;

    let cancelled = false;
    (async () => {
      setLoadingStatus(true);
      setLoadingElegiveis(true);
      try {
        const todos = await PersonalTrainerService.getAllPersonalTrainers();
        if (cancelled) return;
        setElegiveis(
          todos.filter(
            (personal) =>
              personal.isVerificado &&
              personal.status === 'ativo' &&
              personal.medicoVinculadoIds.includes(medicoId)
          )
        );
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar personal trainers elegíveis:', error);
          setElegiveis([]);
        }
      } finally {
        if (!cancelled) setLoadingElegiveis(false);
      }

      try {
        const q = query(
          collection(db, COL_PACIENTE_PERSONAL_TRAINER),
          where('pacienteId', '==', pacienteId),
          where('status', '==', 'ativo')
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const vinculos = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            pacienteId: data.pacienteId as string,
            personalTrainerId: data.personalTrainerId as string,
            medicoId: data.medicoId as string,
            dataCompartilhamento: data.dataCompartilhamento?.toDate?.() || new Date(),
            status: (data.status || 'ativo') as VinculoAtivoView['status'],
          };
        });
        setVinculosAtivos(vinculos.filter((v) => v.medicoId === medicoId));
        const reqs = await SolicitacaoPersonalTrainerService.listRequestsByPaciente(
          medicoId,
          pacienteId
        );
        if (cancelled) return;
        setSolicitacoes(reqs);
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar status de compartilhamento:', error);
          setVinculosAtivos([]);
          setSolicitacoes([]);
        }
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [medicoId, pacienteId]);

  const pendentes = solicitacoes.filter((s) => s.status === SOLICITACAO_STATUS.PENDENTE);
  const busy = enviando || !!encerrandoId || !!cancelandoId;

  const resolvePersonalNome = (personalTrainerId: string) => {
    const personal = elegiveis.find((p) => p.userId === personalTrainerId);
    return personal?.nome || 'Personal Trainer';
  };

  const handleOpenBusca = async () => {
    setShowBusca(true);
    await loadElegiveis();
  };

  const handleSelectPersonal = async (personal: PersonalTrainerDoc) => {
    if (!pacienteId || !medicoId || enviando) return;
    setEnviando(true);
    setShowBusca(false);
    try {
      const ok = await compartilhamentoEnvio.run({
        role: 'personal_trainer',
        profissionalNome: personal.nome,
        create: () =>
          SolicitacaoPersonalTrainerService.createPacienteShareRequest(
            medicoId,
            personal.userId,
            pacienteId,
            {
              pacienteNome: pacienteLabel,
              medicoNome: medicoNome || '',
              personalTrainerNome: personal.nome,
              personalTrainerEmail: personal.email,
            }
          ),
      });
      if (ok) await loadStatus();
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelSolicitacao = async (solicitacaoId: string) => {
    if (busy) return;
    setCancelandoId(solicitacaoId);
    try {
      await SolicitacaoPersonalTrainerService.cancelShareRequest(solicitacaoId);
      notify('Solicitação cancelada com sucesso!');
      await loadStatus();
    } catch (error: unknown) {
      console.error('Erro ao cancelar solicitação:', error);
      const msg =
        error instanceof Error ? error.message : 'Erro ao cancelar solicitação.';
      notify(msg, true);
    } finally {
      setCancelandoId(null);
    }
  };

  const handleEncerrar = async (vinculo: VinculoAtivoView, nomePersonal: string) => {
    if (busy) return;
    const confirmar = confirm(
      `Tem certeza que deseja cancelar o compartilhamento de ${pacienteLabel} com ${nomePersonal}?\n\n` +
        `Esta ação irá:\n` +
        `- Encerrar o compartilhamento ativo\n` +
        `- Deletar o histórico na coleção de solicitações\n\n` +
        `Esta ação não pode ser desfeita.`
    );
    if (!confirmar) return;

    setEncerrandoId(vinculo.id);
    try {
      await SolicitacaoPersonalTrainerService.endCompartilhamento(
        pacienteId,
        vinculo.personalTrainerId,
        medicoId
      );
      notify('Compartilhamento encerrado com sucesso!');
      await loadStatus();
    } catch (error: unknown) {
      console.error('Erro ao encerrar compartilhamento:', error);
      const msg =
        error instanceof Error ? error.message : 'Erro ao encerrar compartilhamento.';
      notify(msg, true);
    } finally {
      setEncerrandoId(null);
    }
  };

  const buscaModal = showBusca ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10050] p-4">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buscar-personal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3
              id="buscar-personal-title"
              className="text-lg font-semibold text-gray-900 flex items-center gap-2"
            >
              <Search size={20} className="text-pink-600" />
              Buscar Personal Trainer
            </h3>
            <button
              type="button"
              onClick={() => setShowBusca(false)}
              disabled={enviando}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Personal trainers vinculados a você. Selecione um para compartilhar o paciente.
          </p>

          {loadingElegiveis ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent" />
              <span className="ml-2">Carregando...</span>
            </div>
          ) : elegiveis.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Personal trainers vinculados ({elegiveis.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {elegiveis.map((personal) => (
                  <button
                    key={personal.id}
                    type="button"
                    onClick={() => handleSelectPersonal(personal)}
                    disabled={enviando}
                    className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-900">{personal.nome}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {personal.registroNumero || 'Sem registro'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              Nenhum personal trainer vinculado a você. Vincule personal trainers na aba Personal
              Trainers.
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const headerShareControlsLight = (
    <div className="flex flex-nowrap items-center gap-2 border-t border-gray-100 bg-gray-50/90 px-3 py-2 sm:px-4">
      <Dumbbell size={15} className="shrink-0 text-pink-600" aria-hidden />
      <span className="shrink-0 text-xs font-medium text-gray-500">Personal</span>
      {loadingStatus ? (
        <span className="text-xs text-gray-400">Carregando…</span>
      ) : vinculosAtivos.length > 0 ? (
        vinculosAtivos.map((vinculo) => {
          const nomePersonal = resolvePersonalNome(vinculo.personalTrainerId);
          return (
            <div key={vinculo.id} className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                {nomePersonal}
              </span>
              <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Aceito
              </span>
              <button
                type="button"
                onClick={() => handleEncerrar(vinculo, nomePersonal)}
                disabled={busy}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle size={13} />
                {encerrandoId === vinculo.id ? '…' : 'Encerrar'}
              </button>
            </div>
          );
        })
      ) : pendentes.length > 0 ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
            {resolvePersonalNome(pendentes[0].personalTrainerId)}
          </span>
          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Aguardando
          </span>
          <button
            type="button"
            onClick={() => void handleCancelSolicitacao(pendentes[0].id)}
            disabled={busy}
            className="shrink-0 rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {cancelandoId === pendentes[0].id ? '…' : 'Cancelar'}
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-xs text-gray-400">Nenhum vinculado</span>
          <button
            type="button"
            onClick={() => void handleOpenBusca()}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <Search size={14} />
            Buscar
          </button>
        </>
      )}
      {(localMessage || localError) && (
        <p
          className={`w-full text-[11px] ${
            localError ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {localError || localMessage}
        </p>
      )}
    </div>
  );

  const personalScreen = (
    <Suspense
      fallback={
        <div className="flex min-h-[50dvh] items-center justify-center bg-[#0A1F44] text-sm text-[#E8EDED]/70">
          Carregando treinos do paciente…
        </div>
      }
    >
      <PersonalPageContent
        key={`personal-embed-${pacienteId}-${fullscreen ? 'fs' : 'embed'}`}
        embedded={!fullscreen}
        fromMetaadminEmbedded
        metaadminFullscreen={fullscreen}
        suppressAppHeader={fullscreen}
        professionalReadOnly
        professionalViewerRole="doctor"
        pacienteProp={paciente}
        onCloseMetaadmin={onClose}
      />
    </Suspense>
  );

  if (fullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-white">
          <PacienteModalHeader
            compact
            className="flex-shrink-0 border-b-0"
            patientName={pacienteLabel}
            patientPhotoUrl={patientPhotoUrl}
            dataNascimento={paciente.dadosIdentificacao?.dataNascimento}
            cidade={paciente.dadosIdentificacao?.endereco?.cidade}
            estado={paciente.dadosIdentificacao?.endereco?.estado}
            statusTratamento={paciente.statusTratamento}
            recomendacoesLidas={Boolean(paciente.recomendacoesLidas)}
            dataLeituraRecomendacoes={paciente.dataLeituraRecomendacoes}
            actions={
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            }
          />
          <div className="shrink-0 border-b border-gray-200 bg-white">{headerShareControlsLight}</div>
          <div className="min-h-0 flex-1 overflow-hidden">{personalScreen}</div>
        </div>
        {buscaModal}
        {compartilhamentoEnvio.modal}
      </>
    );
  }

  const vinculoPrincipal = vinculosAtivos[0] ?? null;
  const pendentePrincipal = pendentes[0] ?? null;
  const nomeVinculo = vinculoPrincipal
    ? resolvePersonalNome(vinculoPrincipal.personalTrainerId)
    : null;
  const nomePendente = pendentePrincipal
    ? resolvePersonalNome(pendentePrincipal.personalTrainerId)
    : null;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Faixa discreta: buscar / status / cancelar — uma linha */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40">
        <Dumbbell size={15} className="text-pink-600 shrink-0" aria-hidden />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
          Personal
        </span>

        {loadingStatus ? (
          <span className="text-xs text-gray-400">Carregando…</span>
        ) : vinculoPrincipal && nomeVinculo ? (
          <>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
              {nomeVinculo}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
              Aceito
            </span>
            {canManageLink ? (
              <button
                type="button"
                onClick={() => handleEncerrar(vinculoPrincipal, nomeVinculo)}
                disabled={busy}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
              >
                <XCircle size={13} />
                {encerrandoId === vinculoPrincipal.id ? 'Cancelando…' : 'Cancelar'}
              </button>
            ) : null}
          </>
        ) : pendentePrincipal && nomePendente ? (
          <>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
              {nomePendente}
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shrink-0">
              Aguardando aceite
            </span>
            {canManageLink ? (
              <button
                type="button"
                onClick={() => handleCancelSolicitacao(pendentePrincipal.id)}
                disabled={busy}
                className="shrink-0 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
              >
                {cancelandoId === pendentePrincipal.id ? 'Cancelando…' : 'Cancelar'}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-xs text-gray-400 truncate min-w-0 flex-1 hidden sm:inline">
              Nenhum personal vinculado
            </span>
            {canManageLink ? (
              <button
                type="button"
                onClick={() => void handleOpenBusca()}
                disabled={busy || loadingElegiveis || elegiveis.length === 0}
                className="shrink-0 sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                title={
                  elegiveis.length === 0
                    ? 'Vincule personal trainers na aba Personal Trainers'
                    : 'Buscar personal trainer'
                }
              >
                <Search size={14} />
                Buscar personal
              </button>
            ) : null}
          </>
        )}

        {(localMessage || localError) && (
          <span
            className={`w-full text-[11px] ${
              localError ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {localError || localMessage}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <MetapersonalPacienteTreinoPanel
          key={`treino-readonly-${pacienteId}`}
          readOnly
          personalTrainerId=""
          paciente={paciente}
        />
      </div>

      {buscaModal}
      {compartilhamentoEnvio.modal}
    </div>
  );
}

export default PersonalPacienteSharePanel;
