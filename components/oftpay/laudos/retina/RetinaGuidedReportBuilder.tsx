'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  EyeSide,
  RetinaFinding,
  RetinaMapClickPayload,
  RetinaSection,
  RetinaStructuredFindings,
} from '@/types/oftpay/retinaMap';
import {
  RETINA_FINDING_TYPE_LABELS,
  RETINA_QUADRANT_LABELS,
  RETINA_REGION_LABELS,
  RETINA_SECTION_ORDER,
} from '@/types/oftpay/retinaMap';
import {
  generateRetinaReport,
  getCompletedSections,
  eyeHasAnyData,
  vitreoBlocksFundoscopy,
} from '@/lib/oftpay/retinaReportGenerator';
import {
  createEmptyStructuredByEye,
  updateStructuredForEye,
} from '@/lib/oftpay/retinaStructuredDefaults';
import { vitreoToMeiosOpticos } from '@/lib/oftpay/vitreoOverlayFromStructured';
import {
  getLocalizedFieldConfig,
  makeStructuredKey,
  parseStructuredKey,
} from '@/lib/oftpay/retinaStructuredMapConfig';
import RetinaMapSvg from './RetinaMapSvg';
import RetinaSectionForm from './RetinaSectionForm';
import RetinaSectionStepper from './RetinaSectionStepper';
import type { LocalizedFieldTogglePayload, PlacementMode } from './RetinaLocalizedField';
import { ChevronLeft, ChevronRight, Copy, Eraser, MapPin, RotateCcw, Save, Trash2 } from 'lucide-react';

function newFindingId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface RetinaGuidedReportBuilderProps {
  variant?: 'standalone' | 'embedded';
}

export default function RetinaGuidedReportBuilder({
  variant = 'standalone',
}: RetinaGuidedReportBuilderProps) {
  const [activeEye, setActiveEye] = useState<EyeSide>('OD');
  const [activeSection, setActiveSection] = useState<RetinaSection>('vitreo');
  const [structuredByEye, setStructuredByEye] = useState(createEmptyStructuredByEye);
  const [findings, setFindings] = useState<RetinaFinding[]>([]);
  const [placementMode, setPlacementMode] = useState<PlacementMode | null>(null);
  const [finalReport, setFinalReport] = useState('');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);

  const eyeStructured = structuredByEye[activeEye];
  const eyeFindings = findings.filter((f) => f.eye === activeEye);
  const vitreoBlocked = vitreoBlocksFundoscopy(eyeStructured.vitreo);
  const mapClickEnabled =
    !!placementMode && (!vitreoBlocked || placementMode.section === 'vitreo');

  const vitreoOverlay = useMemo(
    () => vitreoToMeiosOpticos(eyeStructured.vitreo),
    [eyeStructured.vitreo]
  );

  const completedSections = useMemo(
    () => getCompletedSections(eyeStructured, eyeFindings),
    [eyeStructured, eyeFindings]
  );

  const generatedReport = useMemo(
    () => generateRetinaReport(findings, { structured: structuredByEye }),
    [findings, structuredByEye]
  );

  useEffect(() => {
    setFinalReport(generatedReport);
  }, [generatedReport]);

  const handleStructuredChange = useCallback(
    (patch: Partial<RetinaStructuredFindings>) => {
      setStructuredByEye((prev) => updateStructuredForEye(prev, activeEye, patch));
    },
    [activeEye]
  );

  const setStructuredField = useCallback(
    (section: RetinaSection, fieldKey: string, value: boolean | undefined) => {
      setStructuredByEye((prev) => {
        const current = prev[activeEye];
        const sectionData = { ...current[section] } as Record<string, unknown>;
        sectionData[fieldKey] = value;
        return updateStructuredForEye(prev, activeEye, {
          [section]: sectionData,
        } as Partial<RetinaStructuredFindings>);
      });
    },
    [activeEye]
  );

  const handleLocalizedToggle = useCallback(
    (payload: LocalizedFieldTogglePayload) => {
      const { section, fieldKey, checked } = payload;
      const config = getLocalizedFieldConfig(section, fieldKey);
      const structuredKey = makeStructuredKey(section, fieldKey);

      setStructuredField(section, fieldKey, checked || undefined);

      if (!checked) {
        setFindings((prev) =>
          prev.filter((f) => !(f.eye === activeEye && f.structuredKey === structuredKey))
        );
        setPlacementMode((prev) =>
          prev?.section === section && prev?.fieldKey === fieldKey ? null : prev
        );
        return;
      }

      if (config) {
        setPlacementMode({
          section,
          fieldKey,
          label: config.label,
          findingType: config.findingType,
          allowMultiple: config.allowMultiple,
        });
        if (activeSection !== section) {
          setActiveSection(section);
        }
      }
    },
    [activeEye, activeSection, setStructuredField]
  );

  const handleRequestPlacement = useCallback(
    ({ section, fieldKey }: { section: RetinaSection; fieldKey: string }) => {
      const config = getLocalizedFieldConfig(section, fieldKey);
      if (!config) return;
      setPlacementMode({
        section,
        fieldKey,
        label: config.label,
        findingType: config.findingType,
        allowMultiple: config.allowMultiple,
      });
      if (activeSection !== section) {
        setActiveSection(section);
      }
    },
    [activeSection]
  );

  const handleMapClick = useCallback(
    (payload: RetinaMapClickPayload) => {
      if (!placementMode) return;

      const structuredKey = makeStructuredKey(placementMode.section, placementMode.fieldKey);
      const config = getLocalizedFieldConfig(placementMode.section, placementMode.fieldKey);

      const finding: RetinaFinding = {
        id: newFindingId(),
        eye: activeEye,
        section: placementMode.section,
        structuredKey,
        type: placementMode.findingType,
        x: payload.x,
        y: payload.y,
        region: payload.region,
        quadrant: payload.quadrant,
        clockHour: payload.clockHour,
        notes:
          placementMode.findingType === 'outros' ? placementMode.label : undefined,
        createdAt: new Date().toISOString(),
      };

      setFindings((prev) => [...prev, finding]);

      if (!config?.allowMultiple) {
        setPlacementMode(null);
      }
    },
    [placementMode, activeEye]
  );

  const removeFinding = (id: string) => {
    setFindings((prev) => {
      const removed = prev.find((f) => f.id === id);
      const next = prev.filter((f) => f.id !== id);

      if (removed?.structuredKey) {
        const stillHas = next.some(
          (f) => f.eye === removed.eye && f.structuredKey === removed.structuredKey
        );
        if (!stillHas) {
          const parsed = parseStructuredKey(removed.structuredKey);
          if (parsed) {
            setStructuredField(parsed.section, parsed.fieldKey, undefined);
            setPlacementMode((mode) =>
              mode?.section === parsed.section && mode?.fieldKey === parsed.fieldKey
                ? null
                : mode
            );
          }
        }
      }

      return next;
    });
  };

  const clearEyeFindings = () => {
    if (eyeFindings.length === 0) return;
    if (!window.confirm(`Remover todos os achados localizados em ${activeEye}?`)) return;
    setFindings((prev) => prev.filter((f) => f.eye !== activeEye));
    setPlacementMode(null);
    setStructuredByEye((prev) => ({
      ...prev,
      [activeEye]: createEmptyStructuredByEye()[activeEye],
    }));
  };

  const localizedFindings = eyeFindings.filter((f) => f.structuredKey);

  const examHasData = useMemo(() => {
    if (findings.length > 0) return true;
    for (const eye of ['OD', 'OE'] as const) {
      const ef = findings.filter((f) => f.eye === eye);
      if (eyeHasAnyData(structuredByEye[eye], ef)) return true;
    }
    return finalReport.trim().length > 0;
  }, [findings, structuredByEye, finalReport]);

  const resetEntireExam = () => {
    if (
      !window.confirm(
        'Zerar todo o exame (OD e OE)? Todos os achados, etapas preenchidas e o texto do laudo serão apagados e você voltará ao início.'
      )
    ) {
      return;
    }
    setStructuredByEye(createEmptyStructuredByEye());
    setFindings([]);
    setPlacementMode(null);
    setActiveEye('OD');
    setActiveSection('vitreo');
    setFinalReport('');
    setCopyMessage(null);
    setDraftSavedMessage(null);
  };

  const goToAdjacentSection = (direction: -1 | 1) => {
    const idx = RETINA_SECTION_ORDER.indexOf(activeSection);
    const next = RETINA_SECTION_ORDER[idx + direction];
    if (next) setActiveSection(next);
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(finalReport);
      setCopyMessage('Laudo copiado.');
      setTimeout(() => setCopyMessage(null), 2500);
    } catch {
      setCopyMessage('Não foi possível copiar.');
      setTimeout(() => setCopyMessage(null), 2500);
    }
  };

  const saveDraftVisual = () => {
    setDraftSavedMessage('Rascunho salvo localmente (visual — sem persistência nesta versão).');
    setTimeout(() => setDraftSavedMessage(null), 3000);
  };

  return (
    <div className={`mx-auto max-w-7xl space-y-6 ${variant === 'embedded' ? 'p-4 md:p-6' : 'p-4 md:p-6'}`}>
      {variant === 'standalone' && (
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Laudo Guiado OftPay — Experimental
          </p>
          <h1 className="text-xl font-semibold text-gray-900">Mapeamento de Retina</h1>
          <p className="text-sm text-gray-600">
            Fluxo clínico por etapas: marque os achados em cada etapa e indique no mapa onde
            estão localizados quando solicitado.
          </p>
        </header>
      )}

      {variant === 'embedded' && (
        <p className="text-sm text-gray-600">
          Siga as etapas à esquerda. Ao marcar um achado que exige localização (ex.: drusas),
          clique no mapa para indicar onde está — o laudo é montado automaticamente.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(['OD', 'OE'] as const).map((eye) => (
          <button
            key={eye}
            type="button"
            onClick={() => setActiveEye(eye)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeEye === eye
                ? 'bg-violet-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {eye}
            <span className="ml-2 text-xs opacity-80">
              ({getCompletedSections(structuredByEye[eye], findings.filter((f) => f.eye === eye)).size}{' '}
              etapas)
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_1fr_340px] xl:grid-cols-[220px_1fr_380px]">
        <aside className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Etapas</p>
          <RetinaSectionStepper
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            completedSections={completedSections}
          />
        </aside>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <RetinaSectionForm
            eye={activeEye}
            section={activeSection}
            data={eyeStructured}
            findings={eyeFindings}
            placementMode={placementMode}
            onChange={handleStructuredChange}
            onLocalizedToggle={handleLocalizedToggle}
            onRequestPlacement={handleRequestPlacement}
          />

          {placementMode && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Localizar: {placementMode.label}</p>
                <p className="text-xs text-violet-700">
                  Clique no mapa à direita
                  {placementMode.allowMultiple
                    ? ' — você pode marcar vários pontos'
                    : ' — um ponto no mapa'}
                  .{' '}
                  <button
                    type="button"
                    className="underline hover:text-violet-900"
                    onClick={() => setPlacementMode(null)}
                  >
                    Cancelar
                  </button>
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => goToAdjacentSection(-1)}
              disabled={activeSection === 'vitreo'}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => goToAdjacentSection(1)}
              disabled={activeSection === 'conduta'}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {localizedFindings.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Achados localizados ({localizedFindings.length})
              </h3>
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {localizedFindings.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {RETINA_FINDING_TYPE_LABELS[f.type]}
                        {f.structuredKey && (
                          <span className="ml-1 text-xs font-normal text-violet-600">
                            ({f.structuredKey.split('.')[1]})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        {RETINA_REGION_LABELS[f.region]} · {RETINA_QUADRANT_LABELS[f.quadrant]}
                        {f.clockHour != null ? ` · ${f.clockHour}h` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFinding(f.id)}
                      className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50"
                      aria-label="Remover achado"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-medium text-gray-900">Mapa — {activeEye}</h2>
          <p className="mb-3 text-xs text-gray-500">
            {placementMode
              ? `Modo localização: ${placementMode.label} — clique no fundo de olho.`
              : vitreoBlocked && activeSection !== 'vitreo'
                ? 'Fundoscopia limitada pela opacidade intensa dos meios ópticos.'
                : 'Selecione um achado na etapa atual que exija localização para habilitar o mapa.'}
          </p>
          <RetinaMapSvg
            eye={activeEye}
            findings={findings}
            meiosOpticos={vitreoOverlay}
            activeSection={placementMode?.section ?? activeSection}
            mapClickEnabled={mapClickEnabled}
            placementLabel={placementMode?.label}
            onAddFinding={handleMapClick}
            onSelectMeiosOpticos={() => setActiveSection('vitreo')}
          />
          <button
            type="button"
            onClick={clearEyeFindings}
            disabled={eyeFindings.length === 0}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Eraser className="h-3.5 w-3.5" />
            Limpar achados localizados ({activeEye})
          </button>
        </section>
      </div>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-900">Texto do laudo</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar laudo
            </button>
            <button
              type="button"
              onClick={saveDraftVisual}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar rascunho
            </button>
          </div>
        </div>

        {copyMessage && <p className="text-xs text-green-700">{copyMessage}</p>}
        {draftSavedMessage && <p className="text-xs text-violet-700">{draftSavedMessage}</p>}

        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800">
          {generatedReport}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Texto final do laudo (editável)
          </label>
          <textarea
            value={finalReport}
            onChange={(e) => setFinalReport(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm leading-relaxed"
          />
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={resetEntireExam}
            disabled={!examHasData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Zerar exame e recomeçar
          </button>
        </div>
      </section>
    </div>
  );
}
