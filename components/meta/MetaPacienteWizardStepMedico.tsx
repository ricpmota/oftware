'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, BadgeCheck, Loader2, MapPin, Star, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';
import { MedicoService } from '@/services/medicoService';
import { ClassificacaoProfissionalService } from '@/services/classificacaoProfissionalService';
import { gerarSlugDrMedico } from '@/utils/medicoDrSlug';
import { FieldLabel, selectClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import type { MetaChatMedicoUiState } from '@/lib/meta/metaChatInicial';
import {
  ESTADOS_BR,
  getMedicoChatDisplayName,
  medicoElegivelListaPaciente,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_PERFIL_COMPLETO,
  META_CHAT_STEP_SOLICITACAO_ENVIADA,
  TEXTO_AGUARDANDO_ACEITE_MEDICO,
  TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA,
  TEXTO_POS_METAS_SEM_BUSCA_MEDICO,
  TEXTO_SOLICITACAO_PENDENTE,
  isMetaChatInicialCompleto,
  devePularSelecaoMedicoNoChat,
} from '@/lib/meta/metaChatInicial';

type SolicitacaoResumo = {
  medicoNome: string;
  status: 'pendente_confirmacao';
};

function MedicoWizardAvatar({ medico }: { medico: Medico }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = (medico.fotoPerfilUrl || '').trim();
  const initial = (medico.nome || '').trim().charAt(0).toUpperCase();

  if (url && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={medico.nome ? `Foto de ${medico.nome}` : 'Foto do médico'}
        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 bg-slate-100"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 text-sm font-semibold">
      {initial || '?'}
    </div>
  );
}

function medicoNomeCurto(medico: Medico): string {
  const cap = (s: string) => (s.charAt(0).toUpperCase() + (s.slice(1) || '').toLowerCase()).trim();
  const parts = (medico.nome || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return cap(parts[0] || medico.nome || '');
  return `${cap(parts[0])} ${cap(parts[parts.length - 1])}`;
}

export type MetaPacienteWizardStepMedicoProps = {
  step: number;
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  medicoUi: MetaChatMedicoUiState;
  setMedicoUi: React.Dispatch<React.SetStateAction<MetaChatMedicoUiState>>;
  onGoToStep: (step: number) => void;
  onSave: (closeAfter?: boolean, pacienteAtualizado?: PacienteCompleto) => Promise<void>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onCreateSolicitacao?: (medico: { id: string; nome: string }, pacienteAtualizado: PacienteCompleto) => Promise<void>;
  onCheckSolicitacaoAberta?: () => Promise<boolean>;
  /** Paciente veio de link do médico e já tem solicitação pendente — não busca outro médico. */
  aguardandoAceiteMedico?: { medicoNome: string } | null;
};

export default function MetaPacienteWizardStepMedico({
  step,
  paciente,
  setPaciente,
  medicoUi,
  setMedicoUi,
  onGoToStep,
  onSave,
  saving,
  setSaving,
  onCreateSolicitacao,
  onCheckSolicitacaoAberta,
  aguardandoAceiteMedico = null,
}: MetaPacienteWizardStepMedicoProps) {
  const selectedEstado = medicoUi.selectedEstado || '';
  const selectedCidade = medicoUi.selectedCidade || '';
  const selectedMedicoId = medicoUi.selectedMedicoId ?? null;

  const setSelectedEstado = (estado: string) => {
    setMedicoUi((prev) => ({ ...prev, selectedEstado: estado, selectedCidade: '', selectedMedicoId: null }));
  };
  const setSelectedCidade = (cidade: string) => {
    setMedicoUi((prev) => ({ ...prev, selectedCidade: cidade, selectedMedicoId: null }));
  };
  const setSelectedMedicoId = (id: string | null) => {
    setMedicoUi((prev) => ({ ...prev, selectedMedicoId: id }));
  };

  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicosFiltrados, setMedicosFiltrados] = useState<Medico[]>([]);
  const [agregadosMedicos, setAgregadosMedicos] = useState<Record<string, { count: number; media: number }>>({});
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [solicitacaoResumo, setSolicitacaoResumo] = useState<SolicitacaoResumo | null>(null);
  const [showPerfilMedicoModal, setShowPerfilMedicoModal] = useState(false);
  const [medicoParaSolicitar, setMedicoParaSolicitar] = useState<Medico | null>(null);
  const [iframePerfilSrc, setIframePerfilSrc] = useState('');
  const [iframePerfilLoading, setIframePerfilLoading] = useState(true);
  const [hasSolicitacaoAbertaCheck, setHasSolicitacaoAbertaCheck] = useState<boolean | null>(null);

  const onCheckRef = useRef(onCheckSolicitacaoAberta);
  onCheckRef.current = onCheckSolicitacaoAberta;

  useEffect(() => {
    if (step !== META_CHAT_STEP_MEDICO_UF && step !== META_CHAT_STEP_MEDICO_LISTA) return;
    if (medicos.length > 0) return;
    setLoadingMedicos(true);
    MedicoService.getAllMedicos()
      .then((list) => setMedicos(list.filter(medicoElegivelListaPaciente)))
      .catch(() => setMedicos([]))
      .finally(() => setLoadingMedicos(false));
  }, [step, medicos.length]);

  useEffect(() => {
    if (step !== META_CHAT_STEP_MEDICO_UF && step !== META_CHAT_STEP_MEDICO_LISTA) return;
    if (!onCheckRef.current) return;
    let cancelled = false;
    setHasSolicitacaoAbertaCheck(null);
    onCheckRef.current().then((hasOpen) => {
      if (!cancelled) setHasSolicitacaoAbertaCheck(hasOpen);
    }).catch(() => {
      if (!cancelled) setHasSolicitacaoAbertaCheck(false);
    });
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    const onMedicoSearch =
      step === META_CHAT_STEP_MEDICO_UF || step === META_CHAT_STEP_MEDICO_LISTA;
    if (!onMedicoSearch || !selectedEstado || !selectedCidade) {
      if (onMedicoSearch && !selectedCidade) setMedicosFiltrados([]);
      return;
    }
    setLoadingMedicos(true);
    setAgregadosMedicos({});
    MedicoService.getMedicosByCidade(selectedCidade, selectedEstado)
      .then((list) => setMedicosFiltrados(list.filter(medicoElegivelListaPaciente)))
      .finally(() => setLoadingMedicos(false));
  }, [step, selectedEstado, selectedCidade]);

  useEffect(() => {
    const onMedicoSearch =
      step === META_CHAT_STEP_MEDICO_UF || step === META_CHAT_STEP_MEDICO_LISTA;
    if (!onMedicoSearch || medicosFiltrados.length === 0) return;
    const load = async () => {
      const map: Record<string, { count: number; media: number }> = {};
      await Promise.all(
        medicosFiltrados.map(async (m) => {
          const a = await ClassificacaoProfissionalService.getAgregado('medico', m.id);
          map[m.id] = a;
        })
      );
      setAgregadosMedicos(map);
    };
    void load();
  }, [step, medicosFiltrados]);

  useEffect(() => {
    if (showPerfilMedicoModal && medicoParaSolicitar && typeof window !== 'undefined') {
      setIframePerfilLoading(true);
      setIframePerfilSrc(`${window.location.origin}/dr/${gerarSlugDrMedico(medicoParaSolicitar.nome)}?embed=1`);
    } else if (!showPerfilMedicoModal) {
      setIframePerfilSrc('');
      setIframePerfilLoading(true);
    }
  }, [showPerfilMedicoModal, medicoParaSolicitar?.id, medicoParaSolicitar]);

  const estadosComMedicos = useMemo(
    () => [...new Set(medicos.flatMap((m) => (m.cidades || []).map((c) => c.estado)))].filter(Boolean).sort(),
    [medicos]
  );

  const cidadesDoEstado = useMemo(
    () =>
      selectedEstado
        ? [...new Set(
            medicos.flatMap((m) =>
              (m.cidades || []).filter((c) => c.estado === selectedEstado).map((c) => c.cidade)
            )
          )]
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b)))
        : [],
    [medicos, selectedEstado]
  );

  const medicosOrdenados = useMemo(() => {
    if (medicosFiltrados.length === 0) return [];
    return [...medicosFiltrados].sort((a, b) => {
      const va = a.isVerificado ? 1 : 0;
      const vb = b.isVerificado ? 1 : 0;
      if (vb !== va) return vb - va;
      const ma = agregadosMedicos[a.id]?.media ?? 0;
      const mb = agregadosMedicos[b.id]?.media ?? 0;
      if (mb !== ma) return mb - ma;
      const ca = agregadosMedicos[a.id]?.count ?? 0;
      const cb = agregadosMedicos[b.id]?.count ?? 0;
      return cb - ca;
    });
  }, [medicosFiltrados, agregadosMedicos]);

  const fecharPerfilMedicoModal = () => {
    setShowPerfilMedicoModal(false);
    setMedicoParaSolicitar(null);
    setIframePerfilSrc('');
    setIframePerfilLoading(true);
  };

  const finalizarFluxoSolicitacao = (medico: Medico) => {
    setSelectedMedicoId(medico.id);
    setSolicitacaoResumo({
      medicoNome: getMedicoChatDisplayName(medico),
      status: 'pendente_confirmacao',
    });
    onGoToStep(META_CHAT_STEP_SOLICITACAO_ENVIADA);
    fecharPerfilMedicoModal();
  };

  const executarSolicitacao = async () => {
    const medico = medicoParaSolicitar;
    if (!medico) return;
    const atualizado = { ...paciente, medicoResponsavelId: medico.id };
    if (!isMetaChatInicialCompleto(atualizado)) {
      alert('Complete todas as etapas do cadastro antes de solicitar tratamento.');
      return;
    }
    setSaving(true);
    try {
      if (onCreateSolicitacao) {
        await onCreateSolicitacao({ id: medico.id, nome: medico.nome }, atualizado);
      } else {
        setPaciente(atualizado);
        await onSave(false, atualizado);
      }
      finalizarFluxoSolicitacao(medico);
    } catch (err) {
      console.error('Erro ao criar solicitação:', err);
    } finally {
      setSaving(false);
    }
  };

  if (step === META_CHAT_STEP_PERFIL_COMPLETO) {
    if (aguardandoAceiteMedico) {
      return (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-900">Aguardando aceite do médico</p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[11px] uppercase tracking-wide text-amber-800/70">Médico solicitado</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{aguardandoAceiteMedico.medicoNome}</p>
            <div className="mt-3 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Pendente de confirmação
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{TEXTO_AGUARDANDO_ACEITE_MEDICO}</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 whitespace-pre-line">{TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA}</p>
        <p className="text-sm text-slate-600 whitespace-pre-line">{TEXTO_POS_METAS_SEM_BUSCA_MEDICO}</p>
      </div>
    );
  }

  if (step === META_CHAT_STEP_SOLICITACAO_ENVIADA && solicitacaoResumo) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-900">Solicitação enviada com sucesso</p>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-emerald-800/70">Médico selecionado</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{solicitacaoResumo.medicoNome}</p>
          <div className="mt-3 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Pendente de confirmação
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-line">{TEXTO_SOLICITACAO_PENDENTE}</p>
      </div>
    );
  }

  if (step === META_CHAT_STEP_MEDICO_UF || step === META_CHAT_STEP_MEDICO_LISTA) {
    if (aguardandoAceiteMedico || devePularSelecaoMedicoNoChat(paciente)) {
      return null;
    }

    if (hasSolicitacaoAbertaCheck === true) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-950">Você já tem uma solicitação em andamento.</p>
          <p className="text-xs text-amber-900/80">
            Acompanhe o status em Médicos &gt; Minhas solicitações.
          </p>
        </div>
      );
    }

    if (hasSolicitacaoAbertaCheck === null && onCheckSolicitacaoAberta) {
      return (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 size={16} className="animate-spin text-emerald-600" />
          Verificando solicitações...
        </p>
      );
    }

    return (
      <>
        <div className="space-y-4">
          <div>
            <FieldLabel>Estado</FieldLabel>
            <select
              className={selectClassName}
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
            >
              <option value="">Selecione</option>
              {(estadosComMedicos.length ? estadosComMedicos : ESTADOS_BR).map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          {selectedEstado && (
            <div>
              <FieldLabel>Cidade</FieldLabel>
              <select
                className={selectClassName}
                value={selectedCidade}
                onChange={(e) => setSelectedCidade(e.target.value)}
              >
                <option value="">Selecione</option>
                {cidadesDoEstado.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCidade && (
            <>
              {loadingMedicos ? (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 size={16} className="animate-spin text-emerald-600" /> Buscando médicos...
                </p>
              ) : medicosOrdenados.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhum médico encontrado nesta cidade.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {medicosOrdenados.map((medico) => {
                    const agg = agregadosMedicos[medico.id];
                    const media = agg?.media ?? 0;
                    const count = agg?.count ?? 0;
                    const estrelasCheias = Math.round(media);
                    const isSelected = selectedMedicoId === medico.id;
                    return (
                      <button
                        key={medico.id}
                        type="button"
                        onClick={() => {
                          setMedicoParaSolicitar(medico);
                          setShowPerfilMedicoModal(true);
                        }}
                        className={`flex items-center gap-3 w-full text-left p-3 rounded-xl border transition-colors ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <MedicoWizardAvatar medico={medico} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate font-medium text-slate-900">
                            {medico.genero === 'F' ? 'Dra. ' : 'Dr. '}
                            {medicoNomeCurto(medico)}
                            {medico.isVerificado ? (
                              <BadgeCheck size={18} className="text-emerald-600 fill-emerald-100 shrink-0" aria-hidden />
                            ) : (
                              <Badge size={16} className="shrink-0 text-slate-400" aria-hidden />
                            )}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} />
                            {selectedCidade}, {selectedEstado}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                size={14}
                                className={i <= estrelasCheias ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                              />
                            ))}
                            {count > 0 && (
                              <span className="ml-1 text-xs text-slate-500">
                                ({count} {count === 1 ? 'avaliação' : 'avaliações'})
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {showPerfilMedicoModal && medicoParaSolicitar && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-0"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col overflow-hidden bg-white">
              <div className="flex shrink-0 items-center justify-end border-b border-slate-200 px-3 py-2 pt-[env(safe-area-inset-top)]">
                <button
                  type="button"
                  onClick={fecharPerfilMedicoModal}
                  className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="relative min-h-0 flex-1 bg-slate-100">
                {iframePerfilLoading && iframePerfilSrc && (
                  <div className="absolute inset-0 z-[1] flex items-center justify-center bg-white">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                  </div>
                )}
                {iframePerfilSrc ? (
                  <iframe
                    title={`Perfil — ${medicoParaSolicitar.nome}`}
                    src={iframePerfilSrc}
                    className="absolute inset-0 w-full h-full border-0 bg-white"
                    onLoad={() => setIframePerfilLoading(false)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>
              <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void executarSolicitacao()}
                  className="w-full max-w-md mx-auto block py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
                >
                  {saving ? 'Enviando...' : 'Solicitar Tratamento'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function isMetaPacienteWizardMedicoStep(step: number): boolean {
  return step >= META_CHAT_STEP_MEDICO_UF && step <= META_CHAT_STEP_SOLICITACAO_ENVIADA;
}

export function isMetaPacienteWizardTerminalStep(step: number): boolean {
  return step === META_CHAT_STEP_PERFIL_COMPLETO || step === META_CHAT_STEP_SOLICITACAO_ENVIADA;
}
