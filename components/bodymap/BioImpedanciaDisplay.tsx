'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Plus, Edit, X } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { BodyMapOverlay } from './BodyMapOverlay';
import { BioImpedanciaForm } from './BioImpedanciaForm';
import { BioRangeBar } from './BioRangeBar';
import TrendLine from '@/components/TrendLine';
import { getBioRange } from '@/utils/bioImpedanciaRanges';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import { useBioLimitOverrides } from '@/hooks/useBioLimitOverrides';
import { parseBioDataRegistro, formatBioRegistroPtBr, formatBioRegistroPtBrShort } from '@/utils/bioImpedanciaDate';
import {
  bioFieldTrend,
  findRegistroAnteriorCronologico,
  formatBioMetricDisplay,
} from '@/utils/bioImpedanciaTrend';
import { BioImpedanciaTrendGlyph } from '@/components/bodymap/BioImpedanciaTrendGlyph';

/** Acima do modal "Editar Paciente" (z-50); renderizado em document.body via portal */
const BIO_FORM_MODAL_Z = 'z-[200]';

function bioImpedanciaFormModalShellClasses(isMobile: boolean) {
  const overlay = isMobile
    ? `fixed inset-0 ${BIO_FORM_MODAL_Z} flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50`
    : `fixed inset-0 ${BIO_FORM_MODAL_Z} flex items-center justify-center p-4 bg-black/50`;
  const panel = isMobile
    ? 'bg-white w-full max-h-[95dvh] rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col'
    : 'bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col';
  const body = isMobile
    ? 'overflow-y-auto overflow-x-hidden px-3 py-3 flex-1 min-h-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 sm:pb-6'
    : 'overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex-1 min-h-0';
  return { overlay, panel, body };
}

const SECTIONS = [
  {
    key: 'composicao',
    label: 'Análise de Composição Corporal',
    fields: [
      { key: 'aguaTotalLitros', label: 'Água Total', unit: 'L', getValue: (r: BioImpedanciaRegistro) => r.composicaoCorporal?.aguaTotalLitros },
      { key: 'proteinasKg', label: 'Proteínas', unit: 'kg', getValue: (r: BioImpedanciaRegistro) => r.composicaoCorporal?.proteinasKg },
      { key: 'mineraisKg', label: 'Minerais', unit: 'kg', getValue: (r: BioImpedanciaRegistro) => r.composicaoCorporal?.mineraisKg },
      { key: 'massaGorduraKg', label: 'Massa de Gordura', unit: 'kg', getValue: (r: BioImpedanciaRegistro) => r.composicaoCorporal?.massaGorduraKg },
    ],
  },
  {
    key: 'musculo',
    label: 'Análise Músculo-Gordura',
    fields: [
      { key: 'massaMuscularKg', label: 'Massa Muscular', unit: 'kg', getValue: (r: BioImpedanciaRegistro) => r.analiseMusculoGordura?.massaMuscularKg },
      { key: 'massaGorduraKg', label: 'Massa de Gordura', unit: 'kg', getValue: (r: BioImpedanciaRegistro) => r.analiseMusculoGordura?.massaGorduraKg },
    ],
  },
  {
    key: 'obesidade',
    label: 'Análise de Obesidade',
    fields: [
      { key: 'percentualGordura', label: 'PGC (%)', unit: '%', getValue: (r: BioImpedanciaRegistro) => r.analiseObesidade?.percentualGordura },
    ],
  },
];

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
  /**
   * Formulário em `document.body` com z-index acima do modal do paciente.
   * Usado no Metaadmin (desktop e mobile) para não ficar cortado por `overflow-hidden`.
   */
  formularioEmModal?: boolean;
  /** Prioriza visualização dos dados; mesma ideia do fluxo “consultar → novo/editar em janela”. */
  formularioDepoisDaVisualizacao?: boolean;
  /**
   * Com `metaHomeColumn="metrics"`: exibe o gráfico resumo (peso, massa muscular, PGC) abaixo das seções.
   * Útil no /meta desktop para o paciente ver evolução junto da composição.
   */
  mostrarHistoricoResumoNoBlocoMetricas?: boolean;
  /** Com `metaHomeColumn="body"`: omite o mesmo gráfico resumo (evita duplicata quando já está nas métricas). */
  ocultarHistoricoResumoNoBlocoCorpo?: boolean;
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
}: BioImpedanciaDisplayProps) {
  const bioLimitOverrides = useBioLimitOverrides();
  const [portalReady, setPortalReady] = useState(false);
  const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(new Set());
  const [detalhesExpandidos, setDetalhesExpandidos] = useState<Set<string>>(new Set());
  const [showNovoRegistro, setShowNovoRegistro] = useState(false);
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);
  const [indiceRegistroSelecionado, setIndiceRegistroSelecionado] = useState(0);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const pid = paciente?.id ?? null;
  useEffect(() => {
    setShowNovoRegistro(false);
    setIndiceEditando(null);
    setIndiceRegistroSelecionado(0);
    setSecoesExpandidas(new Set());
    setDetalhesExpandidos(new Set());
  }, [pid]);

  /** Mais recente primeiro — paciente e profissional veem o último exame correto nas setas e no “último”. */
  const registrosView = useMemo(
    () =>
      [...registros].sort(
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
  const registroExibido = modoNutricionista && registrosView.length > 0 ? registroSelecionado : ultimo;
  const registroAnterior = useMemo(
    () => (registroExibido ? findRegistroAnteriorCronologico(registrosView, registroExibido) : null),
    [registroExibido, registrosView]
  );
  const sexo = (paciente?.dadosIdentificacao?.sexoBiologico ?? (paciente as any)?.dadosidentificacao?.sexobiologico) as 'M' | 'F' | null;
  const pesoAtual = paciente?.evolucaoSeguimento?.length
    ? [...(paciente.evolucaoSeguimento || [])].sort((a, b) => (b.weekIndex ?? 0) - (a.weekIndex ?? 0)).find(r => r.peso && r.peso > 0)?.peso
    : paciente?.dadosClinicos?.medidasIniciais?.peso ?? 0;

  const fecharFormularioBio = () => {
    setIndiceEditando(null);
    setShowNovoRegistro(false);
  };

  const fecharModalFormVazio = () => {
    setShowNovoRegistro(false);
  };

  const toggleSecao = (key: string) => {
    const next = new Set(secoesExpandidas);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSecoesExpandidas(next);
  };

  const toggleDetalhe = (key: string) => {
    const next = new Set(detalhesExpandidos);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDetalhesExpandidos(next);
  };

  const dadosGrafico = [...registrosView]
    .map((r) => ({ r, t: parseBioDataRegistro(r.dataRegistro).getTime() }))
    .sort((a, b) => b.t - a.t)
    .reverse()
    .map(({ r }) => ({
      data: formatBioRegistroPtBrShort(r.dataRegistro),
      peso: r.peso,
      massaMuscular: r.analiseMusculoGordura?.massaMuscularKg ?? null,
      percentualGordura: r.analiseObesidade?.percentualGordura ?? null,
      aguaTotalLitros: r.composicaoCorporal?.aguaTotalLitros ?? null,
      proteinasKg: r.composicaoCorporal?.proteinasKg ?? null,
      mineraisKg: r.composicaoCorporal?.mineraisKg ?? null,
      massaGorduraKg: r.analiseMusculoGordura?.massaGorduraKg ?? r.composicaoCorporal?.massaGorduraKg ?? null,
    }));

  const graficoHistoricoResumo =
    dadosGrafico.length > 0 ? (
      <>
        <h4 className="font-semibold text-gray-900 mb-3">Histórico</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dadosGrafico} margin={{ top: 20, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} yAxisId="left" />
            <YAxis orientation="right" tick={{ fontSize: 10 }} yAxisId="right" domain={[0, 50]} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="peso"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Peso (kg)"
              dot={{ r: 4 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="peso"
                position="top"
                offset={6}
                fontSize={9}
                fill="#2563eb"
                formatter={(v: unknown) => (v != null && Number.isFinite(Number(v)) ? String(Number(v).toFixed(1)) : '')}
              />
            </Line>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="massaMuscular"
              stroke="#10b981"
              strokeWidth={2}
              name="Massa Muscular (kg)"
              dot={{ r: 4 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="massaMuscular"
                position="top"
                offset={6}
                fontSize={9}
                fill="#059669"
                formatter={(v: unknown) => (v != null && Number.isFinite(Number(v)) ? String(Number(v).toFixed(1)) : '')}
              />
            </Line>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="percentualGordura"
              stroke="#f97316"
              strokeWidth={2}
              name="PGC (%)"
              dot={{ r: 4 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="percentualGordura"
                position="top"
                offset={6}
                fontSize={9}
                fill="#ea580c"
                formatter={(v: unknown) => (v != null && Number.isFinite(Number(v)) ? String(Number(v).toFixed(1)) : '')}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </>
    ) : null;

  const registroEditando = indiceEditando != null && registrosView[indiceEditando] ? registrosView[indiceEditando] : null;
  const showForm = showNovoRegistro || indiceEditando != null;
  const showFormInline = showForm && !formularioEmModal && metaHomeColumn === 'full';

  const showSectionsBlock = metaHomeColumn !== 'body';
  const showBodyBlock = metaHomeColumn !== 'metrics';
  const sectionsForLayout =
    metaHomeColumn === 'metrics'
      ? SECTIONS.filter((s) => s.key === 'composicao' || s.key === 'obesidade')
      : SECTIONS;

  const rootSpacer = metaHomeColumn === 'full' ? 'space-y-6' : 'space-y-4';
  const shellForm = bioImpedanciaFormModalShellClasses(isMobile);

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
          <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 border-b border-gray-200 bg-teal-50/80 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
            <h3 id="bioimpedancia-form-modal-titulo" className="text-base sm:text-lg font-semibold text-gray-900 pr-2 min-w-0">
              {indiceEditando != null && registroEditando
                ? `Editar — ${formatBioRegistroPtBr(registroEditando.dataRegistro)}`
                : 'Novo registro de bioimpedância'}
            </h3>
            <button
              type="button"
              onClick={fecharFormularioBio}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 shrink-0"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
          </div>
          <div className={shellForm.body}>
            <BioImpedanciaForm
              pacienteId={paciente.id}
              pesoAtual={pesoAtual ?? 0}
              registros={registrosView}
              onSalvo={onSalvo}
              registroParaEditar={registroEditando ?? undefined}
              indiceEdicao={indiceEditando ?? 0}
              onCancelar={fecharFormularioBio}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>
    ) : null;

  if (!ultimo && !modoNutricionista) {
    return (
      <p className="text-sm text-gray-600">Fale com seu médico ou nutricionista para realizar Bio Impedância.</p>
    );
  }

  if (!ultimo && modoNutricionista) {
    const portalVazio =
      portalReady && formularioEmModal && showNovoRegistro && paciente && onSalvo
        ? createPortal(
            (() => {
              const shell = bioImpedanciaFormModalShellClasses(isMobile);
              return (
                <div
                  className={shell.overlay}
                  onClick={fecharModalFormVazio}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="bioimpedancia-modal-titulo-vazio"
                >
                  <div className={shell.panel} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 border-b border-gray-200 bg-teal-50/80 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
                      <h3 id="bioimpedancia-modal-titulo-vazio" className="text-base sm:text-lg font-semibold text-gray-900 pr-2">
                        Novo registro de bioimpedância
                      </h3>
                      <button
                        type="button"
                        onClick={fecharModalFormVazio}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 shrink-0"
                        aria-label="Fechar"
                      >
                        <X size={22} />
                      </button>
                    </div>
                    <div className={shell.body}>
                      <BioImpedanciaForm
                        pacienteId={paciente.id}
                        pesoAtual={pesoAtual ?? 0}
                        registros={[]}
                        onSalvo={onSalvo}
                        isMobile={isMobile}
                        onCancelar={fecharModalFormVazio}
                      />
                    </div>
                  </div>
                </div>
              );
            })(),
            document.body
          )
        : null;

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Nenhum registro de Bio Impedância. Use &quot;+ Novo Registro&quot; para adicionar.</p>
        {formularioEmModal && paciente && onSalvo ? (
          <>
            {!showNovoRegistro && (
              <button
                type="button"
                onClick={() => setShowNovoRegistro(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center gap-2"
              >
                <Plus size={18} /> Novo Registro
              </button>
            )}
            {portalVazio}
          </>
        ) : showNovoRegistro && paciente && onSalvo ? (
          <BioImpedanciaForm
            pacienteId={paciente.id}
            pesoAtual={pesoAtual ?? 0}
            registros={[]}
            onSalvo={onSalvo}
            isMobile={isMobile}
          />
        ) : (
          paciente &&
          onSalvo && (
            <button
              type="button"
              onClick={() => setShowNovoRegistro(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center gap-2"
            >
              <Plus size={18} /> Novo Registro
            </button>
          )
        )}
        {registrosView.length > 0 && dadosGrafico.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Histórico</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dadosGrafico} margin={{ top: 20, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="peso" stroke="#3b82f6" strokeWidth={2} name="Peso (kg)" dot={{ r: 4 }} isAnimationActive={false}>
                  <LabelList dataKey="peso" position="top" offset={6} fontSize={9} fill="#2563eb" formatter={(v: unknown) => (v != null && Number.isFinite(Number(v)) ? String(Number(v).toFixed(1)) : '')} />
                </Line>
                <Line type="monotone" dataKey="massaMuscular" stroke="#10b981" strokeWidth={2} name="Massa Muscular (kg)" dot={{ r: 4 }} isAnimationActive={false}>
                  <LabelList dataKey="massaMuscular" position="top" offset={6} fontSize={9} fill="#059669" formatter={(v: unknown) => (v != null && Number.isFinite(Number(v)) ? String(Number(v).toFixed(1)) : '')} />
                </Line>
                <Line type="monotone" dataKey="percentualGordura" stroke="#f97316" strokeWidth={2} name="PGC (%)" dot={{ r: 4 }} isAnimationActive={false}>
                  <LabelList dataKey="percentualGordura" position="top" offset={6} fontSize={9} fill="#ea580c" formatter={(v: unknown) => (v != null && Number.isFinite(Number(v)) ? String(Number(v).toFixed(1)) : '')} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${rootSpacer}`}>
      {modalFormularioBio ? createPortal(modalFormularioBio, document.body) : null}

      {modoNutricionista && metaHomeColumn === 'full' && registrosView.length > 0 && (
        <>
          <div
            className={`rounded-lg border border-gray-200 bg-white ${
              formularioDepoisDaVisualizacao || formularioEmModal ? 'p-3 shadow-sm sm:p-4' : 'p-3'
            } space-y-3`}
          >
            {(formularioDepoisDaVisualizacao || formularioEmModal) && (
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Histórico de bioimpedância
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[140px]">
                <label className="sr-only">Data do registro</label>
                <select
                  value={idxSel}
                  onChange={(e) => setIndiceRegistroSelecionado(parseInt(e.target.value, 10))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {registrosView.map((r, i) => (
                    <option key={i} value={i}>
                      {formatBioRegistroPtBr(r.dataRegistro)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNovoRegistro(false);
                  setIndiceEditando(idxSel);
                }}
                className="p-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 flex items-center"
                title="Editar registro"
              >
                <Edit size={20} />
                {!isMobile && <span className="ml-1.5 text-sm">Editar</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNovoRegistro(true);
                  setIndiceEditando(null);
                }}
                className="p-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 flex items-center"
                title="Novo registro"
              >
                <Plus size={20} />
                {!isMobile && <span className="ml-1.5 text-sm">Novo Registro</span>}
              </button>
            </div>
          </div>

          {(formularioDepoisDaVisualizacao || formularioEmModal) && modoNutricionista && registrosView.length > 0 && !showForm && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-700">
              <span className="font-medium text-slate-900">Visualização do registro selecionado.</span> Abaixo estão os dados já
              salvos (somente consulta). Para lançar um <strong>novo</strong> exame, use <strong>+ Novo Registro</strong>
              {formularioEmModal ? (isMobile ? ' (abre em tela cheia)' : ' (abre em uma janela)') : ''}. Para corrigir o atual,{' '}
              <strong>Editar</strong>
              {formularioEmModal ? (isMobile ? ' (tela cheia)' : ' (nova janela)') : ''}.
            </div>
          )}
        </>
      )}

      {showFormInline && paciente && onSalvo && (
        <div className="border border-teal-200 rounded-lg p-4 bg-teal-50/50">
          {indiceEditando != null && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Editando registro de {registroEditando ? formatBioRegistroPtBr(registroEditando.dataRegistro) : '—'}
              </span>
              <button
                type="button"
                onClick={fecharFormularioBio}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Fechar formulário
              </button>
            </div>
          )}
          <BioImpedanciaForm
            pacienteId={paciente.id}
            pesoAtual={pesoAtual ?? 0}
            registros={registrosView}
            onSalvo={onSalvo}
            registroParaEditar={registroEditando ?? undefined}
            indiceEdicao={indiceEditando ?? 0}
            onCancelar={fecharFormularioBio}
            isMobile={isMobile}
          />
        </div>
      )}

      {registroExibido && (
        <>
          {showSectionsBlock && (
            <div className="space-y-1.5">
              {sectionsForLayout.map((sec) => {
                const secKey = `bio-${sec.key}`;
                const isSecExp = secoesExpandidas.has(secKey);
                const temAlgumValor = sec.fields.some((f) => {
                  const v = f.getValue(registroExibido);
                  return v != null && v !== '';
                });
                if (!temAlgumValor) return null;

                return (
                  <div key={sec.key} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSecao(secKey)}
                      className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100"
                    >
                      <h4 className="font-semibold text-gray-900 text-sm">{sec.label}</h4>
                      {isSecExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isSecExp && (
                      <div className="p-2.5 space-y-2">
                        {sec.fields.map((f) => {
                          const value = f.getValue(registroExibido) as number | undefined;
                          const hasValue = value != null && value !== '';
                          if (!hasValue) return null;
                          const detKey = `${secKey}-${f.key}`;
                          const isDetExp = detalhesExpandidos.has(detKey);
                          const pesoRegistro = registroExibido?.peso ?? pesoAtual ?? 0;
                          const range = getBioRange(f.key, sexo ?? undefined, pesoRegistro, bioLimitOverrides);
                          const trend = bioFieldTrend(registroAnterior, registroExibido, f.getValue);

                          return (
                            <div key={f.key} className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleDetalhe(detKey)}
                                className="w-full flex items-center justify-between gap-2 p-2 bg-white hover:bg-gray-50"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {isDetExp ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                                  <span className="font-medium text-gray-900 text-sm truncate">{f.label}</span>
                                </div>
                                <span className="text-sm text-gray-800 flex items-center gap-1 shrink-0 tabular-nums">
                                  <BioImpedanciaTrendGlyph dir={trend} />
                                  {formatBioMetricDisplay(Number(value), f.unit)}
                                </span>
                              </button>
                              {isDetExp && (
                                <div className="p-2 space-y-2 border-t border-gray-200">
                                  {range && (
                                    <div className="min-w-0">
                                      <BioRangeBar
                                        label={range.label}
                                        unit={range.unit}
                                        min={range.min}
                                        max={range.max}
                                        barMin={range.barMin}
                                        barMax={range.barMax}
                                        value={value ?? null}
                                      />
                                    </div>
                                  )}
                                  {dadosGrafico.length > 1 && (() => {
                                    const chartKey = f.key === 'massaMuscularKg' ? 'massaMuscular' : f.key;
                                    const hasData = dadosGrafico.some((d) => (d as Record<string, unknown>)[chartKey] != null);
                                    if (!hasData) return null;
                                    return (
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Evolução Temporal</label>
                                        <TrendLine
                                          data={dadosGrafico}
                                          dataKeys={[{ key: chartKey, name: f.label, stroke: '#10b981', dot: true }]}
                                          xKey="data"
                                          height={136}
                                          xAxisLabel="Data"
                                          yAxisLabel={f.unit}
                                          showValueLabels
                                          valueLabelDecimals={chartKey === 'percentualGordura' ? 1 : 2}
                                          formatter={(v: unknown) => (v != null ? String(Number(v).toFixed(1)) : 'N/A')}
                                        />
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {mostrarHistoricoResumoNoBlocoMetricas && metaHomeColumn === 'metrics' && graficoHistoricoResumo && (
            <div className="mt-4 pt-3 border-t border-gray-200">{graficoHistoricoResumo}</div>
          )}

          {showBodyBlock && (
            <>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Registro: {formatBioRegistroPtBr(registroExibido.dataRegistro)}
                </p>
                <h4 className="font-semibold text-gray-900 mb-3">Massa Magra e Gordura Segmentar</h4>
                <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                  <BodyMapOverlay
                    imageSrc={imagemSrc}
                    imageAlt={imageAlt}
                    massaMagraSegmentar={registroExibido.massaMagraSegmentar}
                    gorduraSegmentar={registroExibido.gorduraSegmentar}
                    sexo={sexo}
                  />
                </div>
              </div>

              {!ocultarHistoricoResumoNoBlocoCorpo && graficoHistoricoResumo && <div>{graficoHistoricoResumo}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}
