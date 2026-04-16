'use client';

import type { MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  primeiraDoseDoPlano,
  injectionDayKeyFromLocalDate,
  INJECTION_DAY_LABEL_PT,
  dataPrevistaConclusaoComoEsquema,
  semanaIndexConclusao,
} from '@/utils/datasAplicacaoSemanaPlano';
import { MetaadminMetasTratamentoBlock } from '@/components/metaadmin/MetaadminMetasTratamentoBlock';

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
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  startDate: localDate,
                                  dataInicioTratamento: localDate,
                                  injectionDayOfWeek: inj,
                                }
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
                            <span className="text-xs text-gray-500 ml-2">(padrão: 18, pode ser ampliado depois)</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={paciente?.planoTerapeutico?.numeroSemanasTratamento || 18}
                            onChange={(e) => {
                              const valor = parseInt(e.target.value) || 18;
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  numeroSemanasTratamento: valor
                                }
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            required
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
                            <option value="2.5">2.5 mg</option>
                            <option value="5">5 mg</option>
                            <option value="7.5">7.5 mg</option>
                            <option value="10">10 mg</option>
                            <option value="12.5">12.5 mg</option>
                            <option value="15">15 mg</option>
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

                    {/* Editor de Esquema de Doses por Semana */}
                    {(() => {
                      const ptPlanoEsq = paciente?.planoTerapeutico;
                      const primeiraDose = ptPlanoEsq ? primeiraDoseDoPlano(ptPlanoEsq) : null;
                      if (!primeiraDose) {
                        return (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950/30 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              Configure a data de início para visualizar o esquema de doses.
                            </p>
                          </div>
                        );
                      }

                      const doseInicial = paciente!.planoTerapeutico!.currentDoseMg || 2.5;
                      const numeroSemanas = Number(paciente.planoTerapeutico.numeroSemanasTratamento) || 18;
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const evolucao = paciente.evolucaoSeguimento || [];
                      const datasAplicacaoIndividuais = paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};

                      // Obter registro de aplicação para uma semana (prioriza weekIndex para manter itens aplicados imutáveis ao alterar dia semanal)
                      const getRegistroParaSemana = (semanaNum: number, dataPrevista: Date): any => {
                        const byWeekIndex = evolucao.find((e: any) => (e.weekIndex ?? e.numeroSemana) === semanaNum);
                        if (byWeekIndex?.dataRegistro) return byWeekIndex;
                        const dataPrevNorm = new Date(dataPrevista);
                        dataPrevNorm.setHours(0, 0, 0, 0);
                        return evolucao.find((e: any) => {
                          if (!e.dataRegistro) return false;
                          const dataRegistro = e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro as any);
                          if (isNaN(dataRegistro.getTime())) return false;
                          dataRegistro.setHours(0, 0, 0, 0);
                          const diffDias = Math.abs((dataRegistro.getTime() - dataPrevNorm.getTime()) / (1000 * 60 * 60 * 24));
                          return diffDias <= 1;
                        }) ?? null;
                      };

                      const temRegistroParaData = (dataPrevista: Date, semanaNum?: number) => {
                        if (semanaNum != null) return !!getRegistroParaSemana(semanaNum, dataPrevista);
                        const dataPrevNorm = new Date(dataPrevista);
                        dataPrevNorm.setHours(0, 0, 0, 0);
                        return evolucao.some((e: any) => {
                          if (!e.dataRegistro) return false;
                          const dataRegistro = e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro as any);
                          if (isNaN(dataRegistro.getTime())) return false;
                          dataRegistro.setHours(0, 0, 0, 0);
                          const diffDias = Math.abs((dataRegistro.getTime() - dataPrevNorm.getTime()) / (1000 * 60 * 60 * 24));
                          return diffDias <= 1;
                        });
                      };

                      // Função para calcular dose automática (mesma lógica do calendário)
                      const calcularDoseAutomatica = (semanaIndex: number) => {
                        let semanasDesdeUltimoCiclo = semanaIndex;
                        for (let s = 0; s < semanaIndex; s++) {
                          const dataPrevista = new Date(primeiraDose);
                          dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
                          const registro = evolucao.find((e: any) => {
                            if (!e.dataRegistro) return false;
                            const dataRegistro = e.dataRegistro instanceof Date 
                              ? new Date(e.dataRegistro)
                              : new Date(e.dataRegistro as any);
                            if (isNaN(dataRegistro.getTime())) return false;
                            dataRegistro.setHours(0, 0, 0, 0);
                            const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDias <= 1;
                          });
                          if (registro && registro.dataRegistro) {
                            const dataRegistro = registro.dataRegistro instanceof Date 
                              ? new Date(registro.dataRegistro)
                              : new Date(registro.dataRegistro as any);
                            dataRegistro.setHours(0, 0, 0, 0);
                            const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
                            if (diffDias >= 4) {
                              semanasDesdeUltimoCiclo = semanaIndex - s - 1;
                              break;
                            }
                          }
                        }
                        return doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);
                      };

                      // Criar array de semanas com dados
                      const semanasCanceladas = paciente.planoTerapeutico.semanasCanceladas || [];
                      const semanas = [];
                      for (let s = 0; s < numeroSemanas; s++) {
                        const dataDose = new Date(primeiraDose);
                        dataDose.setDate(primeiraDose.getDate() + (s * 7));
                        const semanaNum = s + 1;
                        const doseAutomatica = calcularDoseAutomatica(s);
                        const doseCustomizada = paciente.planoTerapeutico.esquemaDosesCustomizado?.[semanaNum];
                        const doseAtual = doseCustomizada || doseAutomatica;
                        const isPassada = dataDose < hoje;
                        const isFutura = dataDose >= hoje;
                        const isCancelada = semanasCanceladas.includes(semanaNum);
                        const registroAplicacao = getRegistroParaSemana(semanaNum, dataDose);
                        const temRegistroAplicacao = !!registroAplicacao;
                        // Data de exibição: aplicados usam data real (imutável ao alterar dia semanal); não aplicados usam data individual se houver, senão calculada
                        let dataExibicao = dataDose;
                        if (temRegistroAplicacao && registroAplicacao.dataRegistro) {
                          const dr = registroAplicacao.dataRegistro instanceof Date ? new Date(registroAplicacao.dataRegistro) : new Date(registroAplicacao.dataRegistro as any);
                          dataExibicao = dr;
                        } else if (datasAplicacaoIndividuais[semanaNum]) {
                          try {
                            const [y, m, d] = datasAplicacaoIndividuais[semanaNum].split('-').map(Number);
                            const parsed = new Date(y, m - 1, d);
                            if (!isNaN(parsed.getTime())) dataExibicao = parsed;
                          } catch { /* manter dataDose */ }
                        }

                        semanas.push({
                          semana: semanaNum,
                          data: dataDose,
                          dataExibicao,
                          doseAutomatica,
                          doseAtual,
                          doseCustomizada: doseCustomizada || undefined,
                          isPassada,
                          isFutura,
                          isCancelada,
                          temRegistroAplicacao,
                          isConclusao: false
                        });
                      }
                      // Semana de Conclusão: mesma regra do calendário / Firestore (registro → mapa → última dose ativa + 7d)
                      const dataConclusao = dataPrevistaConclusaoComoEsquema(paciente.planoTerapeutico, evolucao);
                      const semConclNum = semanaIndexConclusao(paciente.planoTerapeutico);
                      const registroConclusaoEsq = getRegistroParaSemana(semConclNum, dataConclusao);
                      let dataExibicaoConclusao = dataConclusao;
                      if (registroConclusaoEsq?.dataRegistro) {
                        const dr = registroConclusaoEsq.dataRegistro instanceof Date
                          ? new Date(registroConclusaoEsq.dataRegistro)
                          : new Date(registroConclusaoEsq.dataRegistro as any);
                        if (!isNaN(dr.getTime())) dataExibicaoConclusao = dr;
                      }
                      semanas.push({
                        semana: semConclNum,
                        data: dataConclusao,
                        dataExibicao: dataExibicaoConclusao,
                        doseAutomatica: 0,
                        doseAtual: 0,
                        doseCustomizada: undefined,
                        isPassada: dataExibicaoConclusao < hoje,
                        isFutura: dataExibicaoConclusao >= hoje,
                        isCancelada: false,
                        temRegistroAplicacao: !!registroConclusaoEsq,
                        isConclusao: true
                      });

                      // Calcular somatório total de miligramas (apenas semanas de dose não canceladas)
                      const totalMiligramas = semanas
                        .filter(s => !s.isCancelada && !(s as { isConclusao?: boolean }).isConclusao)
                        .reduce((total, s) => total + (s.doseAtual || 0), 0);

                      return (
                        <div className="mt-6 border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="text-sm font-semibold text-gray-800">Esquema de Doses por Semana</h5>
                              <p className="text-xs text-gray-500 mt-1">
                                Edite as doses das semanas em que ainda não foi registrada uma aplicação (Novo Registro). Após registrar a aplicação, a dose daquela semana fica bloqueada.
                              </p>
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-xs font-semibold text-blue-800">
                                  Total de miligramas no tratamento: <span className="text-blue-900">{totalMiligramas.toFixed(1)} mg</span>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                // Limpar todas as doses customizadas
                                setPaciente({
                                  ...paciente!,
                                  planoTerapeutico: {
                                    ...paciente?.planoTerapeutico,
                                    esquemaDosesCustomizado: undefined
                                  }
                                });
                              }}
                              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                              Resetar para Automático
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <div className="inline-flex gap-2 min-w-full pb-2" style={{ minWidth: 'max-content' }}>
                              {semanas.map((item) => {
                                const isConclusao = (item as { isConclusao?: boolean }).isConclusao;
                                const isEditable = !item.temRegistroAplicacao && !isConclusao;
                                return (
                                  <div
                                    key={item.semana}
                                    className={`flex-shrink-0 w-24 border rounded-lg p-2 ${
                                      isConclusao
                                        ? 'bg-purple-50 border-purple-300'
                                        : item.isCancelada
                                        ? 'bg-red-50 border-red-300'
                                        : item.temRegistroAplicacao
                                        ? 'bg-gray-50 border-gray-200 opacity-60'
                                        : isEditable
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <div className="text-center">
                                      <div className="text-xs font-semibold text-gray-600 mb-1">
                                        {isConclusao ? 'Conclusão' : `Sem ${item.semana}`}
                                      </div>
                                      <div className="text-xs text-gray-500 mb-2">
                                        {((item as { dataExibicao?: Date }).dataExibicao ?? item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      </div>
                                      {isConclusao ? (
                                        <div className="text-[10px] text-purple-700 font-medium">
                                          Peso final
                                        </div>
                                      ) : item.isCancelada ? (
                                        <div className="text-center">
                                          <div className="text-xs font-semibold text-red-700 mb-1">
                                            ⚠️ Cancelada
                                          </div>
                                          <button
                                            onClick={() => {
                                              const semanasCanceladasAtual = paciente?.planoTerapeutico?.semanasCanceladas || [];
                                              const novasCanceladas = semanasCanceladasAtual.filter(s => s !== item.semana);
                                              
                                              setPaciente({
                                                ...paciente!,
                                                planoTerapeutico: {
                                                  ...paciente?.planoTerapeutico,
                                                  semanasCanceladas: novasCanceladas.length > 0 ? novasCanceladas : undefined
                                                }
                                              });
                                            }}
                                            className="text-[10px] text-red-600 hover:text-red-800 underline"
                                          >
                                            Reativar
                                          </button>
                                        </div>
                                      ) : isEditable ? (
                                        <div className="space-y-1">
                                          <select
                                            value={item.doseAtual}
                                            onChange={(e) => {
                                              const novaDose = parseFloat(e.target.value);
                                              const esquemaAtual = paciente?.planoTerapeutico?.esquemaDosesCustomizado || {};
                                              const novoEsquema = { ...esquemaAtual };
                                              
                                              if (novaDose === item.doseAutomatica) {
                                                delete novoEsquema[item.semana];
                                              } else {
                                                novoEsquema[item.semana] = novaDose;
                                              }
                                              
                                              setPaciente({
                                                ...paciente!,
                                                planoTerapeutico: {
                                                  ...paciente?.planoTerapeutico,
                                                  esquemaDosesCustomizado: Object.keys(novoEsquema).length > 0 ? novoEsquema : undefined
                                                }
                                              });
                                            }}
                                            className="w-full text-xs border border-gray-300 rounded px-1 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          >
                                            <option value="2.5">2.5 mg</option>
                                            <option value="5">5 mg</option>
                                            <option value="7.5">7.5 mg</option>
                                            <option value="10">10 mg</option>
                                            <option value="12.5">12.5 mg</option>
                                            <option value="15">15 mg</option>
                                          </select>
                                          <input
                                            type="date"
                                            value={(() => {
                                              const d = (item as { dataExibicao?: Date }).dataExibicao ?? item.data;
                                              const y = d.getFullYear();
                                              const m = String(d.getMonth() + 1).padStart(2, '0');
                                              const day = String(d.getDate()).padStart(2, '0');
                                              return `${y}-${m}-${day}`;
                                            })()}
                                            onFocus={() => {
                                              const d = (item as { dataExibicao?: Date }).dataExibicao ?? item.data;
                                              const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                              dataAplicacaoFocoRef.current = { semana: item.semana, valor };
                                            }}
                                            onChange={(e) => {
                                              const novaDataStr = e.target.value;
                                              if (!novaDataStr) return;
                                              const datasAtual = paciente?.planoTerapeutico?.datasAplicacaoIndividuais || {};
                                              const novoDatas = { ...datasAtual, [item.semana]: novaDataStr };
                                              setPaciente({
                                                ...paciente!,
                                                planoTerapeutico: {
                                                  ...paciente?.planoTerapeutico,
                                                  datasAplicacaoIndividuais: novoDatas
                                                }
                                              });
                                            }}
                                            onBlur={(e) => {
                                              const atual = dataAplicacaoFocoRef.current;
                                              if (!atual || atual.semana !== item.semana) return;
                                              const novaDataStr = e.target.value;
                                              if (!novaDataStr) return;
                                              if (novaDataStr === atual.valor) return;
                                              if (!window.confirm('Deseja salvar a alteração da data da aplicação?')) {
                                                const datasAtual = paciente?.planoTerapeutico?.datasAplicacaoIndividuais || {};
                                                const novoDatas = { ...datasAtual };
                                                delete novoDatas[item.semana];
                                                setPaciente({
                                                  ...paciente!,
                                                  planoTerapeutico: {
                                                    ...paciente?.planoTerapeutico,
                                                    datasAplicacaoIndividuais: Object.keys(novoDatas).length > 0 ? novoDatas : undefined
                                                  }
                                                });
                                              }
                                              dataAplicacaoFocoRef.current = null;
                                            }}
                                            className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <label className="flex items-center justify-center cursor-pointer text-[10px] text-red-600 hover:text-red-800">
                                            <input
                                              type="checkbox"
                                              checked={false}
                                              onChange={(e) => {
                                                const semanasCanceladasAtual = paciente?.planoTerapeutico?.semanasCanceladas || [];
                                                const novasCanceladas = [...semanasCanceladasAtual, item.semana];
                                                
                                                setPaciente({
                                                  ...paciente!,
                                                  planoTerapeutico: {
                                                    ...paciente?.planoTerapeutico,
                                                    semanasCanceladas: novasCanceladas
                                                  }
                                                });
                                              }}
                                              className="mr-1 h-3 w-3"
                                            />
                                            Cancelar
                                          </label>
                                        </div>
                                      ) : (
                                        <div className={`text-xs font-medium ${
                                          item.doseCustomizada ? 'text-blue-700' : 'text-gray-700'
                                        }`}>
                                          {item.doseAtual} mg
                                          {item.doseCustomizada && (
                                            <span className="block text-[10px] text-blue-500 mt-0.5">(custom)</span>
                                          )}
                                        </div>
                                      )}
                                      {item.temRegistroAplicacao && !item.isCancelada && (
                                        <div className="text-[10px] text-gray-400 mt-1">Aplicada</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {(semanas.some(s => paciente?.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) || 
                            semanas.some(s => s.isCancelada)) && (
                            <div className="mt-3 space-y-2">
                              {semanas.some(s => paciente?.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) && (
                                <p className="text-xs text-blue-600">
                                  <strong>Nota:</strong> Semanas com doses customizadas aparecem destacadas. As doses automáticas são calculadas considerando ajustes e atrasos do tratamento.
                                </p>
                              )}
                              {semanas.some(s => s.isCancelada) && (
                                <p className="text-xs text-red-600">
                                  <strong>Atenção:</strong> Semanas canceladas aparecem em vermelho. Ao salvar o paciente, essas semanas serão automaticamente registradas como puladas na Pasta 6 (Evolução/Seguimento) e não aparecerão nos calendários futuros.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

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
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  startDate: localDate,
                                  dataInicioTratamento: localDate,
                                  injectionDayOfWeek: inj,
                                }
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
                            <span className="text-xs text-gray-500 ml-2">(padrão: 18, pode ser ampliado depois)</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={paciente?.planoTerapeutico?.numeroSemanasTratamento || 18}
                            onChange={(e) => {
                              const valor = parseInt(e.target.value) || 18;
                              setPaciente({
                                ...paciente!,
                                planoTerapeutico: {
                                  ...paciente?.planoTerapeutico,
                                  numeroSemanasTratamento: valor
                                }
                              });
                            }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            required
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
                            <option value="2.5">2.5 mg</option>
                            <option value="5">5 mg</option>
                            <option value="7.5">7.5 mg</option>
                            <option value="10">10 mg</option>
                            <option value="12.5">12.5 mg</option>
                            <option value="15">15 mg</option>
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

                    {/* Editor de Esquema de Doses por Semana */}
                    {(() => {
                      const ptPlanoEsq = paciente?.planoTerapeutico;
                      const primeiraDose = ptPlanoEsq ? primeiraDoseDoPlano(ptPlanoEsq) : null;
                      if (!primeiraDose) {
                        return (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950/30 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              Configure a data de início para visualizar o esquema de doses.
                            </p>
                          </div>
                        );
                      }

                      const doseInicial = paciente!.planoTerapeutico!.currentDoseMg || 2.5;
                      const numeroSemanas = Number(paciente.planoTerapeutico.numeroSemanasTratamento) || 18;
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const evolucao = paciente.evolucaoSeguimento || [];
                      const datasAplicacaoIndividuais = paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};

                      // Obter registro de aplicação para uma semana (prioriza weekIndex para manter itens aplicados imutáveis ao alterar dia semanal)
                      const getRegistroParaSemana = (semanaNum: number, dataPrevista: Date): any => {
                        const byWeekIndex = evolucao.find((e: any) => (e.weekIndex ?? e.numeroSemana) === semanaNum);
                        if (byWeekIndex?.dataRegistro) return byWeekIndex;
                        const dataPrevNorm = new Date(dataPrevista);
                        dataPrevNorm.setHours(0, 0, 0, 0);
                        return evolucao.find((e: any) => {
                          if (!e.dataRegistro) return false;
                          const dataRegistro = e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro as any);
                          if (isNaN(dataRegistro.getTime())) return false;
                          dataRegistro.setHours(0, 0, 0, 0);
                          const diffDias = Math.abs((dataRegistro.getTime() - dataPrevNorm.getTime()) / (1000 * 60 * 60 * 24));
                          return diffDias <= 1;
                        }) ?? null;
                      };

                      const temRegistroParaData = (dataPrevista: Date, semanaNum?: number) => {
                        if (semanaNum != null) return !!getRegistroParaSemana(semanaNum, dataPrevista);
                        const dataPrevNorm = new Date(dataPrevista);
                        dataPrevNorm.setHours(0, 0, 0, 0);
                        return evolucao.some((e: any) => {
                          if (!e.dataRegistro) return false;
                          const dataRegistro = e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro as any);
                          if (isNaN(dataRegistro.getTime())) return false;
                          dataRegistro.setHours(0, 0, 0, 0);
                          const diffDias = Math.abs((dataRegistro.getTime() - dataPrevNorm.getTime()) / (1000 * 60 * 60 * 24));
                          return diffDias <= 1;
                        });
                      };

                      // Função para calcular dose automática (mesma lógica do calendário)
                      const calcularDoseAutomatica = (semanaIndex: number) => {
                        let semanasDesdeUltimoCiclo = semanaIndex;
                        for (let s = 0; s < semanaIndex; s++) {
                          const dataPrevista = new Date(primeiraDose);
                          dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
                          const registro = evolucao.find((e: any) => {
                            if (!e.dataRegistro) return false;
                            const dataRegistro = e.dataRegistro instanceof Date 
                              ? new Date(e.dataRegistro)
                              : new Date(e.dataRegistro as any);
                            if (isNaN(dataRegistro.getTime())) return false;
                            dataRegistro.setHours(0, 0, 0, 0);
                            const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDias <= 1;
                          });
                          if (registro && registro.dataRegistro) {
                            const dataRegistro = registro.dataRegistro instanceof Date 
                              ? new Date(registro.dataRegistro)
                              : new Date(registro.dataRegistro as any);
                            dataRegistro.setHours(0, 0, 0, 0);
                            const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
                            if (diffDias >= 4) {
                              semanasDesdeUltimoCiclo = semanaIndex - s - 1;
                              break;
                            }
                          }
                        }
                        return doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);
                      };

                      // Criar array de semanas com dados
                      const semanasCanceladas = paciente.planoTerapeutico.semanasCanceladas || [];
                      const semanas = [];
                      for (let s = 0; s < numeroSemanas; s++) {
                        const dataDose = new Date(primeiraDose);
                        dataDose.setDate(primeiraDose.getDate() + (s * 7));
                        const semanaNum = s + 1;
                        const doseAutomatica = calcularDoseAutomatica(s);
                        const doseCustomizada = paciente.planoTerapeutico.esquemaDosesCustomizado?.[semanaNum];
                        const doseAtual = doseCustomizada || doseAutomatica;
                        const isPassada = dataDose < hoje;
                        const isFutura = dataDose >= hoje;
                        const isCancelada = semanasCanceladas.includes(semanaNum);
                        const registroAplicacao = getRegistroParaSemana(semanaNum, dataDose);
                        const temRegistroAplicacao = !!registroAplicacao;
                        // Data de exibição: aplicados usam data real (imutável ao alterar dia semanal); não aplicados usam data individual se houver, senão calculada
                        let dataExibicao = dataDose;
                        if (temRegistroAplicacao && registroAplicacao.dataRegistro) {
                          const dr = registroAplicacao.dataRegistro instanceof Date ? new Date(registroAplicacao.dataRegistro) : new Date(registroAplicacao.dataRegistro as any);
                          dataExibicao = dr;
                        } else if (datasAplicacaoIndividuais[semanaNum]) {
                          try {
                            const [y, m, d] = datasAplicacaoIndividuais[semanaNum].split('-').map(Number);
                            const parsed = new Date(y, m - 1, d);
                            if (!isNaN(parsed.getTime())) dataExibicao = parsed;
                          } catch { /* manter dataDose */ }
                        }

                        semanas.push({
                          semana: semanaNum,
                          data: dataDose,
                          dataExibicao,
                          doseAutomatica,
                          doseAtual,
                          doseCustomizada: doseCustomizada || undefined,
                          isPassada,
                          isFutura,
                          isCancelada,
                          temRegistroAplicacao,
                          isConclusao: false
                        });
                      }
                      // Semana de Conclusão: mesma regra do calendário / Firestore (registro → mapa → última dose ativa + 7d)
                      const dataConclusao = dataPrevistaConclusaoComoEsquema(paciente.planoTerapeutico, evolucao);
                      const semConclNum = semanaIndexConclusao(paciente.planoTerapeutico);
                      const registroConclusaoEsq = getRegistroParaSemana(semConclNum, dataConclusao);
                      let dataExibicaoConclusao = dataConclusao;
                      if (registroConclusaoEsq?.dataRegistro) {
                        const dr = registroConclusaoEsq.dataRegistro instanceof Date
                          ? new Date(registroConclusaoEsq.dataRegistro)
                          : new Date(registroConclusaoEsq.dataRegistro as any);
                        if (!isNaN(dr.getTime())) dataExibicaoConclusao = dr;
                      }
                      semanas.push({
                        semana: semConclNum,
                        data: dataConclusao,
                        dataExibicao: dataExibicaoConclusao,
                        doseAutomatica: 0,
                        doseAtual: 0,
                        doseCustomizada: undefined,
                        isPassada: dataExibicaoConclusao < hoje,
                        isFutura: dataExibicaoConclusao >= hoje,
                        isCancelada: false,
                        temRegistroAplicacao: !!registroConclusaoEsq,
                        isConclusao: true
                      });

                      // Calcular somatório total de miligramas (apenas semanas de dose não canceladas)
                      const totalMiligramas = semanas
                        .filter(s => !s.isCancelada && !(s as { isConclusao?: boolean }).isConclusao)
                        .reduce((total, s) => total + (s.doseAtual || 0), 0);

                      return (
                        <div className="mt-6 border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="text-sm font-semibold text-gray-800">Esquema de Doses por Semana</h5>
                              <p className="text-xs text-gray-500 mt-1">
                                Edite as doses das semanas em que ainda não foi registrada uma aplicação (Novo Registro). Após registrar a aplicação, a dose daquela semana fica bloqueada.
                              </p>
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-xs font-semibold text-blue-800">
                                  Total de miligramas no tratamento: <span className="text-blue-900">{totalMiligramas.toFixed(1)} mg</span>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                // Limpar todas as doses customizadas
                                setPaciente({
                                  ...paciente!,
                                  planoTerapeutico: {
                                    ...paciente?.planoTerapeutico,
                                    esquemaDosesCustomizado: undefined
                                  }
                                });
                              }}
                              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                              Resetar para Automático
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <div className="inline-flex gap-2 min-w-full pb-2" style={{ minWidth: 'max-content' }}>
                              {semanas.map((item) => {
                                const isConclusao = (item as { isConclusao?: boolean }).isConclusao;
                                const isEditable = !item.temRegistroAplicacao && !isConclusao;
                                return (
                                  <div
                                    key={item.semana}
                                    className={`flex-shrink-0 w-24 border rounded-lg p-2 ${
                                      isConclusao
                                        ? 'bg-purple-50 border-purple-300'
                                        : item.isCancelada
                                        ? 'bg-red-50 border-red-300'
                                        : item.temRegistroAplicacao
                                        ? 'bg-gray-50 border-gray-200 opacity-60'
                                        : isEditable
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <div className="text-center">
                                      <div className="text-xs font-semibold text-gray-600 mb-1">
                                        {isConclusao ? 'Conclusão' : `Sem ${item.semana}`}
                                      </div>
                                      <div className="text-xs text-gray-500 mb-2">
                                        {((item as { dataExibicao?: Date }).dataExibicao ?? item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      </div>
                                      {isConclusao ? (
                                        <div className="text-[10px] text-purple-700 font-medium">
                                          Peso final
                                        </div>
                                      ) : item.isCancelada ? (
                                        <div className="text-center">
                                          <div className="text-xs font-semibold text-red-700 mb-1">
                                            ⚠️ Cancelada
                                          </div>
                                          <button
                                            onClick={() => {
                                              const semanasCanceladasAtual = paciente?.planoTerapeutico?.semanasCanceladas || [];
                                              const novasCanceladas = semanasCanceladasAtual.filter(s => s !== item.semana);
                                              
                                              setPaciente({
                                                ...paciente!,
                                                planoTerapeutico: {
                                                  ...paciente?.planoTerapeutico,
                                                  semanasCanceladas: novasCanceladas.length > 0 ? novasCanceladas : undefined
                                                }
                                              });
                                            }}
                                            className="text-[10px] text-red-600 hover:text-red-800 underline"
                                          >
                                            Reativar
                                          </button>
                                        </div>
                                      ) : isEditable ? (
                                        <div className="space-y-1">
                                          <select
                                            value={item.doseAtual}
                                            onChange={(e) => {
                                              const novaDose = parseFloat(e.target.value);
                                              const esquemaAtual = paciente?.planoTerapeutico?.esquemaDosesCustomizado || {};
                                              const novoEsquema = { ...esquemaAtual };
                                              
                                              if (novaDose === item.doseAutomatica) {
                                                delete novoEsquema[item.semana];
                                              } else {
                                                novoEsquema[item.semana] = novaDose;
                                              }
                                              
                                              setPaciente({
                                                ...paciente!,
                                                planoTerapeutico: {
                                                  ...paciente?.planoTerapeutico,
                                                  esquemaDosesCustomizado: Object.keys(novoEsquema).length > 0 ? novoEsquema : undefined
                                                }
                                              });
                                            }}
                                            className="w-full text-xs border border-gray-300 rounded px-1 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          >
                                            <option value="2.5">2.5 mg</option>
                                            <option value="5">5 mg</option>
                                            <option value="7.5">7.5 mg</option>
                                            <option value="10">10 mg</option>
                                            <option value="12.5">12.5 mg</option>
                                            <option value="15">15 mg</option>
                                          </select>
                                          <input
                                            type="date"
                                            value={(() => {
                                              const d = (item as { dataExibicao?: Date }).dataExibicao ?? item.data;
                                              const y = d.getFullYear();
                                              const m = String(d.getMonth() + 1).padStart(2, '0');
                                              const day = String(d.getDate()).padStart(2, '0');
                                              return `${y}-${m}-${day}`;
                                            })()}
                                            onFocus={() => {
                                              const d = (item as { dataExibicao?: Date }).dataExibicao ?? item.data;
                                              const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                              dataAplicacaoFocoRef.current = { semana: item.semana, valor };
                                            }}
                                            onChange={(e) => {
                                              const novaDataStr = e.target.value;
                                              if (!novaDataStr) return;
                                              const datasAtual = paciente?.planoTerapeutico?.datasAplicacaoIndividuais || {};
                                              const novoDatas = { ...datasAtual, [item.semana]: novaDataStr };
                                              setPaciente({
                                                ...paciente!,
                                                planoTerapeutico: {
                                                  ...paciente?.planoTerapeutico,
                                                  datasAplicacaoIndividuais: novoDatas
                                                }
                                              });
                                            }}
                                            onBlur={(e) => {
                                              const atual = dataAplicacaoFocoRef.current;
                                              if (!atual || atual.semana !== item.semana) return;
                                              const novaDataStr = e.target.value;
                                              if (!novaDataStr) return;
                                              if (novaDataStr === atual.valor) return;
                                              if (!window.confirm('Deseja salvar a alteração da data da aplicação?')) {
                                                const datasAtual = paciente?.planoTerapeutico?.datasAplicacaoIndividuais || {};
                                                const novoDatas = { ...datasAtual };
                                                delete novoDatas[item.semana];
                                                setPaciente({
                                                  ...paciente!,
                                                  planoTerapeutico: {
                                                    ...paciente?.planoTerapeutico,
                                                    datasAplicacaoIndividuais: Object.keys(novoDatas).length > 0 ? novoDatas : undefined
                                                  }
                                                });
                                              }
                                              dataAplicacaoFocoRef.current = null;
                                            }}
                                            className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <label className="flex items-center justify-center cursor-pointer text-[10px] text-red-600 hover:text-red-800">
                                            <input
                                              type="checkbox"
                                              checked={false}
                                              onChange={(e) => {
                                                const semanasCanceladasAtual = paciente?.planoTerapeutico?.semanasCanceladas || [];
                                                const novasCanceladas = [...semanasCanceladasAtual, item.semana];
                                                
                                                setPaciente({
                                                  ...paciente!,
                                                  planoTerapeutico: {
                                                    ...paciente?.planoTerapeutico,
                                                    semanasCanceladas: novasCanceladas
                                                  }
                                                });
                                              }}
                                              className="mr-1 h-3 w-3"
                                            />
                                            Cancelar
                                          </label>
                                        </div>
                                      ) : (
                                        <div className={`text-xs font-medium ${
                                          item.doseCustomizada ? 'text-blue-700' : 'text-gray-700'
                                        }`}>
                                          {item.doseAtual} mg
                                          {item.doseCustomizada && (
                                            <span className="block text-[10px] text-blue-500 mt-0.5">(custom)</span>
                                          )}
                                        </div>
                                      )}
                                      {item.temRegistroAplicacao && !item.isCancelada && (
                                        <div className="text-[10px] text-gray-400 mt-1">Aplicada</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {(semanas.some(s => paciente?.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) || 
                            semanas.some(s => s.isCancelada)) && (
                            <div className="mt-3 space-y-2">
                              {semanas.some(s => paciente?.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) && (
                                <p className="text-xs text-blue-600">
                                  <strong>Nota:</strong> Semanas com doses customizadas aparecem destacadas. As doses automáticas são calculadas considerando ajustes e atrasos do tratamento.
                                </p>
                              )}
                              {semanas.some(s => s.isCancelada) && (
                                <p className="text-xs text-red-600">
                                  <strong>Atenção:</strong> Semanas canceladas aparecem em vermelho. Ao salvar o paciente, essas semanas serão automaticamente registradas como puladas na Pasta 6 (Evolução/Seguimento) e não aparecerão nos calendários futuros.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
