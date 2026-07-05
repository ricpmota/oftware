'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Save, X } from 'lucide-react';
import NegociacaoAuditoriaPanel from '@/components/metaadmin/mesaNegociacao/NegociacaoAuditoriaPanel';
import PlanoPersonalizadoCard from '@/components/metaadmin/mesaNegociacao/PlanoPersonalizadoCard';
import PlanoPersonalizadoEditor from '@/components/metaadmin/mesaNegociacao/PlanoPersonalizadoEditor';
import PlanoTerapeuticoGraficoPrevisto from '@/components/planoTerapeutico/PlanoTerapeuticoGraficoPrevisto';
import { configuracaoComercialFromPlanoSalvo, formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import {
  doseMensalInicial,
  type RitmoEscalonamentoId,
} from '@/lib/planoTerapeutico/modalidadesPlano';
import {
  calcularPesoAlvo,
  montarResumoDinamico,
  metaInicialDoPlano,
} from '@/lib/planoTerapeutico/planoTerapeuticoPlanoUi';
import {
  montarDadosGraficoTratamento,
  montarMarcosClinicosGrafico,
} from '@/lib/treatment-designer/graficoPlano';
import {
  criarEstadoNegociacaoInicial,
  duplicarPlanoBaseParaPersonalizado,
  aplicarModoRecalculo,
  salvarPropostaMedico,
  iniciarPlanoPersonalizado,
  recalcularPlanoNegociado,
  registrarVersaoMedico,
  salvarNegociacaoSessao,
  carregarNegociacaoSessao,
  prepararParametrosNegociado,
  STATUS_NEGOCIACAO_LABELS,
  type NegociacaoTerapeuticaState,
  type ParametrosPlanoPersonalizadoEditavel,
} from '@/lib/treatment-negotiation';
import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';
import { auth } from '@/lib/firebase';

type Props = {
  open: boolean;
  onClose: () => void;
  plano: PlanoTerapeuticoInterativoDocumento;
  pesoAtual: number | null;
  onPropostaEnviada?: (mensagem: string) => void;
  onAbrirPaginaPaciente?: () => void;
  onPlanoAtualizado?: (plano: PlanoTerapeuticoInterativoDocumento) => void;
};

export default function MesaNegociacaoTerapeuticaPanel({
  open,
  onClose,
  plano,
  pesoAtual,
  onPropostaEnviada,
  onAbrirPaginaPaciente,
  onPlanoAtualizado,
}: Props) {
  const [negociacao, setNegociacao] = useState<NegociacaoTerapeuticaState>(
    criarEstadoNegociacaoInicial
  );
  const [enviando, setEnviando] = useState(false);
  const [feedbackEnvio, setFeedbackEnvio] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const propostaSalva =
    negociacao.status === 'PROPOSTA_MEDICO' ||
    negociacao.status === 'EM_NEGOCIACAO' ||
    plano.negociacaoTerapeutica?.status === 'PROPOSTA_MEDICO' ||
    plano.negociacaoTerapeutica?.status === 'EM_NEGOCIACAO';

  const configuracaoComercial = useMemo(
    () => configuracaoComercialFromPlanoSalvo(plano.configuracaoComercialUsada),
    [plano.configuracaoComercialUsada]
  );

  const resolverInput = useMemo(
    () => ({
      cenariosLegados: plano.cenarios,
      mesesPrazo: plano.cenarios.equilibrado.estimativa.duracaoMeses,
      metaKgSlider: metaInicialDoPlano(plano.metaKg),
      metaKgOriginal: plano.metaKg,
      pesoAtual,
      configuracaoComercial,
      doseMensalMg: doseMensalInicial(configuracaoComercial),
      ritmoEscalonamento: 'lento' as RitmoEscalonamentoId,
      metaPercentual: plano.metaPercentual,
      descontoManual: plano.descontoManual ?? 0,
    }),
    [plano, pesoAtual, configuracaoComercial]
  );

  useEffect(() => {
    if (!open) {
      setFeedbackEnvio(null);
      setErroEnvio(null);
      return;
    }

    const salva = carregarNegociacaoSessao(plano.id);
    if (plano.negociacaoTerapeutica?.parametros) {
      const n = plano.negociacaoTerapeutica;
      setNegociacao({
        status: n.status,
        versaoAtual: 1,
        parametros: n.parametros,
        versoes: [],
      });
      if (n.status === 'PROPOSTA_MEDICO' || n.status === 'EM_NEGOCIACAO') {
        setFeedbackEnvio('Proposta salva. O paciente pode visualizar na aba Plano Personalizado.');
      }
      return;
    }
    if (salva?.parametros) {
      setNegociacao({
        status: salva.status ?? 'RASCUNHO',
        versaoAtual: 1,
        parametros: salva.parametros,
        versoes: [],
      });
      if (salva.status === 'PROPOSTA_MEDICO' || salva.status === 'EM_NEGOCIACAO') {
        setFeedbackEnvio('Proposta salva. O paciente pode visualizar na aba Plano Personalizado.');
      }
      return;
    }

    setNegociacao((prev) => {
      if (prev.parametros) return prev;
      let parametros = duplicarPlanoBaseParaPersonalizado({
        ...resolverInput,
        modalidadeBase: 'mensal',
        pesoAtualKg: pesoAtual,
      });
      parametros = {
        ...parametros,
        mesesPrazo: 1,
        semanasPrazo: 4,
        modoEditor: 'editar_tudo',
        investimento: {
          ...parametros.investimento,
          valorPorMg: configuracaoComercial.valorPorMg,
        },
      };
      parametros = prepararParametrosNegociado(parametros, configuracaoComercial);
      const calculado = recalcularPlanoNegociado({
        parametros,
        configuracaoComercial,
        pesoAtual,
        metaPercentual: plano.metaPercentual,
      });
      return iniciarPlanoPersonalizado(parametros, calculado);
    });
  }, [open, plano.id, plano.metaPercentual, plano.negociacaoTerapeutica, resolverInput, pesoAtual, configuracaoComercial]);

  const planoCalculado = useMemo(() => {
    if (!negociacao.parametros) return null;
    return recalcularPlanoNegociado({
      parametros: negociacao.parametros,
      configuracaoComercial,
      pesoAtual,
      metaPercentual: plano.metaPercentual,
    });
  }, [negociacao.parametros, configuracaoComercial, pesoAtual, plano.metaPercentual]);

  const pesoAlvoGrafico = useMemo(() => {
    if (negociacao.parametros?.pesoAlvoKg != null) {
      return negociacao.parametros.pesoAlvoKg;
    }
    if (pesoAtual == null || !planoCalculado) return null;
    return calcularPesoAlvo(pesoAtual, planoCalculado.perdaPrevistaKg);
  }, [negociacao.parametros?.pesoAlvoKg, pesoAtual, planoCalculado]);

  const dadosGrafico = useMemo(
    () =>
      planoCalculado && pesoAlvoGrafico != null
        ? montarDadosGraficoTratamento(planoCalculado, pesoAlvoGrafico)
        : null,
    [planoCalculado, pesoAlvoGrafico]
  );

  const marcosGrafico = useMemo(() => {
    if (!planoCalculado || pesoAtual == null || pesoAtual <= 0) return [];
    const ritmo = negociacao.parametros?.ritmoEscalonamento ?? 'lento';
    return montarMarcosClinicosGrafico(
      planoCalculado.marcosClinicos,
      pesoAtual,
      ritmo
    ).filter((marco) => marco.semana <= planoCalculado.estimativa.duracaoSemanas);
  }, [planoCalculado, pesoAtual, negociacao.parametros?.ritmoEscalonamento]);

  const resumo = useMemo(
    () => (planoCalculado ? montarResumoDinamico(planoCalculado) : null),
    [planoCalculado]
  );

  const handleParametrosChange = useCallback(
    (parametros: ParametrosPlanoPersonalizadoEditavel) => {
      const sincronizado = prepararParametrosNegociado(parametros, configuracaoComercial);
      const calculado = recalcularPlanoNegociado({
        parametros: sincronizado,
        configuracaoComercial,
        pesoAtual,
        metaPercentual: plano.metaPercentual,
      });
      setNegociacao((prev) => registrarVersaoMedico(prev, sincronizado, calculado));
    },
    [configuracaoComercial, pesoAtual, plano.metaPercentual]
  );

  const handleRecalcular = useCallback(
    (modo: 'automatico' | 'manter_manuais') => {
      if (!negociacao.parametros) return;
      const parametros = prepararParametrosNegociado(
        { ...negociacao.parametros, modoRecalculo: modo },
        configuracaoComercial
      );
      const calculado = recalcularPlanoNegociado({
        parametros,
        configuracaoComercial,
        pesoAtual,
        metaPercentual: plano.metaPercentual,
      });
      setNegociacao((prev) => aplicarModoRecalculo(prev, modo, parametros, calculado));
    },
    [negociacao.parametros, configuracaoComercial, pesoAtual, plano.metaPercentual]
  );

  const handleSalvarProposta = useCallback(async () => {
    if (!negociacao.parametros || !planoCalculado) return;

    const user = auth.currentUser;
    if (!user) {
      setErroEnvio('Faça login novamente para salvar a proposta.');
      return;
    }

    setEnviando(true);
    setErroEnvio(null);
    try {
      const token = await user.getIdToken();
      const novoEstado = salvarPropostaMedico(negociacao, planoCalculado);
      const parametrosSalvos = prepararParametrosNegociado(
        negociacao.parametros,
        configuracaoComercial
      );
      const negociacaoSalva = {
        status: 'PROPOSTA_MEDICO' as const,
        enviadaEm: plano.negociacaoTerapeutica?.enviadaEm ?? new Date().toISOString(),
        nomePlano: parametrosSalvos.nomePlano,
        descricaoCurta: parametrosSalvos.descricaoCurta,
        parametros: parametrosSalvos,
        mensagemPaciente: plano.negociacaoTerapeutica?.mensagemPaciente,
        vistaProposta: plano.negociacaoTerapeutica?.vistaProposta ?? ('medico' as const),
      };

      const res = await fetch('/api/metaadmin/plano-terapeutico/negociacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId: plano.pacienteId,
          orcamentoId: plano.id,
          negociacao: negociacaoSalva,
          valorTotal: planoCalculado.valorTotal,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Não foi possível salvar a proposta.');
      }

      setNegociacao(novoEstado);
      salvarNegociacaoSessao(plano.id, novoEstado);
      if (json.plano) {
        onPlanoAtualizado?.(json.plano as PlanoTerapeuticoInterativoDocumento);
      }

      const mensagem =
        'Proposta salva. O paciente verá o plano na aba Plano Personalizado e poderá assinar.';
      setFeedbackEnvio(mensagem);
      onPropostaEnviada?.(mensagem);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Falha ao salvar proposta. Tente novamente.';
      setErroEnvio(msg);
      setFeedbackEnvio(null);
    } finally {
      setEnviando(false);
    }
  }, [
    negociacao,
    planoCalculado,
    plano.id,
    plano.pacienteId,
    plano.negociacaoTerapeutica,
    configuracaoComercial,
    onPropostaEnviada,
    onPlanoAtualizado,
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden md:items-center md:justify-center md:bg-black/55 md:backdrop-blur-sm md:p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[94vh] md:max-w-5xl md:rounded-2xl shadow-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden border-0 md:border md:border-slate-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mesa-negociacao-titulo"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Mesa de Negociação Terapêutica
              </p>
              <h2 id="mesa-negociacao-titulo" className="text-base sm:text-lg font-semibold text-slate-900">
                Plano Personalizado
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Base mensal — ajuste prazo, doses e investimento conforme a negociação.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Fechar mesa de negociação"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
            {(feedbackEnvio || propostaSalva) && !erroEnvio && (
              <div
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-wrap items-start justify-between gap-3"
                role="status"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      {STATUS_NEGOCIACAO_LABELS.PROPOSTA_MEDICO}
                    </p>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      {feedbackEnvio ??
                        'O paciente pode visualizar e assinar na aba Plano Personalizado.'}
                    </p>
                  </div>
                </div>
                {onAbrirPaginaPaciente && (
                  <button
                    type="button"
                    onClick={onAbrirPaginaPaciente}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-900 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-100 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir página do paciente
                  </button>
                )}
              </div>
            )}

            {erroEnvio && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {erroEnvio}
              </div>
            )}

            {negociacao.parametros && planoCalculado && (
              <>
                <PlanoPersonalizadoCard
                  plano={planoCalculado}
                  status={negociacao.status}
                  versaoAtual={negociacao.versaoAtual}
                  nomePlano={negociacao.parametros.nomePlano}
                  descricaoCurta={negociacao.parametros.descricaoCurta}
                />

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Editar plano personalizado
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRecalcular('automatico')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Recalcular automaticamente
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecalcular('manter_manuais')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                      >
                        Manter valores manuais
                      </button>
                    </div>
                </div>
                <PlanoPersonalizadoEditor
                  parametros={negociacao.parametros}
                  configuracaoComercial={configuracaoComercial}
                  onChange={handleParametrosChange}
                />
                </section>

                {resumo && (
                  <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      Resumo dinâmico
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
                      <span>
                      Prazo:{' '}
                      <strong>
                        {resumo.prazoMeses} {resumo.prazoMeses === 1 ? 'mês' : 'meses'}
                      </strong>{' '}
                      ({planoCalculado.estimativa.duracaoSemanas} semanas)
                    </span>
                      <span>
                        Dose total: <strong>{resumo.doseTotalMg} mg</strong>
                      </span>
                      <span>
                        Aplicações: <strong>{resumo.aplicacoes}</strong>
                      </span>
                      <span>
                        Consultas: <strong>{resumo.consultas}</strong>
                      </span>
                    </div>
                  </section>
                )}

                {dadosGrafico && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">
                      Estimativa de evolução
                    </h3>
                    <PlanoTerapeuticoGraficoPrevisto
                      dados={dadosGrafico}
                      chartId={`mesa-${plano.id}`}
                      rotuloLinhaAlvo="Meta do plano personalizado"
                      marcosClinicos={marcosGrafico}
                      fases={planoCalculado.fases}
                    />
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Investimento</h3>
                  <p className="text-2xl font-semibold text-slate-900 mt-2 tabular-nums">
                    {formatarMoedaBRL(planoCalculado.valorTotal)}
                  </p>
                  {negociacao.parametros.descontoManual > 0 && (
                    <p className="text-xs text-teal-700 mt-1">
                      Inclui desconto manual de{' '}
                      {formatarMoedaBRL(negociacao.parametros.descontoManual)}
                    </p>
                  )}
                </section>

              <NegociacaoAuditoriaPanel
                  versoes={negociacao.versoes}
                  versaoAtual={negociacao.versaoAtual}
                />
              </>
            )}
          </div>

          {negociacao.parametros && (
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-slate-200 bg-white/95 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSalvarProposta}
                disabled={enviando || !planoCalculado}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:cursor-not-allowed ${
                  propostaSalva
                    ? 'text-amber-950 bg-amber-100 border border-amber-300 hover:bg-amber-200 disabled:opacity-50'
                    : 'text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
                }`}
              >
                {enviando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : propostaSalva ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {enviando ? 'Salvando…' : propostaSalva ? 'Atualizar proposta' : 'Salvar proposta'}
              </button>
            </div>
          )}
        </div>
      </div>
  );
}
