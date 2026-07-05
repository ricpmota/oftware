'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Edit, X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { BodyMapOverlay } from './BodyMapOverlay';
import { BioImpedanciaForm } from './BioImpedanciaForm';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { BIO_ORIGEM_LABELS } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import { useBioLimitOverrides } from '@/hooks/useBioLimitOverrides';
import { parseBioDataRegistro, formatBioRegistroPtBr } from '@/utils/bioImpedanciaDate';
import { findRegistroAnteriorCronologico } from '@/utils/bioImpedanciaTrend';
import { getBioAvailableSections, inferBioOrigem } from '@/utils/bioImpedanciaMetrics';
import { ensureBioRegistrosIds, findRegistroById } from '@/utils/bioImpedanciaRegistroId';
import { BioImpedanciaSummaryGrid } from '@/components/bodymap/BioImpedanciaSummaryGrid';
import { BioQualityInsightCard } from '@/components/bodymap/BioQualityInsightCard';
import { BioHistoryTabs } from '@/components/bodymap/BioHistoryTabs';
import { BioImpedanciaCompositionCard } from '@/components/bodymap/BioImpedanciaCompositionCard';
import { BioMobileActionBar } from '@/components/bodymap/BioMobileActionBar';
import { BioEmptyState } from '@/components/bodymap/BioEmptyState';
import { BIO_CARD, BIO_CARD_PAD, BIO_SURFACE, BIO_SECTION_TITLE } from '@/components/bodymap/bioImpedanciaTokens';

const BIO_FORM_MODAL_Z = 'z-[200]';

function bioImpedanciaFormModalShellClasses(isMobile: boolean) {
  const overlay = isMobile
    ? `fixed inset-0 ${BIO_FORM_MODAL_Z} flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50`
    : `fixed inset-0 ${BIO_FORM_MODAL_Z} flex items-center justify-center p-4 bg-black/50`;
  const panel = isMobile
    ? 'bg-white w-full max-h-[95dvh] rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col'
    : 'bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col';
  const body = isMobile
    ? 'overflow-y-auto overflow-x-hidden px-3 py-3 flex-1 min-h-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 sm:pb-6'
    : 'overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex-1 min-h-0';
  return { overlay, panel, body };
}

export type BioImpedanciaMetaHomeColumn = 'full' | 'metrics' | 'body';

interface BioImpedanciaDisplayProps {
  paciente: PacienteCompleto | null;
  registros: BioImpedanciaRegistro[];
  imagemSrc: string;
  imageAlt: string;
  modoNutricionista?: boolean;
  isMobile?: boolean;
  onSalvo?: (registros: BioImpedanciaRegistro[]) => void;
  metaHomeColumn?: BioImpedanciaMetaHomeColumn;
  formularioEmModal?: boolean;
  formularioDepoisDaVisualizacao?: boolean;
  mostrarHistoricoResumoNoBlocoMetricas?: boolean;
  ocultarHistoricoResumoNoBlocoCorpo?: boolean;
  /** Oculta botão Editar e bloqueia edição de registros existentes (ex.: visão do paciente em /meta) */
  permitirEdicaoRegistro?: boolean;
  /** Oculta grid de resumo (quando métricas ficam fora, ex. home /meta) */
  ocultarResumoCorporal?: boolean;
  /** Oculta cabeçalho, seletor de data e navegação interna */
  ocultarCabecalhoInterno?: boolean;
  /** Registro exibido controlado pelo pai (data global da home) */
  registroExibidoExterno?: BioImpedanciaRegistro | null;
  registroAnteriorExterno?: BioImpedanciaRegistro | null;
}

export function BioImpedanciaDisplay({
  paciente,
  registros,
  imagemSrc,
  imageAlt,
  modoNutricionista = false,
  isMobile = false,
  onSalvo,
  metaHomeColumn = 'full',
  formularioEmModal = false,
  formularioDepoisDaVisualizacao = false,
  mostrarHistoricoResumoNoBlocoMetricas = false,
  ocultarHistoricoResumoNoBlocoCorpo = false,
  permitirEdicaoRegistro = true,
  ocultarResumoCorporal = false,
  ocultarCabecalhoInterno = false,
  registroExibidoExterno,
  registroAnteriorExterno,
}: BioImpedanciaDisplayProps) {
  useBioLimitOverrides();
  const [portalReady, setPortalReady] = useState(false);
  const [showNovoRegistro, setShowNovoRegistro] = useState(false);
  const [registroEditandoId, setRegistroEditandoId] = useState<string | null>(null);
  const [indiceRegistroSelecionado, setIndiceRegistroSelecionado] = useState(0);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const pid = paciente?.id ?? null;
  useEffect(() => {
    setShowNovoRegistro(false);
    setRegistroEditandoId(null);
    setIndiceRegistroSelecionado(0);
  }, [pid]);

  const registrosView = useMemo(
    () =>
      ensureBioRegistrosIds(registros).sort(
        (a, b) => parseBioDataRegistro(b.dataRegistro).getTime() - parseBioDataRegistro(a.dataRegistro).getTime()
      ),
    [registros]
  );

  const ultimo = registrosView[0];
  const idxSel = registrosView.length > 0 ? Math.min(indiceRegistroSelecionado, registrosView.length - 1) : 0;

  useEffect(() => {
    if (registrosView.length > 0 && indiceRegistroSelecionado >= registrosView.length) {
      setIndiceRegistroSelecionado(registrosView.length - 1);
    }
  }, [registrosView.length, indiceRegistroSelecionado]);

  const registroSelecionado = registrosView[idxSel] ?? ultimo;
  const registroExibidoInterno = modoNutricionista && registrosView.length > 0 ? registroSelecionado : ultimo;
  const registroExibido =
    registroExibidoExterno !== undefined ? registroExibidoExterno : registroExibidoInterno;
  const registroAnterior = useMemo(() => {
    if (registroAnteriorExterno !== undefined) return registroAnteriorExterno;
    return registroExibido ? findRegistroAnteriorCronologico(registrosView, registroExibido) : null;
  }, [registroAnteriorExterno, registroExibido, registrosView]);

  const sexo = (paciente?.dadosIdentificacao?.sexoBiologico ?? (paciente as { dadosidentificacao?: { sexobiologico?: string } })?.dadosidentificacao?.sexobiologico) as 'M' | 'F' | null;

  const pesoAtual = paciente?.evolucaoSeguimento?.length
    ? [...(paciente.evolucaoSeguimento || [])]
        .sort((a, b) => (b.weekIndex ?? 0) - (a.weekIndex ?? 0))
        .find((r) => r.peso && r.peso > 0)?.peso
    : paciente?.dadosClinicos?.medidasIniciais?.peso ?? 0;

  const fecharFormularioBio = () => {
    setRegistroEditandoId(null);
    setShowNovoRegistro(false);
  };

  const abrirEditarRegistro = (registro: BioImpedanciaRegistro) => {
    const comId = ensureBioRegistrosIds([registro])[0];
    setRegistroEditandoId(comId.id ?? null);
    setShowNovoRegistro(false);
  };

  const abrirImportarExame = () => {
    setRegistroEditandoId(null);
    setShowNovoRegistro(true);
  };

  const handleSalvoRegistros = async (novos: BioImpedanciaRegistro[]) => {
    const comIds = ensureBioRegistrosIds(novos);
    const idExcluido = registroEditandoId;
    const eraEdicao = registroEditandoId != null;
    await onSalvo?.(comIds);
    if (idExcluido && !comIds.some((r) => r.id === idExcluido)) {
      setIndiceRegistroSelecionado(0);
    } else if (!eraEdicao) {
      setIndiceRegistroSelecionado(0);
    }
  };

  const registroEditando = registroEditandoId
    ? findRegistroById(registrosView, registroEditandoId)
    : null;
  const showForm = showNovoRegistro || registroEditandoId != null;
  const showFormInline = showForm && !formularioEmModal && metaHomeColumn === 'full';

  const shellForm = bioImpedanciaFormModalShellClasses(isMobile);

  const formModalContent = () =>
    paciente && onSalvo ? (
      <BioImpedanciaForm
        pacienteId={paciente.id}
        pesoAtual={pesoAtual ?? 0}
        registros={registrosView}
        onSalvo={handleSalvoRegistros}
        registroParaEditar={registroEditando ?? undefined}
        registroEditandoId={registroEditandoId}
        onCancelar={fecharFormularioBio}
        isMobile={isMobile}
      />
    ) : null;

  const modalFormularioBio =
    formularioEmModal && portalReady && metaHomeColumn === 'full' && showForm && paciente && onSalvo ? (
      <div
        className={shellForm.overlay}
        onClick={fecharFormularioBio}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bioimpedancia-form-modal-titulo"
      >
        <div className={shellForm.panel} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <h3 id="bioimpedancia-form-modal-titulo" className="text-base sm:text-lg font-semibold text-gray-900 pr-2 min-w-0">
              {registroEditandoId != null && registroEditando
                ? 'Editar bioimpedância'
                : 'Importar exame'}
            </h3>
            <button type="button" onClick={fecharFormularioBio} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Fechar">
              <X size={22} />
            </button>
          </div>
          <div className={shellForm.body}>{formModalContent()}</div>
        </div>
      </div>
    ) : null;

  if (!ultimo && !modoNutricionista && registroExibidoExterno === undefined) {
    return (
      <p className="text-sm text-gray-600">Fale com seu médico ou nutricionista para realizar Bio Impedância.</p>
    );
  }

  if (!ultimo && modoNutricionista) {
    const portalVazio =
      portalReady && formularioEmModal && showNovoRegistro && paciente && onSalvo
        ? createPortal(
            <div className={shellForm.overlay} onClick={fecharFormularioBio} role="dialog" aria-modal="true">
              <div className={shellForm.panel} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Importar exame</h3>
                  <button type="button" onClick={fecharFormularioBio} className="p-2 rounded-xl hover:bg-gray-100"><X size={22} /></button>
                </div>
                <div className={shellForm.body}>{formModalContent()}</div>
              </div>
            </div>,
            document.body
          )
        : null;

    return (
      <div className={`space-y-4 ${isMobile ? 'pb-24' : ''}`}>
        <BioEmptyState
          title="Nenhum exame registrado"
          description="Importe um laudo ou preencha os dados manualmente para começar o acompanhamento."
          action={
            paciente && onSalvo && (
              <button
                type="button"
                onClick={abrirImportarExame}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Upload size={16} /> Importar exame
              </button>
            )
          }
        />
        {portalVazio}
      </div>
    );
  }

  const sections = registroExibido ? getBioAvailableSections(registroExibido) : null;
  const origem = registroExibido ? inferBioOrigem(registroExibido) : 'generica';

  const headerBlock = registroExibido && metaHomeColumn === 'full' && !ocultarCabecalhoInterno && (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Bioimpedância</h2>
          <p className="text-sm text-gray-500 mt-1">Composição corporal, gordura visceral e evolução metabólica</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
              {BIO_ORIGEM_LABELS[origem]}
            </span>
            <span className="text-xs text-gray-500">
              Exame de {formatBioRegistroPtBr(registroExibido.dataRegistro)}
            </span>
          </div>
        </div>
        {modoNutricionista && onSalvo && !isMobile && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={abrirImportarExame}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 shadow-sm"
            >
              <Upload size={16} /> Importar exame
            </button>
          </div>
        )}
      </div>

      {modoNutricionista && registrosView.length >= 1 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {registrosView.length > 1 && (
            <>
              <button type="button" disabled={idxSel >= registrosView.length - 1} onClick={() => setIndiceRegistroSelecionado((i) => i + 1)} className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-40" aria-label="Exame anterior">
                <ChevronLeft size={18} />
              </button>
              <select
                value={idxSel}
                onChange={(e) => setIndiceRegistroSelecionado(parseInt(e.target.value, 10))}
                className="flex-1 min-w-[140px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm"
              >
                {registrosView.map((r, i) => (
                  <option key={r.id ?? i} value={i}>{formatBioRegistroPtBr(r.dataRegistro)}</option>
                ))}
              </select>
              <button type="button" disabled={idxSel <= 0} onClick={() => setIndiceRegistroSelecionado((i) => i - 1)} className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-40" aria-label="Exame mais recente">
                <ChevronRight size={18} />
              </button>
            </>
          )}
          {permitirEdicaoRegistro && (
            <button
              type="button"
              onClick={() => registroSelecionado && abrirEditarRegistro(registroSelecionado)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-sm font-semibold"
              title="Editar registro exibido"
            >
              <Edit size={16} />
              Editar
            </button>
          )}
        </div>
      )}
    </div>
  );

  const mobileHeaderCompact = registroExibido && metaHomeColumn === 'full' && isMobile && modoNutricionista && !ocultarCabecalhoInterno && (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">{formatBioRegistroPtBr(registroExibido.dataRegistro)}</span>
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">{BIO_ORIGEM_LABELS[origem]}</span>
      </div>
      {registrosView.length > 1 ? (
        <select value={idxSel} onChange={(e) => setIndiceRegistroSelecionado(parseInt(e.target.value, 10))} className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
          {registrosView.map((r, i) => (
            <option key={r.id ?? i} value={i}>{formatBioRegistroPtBr(r.dataRegistro)}</option>
          ))}
        </select>
      ) : null}
      {permitirEdicaoRegistro && (
        <button
          type="button"
          onClick={() => registroSelecionado && abrirEditarRegistro(registroSelecionado)}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold"
        >
          <Edit size={14} /> Editar
        </button>
      )}
    </div>
  );

  const resumoBlock = registroExibido && sections?.resumo && !ocultarResumoCorporal && (
    <BioImpedanciaSummaryGrid
      registro={registroExibido}
      registroAnterior={registroAnterior}
      sexo={sexo}
      compact={isMobile}
    />
  );

  const qualityBlock = registroExibido && metaHomeColumn !== 'body' && (
    <BioQualityInsightCard registroAtual={registroExibido} registroAnterior={registroAnterior} />
  );

  const historyBlock = registrosView.length >= 2 && metaHomeColumn !== 'body' && (
    <BioHistoryTabs registros={registrosView} />
  );

  const compositionBlock = registroExibido && sections?.composicao && metaHomeColumn !== 'body' && (
    <BioImpedanciaCompositionCard registro={registroExibido} sexo={sexo} />
  );

  const bodyMapBlock = registroExibido && metaHomeColumn !== 'metrics' && (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD}`}>
      <h4 className={BIO_SECTION_TITLE}>Mapa corporal</h4>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">Distribuição segmentar de massa magra e gordura</p>
      {sections?.segmentar ? (
        <BodyMapOverlay
          imageSrc={imagemSrc}
          imageAlt={imageAlt}
          massaMagraSegmentar={registroExibido.massaMagraSegmentar}
          gorduraSegmentar={registroExibido.gorduraSegmentar}
          sexo={sexo}
        />
      ) : (
        <BioEmptyState title="Sem análise segmentar" description="Este exame não trouxe análise segmentar." />
      )}
    </div>
  );

  const showMobileBar = isMobile && modoNutricionista && metaHomeColumn === 'full' && onSalvo && !showForm;
  const usarContainerSurface = metaHomeColumn === 'full' && !ocultarCabecalhoInterno;

  return (
    <div
      className={`min-w-0 ${
        usarContainerSurface
          ? `${BIO_SURFACE} rounded-2xl p-3 sm:p-4 lg:p-0 lg:bg-transparent`
          : 'space-y-4'
      } ${showMobileBar ? 'pb-24' : ''}`}
    >
      {modalFormularioBio ? createPortal(modalFormularioBio, document.body) : null}

      {showFormInline && formModalContent()}

      {metaHomeColumn === 'metrics' && (
        <div className="space-y-4">
          {resumoBlock}
          {compositionBlock}
          {mostrarHistoricoResumoNoBlocoMetricas && historyBlock}
        </div>
      )}

      {metaHomeColumn === 'body' && (
        <div className="space-y-4">
          {bodyMapBlock}
          {!ocultarHistoricoResumoNoBlocoCorpo && historyBlock}
        </div>
      )}

      {metaHomeColumn === 'full' && ocultarCabecalhoInterno && !registroExibido && (
        <BioEmptyState
          title="Sem bioimpedância nesta data"
          description="Não há exame de bioimpedância registrado para a data selecionada."
        />
      )}

      {metaHomeColumn === 'full' && registroExibido && (
        <>
          {isMobile ? mobileHeaderCompact : headerBlock}

          {isMobile ? (
            <div className="space-y-4">
              {resumoBlock}
              {qualityBlock}
              {historyBlock}
              {compositionBlock}
              {bodyMapBlock}
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-5 lg:gap-6">
              <div className="space-y-4 min-w-0">
                {resumoBlock}
                {qualityBlock}
                {historyBlock}
                {compositionBlock}
              </div>
              <div className="space-y-4 min-w-0">
                {bodyMapBlock}
                {modoNutricionista && onSalvo && (formularioDepoisDaVisualizacao || formularioEmModal) && !showForm && (
                  <div className={`${BIO_CARD} ${BIO_CARD_PAD} text-sm text-gray-600`}>
                    <span className="font-medium text-gray-900">Consulta somente leitura.</span> Use{' '}
                    <strong>Importar exame</strong> para lançar um novo registro.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showMobileBar && <BioMobileActionBar onImport={abrirImportarExame} />}
    </div>
  );
}
