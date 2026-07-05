'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import { DoseMgTirzepatidaSelectOptions } from '@/components/tirzepatida/DoseMgTirzepatidaSelectOptions';
import { buildSemanasEsquemaDoses, pacienteComDoseMgSemanaAtualizada } from '@/utils/esquemaDosesSemana';
import { primeiraDoseDoPlano } from '@/utils/datasAplicacaoSemanaPlano';
import { EsquemaDoseSemanaDateInput, formatDateAsDDMMYY, formatWeekdayPt } from '@/components/metaadmin/EsquemaDoseSemanaDateInput';

type Props = {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
};

export function EsquemaDosesPorSemanaEditor({ paciente, setPaciente, dataAplicacaoFocoRef }: Props) {
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

  const built = buildSemanasEsquemaDoses(paciente);
  if (!built) {
    return (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950/30 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Informe o número de semanas do tratamento em Metadados do Plano para listar o esquema de doses.
        </p>
      </div>
    );
  }

  const { semanas, totalMiligramas } = built;
  const datasAplicacaoIndividuais = paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Esquema de Doses por Semana</h5>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Fonte única das doses (mg): defina aqui por semana. Evolução/seguimento, calendário e
            novos registros usam sempre estes valores. Semanas já aplicadas mantêm a data real e ficam
            bloqueadas para edição de dose aqui (altere na evolução/seguimento).
          </p>
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950/30 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
              Total de miligramas no tratamento:{' '}
              <span className="text-blue-900 dark:text-blue-100">{totalMiligramas.toFixed(1)} mg</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPaciente({
              ...paciente,
              planoTerapeutico: {
                ...paciente.planoTerapeutico,
                esquemaDosesCustomizado: undefined,
              },
            });
          }}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
        >
          Resetar para Automático
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-2 min-w-full pb-2" style={{ minWidth: 'max-content' }}>
          {semanas.map((item) => {
            const isEditable = !item.temDoseAplicada && !item.isConclusao;
            return (
              <div
                key={item.semana}
                className={`flex-shrink-0 w-24 border rounded-lg p-2 ${
                  item.isConclusao
                    ? 'bg-purple-50 border-purple-300 dark:bg-purple-950/30'
                    : item.isCancelada
                      ? 'bg-red-50 border-red-300'
                      : item.temDoseAplicada
                        ? 'bg-gray-50 border-gray-200 opacity-60 dark:bg-gray-900/40'
                        : isEditable
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {item.isConclusao ? 'Conclusão' : `Sem ${item.semana}`}
                  </div>
                  <div className="text-xs text-gray-500 mb-2 tabular-nums">{formatDateAsDDMMYY(item.dataExibicao)}</div>
                  <div className="text-[10px] text-gray-500 mb-2">{formatWeekdayPt(item.dataExibicao)}</div>
                  {item.isConclusao ? (
                    <div className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">Peso final</div>
                  ) : item.isCancelada ? (
                    <div className="text-center">
                      <div className="text-xs font-semibold text-red-700 mb-1">⚠️ Cancelada</div>
                      <button
                        type="button"
                        onClick={() => {
                          const semanasCanceladasAtual = paciente.planoTerapeutico?.semanasCanceladas || [];
                          const novasCanceladas = semanasCanceladasAtual.filter((s) => s !== item.semana);
                          setPaciente({
                            ...paciente,
                            planoTerapeutico: {
                              ...paciente.planoTerapeutico,
                              semanasCanceladas: novasCanceladas.length > 0 ? novasCanceladas : undefined,
                            },
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
                          if (!Number.isFinite(novaDose)) return;
                          setPaciente(
                            pacienteComDoseMgSemanaAtualizada(paciente, item.semana, novaDose)
                          );
                        }}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                            <DoseMgTirzepatidaSelectOptions />
                      </select>
                      <EsquemaDoseSemanaDateInput
                        semana={item.semana}
                        dataExibicao={item.dataExibicao}
                        yyyyMmDdFromMap={datasAplicacaoIndividuais[item.semana]}
                        dataAplicacaoFocoRef={dataAplicacaoFocoRef}
                        onApplyYyyyMmDd={(semana, ymd) => {
                          const datasAtual = paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};
                          setPaciente({
                            ...paciente,
                            planoTerapeutico: {
                              ...paciente.planoTerapeutico,
                              datasAplicacaoIndividuais: { ...datasAtual, [semana]: ymd },
                            },
                          });
                        }}
                        onRemoveOverride={(semana) => {
                          const datasAtual = paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};
                          const novoDatas = { ...datasAtual };
                          delete novoDatas[semana];
                          setPaciente({
                            ...paciente,
                            planoTerapeutico: {
                              ...paciente.planoTerapeutico,
                              datasAplicacaoIndividuais:
                                Object.keys(novoDatas).length > 0 ? novoDatas : undefined,
                            },
                          });
                        }}
                      />
                      <label className="flex items-center justify-center cursor-pointer text-[10px] text-red-600 hover:text-red-800">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => {
                            const semanasCanceladasAtual = paciente.planoTerapeutico?.semanasCanceladas || [];
                            setPaciente({
                              ...paciente,
                              planoTerapeutico: {
                                ...paciente.planoTerapeutico,
                                semanasCanceladas: [...semanasCanceladasAtual, item.semana],
                              },
                            });
                          }}
                          className="mr-1 h-3 w-3"
                        />
                        Cancelar
                      </label>
                    </div>
                  ) : (
                    <div
                      className={`text-xs font-medium ${
                        item.doseCustomizada && !item.doseAplicadaMg ? 'text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {item.doseAtual} mg
                      {item.temDoseAplicada && (
                        <span className="block text-[10px] text-green-600 mt-0.5">(aplicada)</span>
                      )}
                      {item.doseCustomizada != null && !item.temDoseAplicada && (
                        <span className="block text-[10px] text-blue-500 mt-0.5">(custom)</span>
                      )}
                    </div>
                  )}
                  {item.temDoseAplicada && !item.isCancelada && !item.isConclusao && (
                    <div className="text-[10px] text-green-700 dark:text-green-400 mt-1 font-medium">Aplicada</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {(semanas.some((s) => paciente.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) ||
        semanas.some((s) => s.isCancelada)) && (
        <div className="mt-3 space-y-2">
          {semanas.some((s) => paciente.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) && (
            <p className="text-xs text-blue-600 dark:text-blue-300">
              <strong>Nota:</strong> Semanas com doses customizadas aparecem destacadas. A dose exibida é sempre a
              definida neste esquema.
            </p>
          )}
          {semanas.some((s) => s.isCancelada) && (
            <p className="text-xs text-red-600">
              <strong>Atenção:</strong> Semanas canceladas aparecem em vermelho. Ao salvar o paciente, essas semanas
              serão registradas como puladas na evolução.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
