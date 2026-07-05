'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { FlaskConical, FileText, Loader2, Plus, Trash2, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico, HipoteseDiagnosticaSalva } from '@/types/medico';
import { normalizeHipotesesDiagnosticasSalvas } from '@/types/medico';
import { Sex } from '@/types/labRanges';
import { LAB_SECTION_LABELS_PT } from '@/lib/labExames/labSectionLabels';
import { getLabRange, type LabLimitOverrides } from '@/utils/labRangesFromJson';
import { restaurarSelecaoDeRegistroSalvo } from '@/utils/coletarExamesSolicitacaoLista';
import type { SolicitacaoExamesSalva } from '@/utils/solicitacaoExamesPdfDownload';

function coletarTodasChavesExamesDisponiveis(
  sexo: Sex | undefined,
  dataNascimento: Date | string | undefined,
  labOrder: Record<string, string[]>,
  limitOverrides?: LabLimitOverrides | null
): string[] {
  const keys: string[] = [];
  for (const campos of Object.values(labOrder)) {
    if (!Array.isArray(campos)) continue;
    for (const campoKey of campos) {
      const rangeToUse = getLabRange(campoKey, sexo as Sex, dataNascimento, limitOverrides);
      if (rangeToUse?.label) keys.push(campoKey);
    }
  }
  return keys;
}

function formatarDataHoraRegistro(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resumoExames(exames: string[]): string {
  if (!exames.length) return 'Nenhum exame';
  if (exames.length <= 3) return exames.join(', ');
  return `${exames.slice(0, 3).join(', ')} +${exames.length - 3}`;
}

export type SolicitarExamesModalProps = {
  open: boolean;
  onClose: () => void;
  paciente: PacienteCompleto;
  medicoPerfil: Medico;
  examesSelecionados: string[];
  setExamesSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  examesCustomizados: string[];
  setExamesCustomizados: React.Dispatch<React.SetStateAction<string[]>>;
  hipoteseDiagnosticaSolicitacao: string;
  setHipoteseDiagnosticaSolicitacao: (v: string) => void;
  hipoteseDiagnosticaTituloSalvar: string;
  setHipoteseDiagnosticaTituloSalvar: (v: string) => void;
  labOrderBySecaoConfig: Record<string, string[]>;
  labLimitOverrides: LabLimitOverrides | null;
  onGerarPdf: () => void;
  onSalvarHipotese: () => Promise<void>;
  onRemoverHipoteseSalva: (indice: number) => Promise<void>;
  salvandoHipoteseDiagnostica: boolean;
  registrosRefreshKey?: number;
};

export function SolicitarExamesModal({
  open,
  onClose,
  paciente,
  medicoPerfil,
  examesSelecionados,
  setExamesSelecionados,
  examesCustomizados,
  setExamesCustomizados,
  hipoteseDiagnosticaSolicitacao,
  setHipoteseDiagnosticaSolicitacao,
  hipoteseDiagnosticaTituloSalvar,
  setHipoteseDiagnosticaTituloSalvar,
  labOrderBySecaoConfig,
  labLimitOverrides,
  onGerarPdf,
  onSalvarHipotese,
  onRemoverHipoteseSalva,
  salvandoHipoteseDiagnostica,
  registrosRefreshKey = 0,
}: SolicitarExamesModalProps) {
  const selectTodosExamesCheckboxRef = useRef<HTMLInputElement>(null);
  const selectExameAnteriorCheckboxRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [registros, setRegistros] = useState<SolicitacaoExamesSalva[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [deletandoRegistroId, setDeletandoRegistroId] = useState<string | null>(null);
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setRegistroSelecionadoId(null);
    }
  }, [open]);

  const pacienteNome =
    paciente.dadosIdentificacao?.nomeCompleto ||
    paciente.dadosIdentificacao?.nome ||
    paciente.nome ||
    'Paciente';
  const sexoPaciente = paciente.dadosIdentificacao?.sexoBiologico as Sex | undefined;
  const dataNascPaciente = paciente.dadosIdentificacao?.dataNascimento;

  const temExamesSelecionados =
    examesSelecionados.length > 0 || examesCustomizados.some((e) => e.trim().length > 0);

  const carregarRegistros = useCallback(async () => {
    if (!paciente.id) return;
    setLoadingRegistros(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'pacientes_completos', paciente.id, 'solicitacoesExames'),
          orderBy('criadoEm', 'desc')
        )
      );
      setRegistros(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            pacienteId: paciente.id,
            medicoId: (data.medicoId as string) ?? '',
            exames: (data.exames as string[]) ?? [],
            hipoteseDiagnostica: (data.hipoteseDiagnostica as string) ?? '',
            criadoEm: data.criadoEm?.toDate?.() ?? new Date(),
          };
        })
      );
    } catch (err) {
      console.error('[SolicitarExamesModal] Erro ao carregar registros:', err);
    } finally {
      setLoadingRegistros(false);
    }
  }, [paciente.id]);

  useEffect(() => {
    if (!open) return;
    void carregarRegistros();
  }, [open, carregarRegistros, registrosRefreshKey]);

  const ultimaRequisicao = registros[0] ?? null;

  const selecaoExameAnterior = useMemo(() => {
    if (!ultimaRequisicao?.exames.length) {
      return { chaves: [] as string[], customizados: [] as string[] };
    }
    const { examesSelecionados: chaves, examesCustomizados: custom } = restaurarSelecaoDeRegistroSalvo(
      ultimaRequisicao.exames,
      sexoPaciente,
      dataNascPaciente,
      labOrderBySecaoConfig,
      labLimitOverrides
    );
    return {
      chaves,
      customizados: custom.filter((c) => c.trim().length > 0),
    };
  }, [
    ultimaRequisicao,
    sexoPaciente,
    dataNascPaciente,
    labOrderBySecaoConfig,
    labLimitOverrides,
  ]);

  const temExameAnteriorDisponivel =
    selecaoExameAnterior.chaves.length > 0 || selecaoExameAnterior.customizados.length > 0;

  const todosExameAnteriorMarcados =
    temExameAnteriorDisponivel &&
    selecaoExameAnterior.chaves.every((k) => examesSelecionados.includes(k)) &&
    selecaoExameAnterior.customizados.every((c) =>
      examesCustomizados.some((e) => e.trim() === c.trim())
    );

  const algumExameAnteriorMarcado =
    selecaoExameAnterior.chaves.some((k) => examesSelecionados.includes(k)) ||
    selecaoExameAnterior.customizados.some((c) =>
      examesCustomizados.some((e) => e.trim() === c.trim())
    );

  useEffect(() => {
    const el = selectTodosExamesCheckboxRef.current;
    if (!el || !open) return;
    const todasChaves = coletarTodasChavesExamesDisponiveis(
      sexoPaciente,
      dataNascPaciente,
      labOrderBySecaoConfig,
      labLimitOverrides
    );
    const todosMarcados =
      todasChaves.length > 0 && todasChaves.every((k) => examesSelecionados.includes(k));
    const algumMarcado = todasChaves.some((k) => examesSelecionados.includes(k));
    el.indeterminate = algumMarcado && !todosMarcados;
  }, [open, examesSelecionados, sexoPaciente, dataNascPaciente, labOrderBySecaoConfig, labLimitOverrides]);

  useEffect(() => {
    const el = selectExameAnteriorCheckboxRef.current;
    if (!el || !open) return;
    el.indeterminate = algumExameAnteriorMarcado && !todosExameAnteriorMarcados;
  }, [open, algumExameAnteriorMarcado, todosExameAnteriorMarcados]);

  const handleFechar = () => {
    onClose();
    setExamesSelecionados([]);
    setExamesCustomizados(['']);
  };

  const handleDeletarRegistro = async (registroId: string) => {
    if (!paciente.id || !confirm('Excluir este registro de requisição?')) return;
    setDeletandoRegistroId(registroId);
    try {
      await deleteDoc(doc(db, 'pacientes_completos', paciente.id, 'solicitacoesExames', registroId));
      setRegistros((prev) => prev.filter((r) => r.id !== registroId));
      if (registroSelecionadoId === registroId) setRegistroSelecionadoId(null);
    } catch (err) {
      console.error('[SolicitarExamesModal] Erro ao excluir registro:', err);
    } finally {
      setDeletandoRegistroId(null);
    }
  };

  const aplicarRegistroSalvo = (reg: SolicitacaoExamesSalva) => {
    const { examesSelecionados: keys, examesCustomizados: custom } = restaurarSelecaoDeRegistroSalvo(
      reg.exames,
      sexoPaciente,
      dataNascPaciente,
      labOrderBySecaoConfig,
      labLimitOverrides
    );
    setExamesSelecionados(keys);
    setExamesCustomizados(custom);
    if (reg.hipoteseDiagnostica) {
      setHipoteseDiagnosticaSolicitacao(reg.hipoteseDiagnostica);
    }
    setRegistroSelecionadoId(reg.id);
  };

  if (!open || !mounted) return null;

  const todasChaves = coletarTodasChavesExamesDisponiveis(
    sexoPaciente,
    dataNascPaciente,
    labOrderBySecaoConfig,
    labLimitOverrides
  );

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex flex-col overflow-hidden md:items-center md:justify-center md:bg-black/50 md:p-4">
      <div className="flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[92vh] md:max-w-4xl md:rounded-2xl md:shadow-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-700 shrink-0">
                <FlaskConical className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  Solicitar Exames
                </p>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{pacienteNome}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFechar}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 shrink-0 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 sm:px-6 py-5 space-y-5">
          {/* Paciente resumo */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Paciente</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <p className="text-slate-700">
                <span className="text-slate-400 text-xs block">CPF</span>
                {paciente.dadosIdentificacao?.cpf || '—'}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-400 text-xs block">Nascimento</span>
                {dataNascPaciente
                  ? new Date(dataNascPaciente).toLocaleDateString('pt-BR')
                  : '—'}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-400 text-xs block">Sexo</span>
                {sexoPaciente === 'M' ? 'Masculino' : sexoPaciente === 'F' ? 'Feminino' : '—'}
              </p>
            </div>
          </div>

          {/* Histórico */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Requisições salvas
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Toque para repetir os mesmos exames</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            {loadingRegistros ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando…
              </div>
            ) : registros.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhuma requisição salva ainda.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Ao gerar o PDF, o registro é salvo automaticamente com data e hora.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {registros.map((reg) => {
                  const selecionado = registroSelecionadoId === reg.id;
                  return (
                    <div
                      key={reg.id}
                      className={`flex items-start gap-2 px-3 py-3 transition-colors ${
                        selecionado ? 'bg-violet-50 ring-1 ring-inset ring-violet-200' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => aplicarRegistroSalvo(reg)}
                        className="flex-1 min-w-0 text-left rounded-lg px-1 py-0.5"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {formatarDataHoraRegistro(reg.criadoEm)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {reg.exames.length} {reg.exames.length === 1 ? 'exame' : 'exames'} · {resumoExames(reg.exames)}
                        </p>
                        {reg.hipoteseDiagnostica && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            HD: {reg.hipoteseDiagnostica}
                          </p>
                        )}
                        {selecionado && (
                          <p className="text-[11px] font-medium text-violet-700 mt-1.5">
                            Exames selecionados — gere o PDF para salvar nova requisição
                          </p>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeletarRegistro(reg.id);
                        }}
                        disabled={deletandoRegistroId === reg.id}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
                        title="Excluir registro"
                        aria-label="Excluir registro"
                      >
                        {deletandoRegistroId === reg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Exames disponíveis */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selecionar exames
              </p>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    ref={selectTodosExamesCheckboxRef}
                    type="checkbox"
                    checked={todasChaves.length > 0 && todasChaves.every((k) => examesSelecionados.includes(k))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExamesSelecionados((prev) => [...new Set([...prev, ...todasChaves])]);
                      } else {
                        setExamesSelecionados((prev) => prev.filter((k) => !todasChaves.includes(k)));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  Selecionar todos
                </label>
                <label
                  className={`inline-flex items-center gap-2 text-xs select-none ${
                    temExameAnteriorDisponivel
                      ? 'cursor-pointer text-slate-700'
                      : 'cursor-not-allowed text-slate-400'
                  }`}
                  title={
                    temExameAnteriorDisponivel && ultimaRequisicao
                      ? `Última requisição: ${formatarDataHoraRegistro(ultimaRequisicao.criadoEm)}`
                      : 'Nenhuma requisição anterior salva'
                  }
                >
                  <input
                    ref={selectExameAnteriorCheckboxRef}
                    type="checkbox"
                    disabled={!temExameAnteriorDisponivel}
                    checked={todosExameAnteriorMarcados}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExamesSelecionados((prev) => [
                          ...new Set([...prev, ...selecaoExameAnterior.chaves]),
                        ]);
                        setExamesCustomizados((prev) => {
                          const existentes = prev.map((item) => item.trim()).filter(Boolean);
                          const novos = selecaoExameAnterior.customizados.filter(
                            (c) => !existentes.includes(c.trim())
                          );
                          const merged = [...existentes, ...novos];
                          return merged.length > 0 ? merged : [''];
                        });
                      } else {
                        setExamesSelecionados((prev) =>
                          prev.filter((k) => !selecaoExameAnterior.chaves.includes(k))
                        );
                        setExamesCustomizados((prev) => {
                          const anteriores = new Set(
                            selecaoExameAnterior.customizados.map((c) => c.trim())
                          );
                          const filtered = prev.filter((item) => !anteriores.has(item.trim()));
                          return filtered.length > 0 ? filtered : [''];
                        });
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                  />
                  Selecionar do exame anterior
                </label>
              </div>
            </div>
            <div className="p-4 space-y-4 max-h-72 overflow-y-auto">
              {Object.entries(labOrderBySecaoConfig).map(([secaoKey, campos]) => {
                const nomeSecao = LAB_SECTION_LABELS_PT[secaoKey] || secaoKey;

                if (secaoKey === 'hemograma') {
                  const temHemograma = examesSelecionados.some((f) =>
                    ['hgb', 'wbc', 'platelets'].includes(f)
                  );
                  return (
                    <div key={secaoKey} className="pb-3 border-b border-slate-100 last:border-b-0">
                      <p className="text-sm font-semibold text-slate-800 mb-2">{nomeSecao}</p>
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={temHemograma}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExamesSelecionados((prev) => {
                                const novos = [...prev];
                                for (const k of ['hgb', 'wbc', 'platelets']) {
                                  if (!novos.includes(k)) novos.push(k);
                                }
                                return novos;
                              });
                            } else {
                              setExamesSelecionados((prev) =>
                                prev.filter((f) => !['hgb', 'wbc', 'platelets'].includes(f))
                              );
                            }
                          }}
                          className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-700">Hemograma Completo</span>
                      </label>
                    </div>
                  );
                }

                return (
                  <div key={secaoKey} className="pb-3 border-b border-slate-100 last:border-b-0">
                    <p className="text-sm font-semibold text-slate-800 mb-2">{nomeSecao}</p>
                    <div className="space-y-1 ml-1">
                      {Array.isArray(campos) &&
                        campos.map((campoKey) => {
                          const rangeToUse = getLabRange(
                            campoKey,
                            sexoPaciente,
                            dataNascPaciente,
                            labLimitOverrides
                          );
                          if (!rangeToUse?.label) return null;
                          return (
                            <label
                              key={campoKey}
                              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={examesSelecionados.includes(campoKey)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExamesSelecionados((prev) => [...prev, campoKey]);
                                  } else {
                                    setExamesSelecionados((prev) => prev.filter((f) => f !== campoKey));
                                  }
                                }}
                                className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                              />
                              <span className="text-sm text-slate-700 flex-1">{rangeToUse.label}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exames customizados */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Outros exames
            </p>
            <div className="space-y-2">
              {examesCustomizados.map((exame, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={exame}
                    onChange={(e) => {
                      const novos = [...examesCustomizados];
                      novos[idx] = e.target.value;
                      setExamesCustomizados(novos);
                    }}
                    placeholder="Digite o nome do exame"
                    className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  />
                  {examesCustomizados.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setExamesCustomizados(examesCustomizados.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setExamesCustomizados([...examesCustomizados, ''])}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800"
              >
                <Plus className="w-4 h-4" />
                Adicionar exame
              </button>
            </div>
          </div>

          {/* Hipótese diagnóstica */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Hipótese diagnóstica
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Salvas no seu perfil de médico — visíveis para todos os seus pacientes.
            </p>
            {normalizeHipotesesDiagnosticasSalvas(medicoPerfil.hipotesesDiagnosticasSalvas).length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2">Hipóteses salvas:</p>
                <ul className="border border-slate-200 rounded-lg bg-slate-50 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {normalizeHipotesesDiagnosticasSalvas(medicoPerfil.hipotesesDiagnosticasSalvas).map(
                    (h: HipoteseDiagnosticaSalva, hi: number) => (
                      <li key={`hip-salva-${hi}-${h.titulo.slice(0, 20)}`} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setHipoteseDiagnosticaSolicitacao(h.texto);
                            setHipoteseDiagnosticaTituloSalvar(h.titulo);
                          }}
                          className="flex-1 text-left text-sm px-3 py-2 text-slate-900 hover:bg-violet-50 rounded-lg"
                        >
                          {h.titulo}
                        </button>
                        <button
                          type="button"
                          title="Remover hipótese salva"
                          aria-label="Remover hipótese salva"
                          onClick={() => void onRemoverHipoteseSalva(hi)}
                          className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Título na lista (curto)
            </label>
            <input
              type="text"
              value={hipoteseDiagnosticaTituloSalvar}
              onChange={(e) => setHipoteseDiagnosticaTituloSalvar(e.target.value)}
              placeholder="Ex.: Obesidade grave — investigação metabólica"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            />
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Texto completo (requisição / PDF)
            </label>
            <textarea
              value={hipoteseDiagnosticaSolicitacao}
              onChange={(e) => setHipoteseDiagnosticaSolicitacao(e.target.value)}
              rows={3}
              placeholder="Texto que aparecerá na requisição impressa (opcional)."
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            />
            <button
              type="button"
              disabled={
                salvandoHipoteseDiagnostica ||
                !hipoteseDiagnosticaSolicitacao.trim() ||
                !hipoteseDiagnosticaTituloSalvar.trim() ||
                !medicoPerfil.id
              }
              onClick={() => void onSalvarHipotese()}
              className="mt-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvandoHipoteseDiagnostica ? 'Salvando…' : 'Salvar no meu banco de hipóteses'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
            <button
              type="button"
              onClick={handleFechar}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onGerarPdf}
              disabled={!temExamesSelecionados}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Gerar Requisição em PDF
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
