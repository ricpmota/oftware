'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, FileText, BarChart3, Edit, Trash2, Syringe, Weight, Ruler, Scale, Calendar } from 'lucide-react';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { primeiraDoseDoPlano, dataGradeSemanal } from '@/utils/datasAplicacaoSemanaPlano';
import { obterDoseMgSemanaPaciente } from '@/utils/esquemaDosesSemana';
import { EvolucaoTratamentoChart, type EvolucaoTratamentoPonto } from '@/components/EvolucaoTratamentoChart';
import { buildDepoimentoResultadoFromPaciente } from '@/utils/buildDepoimentoResultadoFromPaciente';
import {
  BotaoCompartilharResultadoTratamento,
  ModalResultadoTratamento,
} from '@/components/paciente/ModalResultadoTratamento';
import { ProtocoloGraficoBadge } from '@/components/paciente/ProtocoloGraficoBadge';
import {
  aplicarVistaDeProtocolo,
  listarProtocolosTirzepatida,
  protocoloPorIndice,
  semanaRelativaNoProtocolo,
} from '@/utils/tirzepatidaProtocoloDisplay';

type GraficoModalTipo = 'peso' | 'compAbdominal';
type FiltroListaAplicacoes = 'aplicadas' | 'todas';

const badgeRegistro =
  'inline-flex max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold leading-none tabular-nums text-gray-800 ring-1 ring-black/[0.06] dark:bg-gray-900/70 dark:text-gray-100 dark:ring-white/10';

function formatarDataRegistro(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export interface ModalGraficoERegistrosPacienteProps {
  open: boolean;
  paciente: PacienteCompleto | null;
  onClose: () => void;
  isMobile?: boolean;
  onPacienteUpdated?: (paciente: PacienteCompleto) => void;
  allowEditDelete?: boolean;
  onEditRegistro?: (paciente: PacienteCompleto, registro: any) => void;
  onFeedback?: (message: string) => void;
  /** Se informado, substitui o modal padrão "Resultado do tratamento". */
  onShare?: () => void;
  /** Estrelas do depoimento (opcional; padrão 0). */
  estrelasDepoimento?: number;
  /** Aba inicial do gráfico ao abrir o modal. */
  initialGraficoTipo?: GraficoModalTipo;
}

type ItemEvolucaoGrafico = {
  registro?: any;
  weekIndex: number;
  semanaRelativa: number;
  dataPrevista: Date;
  foiAplicado: boolean;
};

function toDate(v: any): Date | null {
  if (v instanceof Date) return v;
  if (v?.toDate) return v.toDate();
  if (v) return new Date(v);
  return null;
}

function ehSemanaConclusaoStr(s: string | undefined): boolean {
  return !!(s && s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('semana de conclusao'));
}

function weekIndexOf(r: { weekIndex?: number; numeroSemana?: number } | null | undefined): number {
  return r?.weekIndex ?? r?.numeroSemana ?? 0;
}

function circunferenciaDoRegistro(registro: { circunferenciaAbdominal?: unknown } | null | undefined): number | null {
  const valor = registro?.circunferenciaAbdominal;
  return typeof valor === 'number' && valor > 0 ? valor : null;
}

/** Mesma série do histograma de peso, com a circunferência de cada semana e da conclusão. */
function serieCircunferencia(
  evolucao: EvolucaoTratamentoPonto[],
  semanas: ItemEvolucaoGrafico[],
  conclusaoCm: number | null
): EvolucaoTratamentoPonto[] {
  const porSemana = new Map(semanas.map((semana) => [semana.semanaRelativa, circunferenciaDoRegistro(semana.registro)]));
  const serie = evolucao.map((ponto) => ({
    ...ponto,
    circunferenciaCm: ponto.isConclusao ? conclusaoCm : porSemana.get(ponto.weekIndex) ?? null,
  }));
  const ultimo = serie[serie.length - 1];
  if (ultimo && !ultimo.isConclusao && conclusaoCm != null && conclusaoCm > 0) {
    serie.push({
      weekIndex: ultimo.weekIndex + 1,
      peso: null,
      doseMg: 0,
      foiAplicado: false,
      isConclusao: true,
      circunferenciaCm: conclusaoCm,
    });
  }
  return serie;
}

function indiceProtocoloAtual(paciente: PacienteCompleto | null): number {
  const lista = paciente ? listarProtocolosTirzepatida(paciente) : [];
  return lista.find((p) => p.ativo)?.indice ?? lista[lista.length - 1]?.indice ?? 1;
}

export function ModalGraficoERegistrosPaciente({
  open,
  paciente,
  onClose,
  isMobile = false,
  onPacienteUpdated,
  allowEditDelete = false,
  onEditRegistro,
  onFeedback,
  onShare,
  estrelasDepoimento = 0,
  initialGraficoTipo = 'peso',
}: ModalGraficoERegistrosPacienteProps) {
  const [graficoModalTipo, setGraficoModalTipo] = useState<GraficoModalTipo>('peso');
  const [filtroListaAplicacoes, setFiltroListaAplicacoes] = useState<FiltroListaAplicacoes>('aplicadas');
  const [pacienteLocal, setPacienteLocal] = useState<PacienteCompleto | null>(paciente);
  const [deleting, setDeleting] = useState(false);
  const [showResultadoTratamento, setShowResultadoTratamento] = useState(false);
  const [protocoloIndice, setProtocoloIndice] = useState(1);
  const [showProtocoloMenu, setShowProtocoloMenu] = useState(false);

  useEffect(() => {
    setPacienteLocal(paciente);
  }, [paciente]);

  useEffect(() => {
    if (!open || !paciente) return;
    setGraficoModalTipo(initialGraficoTipo);
    setShowResultadoTratamento(false);
    setShowProtocoloMenu(false);
    setProtocoloIndice(indiceProtocoloAtual(paciente));
    // Só ao abrir ou trocar de paciente — não resetar o seletor a cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paciente?.id cobre a troca
  }, [open, paciente?.id, initialGraficoTipo]);

  const handleClose = useCallback(() => {
    setShowResultadoTratamento(false);
    setShowProtocoloMenu(false);
    onClose();
  }, [onClose]);

  const handleCompartilhar = useCallback(() => {
    if (onShare) {
      onShare();
      return;
    }
    setShowResultadoTratamento(true);
  }, [onShare]);

  const resultadoTratamentoData = useMemo(() => {
    if (!pacienteLocal) return null;
    return buildDepoimentoResultadoFromPaciente(pacienteLocal, estrelasDepoimento ?? 0, '', {
      protocoloIndice,
    });
  }, [pacienteLocal, estrelasDepoimento, protocoloIndice]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose]
  );

  const handleRelatorio = useCallback(async () => {
    if (!pacienteLocal?.id) return;
    try {
      const res = await fetch(`/api/relatorio-paciente/link?pacienteId=${encodeURIComponent(pacienteLocal.id)}`);
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        onFeedback?.('Não foi possível abrir o relatório.');
      }
    } catch {
      onFeedback?.('Erro ao obter link do relatório.');
    }
  }, [pacienteLocal?.id, onFeedback]);

  const handleDeleteRegistro = useCallback(
    async (registro: any) => {
      if (!allowEditDelete || !pacienteLocal?.id) return;
      if (!confirm('Tem certeza que deseja excluir este registro?')) return;
      setDeleting(true);
      try {
        const evolucaoAtualizada = (pacienteLocal.evolucaoSeguimento || []).filter(
          (e) => e !== registro && e.id !== registro?.id
        );
        const pacienteAtualizado: PacienteCompleto = {
          ...pacienteLocal,
          evolucaoSeguimento: evolucaoAtualizada,
        };
        await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
        const recarregado = await PacienteService.getPacienteById(pacienteLocal.id);
        const updated = recarregado || pacienteAtualizado;
        setPacienteLocal(updated);
        onPacienteUpdated?.(updated);
        onFeedback?.('Registro excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
        onFeedback?.('Erro ao excluir registro');
      } finally {
        setDeleting(false);
      }
    },
    [allowEditDelete, pacienteLocal, onPacienteUpdated, onFeedback]
  );

  const protocolos = useMemo(
    () => (pacienteLocal ? listarProtocolosTirzepatida(pacienteLocal) : []),
    [pacienteLocal]
  );

  const chartData = useMemo(() => {
    if (!pacienteLocal) return null;

    const proto = protocoloPorIndice(pacienteLocal, protocoloIndice);
    const pacienteVista = aplicarVistaDeProtocolo(pacienteLocal, proto);
    const evolucaoBruto = (pacienteLocal.evolucaoSeguimento || [])
      .slice()
      .sort((a: any, b: any) => weekIndexOf(a) - weekIndexOf(b));

    const planoTerapeutico = pacienteVista.planoTerapeutico;
    const numeroSemanas = Number(proto.numeroSemanasTratamento) || 18;
    const semanasCanceladas = proto.semanasCanceladas || [];
    const pdGrafico = planoTerapeutico ? primeiraDoseDoPlano(planoTerapeutico) : null;
    const inicioGrafico = proto.semanaInicioCiclo;
    const fimGrafico = inicioGrafico + numeroSemanas - 1;

    const evolucao: ItemEvolucaoGrafico[] = [];
    if (pdGrafico) {
      const primeiraDose = new Date(pdGrafico);
      primeiraDose.setHours(0, 0, 0, 0);
      for (let semana = inicioGrafico; semana <= fimGrafico; semana++) {
        if (semanasCanceladas.includes(semana)) continue;
        const weekStart = dataGradeSemanal(primeiraDose, semana, inicioGrafico);
        const registro = evolucaoBruto.find((r: any) => weekIndexOf(r) === semana);
        const ehPerdida = registro?.adherence === 'MISSED' || registro?.adesao === 'esquecida';
        const foiAplicado = !ehPerdida && !!(registro?.doseAplicada?.quantidade && registro.doseAplicada.quantidade > 0);
        evolucao.push({
          registro: registro || null,
          weekIndex: semana,
          semanaRelativa: semanaRelativaNoProtocolo(semana, inicioGrafico),
          dataPrevista: weekStart,
          foiAplicado,
        });
      }
    } else {
      evolucaoBruto.forEach((registro: any, idx: number) => {
        const w = weekIndexOf(registro) || idx + 1;
        if (w < inicioGrafico || w > fimGrafico) return;
        const ehPerdida = registro?.adherence === 'MISSED' || registro?.adesao === 'esquecida';
        const foiAplicado = !ehPerdida && !!(registro?.doseAplicada?.quantidade && registro.doseAplicada.quantidade > 0);
        const weekStart = registro.dataRegistro
          ? (registro.dataRegistro?.toDate ? registro.dataRegistro.toDate() : new Date(registro.dataRegistro))
          : new Date();
        evolucao.push({
          registro,
          weekIndex: w,
          semanaRelativa: semanaRelativaNoProtocolo(w, inicioGrafico),
          dataPrevista: weekStart,
          foiAplicado,
        });
      });
    }

    const registrosDoCiclo = evolucaoBruto.filter((r: any) => {
      const w = weekIndexOf(r);
      return w >= inicioGrafico && w <= fimGrafico;
    });
    const registrosComPeso = registrosDoCiclo.filter((r: any) => r.peso != null && r.peso > 0);
    const pesoSemana1 = registrosComPeso.find((r: any) => weekIndexOf(r) === inicioGrafico)?.peso;
    const pesoUltimaSemana = registrosComPeso.length > 0 ? registrosComPeso[registrosComPeso.length - 1].peso : null;
    const perdaTotal = pesoSemana1 != null && pesoUltimaSemana != null ? pesoSemana1 - pesoUltimaSemana : 0;

    const registrosComComp = registrosDoCiclo.filter(
      (r: any) => r.circunferenciaAbdominal != null && r.circunferenciaAbdominal > 0
    );
    const compInicial =
      registrosComComp.find((r: any) => weekIndexOf(r) === inicioGrafico)?.circunferenciaAbdominal ??
      (proto.ativo ? pacienteLocal.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal : undefined);
    const conclusaoCircRaw = proto.conclusaoTratamento?.circunferenciaAbdominalFinalCm;
    const conclusaoCirc =
      typeof conclusaoCircRaw === 'number' && conclusaoCircRaw > 0 ? conclusaoCircRaw : null;
    const compUltimaSemana =
      conclusaoCirc ??
      (registrosComComp.length > 0 ? registrosComComp[registrosComComp.length - 1].circunferenciaAbdominal : null);
    const reducaoTotalComp = compInicial != null && compUltimaSemana != null ? compInicial - compUltimaSemana : 0;

    const evolucaoAplicados = evolucao.filter((e) => e.foiAplicado);

    return {
      proto,
      pacienteVista,
      evolucao,
      evolucaoAplicados,
      perdaTotal,
      reducaoTotalComp,
      conclusaoCirc,
      temComp: registrosComComp.length > 0 || conclusaoCirc != null,
    };
  }, [pacienteLocal, protocoloIndice]);

  if (!open || !pacienteLocal || !chartData) return null;

  const {
    pacienteVista,
    evolucao,
    evolucaoAplicados,
    perdaTotal,
    reducaoTotalComp,
    conclusaoCirc,
    temComp,
  } = chartData;

  const nomePaciente = pacienteLocal.dadosIdentificacao?.nomeCompleto || pacienteLocal.nome;
  const listaExibir = [...(filtroListaAplicacoes === 'aplicadas' ? evolucaoAplicados : evolucao)].reverse();
  const serieComp =
    resultadoTratamentoData == null
      ? []
      : serieCircunferencia(resultadoTratamentoData.evolucao, evolucao, conclusaoCirc);
  const mostrarSeletorProtocolo = protocolos.length > 1;

  return (
    <>
    <div
      className="fixed inset-0 z-[9999] flex h-[100dvh] flex-col bg-black/50 lg:items-center lg:justify-center lg:p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-gray-900 lg:h-auto lg:max-h-[90vh] lg:max-w-4xl lg:flex-initial lg:rounded-2xl lg:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate min-w-0 mr-2">
            {nomePaciente}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleRelatorio}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Abrir relatório final do paciente (mesmo enviado por e-mail na Conclusão do Tratamento)"
            >
              <FileText size={18} />
              Relatório
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <BotaoCompartilharResultadoTratamento onClick={handleCompartilhar} />
            <div
              role="switch"
              aria-checked={graficoModalTipo === 'compAbdominal'}
              className="relative inline-flex h-9 w-[220px] cursor-pointer select-none rounded-full bg-gray-200 dark:bg-gray-600 p-1 shadow-inner"
              onClick={() => setGraficoModalTipo(graficoModalTipo === 'peso' ? 'compAbdominal' : 'peso')}
            >
              <div
                className="absolute top-1 h-7 w-[calc(50%-4px)] rounded-full bg-blue-600 dark:bg-blue-500 shadow-md transition-[left] duration-200 ease-out"
                style={{ left: graficoModalTipo === 'peso' ? '4px' : 'calc(50% + 2px)' }}
              />
              <span
                className={`relative z-10 flex flex-1 items-center justify-center text-xs font-semibold transition-colors duration-200 ${
                  graficoModalTipo === 'peso' ? 'text-white' : 'text-gray-500 dark:text-gray-500'
                }`}
              >
                Peso
              </span>
              <span
                className={`relative z-10 flex flex-1 items-center justify-center text-xs font-semibold transition-colors duration-200 ${
                  graficoModalTipo === 'compAbdominal' ? 'text-white' : 'text-gray-500 dark:text-gray-500'
                }`}
              >
                Comp. Abdominal
              </span>
            </div>
          </div>

          <div className="relative -mx-3 sm:-mx-5 lg:mx-0">
            {mostrarSeletorProtocolo ? (
              <ProtocoloGraficoBadge
                protocolos={protocolos}
                protocoloIndice={protocoloIndice}
                menuAberto={showProtocoloMenu}
                onToggle={() => setShowProtocoloMenu((v) => !v)}
                onSelect={(indice) => {
                  setProtocoloIndice(indice);
                  setShowProtocoloMenu(false);
                }}
              />
            ) : null}

          {graficoModalTipo === 'peso' ? (
            resultadoTratamentoData && resultadoTratamentoData.evolucao.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-0 py-3 dark:border-gray-700 dark:bg-gray-800 lg:p-4">
                <h3
                  className={`mb-3 px-2 text-sm font-semibold text-slate-800 dark:text-white lg:px-0 ${
                    mostrarSeletorProtocolo ? 'pr-28' : ''
                  }`}
                >
                  Perda de peso total: {perdaTotal.toFixed(1)} kg
                </h3>
                <div className="rounded-xl border border-slate-100 bg-white px-0 py-1 dark:border-gray-700 dark:bg-gray-900/40 lg:p-3">
                  <EvolucaoTratamentoChart
                    evolucao={resultadoTratamentoData.evolucao}
                    pacienteId={pacienteLocal.id}
                    hideTitle
                    compact={isMobile}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum registro com peso neste protocolo.</p>
              </div>
            )
          ) : temComp && serieComp.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-0 py-3 dark:border-gray-700 dark:bg-gray-800 lg:p-4">
              <h3
                className={`mb-3 px-2 text-sm font-semibold text-slate-800 dark:text-white lg:px-0 ${
                  mostrarSeletorProtocolo ? 'pr-28' : ''
                }`}
              >
                Redução comp. abdominal total: {reducaoTotalComp.toFixed(1)} cm
              </h3>
              <div className="rounded-xl border border-slate-100 bg-white px-0 py-1 dark:border-gray-700 dark:bg-gray-900/40 lg:p-3">
                <EvolucaoTratamentoChart
                  evolucao={serieComp}
                  pacienteId={pacienteLocal.id}
                  metrica="circunferencia"
                  hideTitle
                  compact={isMobile}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhum registro com comprimento abdominal neste protocolo.
              </p>
            </div>
          )}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Registros de aplicação</h3>
              <div
                role="switch"
                aria-checked={filtroListaAplicacoes === 'todas'}
                className="relative inline-flex h-9 w-[140px] cursor-pointer select-none rounded-full bg-gray-200 dark:bg-gray-600 p-1 shadow-inner"
                onClick={() =>
                  setFiltroListaAplicacoes(filtroListaAplicacoes === 'aplicadas' ? 'todas' : 'aplicadas')
                }
              >
                <div
                  className="absolute top-1 h-7 w-[calc(50%-4px)] rounded-full bg-green-600 dark:bg-green-500 shadow-md transition-[left] duration-200 ease-out"
                  style={{ left: filtroListaAplicacoes === 'aplicadas' ? '4px' : 'calc(50% + 2px)' }}
                />
                <span
                  className={`relative z-10 flex flex-1 items-center justify-center text-xs font-semibold transition-colors duration-200 ${
                    filtroListaAplicacoes === 'aplicadas' ? 'text-white' : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  Aplicadas
                </span>
                <span
                  className={`relative z-10 flex flex-1 items-center justify-center text-xs font-semibold transition-colors duration-200 ${
                    filtroListaAplicacoes === 'todas' ? 'text-white' : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  Todas
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {listaExibir.map((item) => {
                const { registro, weekIndex, semanaRelativa, dataPrevista, foiAplicado } = item;
                const idxAplicados = evolucaoAplicados.findIndex((e) => e.weekIndex === weekIndex);
                const anterior =
                  foiAplicado && registro?.peso != null && idxAplicados > 0
                    ? evolucaoAplicados[idxAplicados - 1]?.registro?.peso
                    : null;
                const variacaoPeso =
                  registro?.peso != null && anterior != null && typeof anterior === 'number'
                    ? registro.peso - anterior
                    : null;
                const anteriorComp =
                  foiAplicado && registro?.circunferenciaAbdominal != null && idxAplicados > 0
                    ? evolucaoAplicados[idxAplicados - 1]?.registro?.circunferenciaAbdominal
                    : null;
                const variacaoComp =
                  registro?.circunferenciaAbdominal != null && anteriorComp != null && typeof anteriorComp === 'number'
                    ? registro.circunferenciaAbdominal - anteriorComp
                    : null;
                const dataAplicacao =
                  foiAplicado && registro
                    ? registro.doseAplicada?.data
                      ? toDate(registro.doseAplicada.data)
                      : registro.dataRegistro
                        ? toDate(registro.dataRegistro)
                        : null
                    : null;
                const ehConclusao = registro ? ehSemanaConclusaoStr(registro.comentarioMedico) : false;
                const mgG =
                  weekIndex > 0 && registro?.adherence !== 'MISSED' && registro?.adesao !== 'esquecida'
                    ? obterDoseMgSemanaPaciente(pacienteVista, weekIndex)
                    : 0;

                return (
                  <div
                    key={registro?.id || `sem-${weekIndex}`}
                    className={`rounded-xl p-3 shadow-sm transition-all hover:shadow-md ${
                      foiAplicado
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/60 dark:border-green-700/50'
                        : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/60 dark:border-amber-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            Semana {semanaRelativa}
                          </span>
                          <span
                            className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${
                              foiAplicado
                                ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                : registro && (registro.adherence === 'MISSED' || registro.adesao === 'esquecida')
                                  ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {foiAplicado
                              ? '✓ Aplicada'
                              : registro && (registro.adherence === 'MISSED' || registro.adesao === 'esquecida')
                                ? '✗ Perdida'
                                : 'Pendente'}
                          </span>
                          {ehConclusao && <span className="text-xs text-purple-600 dark:text-purple-400">— Conclusão</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {registro?.peso != null && (
                            <span className={badgeRegistro} title="Peso">
                              <Scale className="h-3 w-3 shrink-0" aria-hidden />
                              {registro.peso} kg
                            </span>
                          )}
                          {mgG > 0 && (
                            <span className={badgeRegistro} title="Dose da aplicação">
                              <Syringe className="h-3 w-3 shrink-0" aria-hidden />
                              {mgG} mg
                            </span>
                          )}
                          {variacaoPeso != null && (
                            <span className={badgeRegistro} title="Variação de peso em relação à semana anterior">
                              <Weight className="h-3 w-3 shrink-0" aria-hidden />
                              <span
                                className={
                                  variacaoPeso <= -1
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }
                              >
                                Δ {variacaoPeso > 0 ? '+' : ''}
                                {variacaoPeso.toFixed(1)} kg
                              </span>
                            </span>
                          )}
                          {variacaoComp != null && (
                            <span className={badgeRegistro} title="Variação de comprimento abdominal em relação à semana anterior">
                              <Ruler className="h-3 w-3 shrink-0" aria-hidden />
                              <span
                                className={
                                  variacaoComp <= 0
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }
                              >
                                Δ {variacaoComp > 0 ? '+' : ''}
                                {variacaoComp.toFixed(1)} cm
                              </span>
                            </span>
                          )}
                          {dataAplicacao && (
                            <span className={badgeRegistro} title="Data da aplicação">
                              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                              {formatarDataRegistro(dataAplicacao)}
                            </span>
                          )}
                          {!foiAplicado && (
                            <span className={badgeRegistro} title="Data prevista">
                              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                              Previsto {formatarDataRegistro(dataPrevista)}
                            </span>
                          )}
                        </div>
                      </div>
                      {allowEditDelete &&
                        (foiAplicado || (registro && (registro.adherence === 'MISSED' || registro.adesao === 'esquecida'))) && (
                          <div className="flex gap-1 shrink-0">
                            {onEditRegistro && (
                              <button
                                type="button"
                                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                title="Editar"
                                onClick={() => {
                                  handleClose();
                                  onEditRegistro(pacienteLocal, registro);
                                }}
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="p-1.5 rounded-md text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50"
                              title="Excluir"
                              disabled={deleting}
                              onClick={() => handleDeleteRegistro(registro)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
            {evolucao.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Nenhum registro ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>

    {!onShare && (
      <ModalResultadoTratamento
        open={showResultadoTratamento}
        data={resultadoTratamentoData}
        paciente={pacienteLocal}
        estrelas={estrelasDepoimento ?? 0}
        onClose={() => setShowResultadoTratamento(false)}
      />
    )}
    </>
  );
}
