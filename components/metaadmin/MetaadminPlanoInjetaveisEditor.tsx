'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown, Plus, Trash2, Wrench } from 'lucide-react';
import type { PacienteCompleto, PlanoInjetavelAplicacao } from '@/types/obesidade';
import type { Prescricao } from '@/types/prescricao';
import { PrescricaoService } from '@/services/prescricaoService';
import { montarListaProtocolosAba } from '@/lib/prescricao/prescricaoListas';
import { tituloExibicaoPrescricao } from '@/lib/prescricao/prescricaoCatalogoDefaults';
import {
  dataGradeSemanal,
  injectionDayKeyFromLocalDate,
  INJECTION_DAY_LABEL_PT,
  ymdLocal,
} from '@/utils/datasAplicacaoSemanaPlano';
import {
  formatDateAsDDMMYY,
  formatWeekdayPt,
  parseYyyyMmDdToLocalDate,
} from '@/utils/esquemaDoseSemanaDateFormat';
import { EsquemaDoseSemanaDateInput } from '@/components/metaadmin/EsquemaDoseSemanaDateInput';
import { pacienteComInjetavelRealizado } from '@/utils/injetaveisCalendario';

type Props = {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  medicoId: string;
  /** Somente visualização: sem add/delete; valores como texto. */
  readOnly?: boolean;
};

function newAplicacaoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `inj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toLocalDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value);
  const td = (value as { toDate?: () => Date })?.toDate?.();
  if (td && !isNaN(td.getTime())) return new Date(td);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return parseYyyyMmDdToLocalDate(value.trim());
  }
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function startDateInputValue(aplicacao: PlanoInjetavelAplicacao): string {
  const d = toLocalDate(aplicacao.startDate);
  if (!d) return '';
  d.setHours(0, 0, 0, 0);
  return ymdLocal(d);
}

function buildEmptyAplicacao(): PlanoInjetavelAplicacao {
  return {
    id: newAplicacaoId(),
    protocoloId: '',
    protocoloNome: '',
    numeroSemanasTratamento: 12,
  };
}

export function MetaadminPlanoInjetaveisEditor({
  paciente,
  setPaciente,
  medicoId,
  readOnly = false,
}: Props) {
  const [protocolos, setProtocolos] = useState<Prescricao[]>([]);
  const [loadingProtocolos, setLoadingProtocolos] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const dataAplicacaoFocoRef = useRef<{ semana: number; valor: string } | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!medicoId || readOnly) return;
      setLoadingProtocolos(true);
      try {
        const [templates, prescricoesMedico] = await Promise.all([
          PrescricaoService.getPrescricoesTemplate(),
          PrescricaoService.getPrescricoesByMedico(medicoId),
        ]);
        if (cancelled) return;
        setProtocolos(montarListaProtocolosAba(templates, prescricoesMedico));
      } catch (err) {
        console.error('Erro ao carregar Protocolos Salvos:', err);
        if (!cancelled) setProtocolos([]);
      } finally {
        if (!cancelled) setLoadingProtocolos(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [medicoId, readOnly]);

  const aplicacoes = paciente.planoTerapeutico?.injetaveisAplicacoes || [];

  const updateAplicacoes = (next: PlanoInjetavelAplicacao[]) => {
    if (readOnly) return;
    setPaciente({
      ...paciente,
      planoTerapeutico: {
        ...paciente.planoTerapeutico,
        metas: paciente.planoTerapeutico?.metas || {},
        injetaveisAplicacoes: next,
      },
    });
  };

  const patchAplicacao = (id: string, patch: Partial<PlanoInjetavelAplicacao>) => {
    updateAplicacoes(
      aplicacoes.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  };

  const adicionarAplicacao = () => {
    updateAplicacoes([...aplicacoes, buildEmptyAplicacao()]);
  };

  const removerAplicacao = (id: string) => {
    updateAplicacoes(aplicacoes.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Aplicações de injetáveis</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {readOnly
              ? 'Protocolos injetáveis configurados no plano terapêutico.'
              : 'Selecione um ou mais Protocolos Salvos. O nome do protocolo é a medicação. Não há dose em mg — apenas observação por aplicação.'}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={adicionarAplicacao}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 shrink-0"
          >
            <Plus size={16} />
            Adicionar protocolo
          </button>
        )}
      </div>

      {aplicacoes.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-800/30 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 mb-3 mx-auto">
            <Wrench className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Nenhum protocolo injetável selecionado
          </p>
          {!readOnly && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Clique em “Adicionar protocolo” para incluir a primeira medicação.
            </p>
          )}
        </div>
      )}

      {aplicacoes.map((aplicacao, index) => {
        const start = toLocalDate(aplicacao.startDate);
        if (start) start.setHours(0, 0, 0, 0);
        const nSem = Number(aplicacao.numeroSemanasTratamento) || 0;
        const semanasCanceladas = aplicacao.semanasCanceladas || [];
        const individuais = aplicacao.datasAplicacaoIndividuais || {};
        const observacoes = aplicacao.observacoesPorSemana || {};
        const injectionKey =
          aplicacao.injectionDayOfWeek ||
          (start ? (injectionDayKeyFromLocalDate(start) as PlanoInjetavelAplicacao['injectionDayOfWeek']) : undefined);
        const isExpanded = expandedIds.has(aplicacao.id);

        return (
          <div
            key={aplicacao.id}
            className={`border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 ${
              isExpanded ? 'p-4 space-y-4' : 'px-4 py-3'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Protocolo {index + 1}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5 truncate">
                  {aplicacao.protocoloNome || 'Selecione o protocolo'}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removerAplicacao(aplicacao.id)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label={`Remover protocolo ${index + 1}`}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleExpanded(aplicacao.id)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded
                      ? `Recolher protocolo ${index + 1}`
                      : `Expandir protocolo ${index + 1}`
                  }
                >
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            {isExpanded && (
              <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Protocolo salvo (medicação) *
                </label>
                {readOnly ? (
                  <div className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 min-h-[42px] flex items-center">
                    {aplicacao.protocoloNome || '—'}
                  </div>
                ) : (
                  <select
                    value={aplicacao.protocoloId}
                    disabled={loadingProtocolos}
                    onChange={(e) => {
                      const id = e.target.value;
                      const proto = protocolos.find((p) => p.id === id);
                      const nome = proto ? tituloExibicaoPrescricao(proto.nome) : '';
                      patchAplicacao(aplicacao.id, {
                        protocoloId: id,
                        protocoloNome: nome,
                      });
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  >
                    <option value="">
                      {loadingProtocolos ? 'Carregando protocolos…' : 'Selecione um Protocolo Salvo'}
                    </option>
                    {protocolos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {tituloExibicaoPrescricao(p.nome)}
                        {p.pastaNome ? ` (${p.pastaNome})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {!readOnly && !loadingProtocolos && protocolos.length === 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Nenhum Protocolo Salvo encontrado no catálogo. Em Protocolos Salvos, altere o título e as medicações e salve para gerar um novo protocolo nesta lista.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título para o paciente
                </label>
                {readOnly ? (
                  <div className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 min-h-[42px] flex items-center">
                    {aplicacao.protocoloNome || '—'}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={aplicacao.protocoloNome}
                      onChange={(e) =>
                        patchAplicacao(aplicacao.id, { protocoloNome: e.target.value })
                      }
                      disabled={!aplicacao.protocoloId}
                      placeholder="Nome que o paciente verá na mensagem, no painel e no calendário"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 disabled:opacity-60"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Aparece na mensagem de aplicação, em Aplicações → Injetáveis e no calendário. As observações de cada semana também são exibidas nesses três lugares.
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data de início *
                </label>
                {readOnly ? (
                  <div className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 min-h-[42px] flex items-center">
                    {start
                      ? start.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>
                ) : (
                  <input
                    type="date"
                    value={startDateInputValue(aplicacao)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        patchAplicacao(aplicacao.id, {
                          startDate: undefined,
                          injectionDayOfWeek: undefined,
                        });
                        return;
                      }
                      const [y, m, d] = raw.split('-').map(Number);
                      const localDate = new Date(y, m - 1, d, 0, 0, 0, 0);
                      const inj = injectionDayKeyFromLocalDate(localDate) as PlanoInjetavelAplicacao['injectionDayOfWeek'];
                      patchAplicacao(aplicacao.id, {
                        startDate: localDate,
                        injectionDayOfWeek: inj,
                      });
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dia da aplicação semanal
                </label>
                <div className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 min-h-[42px] flex items-center">
                  {injectionKey ? (
                    INJECTION_DAY_LABEL_PT[injectionKey] ?? injectionKey
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Defina a data de início</span>
                  )}
                </div>
                {!readOnly && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Definido automaticamente pelo dia da semana da data de início.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2 sm:max-w-xs">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de semanas do tratamento *
                </label>
                {readOnly ? (
                  <div className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 min-h-[42px] flex items-center">
                    {aplicacao.numeroSemanasTratamento ?? '—'}
                  </div>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={
                      aplicacao.numeroSemanasTratamento == null
                        ? ''
                        : String(aplicacao.numeroSemanasTratamento)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        patchAplicacao(aplicacao.id, { numeroSemanasTratamento: undefined });
                        return;
                      }
                      const n = parseInt(raw, 10);
                      if (!Number.isFinite(n)) return;
                      patchAplicacao(aplicacao.id, {
                        numeroSemanasTratamento: Math.min(200, Math.max(1, n)),
                      });
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                )}
              </div>
            </div>

            {!start || nSem < 1 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950/30 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {readOnly
                    ? 'Data de início ou número de semanas não configurados.'
                    : 'Configure a data de início e o número de semanas para visualizar o esquema de aplicação.'}
                </p>
              </div>
            ) : (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Esquema de aplicação por semana
                </h5>
                {!readOnly && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Inclua observações por aplicação. Sem seleção de dose.
                  </p>
                )}
                <div className="overflow-x-auto">
                  <div className="inline-flex gap-2 min-w-full pb-2" style={{ minWidth: 'max-content' }}>
                    {Array.from({ length: nSem }, (_, i) => {
                      const semana = i + 1;
                      const isCancelada = semanasCanceladas.includes(semana);
                      const realizados = aplicacao.realizadoPorSemana || {};
                      const isAplicada =
                        realizados[String(semana)] === true ||
                        realizados[semana as unknown as string] === true;
                      const isEditable = !readOnly && !isCancelada && !isAplicada;
                      const overrideYmd = individuais[String(semana)] || individuais[semana as unknown as string];
                      const dataGrade = dataGradeSemanal(start, semana);
                      const dataExibicao =
                        (typeof overrideYmd === 'string' && parseYyyyMmDdToLocalDate(overrideYmd)) || dataGrade;
                      const obs = observacoes[String(semana)] || observacoes[semana as unknown as string] || '';

                      const toggleAplicado = () => {
                        if (readOnly) return;
                        setPaciente((prev) =>
                          prev
                            ? pacienteComInjetavelRealizado(
                                prev,
                                aplicacao.id,
                                semana,
                                !isAplicada
                              )
                            : prev
                        );
                      };

                      return (
                        <div
                          key={`${aplicacao.id}-${semana}`}
                          className={`relative flex-shrink-0 w-36 border rounded-lg p-2 ${
                            isCancelada
                              ? 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800'
                              : isAplicada
                                ? 'bg-gray-50 border-gray-200 dark:bg-gray-900/40 dark:border-gray-700'
                                : 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                          }`}
                        >
                          {!readOnly && !isCancelada && (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isAplicada}
                              aria-label={isAplicada ? 'Marcar como pendente' : 'Marcar como aplicado'}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAplicado();
                              }}
                              className={`absolute top-1.5 right-1.5 z-10 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                isAplicada
                                  ? 'bg-green-500 focus:ring-green-500'
                                  : 'bg-gray-500 dark:bg-gray-400 focus:ring-green-500'
                              }`}
                              title={isAplicada ? 'Marcar como pendente' : 'Marcar como aplicado'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isAplicada ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}
                          <div className={`text-center mb-2 ${!readOnly && !isCancelada ? 'pr-8' : ''} ${isAplicada ? 'opacity-60' : ''}`}>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                              Sem {semana}
                            </div>
                            <div className="text-xs text-gray-500 mb-2 tabular-nums">
                              {formatDateAsDDMMYY(dataExibicao)}
                            </div>
                            <div className="text-[10px] text-gray-500 mb-2">{formatWeekdayPt(dataExibicao)}</div>
                          </div>

                          {isCancelada ? (
                            <div className="text-center">
                              <div className="text-xs font-semibold text-red-700 mb-1">Cancelada</div>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = semanasCanceladas.filter((s) => s !== semana);
                                    patchAplicacao(aplicacao.id, {
                                      semanasCanceladas: next.length > 0 ? next : undefined,
                                    });
                                  }}
                                  className="text-[10px] text-red-600 hover:text-red-800 underline"
                                >
                                  Reativar
                                </button>
                              )}
                            </div>
                          ) : isEditable ? (
                            <div className="space-y-1.5">
                              <EsquemaDoseSemanaDateInput
                                semana={semana}
                                dataExibicao={dataExibicao}
                                yyyyMmDdFromMap={
                                  typeof overrideYmd === 'string' ? overrideYmd : undefined
                                }
                                dataAplicacaoFocoRef={dataAplicacaoFocoRef}
                                onApplyYyyyMmDd={(sem, ymd) => {
                                  const nextIndividuais = { ...individuais, [String(sem)]: ymd };
                                  patchAplicacao(aplicacao.id, {
                                    datasAplicacaoIndividuais: nextIndividuais,
                                  });
                                }}
                                onRemoveOverride={(sem) => {
                                  const nextIndividuais = { ...individuais };
                                  delete nextIndividuais[String(sem)];
                                  delete nextIndividuais[sem as unknown as string];
                                  patchAplicacao(aplicacao.id, {
                                    datasAplicacaoIndividuais:
                                      Object.keys(nextIndividuais).length > 0
                                        ? nextIndividuais
                                        : undefined,
                                  });
                                }}
                              />
                              <textarea
                                value={obs}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const nextObs = { ...observacoes };
                                  if (!value.trim()) {
                                    delete nextObs[String(semana)];
                                    delete nextObs[semana as unknown as string];
                                  } else {
                                    nextObs[String(semana)] = value;
                                  }
                                  patchAplicacao(aplicacao.id, {
                                    observacoesPorSemana:
                                      Object.keys(nextObs).length > 0 ? nextObs : undefined,
                                  });
                                }}
                                rows={3}
                                placeholder="Observação (visível para o paciente)"
                                className="w-full text-[10px] border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none"
                              />
                              <label className="flex items-center justify-center cursor-pointer text-[10px] text-red-600 hover:text-red-800">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => {
                                    patchAplicacao(aplicacao.id, {
                                      semanasCanceladas: [...semanasCanceladas, semana],
                                    });
                                  }}
                                  className="mr-1 h-3 w-3"
                                />
                                Cancelar
                              </label>
                            </div>
                          ) : (
                            <div className={`text-center space-y-1 ${isAplicada ? 'opacity-60' : ''}`}>
                              {obs ? (
                                <p className="text-[10px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                  {obs}
                                </p>
                              ) : (
                                <p className="text-[10px] text-gray-400 italic">Sem observação</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        );
      })}

      {!readOnly && aplicacoes.length > 0 && (
        <button
          type="button"
          onClick={adicionarAplicacao}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-700 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <Plus size={16} />
          Adicionar outro protocolo
        </button>
      )}
    </div>
  );
}
