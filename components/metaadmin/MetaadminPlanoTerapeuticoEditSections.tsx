'use client';

import type { MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import { injectionDayKeyFromLocalDate, INJECTION_DAY_LABEL_PT, mesclarPlanoComDatasReconstruidas } from '@/utils/datasAplicacaoSemanaPlano';
import { MetaadminMetasTratamentoBlock } from '@/components/metaadmin/MetaadminMetasTratamentoBlock';
import { EsquemaDosesPorSemanaEditor } from '@/components/metaadmin/EsquemaDosesPorSemanaEditor';
import { DoseMgTirzepatidaSelectOptions } from '@/components/tirzepatida/DoseMgTirzepatidaSelectOptions';

export type MetaadminPlanoTerapeuticoSectionMode = 'plano' | 'meta' | 'full';

export type MetaadminPlanoTerapeuticoEditSectionsProps = {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
  mode: MetaadminPlanoTerapeuticoSectionMode;
  /** Quando true, omite o título "Meta" e o texto introdutório das metas (ex.: modal /meta com cabeçalho próprio). */
  hideMetaHeading?: boolean;
};

export function MetaadminPlanoTerapeuticoEditSections({
  paciente,
  setPaciente,
  dataAplicacaoFocoRef,
  mode,
  hideMetaHeading = false,
}: MetaadminPlanoTerapeuticoEditSectionsProps) {
  if (mode === 'full') {
    return (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plano Terapêutico</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Metadados do plano */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Metadados do Plano</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data de início do tratamento *</label>
                          <input
                            type="date"
                            value={(() => {
                              const date = paciente?.planoTerapeutico?.startDate || paciente?.planoTerapeutico?.dataInicioTratamento;
                              if (!date) return '';
                              try {
                                const d = new Date(date);
                                if (!isNaN(d.getTime())) {
                                  const year = d.getFullYear();
                                  const month = String(d.getMonth() + 1).padStart(2, '0');
                                  const day = String(d.getDate()).padStart(2, '0');
                                  return `${year}-${month}-${day}`;
                                }
                                return '';
                              } catch {
                                return '';
                              }
                            })()}
                            onChange={(e) => {
                              if (!e.target.value) {
                                setPaciente({
                                  ...paciente!,
                                  planoTerapeutico: {
                                    ...paciente?.planoTerapeutico,
                                    startDate: undefined,
                                    dataInicioTratamento: undefined,
                                    injectionDayOfWeek: undefined,
                                    datasAplicacaoIndividuais: undefined,
                                  }
                                });
                                return;
                              }
                              const [year, month, day] = e.target.value.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
                              const inj = injectionDayKeyFromLocalDate(localDate) as
                                | 'dom'
                                | 'seg'
                                | 'ter'
                                | 'qua'
                                | 'qui'
                                | 'sex'
                                | 'sab';
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: mesclarPlanoComDatasReconstruidas(
                                  paciente?.planoTerapeutico,
                                  {
                                    startDate: localDate,
                                    dataInicioTratamento: localDate,
                                    injectionDayOfWeek: inj,
                                  },
                                  paciente?.evolucaoSeguimento
                                ),
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dia da aplicação semanal</label>
                          <div className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 min-h-[42px] flex items-center">
                            {(() => {
                              const date = paciente?.planoTerapeutico?.startDate || paciente?.planoTerapeutico?.dataInicioTratamento;
                              if (!date) return <span className="text-gray-400 dark:text-gray-500">Defina a data de início</span>;
                              const d = date instanceof Date ? new Date(date) : new Date(date as any);
                              if (isNaN(d.getTime())) return <span className="text-gray-400">—</span>;
                              d.setHours(0, 0, 0, 0);
                              const key = injectionDayKeyFromLocalDate(d);
                              return INJECTION_DAY_LABEL_PT[key] ?? key;
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Definido automaticamente pelo dia da semana da data de início.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Número de semanas do tratamento *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={
                              paciente?.planoTerapeutico?.numeroSemanasTratamento === undefined ||
                              paciente?.planoTerapeutico?.numeroSemanasTratamento === null
                                ? ''
                                : String(paciente.planoTerapeutico.numeroSemanasTratamento)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setPaciente({
                                  ...paciente!,
                                  planoTerapeutico: {
                                    ...paciente?.planoTerapeutico,
                                    numeroSemanasTratamento: undefined,
                                  },
                                });
                                return;
                              }
                              const n = parseInt(raw, 10);
                              if (!Number.isFinite(n)) return;
                              const clamped = Math.min(200, Math.max(1, n));
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  numeroSemanasTratamento: clamped,
                                },
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Defina a duração inicial do tratamento. Após finalizar essas semanas, você poderá ampliar o tratamento adicionando mais semanas.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dose e titulação */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Dose e Titulação</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dose inicial (mg) *</label>
                          <select
                            value={paciente?.planoTerapeutico?.currentDoseMg || paciente?.planoTerapeutico?.doseAtual?.quantidade || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              const now = new Date();
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  currentDoseMg: value as any,
                                  lastDoseChangeAt: now,
                                  nextReviewDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), // +28 dias
                                  doseAtual: {
                                    quantidade: value,
                                    frequencia: 'semanal' as const,
                                    dataUltimaAjuste: now
                                  }
                                }
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          >
                            <option value="">Selecione</option>
                            <DoseMgTirzepatidaSelectOptions />
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status da Titulação</label>
                          <select
                            value={paciente?.planoTerapeutico?.titrationStatus || ''}
                            onChange={(e) => {
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  titrationStatus: e.target.value as any
                                }
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          >
                            <option value="">Selecione</option>
                            <option value="INICIADO">Iniciado</option>
                            <option value="EM_TITULACAO">Em titulação</option>
                            <option value="MANUTENCAO">Manutenção</option>
                            <option value="PAUSADO">Pausado</option>
                            <option value="ENCERRADO">Encerrado</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observação</label>
                          <textarea
                            value={paciente?.planoTerapeutico?.titrationNotes || ''}
                            onChange={(e) => {
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  titrationNotes: e.target.value
                                }
                              });
                            }}
                            placeholder="Motivo de ajuste, intolerância GI, etc."
                            rows={3}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                    <EsquemaDosesPorSemanaEditor
                      paciente={paciente}
                      setPaciente={setPaciente}
                      dataAplicacaoFocoRef={dataAplicacaoFocoRef}
                    />

                  <MetaadminMetasTratamentoBlock paciente={paciente!} setPaciente={setPaciente} />

                </div>
    );
  }
  if (mode === 'plano') {
    return (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plano Terapêutico</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Metadados do plano */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Metadados do Plano</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data de início do tratamento *</label>
                          <input
                            type="date"
                            value={(() => {
                              const date = paciente?.planoTerapeutico?.startDate || paciente?.planoTerapeutico?.dataInicioTratamento;
                              if (!date) return '';
                              try {
                                const d = new Date(date);
                                if (!isNaN(d.getTime())) {
                                  const year = d.getFullYear();
                                  const month = String(d.getMonth() + 1).padStart(2, '0');
                                  const day = String(d.getDate()).padStart(2, '0');
                                  return `${year}-${month}-${day}`;
                                }
                                return '';
                              } catch {
                                return '';
                              }
                            })()}
                            onChange={(e) => {
                              if (!e.target.value) {
                                setPaciente({
                                  ...paciente!,
                                  planoTerapeutico: {
                                    ...paciente?.planoTerapeutico,
                                    startDate: undefined,
                                    dataInicioTratamento: undefined,
                                    injectionDayOfWeek: undefined,
                                    datasAplicacaoIndividuais: undefined,
                                  }
                                });
                                return;
                              }
                              const [year, month, day] = e.target.value.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
                              const inj = injectionDayKeyFromLocalDate(localDate) as
                                | 'dom'
                                | 'seg'
                                | 'ter'
                                | 'qua'
                                | 'qui'
                                | 'sex'
                                | 'sab';
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: mesclarPlanoComDatasReconstruidas(
                                  paciente?.planoTerapeutico,
                                  {
                                    startDate: localDate,
                                    dataInicioTratamento: localDate,
                                    injectionDayOfWeek: inj,
                                  },
                                  paciente?.evolucaoSeguimento
                                ),
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dia da aplicação semanal</label>
                          <div className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 min-h-[42px] flex items-center">
                            {(() => {
                              const date = paciente?.planoTerapeutico?.startDate || paciente?.planoTerapeutico?.dataInicioTratamento;
                              if (!date) return <span className="text-gray-400 dark:text-gray-500">Defina a data de início</span>;
                              const d = date instanceof Date ? new Date(date) : new Date(date as any);
                              if (isNaN(d.getTime())) return <span className="text-gray-400">—</span>;
                              d.setHours(0, 0, 0, 0);
                              const key = injectionDayKeyFromLocalDate(d);
                              return INJECTION_DAY_LABEL_PT[key] ?? key;
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Definido automaticamente pelo dia da semana da data de início.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Número de semanas do tratamento *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={
                              paciente?.planoTerapeutico?.numeroSemanasTratamento === undefined ||
                              paciente?.planoTerapeutico?.numeroSemanasTratamento === null
                                ? ''
                                : String(paciente.planoTerapeutico.numeroSemanasTratamento)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setPaciente({
                                  ...paciente!,
                                  planoTerapeutico: {
                                    ...paciente?.planoTerapeutico,
                                    numeroSemanasTratamento: undefined,
                                  },
                                });
                                return;
                              }
                              const n = parseInt(raw, 10);
                              if (!Number.isFinite(n)) return;
                              const clamped = Math.min(200, Math.max(1, n));
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  numeroSemanasTratamento: clamped,
                                },
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Defina a duração inicial do tratamento. Após finalizar essas semanas, você poderá ampliar o tratamento adicionando mais semanas.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dose e titulação */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Dose e Titulação</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dose inicial (mg) *</label>
                          <select
                            value={paciente?.planoTerapeutico?.currentDoseMg || paciente?.planoTerapeutico?.doseAtual?.quantidade || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              const now = new Date();
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  currentDoseMg: value as any,
                                  lastDoseChangeAt: now,
                                  nextReviewDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), // +28 dias
                                  doseAtual: {
                                    quantidade: value,
                                    frequencia: 'semanal' as const,
                                    dataUltimaAjuste: now
                                  }
                                }
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          >
                            <option value="">Selecione</option>
                            <DoseMgTirzepatidaSelectOptions />
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status da Titulação</label>
                          <select
                            value={paciente?.planoTerapeutico?.titrationStatus || ''}
                            onChange={(e) => {
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  titrationStatus: e.target.value as any
                                }
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          >
                            <option value="">Selecione</option>
                            <option value="INICIADO">Iniciado</option>
                            <option value="EM_TITULACAO">Em titulação</option>
                            <option value="MANUTENCAO">Manutenção</option>
                            <option value="PAUSADO">Pausado</option>
                            <option value="ENCERRADO">Encerrado</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observação</label>
                          <textarea
                            value={paciente?.planoTerapeutico?.titrationNotes || ''}
                            onChange={(e) => {
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  titrationNotes: e.target.value
                                }
                              });
                            }}
                            placeholder="Motivo de ajuste, intolerância GI, etc."
                            rows={3}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                    <EsquemaDosesPorSemanaEditor
                      paciente={paciente}
                      setPaciente={setPaciente}
                      dataAplicacaoFocoRef={dataAplicacaoFocoRef}
                    />
                </div>
    );
  }
  return (
    <div className="space-y-6">
      {!hideMetaHeading && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meta</h3>
      )}
                  <MetaadminMetasTratamentoBlock paciente={paciente!} setPaciente={setPaciente} hideMetaHeading={hideMetaHeading} />

    </div>
  );
}
