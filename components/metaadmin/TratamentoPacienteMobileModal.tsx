'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { BarChart3, Camera, Quote, Wrench, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import PacienteModalHeader from '@/components/metaadmin/paciente-modal/PacienteModalHeader';
import { MetaadminPlanoTerapeuticoEditSections } from '@/components/metaadmin/MetaadminPlanoTerapeuticoEditSections';
import { MetaadminInjetaveisAplicacoesView } from '@/components/metaadmin/MetaadminInjetaveisAplicacoesView';
import { CheckInSemanalDetalheModal } from '@/components/aplicacao/CheckInSemanalDetalheModal';
import { MarcoZeroDetalheModal } from '@/components/aplicacao/MarcoZeroDetalheModal';
import { ScoreProgressBar } from '@/components/ScoreProgressRing';
import {
  listarAplicacoesEsquemaComConclusao,
  obterDoseMgSemanaPaciente,
} from '@/utils/esquemaDosesSemana';
import {
  aplicacaoFoiFeitaNoPaciente,
  obterRegistroSeguimentoDaAplicacao,
  obterVariacaoCompAplicacao,
  obterVariacaoPesoAplicacao,
  toDateLocalEvolucao,
} from '@/utils/evolucaoAplicacaoHelpers';
import {
  primeiraDoseDoPlano,
} from '@/utils/datasAplicacaoSemanaPlano';
import {
  listDepoimentosSlidesFromPlano,
  temDepoimentosAssociadosAoPlano,
} from '@/utils/conclusaoTratamentoHistorico';
import {
  obterCheckInScoreParaAplicacao,
  obterCheckInSemanalDetalheParaAplicacao,
  obterCheckInSemanalDetalheDeRegistro,
  type CheckInSemanalDetalhe,
} from '@/lib/aplicacao/resolveCheckInSemanalScore';
import {
  obterMarcoZeroDetalheDeRegistro,
  obterMarcoZeroDetalheParaAplicacao,
  type MarcoZeroDetalhe,
} from '@/lib/aplicacao/resolveMarcoZeroDetalhe';
import {
  aplicarVistaDeProtocolo,
  listarProtocolosTirzepatida,
  semanaConclusaoDoProtocolo,
  semanaRelativaNoProtocolo,
  weekIndexPertenceAoProtocolo,
} from '@/utils/tirzepatidaProtocoloDisplay';
import { ProtocoloAplicacoesGrupoCard } from '@/components/metaadmin/ProtocoloAplicacoesGrupoCard';

type AbaModal = 'plano' | 'aplicacoes';
type SubpastaAplicacoes = 'tirzepatida' | 'retatrutida' | 'injetaveis';

export type TratamentoPacienteMobileModalProps = {
  open: boolean;
  paciente: PacienteCompleto | null;
  onClose: () => void;
  /** Prefer true for nutri/personal viewers (default). */
  readOnly?: boolean;
  patientPhotoUrl?: string | null;
  temFoto?: boolean;
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  onOpenFotos?: (paciente: PacienteCompleto) => void;
  medicoId?: string;
  /** Classe do shell fullscreen (ex.: bottom-16 no personal). */
  shellClassName?: string;
};

const noopSetPaciente: Dispatch<SetStateAction<PacienteCompleto | null>> = () => {};

type AplicacaoCard = {
  data: Date;
  semana: number;
  dose: number;
  localAplicacao: string;
};

function isRegistroConclusaoPorId(id: unknown): boolean {
  return (
    typeof id === 'string' &&
    (id.startsWith('seguimento-conclusao-numeracao') || id.startsWith('seguimento-conclusao-'))
  );
}

function montarAplicacoesLista(paciente: PacienteCompleto): {
  primeira: Date | null;
  conclusaoPreenchidaGlobal: boolean;
  temDepoimentoConclusao: boolean;
  grupos: { proto: ReturnType<typeof listarProtocolosTirzepatida>[number]; items: AplicacaoCard[] }[];
} {
  const pt = paciente.planoTerapeutico;
  const primeira = pt ? primeiraDoseDoPlano(pt) : null;
  const ev = paciente.evolucaoSeguimento || [];
  const conclusaoPreenchidaGlobal = ev.some((e) => isRegistroConclusaoPorId(e.id));
  const temDepoimentoConclusao = temDepoimentosAssociadosAoPlano(
    paciente.planoTerapeutico as unknown as Record<string, unknown>
  );

  const grupos = listarProtocolosTirzepatida(paciente).map((proto) => {
    const vista = aplicarVistaDeProtocolo(paciente, proto);
    const items: AplicacaoCard[] = listarAplicacoesEsquemaComConclusao(vista).filter((a) =>
      weekIndexPertenceAoProtocolo(a.semana, proto)
    );
    return { proto, items };
  });

  return {
    primeira,
    conclusaoPreenchidaGlobal,
    temDepoimentoConclusao,
    grupos,
  };
}

function cardStyleFor(
  conclusaoOkCard: boolean,
  foiAplicada: boolean,
  dataFutura: boolean
): CSSProperties {
  if (conclusaoOkCard) {
    return {
      background: 'linear-gradient(135deg, #f3e8ff 0%, #e879f9 100%)',
      border: '1px solid #c084fc',
      borderLeft: '3px solid #7c3aed',
    };
  }
  if (foiAplicada) {
    return {
      background: 'linear-gradient(135deg, #dcfce7 0%, #86efac 100%)',
      border: '1px solid #86efac',
      borderLeft: '3px solid #16a34a',
    };
  }
  if (dataFutura) {
    return {
      background: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)',
      border: '1px solid #fdba74',
      borderLeft: '3px solid #ea580c',
    };
  }
  return {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)',
    border: '1px solid #fca5a5',
    borderLeft: '3px solid #dc2626',
  };
}

export function TratamentoPacienteMobileModal({
  open,
  paciente,
  onClose,
  readOnly = true,
  patientPhotoUrl,
  temFoto = false,
  onOpenGrafico,
  onOpenFotos,
  medicoId,
  shellClassName = 'fixed inset-0 bg-white z-[70] flex flex-col overflow-hidden',
}: TratamentoPacienteMobileModalProps) {
  const [aba, setAba] = useState<AbaModal>('aplicacoes');
  const [aplicacoesSubpasta, setAplicacoesSubpasta] = useState<SubpastaAplicacoes>('tirzepatida');
  const dataAplicacaoFocoRef = useRef<{ semana: number; valor: string } | null>(null);
  const [checkInDetalhe, setCheckInDetalhe] = useState<CheckInSemanalDetalhe | null>(null);
  const [marcoZeroDetalhe, setMarcoZeroDetalhe] = useState<MarcoZeroDetalhe | null>(null);
  const [depoimentoTexto, setDepoimentoTexto] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAba('aplicacoes');
    setAplicacoesSubpasta('tirzepatida');
    setCheckInDetalhe(null);
    setMarcoZeroDetalhe(null);
    setDepoimentoTexto(null);
  }, [open, paciente?.id]);

  const tirzepatidaData = useMemo(
    () => (paciente ? montarAplicacoesLista(paciente) : null),
    [paciente]
  );

  if (!open || !paciente) return null;

  const nomePaciente =
    paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const setPacienteSafe = noopSetPaciente;

  return (
    <div className={shellClassName}>
      <PacienteModalHeader
        compact
        className="flex-shrink-0"
        patientName={nomePaciente}
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

      <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {(['plano', 'aplicacoes'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setAba(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              aba === tab
                ? 'text-blue-700 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'plano' ? 'Plano Terapêutico' : 'Aplicações'}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {aba !== 'aplicacoes' && (
          <div className="p-4">
            <MetaadminPlanoTerapeuticoEditSections
              paciente={paciente}
              setPaciente={setPacienteSafe}
              dataAplicacaoFocoRef={dataAplicacaoFocoRef}
              mode="plano"
              medicoId={medicoId}
              readOnly={readOnly}
              temFoto={temFoto}
              onOpenGrafico={onOpenGrafico}
              onOpenFotos={onOpenFotos}
            />
          </div>
        )}

        {aba === 'aplicacoes' && (
          <div className="p-4 space-y-3">
            <div
              role="tablist"
              aria-label="Subpastas das aplicações"
              className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-gray-100/90 border border-gray-200/80 shadow-inner"
            >
              {(
                [
                  { id: 'tirzepatida' as const, label: 'Tirzepatida' },
                  { id: 'retatrutida' as const, label: 'Retratutida' },
                  { id: 'injetaveis' as const, label: 'Injetáveis' },
                ] as const
              ).map((sub) => {
                const ativa = aplicacoesSubpasta === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    role="tab"
                    aria-selected={ativa}
                    onClick={() => setAplicacoesSubpasta(sub.id)}
                    className={`relative min-h-[2.75rem] flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 rounded-xl text-[11px] sm:text-sm font-bold leading-tight text-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                      ativa
                        ? 'bg-gradient-to-br from-green-600 via-green-600 to-emerald-700 text-white shadow-lg shadow-green-600/35 ring-2 ring-green-400/60 scale-[1.02] z-[1]'
                        : 'text-gray-600 bg-transparent hover:bg-white/90 hover:text-gray-900'
                    }`}
                  >
                    {ativa && (
                      <span
                        className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-white/50"
                        aria-hidden
                      />
                    )}
                    <span className={ativa ? 'drop-shadow-sm' : ''}>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {aplicacoesSubpasta === 'retatrutida' && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-b from-gray-50 to-white px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-4">
                  <Wrench className="h-7 w-7" aria-hidden />
                </div>
                <p className="text-lg font-semibold text-gray-900">Retratutida</p>
                <p className="mt-2 max-w-md text-sm text-gray-600">
                  Esta seção está em construção. Em breve você poderá acompanhar as aplicações aqui.
                </p>
              </div>
            )}

            {aplicacoesSubpasta === 'injetaveis' && (
              <MetaadminInjetaveisAplicacoesView
                paciente={paciente}
                onPacienteAtualizado={() => {}}
                variant="lista"
                allowToggle={false}
              />
            )}

            {aplicacoesSubpasta === 'tirzepatida' && tirzepatidaData && (() => {
              const {
                primeira,
                conclusaoPreenchidaGlobal,
                temDepoimentoConclusao,
                grupos,
              } = tirzepatidaData;

              if (!primeira) {
                return (
                  <p className="text-sm text-gray-600">
                    Configure o plano terapêutico na aba Plano Terapêutico.
                  </p>
                );
              }
              if (!grupos.some((g) => g.items.length > 0)) {
                return (
                  <p className="text-sm text-gray-600">Nenhuma aplicação planejada no período.</p>
                );
              }

              return (
                <div className="space-y-3 pb-4">
                  {grupos.map(({ proto, items }) => (
                    <ProtocoloAplicacoesGrupoCard
                      key={proto.indice}
                      proto={proto}
                      paciente={paciente}
                    >
                  {items.map((aplicacao, idx) => {
                    const semanaRelativa = semanaRelativaNoProtocolo(
                      aplicacao.semana,
                      proto.semanaInicioCiclo
                    );
                    const foiAplicada = aplicacaoFoiFeitaNoPaciente(paciente, aplicacao.data);
                    const dataAplicacao = new Date(aplicacao.data);
                    dataAplicacao.setHours(0, 0, 0, 0);
                    const dataFutura = dataAplicacao.getTime() > hoje.getTime();
                    const ehSemanaConclusaoCard =
                      aplicacao.semana === semanaConclusaoDoProtocolo(proto);
                    const conclusaoOkCard =
                      ehSemanaConclusaoCard &&
                      (proto.ativo
                        ? conclusaoPreenchidaGlobal
                        : Boolean(proto.conclusaoTratamento) ||
                          (paciente.evolucaoSeguimento || []).some(
                            (e) =>
                              isRegistroConclusaoPorId(e.id) &&
                              (e.weekIndex ?? 0) === aplicacao.semana
                          ));
                    const registro = obterRegistroSeguimentoDaAplicacao(paciente, aplicacao.data);
                    const checkInScorePaciente = obterCheckInScoreParaAplicacao(
                      paciente,
                      { semana: aplicacao.semana, data: aplicacao.data },
                      foiAplicada ? registro : null
                    );
                    const marcoZeroDetalhePaciente =
                      foiAplicada && registro
                        ? obterMarcoZeroDetalheParaAplicacao(
                            paciente,
                            { semana: aplicacao.semana, data: aplicacao.data },
                            registro
                          ) ?? obterMarcoZeroDetalheDeRegistro(paciente, registro)
                        : null;
                    const variacaoPeso = obterVariacaoPesoAplicacao(paciente, aplicacao.data);
                    const variacaoComp = obterVariacaoCompAplicacao(paciente, aplicacao.data);
                    const dataExibicao =
                      registro?.dataRegistro
                        ? toDateLocalEvolucao(registro.dataRegistro)
                        : registro?.doseAplicada?.data
                          ? toDateLocalEvolucao(registro.doseAplicada.data)
                          : dataAplicacao;
                    const dataExibicaoStr =
                      dataExibicao && !isNaN(dataExibicao.getTime())
                        ? dataExibicao.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '';
                    const dataAplicStr =
                      dataAplicacao.getFullYear() +
                      '-' +
                      String(dataAplicacao.getMonth() + 1).padStart(2, '0') +
                      '-' +
                      String(dataAplicacao.getDate()).padStart(2, '0');

                    const doseExibir =
                      registro?.doseAplicada?.quantidade ??
                      (aplicacao.semana > 0
                        ? obterDoseMgSemanaPaciente(paciente, aplicacao.semana)
                        : 0) ??
                      aplicacao.dose;

                    const subTitulo = ehSemanaConclusaoCard
                      ? `${dataExibicaoStr ? `Registro: ${dataExibicaoStr}` : 'Data prevista'} · Conclusão do tratamento`
                      : `${dataExibicaoStr ? `Registro: ${dataExibicaoStr}` : 'Data prevista'} · ${doseExibir} mg · ${aplicacao.localAplicacao}`;

                    const pesoDeltaLinha =
                      registro?.peso != null || variacaoPeso != null || variacaoComp != null ? (
                        <p className="text-xs text-gray-800 mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                          {registro?.peso != null && (
                            <span>
                              <span className="font-medium">Peso:</span> {registro.peso} kg
                            </span>
                          )}
                          {variacaoPeso != null && (
                            <>
                              {registro?.peso != null && <span className="text-gray-400">·</span>}
                              <span
                                className={`font-medium ${
                                  variacaoPeso <= -0.1 ? 'text-green-800' : 'text-red-800'
                                }`}
                              >
                                Δ peso {variacaoPeso > 0 ? '+' : ''}
                                {variacaoPeso.toFixed(1)} kg
                              </span>
                            </>
                          )}
                          {variacaoComp != null && (
                            <>
                              {(registro?.peso != null || variacaoPeso != null) && (
                                <span className="text-gray-400">·</span>
                              )}
                              <span
                                className={`font-medium ${
                                  variacaoComp <= -0.1 ? 'text-green-800' : 'text-red-800'
                                }`}
                              >
                                Δ cintura {variacaoComp > 0 ? '+' : ''}
                                {variacaoComp.toFixed(1)} cm
                              </span>
                            </>
                          )}
                        </p>
                      ) : null;

                    return (
                      <div
                        key={`${aplicacao.semana}-${dataAplicStr}-${idx}`}
                        className="relative rounded-lg p-2.5 shadow-sm"
                        style={cardStyleFor(conclusaoOkCard, foiAplicada, dataFutura)}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              Semana {semanaRelativa}
                              {ehSemanaConclusaoCard ? ' — Conclusão' : ''}
                            </h4>
                            <p className="text-xs text-gray-700 mt-0.5">{subTitulo}</p>
                            {pesoDeltaLinha}
                          </div>
                          {!dataFutura && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              {onOpenGrafico && (
                                <button
                                  type="button"
                                  onClick={() => onOpenGrafico(paciente)}
                                  className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 border border-blue-200 bg-white/90 transition-colors"
                                  title="Gráfico e registros do paciente"
                                  aria-label="Gráfico e registros do paciente"
                                >
                                  <BarChart3 size={14} />
                                </button>
                              )}
                              {onOpenFotos && (
                                <button
                                  type="button"
                                  onClick={() => onOpenFotos(paciente)}
                                  className={`p-1.5 rounded-md border bg-white/90 transition-colors ${
                                    temFoto
                                      ? 'text-violet-600 hover:bg-violet-50 border-violet-200'
                                      : 'text-gray-400 border-gray-200'
                                  }`}
                                  title="Registro fotográfico compartilhado"
                                  aria-label="Registro fotográfico compartilhado"
                                >
                                  <Camera size={14} />
                                </button>
                              )}
                              {ehSemanaConclusaoCard &&
                                (temDepoimentoConclusao ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const slides = listDepoimentosSlidesFromPlano(
                                        paciente.planoTerapeutico as unknown as Record<string, unknown>
                                      );
                                      const texto = slides[0]?.texto?.trim() || '';
                                      if (texto) setDepoimentoTexto(texto);
                                    }}
                                    className="p-1.5 rounded-md text-pink-600 bg-white/90 border border-pink-200 hover:bg-pink-50 transition-colors"
                                    title="Ver depoimento do paciente"
                                    aria-label="Ver depoimento do paciente"
                                  >
                                    <Quote size={14} />
                                  </button>
                                ) : (
                                  <span
                                    className="p-1.5 rounded-md text-gray-400 bg-white/90 border border-gray-200"
                                    title="Sem depoimento preenchido"
                                    aria-label="Sem depoimento preenchido"
                                  >
                                    <Quote size={14} />
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                        {!dataFutura &&
                          (marcoZeroDetalhePaciente != null ? (
                            <button
                              type="button"
                              onClick={() => setMarcoZeroDetalhe(marcoZeroDetalhePaciente)}
                              className="mt-1.5 h-7 w-full rounded-md overflow-hidden shadow-sm cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400/80 bg-amber-50 ring-1 ring-amber-200/80 flex items-center justify-center gap-1.5"
                              title="Marco Zero do tratamento — toque para ver detalhes"
                              aria-label="Ver Marco Zero do tratamento"
                            >
                              <span className="text-sm leading-none" aria-hidden>
                                🎯
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-900">
                                Marco Zero
                              </span>
                            </button>
                          ) : (
                            checkInScorePaciente != null &&
                            !ehSemanaConclusaoCard && (
                              <button
                                type="button"
                                onClick={() => {
                                  const detalhe =
                                    obterCheckInSemanalDetalheParaAplicacao(
                                      paciente,
                                      { semana: aplicacao.semana, data: aplicacao.data },
                                      registro
                                    ) ||
                                    (registro
                                      ? obterCheckInSemanalDetalheDeRegistro(paciente, registro)
                                      : null);
                                  if (detalhe) setCheckInDetalhe(detalhe);
                                }}
                                className="mt-1.5 h-7 w-full rounded-md overflow-hidden shadow-sm cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-400/80 bg-white/90 ring-1 ring-black/5"
                                title={`Check-in semanal: ${checkInScorePaciente} pontos — toque para ver detalhes`}
                                aria-label={`Ver check-in semanal: ${checkInScorePaciente} pontos`}
                              >
                                <ScoreProgressBar percent={checkInScorePaciente} />
                              </button>
                            )
                          ))}
                      </div>
                    );
                  })}
                    </ProtocoloAplicacoesGrupoCard>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {checkInDetalhe && (
        <CheckInSemanalDetalheModal
          open
          onClose={() => setCheckInDetalhe(null)}
          pacienteNome={nomePaciente}
          detalhe={checkInDetalhe}
          onOpenGrafico={
            onOpenGrafico
              ? () => {
                  setCheckInDetalhe(null);
                  onOpenGrafico(paciente);
                }
              : undefined
          }
        />
      )}

      {marcoZeroDetalhe && (
        <MarcoZeroDetalheModal
          open
          onClose={() => setMarcoZeroDetalhe(null)}
          pacienteNome={nomePaciente}
          detalhe={marcoZeroDetalhe}
          onOpenGrafico={
            onOpenGrafico
              ? () => {
                  setMarcoZeroDetalhe(null);
                  onOpenGrafico(paciente);
                }
              : undefined
          }
        />
      )}

      {depoimentoTexto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDepoimentoTexto(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="depoimento-ro-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h4 id="depoimento-ro-title" className="text-base font-semibold text-gray-900">
                Depoimento do paciente
              </h4>
              <button
                type="button"
                onClick={() => setDepoimentoTexto(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{depoimentoTexto}</p>
          </div>
        </div>
      )}
    </div>
  );
}
