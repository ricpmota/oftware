'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Exercise } from '@/types/exercise';
import { ExerciseCatalogPanel } from '@/components/personal/create/ExerciseCatalogPanel';
import { PersonalCreateWorkoutDesktop } from '@/components/personal/create/PersonalCreateWorkoutDesktop';
import {
  catalogExerciseIsAdded,
  type SelectedExerciseDraft,
} from '@/lib/personal/workoutDraft';
import {
  createTemplateExerciseFromCatalog,
  draftToTemplateExercise,
  insertDuplicatedTemplateExercise,
  reorderTemplateExercises,
  templateExerciseGifUrl,
  templateExerciseToDraft,
  validatePersonalWorkoutTemplate,
  type PersonalWorkoutTemplate,
  type PersonalWorkoutTemplateExercise,
} from '@/lib/personal/planosTreino';
import {
  createDefaultTrainingSeries,
  formatTrainingSeriesSummary,
  sanitizeIntercalations,
  type TrainingExerciseSeries,
  type TrainingIntercalatedOccurrence,
} from '@/lib/personal/trainingExerciseSeries';
import {
  createIntercalatedOccurrence,
  insertIntercalatedOccurrence,
  repeatIntercalatedOccurrence,
} from '@/lib/personal/trainingIntercalation';
import { TreinosColorSwatches } from '@/components/metapersonal/treinos/TreinosColorSwatches';
import { normalizeTreinoColorKey, type TreinoColorKey } from '@/lib/metapersonal/treinosPlannerTheme';
import { LIGHT_EDITOR, type WorkoutEditorAppearance } from '@/components/personal/create/workoutEditorAppearance';

const FETCH_LIMIT = 300;

type FiltroPasta = 'bodyPart' | 'target' | 'equipment';

export function PersonalWorkoutTemplateEditor({
  initial,
  saving,
  readOnly = false,
  appearance = 'dark',
  fillViewport = false,
  defaultCor,
  onCancel,
  onSave,
  onDirtyChange,
}: {
  initial?: PersonalWorkoutTemplate | null;
  saving?: boolean;
  readOnly?: boolean;
  appearance?: WorkoutEditorAppearance;
  fillViewport?: boolean;
  defaultCor?: string;
  onCancel: () => void;
  onSave: (input: {
    id?: string;
    nome: string;
    descricao?: string;
    cor?: string;
    exercicios: PersonalWorkoutTemplateExercise[];
  }) => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [nome, setNome] = useState(initial?.nome || '');
  const [descricao, setDescricao] = useState(initial?.descricao || '');
  const [cor, setCor] = useState<TreinoColorKey>(
    normalizeTreinoColorKey(initial?.cor) || normalizeTreinoColorKey(defaultCor) || 'emerald'
  );
  const [exercicios, setExercicios] = useState<PersonalWorkoutTemplateExercise[]>(
    initial?.exercicios || []
  );
  const [expandedIds, setExpandedIds] = useState<string[]>(
    (initial?.exercicios || []).map((item) => item.id)
  );
  const [dirty, setDirty] = useState(false);
  const [intercalationPick, setIntercalationPick] = useState<{
    draftId: string;
    afterSeriesId: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [filtroPasta, setFiltroPasta] = useState<FiltroPasta>('bodyPart');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [equipments, setEquipments] = useState<string[]>([]);
  const [bodyPartCatalogExercises, setBodyPartCatalogExercises] = useState<Exercise[]>([]);
  const [exercisesResults, setExercisesResults] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  const markDirty = useCallback(() => {
    setDirty(true);
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [targetsRes, equipmentsRes, bodyPartsRes] = await Promise.all([
          fetch('/api/exercisedb/targets').then((r) => r.json()),
          fetch('/api/exercisedb/equipments').then((r) => r.json()),
          fetch('/api/exercisedb/bodyparts').then((r) => r.json()),
        ]);
        if (cancelled) return;
        setTargets(Array.isArray(targetsRes) ? targetsRes : []);
        setEquipments(Array.isArray(equipmentsRes) ? equipmentsRes : []);
        setBodyParts(Array.isArray(bodyPartsRes) ? bodyPartsRes : []);
      } catch {
        /* catálogo opcional no editor */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedBodyPart) {
      setBodyPartCatalogExercises([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/exercisedb/byBodyPart?bodyPart=${encodeURIComponent(selectedBodyPart)}&page=1&limit=${FETCH_LIMIT}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setBodyPartCatalogExercises(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setBodyPartCatalogExercises([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBodyPart]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoadingExercises(true);
      try {
        let url = '/api/exercises?limit=20';
        if (searchQuery.trim()) {
          url = `/api/exercisedb/search?name=${encodeURIComponent(searchQuery.trim())}&page=1&limit=${FETCH_LIMIT}`;
        } else if (selectedBodyPart) {
          url = `/api/exercisedb/byBodyPart?bodyPart=${encodeURIComponent(selectedBodyPart)}&page=1&limit=${FETCH_LIMIT}`;
        } else if (selectedTarget) {
          url = `/api/exercisedb/byTarget?target=${encodeURIComponent(selectedTarget)}&page=1&limit=${FETCH_LIMIT}`;
        } else if (selectedEquipment) {
          url = `/api/exercisedb/byEquipment?equipment=${encodeURIComponent(selectedEquipment)}&page=1&limit=${FETCH_LIMIT}`;
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const exercises = Array.isArray(data) ? data : [];
        const queryNorm = searchQuery.trim().toLowerCase();
        const filtered = exercises
          .map((ex: Exercise) => ({
            ...ex,
            gifUrl: templateExerciseGifUrl(ex.id),
          }))
          .filter((ex: Exercise) => {
            if (selectedBodyPart && String(ex.bodyPart || '').toLowerCase() !== selectedBodyPart.toLowerCase()) {
              return false;
            }
            if (selectedTarget && String(ex.target || '').toLowerCase() !== selectedTarget.toLowerCase()) {
              return false;
            }
            if (
              selectedEquipment &&
              String(ex.equipment || '').toLowerCase() !== selectedEquipment.toLowerCase()
            ) {
              return false;
            }
            if (queryNorm && !String(ex.name || '').toLowerCase().includes(queryNorm)) return false;
            return true;
          });
        setExercisesResults(filtered);
      } catch {
        setExercisesResults([]);
      } finally {
        setLoadingExercises(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedBodyPart, selectedTarget, selectedEquipment]);

  const availableTargets = useMemo(() => {
    if (!selectedBodyPart) return targets;
    const available = new Set(
      bodyPartCatalogExercises
        .filter((ex) => String(ex.bodyPart || '').toLowerCase() === selectedBodyPart.toLowerCase())
        .map((ex) => ex.target)
        .filter(Boolean)
    );
    return targets.filter((target) => available.has(target));
  }, [selectedBodyPart, targets, bodyPartCatalogExercises]);

  const availableEquipments = useMemo(() => {
    if (!selectedBodyPart) return equipments;
    const available = new Set(
      bodyPartCatalogExercises
        .filter((ex) => {
          if (String(ex.bodyPart || '').toLowerCase() !== selectedBodyPart.toLowerCase()) return false;
          if (selectedTarget && String(ex.target || '').toLowerCase() !== selectedTarget.toLowerCase()) {
            return false;
          }
          return true;
        })
        .map((ex) => ex.equipment)
        .filter(Boolean)
    );
    return equipments.filter((equipment) => available.has(equipment));
  }, [selectedBodyPart, selectedTarget, equipments, bodyPartCatalogExercises]);

  const drafts = useMemo(() => exercicios.map(templateExerciseToDraft), [exercicios]);

  const addExercise = (exercise: Exercise) => {
    if (intercalationPick) {
      const gifUrl = templateExerciseGifUrl(exercise.id);
      setExercicios((prev) =>
        prev.map((item) => {
          if (item.id !== intercalationPick.draftId) return item;
          const occurrence = createIntercalatedOccurrence({
            afterSeriesId: intercalationPick.afterSeriesId,
            slotOrder: (item.prescription.intercalations || []).filter(
              (entry) => entry.afterSeriesId === intercalationPick.afterSeriesId
            ).length,
            exercise,
            gifUrl,
          });
          return {
            ...item,
            prescription: {
              ...item.prescription,
              intercalations: insertIntercalatedOccurrence(
                item.prescription.series,
                item.prescription.intercalations,
                occurrence
              ),
            },
          };
        })
      );
      setIntercalationPick(null);
      markDirty();
      return;
    }
    if (catalogExerciseIsAdded(exercicios, exercise.id)) return;
    const created = createTemplateExerciseFromCatalog(exercise);
    created.order = exercicios.length;
    setExercicios([...exercicios, created]);
    setExpandedIds((prev) => [...prev, created.id]);
    markDirty();
  };

  const updateSeries = (draftId: string, series: TrainingExerciseSeries[]) => {
    setExercicios((prev) =>
      prev.map((item) => {
        if (item.id !== draftId) return item;
        const intercalations = sanitizeIntercalations(item.prescription.intercalations, series);
        return {
          ...item,
          prescription: {
            series,
            ...(intercalations.length > 0 ? { intercalations } : {}),
          },
        };
      })
    );
    markDirty();
  };

  const updateIntercalations = (
    draftId: string,
    intercalations: TrainingIntercalatedOccurrence[]
  ) => {
    setExercicios((prev) =>
      prev.map((item) => {
        if (item.id !== draftId) return item;
        const next = sanitizeIntercalations(intercalations, item.prescription.series);
        return {
          ...item,
          prescription: {
            ...item.prescription,
            ...(next.length > 0 ? { intercalations: next } : { intercalations: undefined }),
          },
        };
      })
    );
    markDirty();
  };

  const updateTrainerNote = (draftId: string, trainerNote: string) => {
    setExercicios(
      exercicios.map((item) =>
        item.id === draftId ? { ...item, trainerNote } : item
      )
    );
    markDirty();
  };

  const catalog = (layout: 'grid' | 'list') => (
    <ExerciseCatalogPanel
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      selectedBodyPart={selectedBodyPart}
      selectedTarget={selectedTarget}
      selectedEquipment={selectedEquipment}
      criarFiltroPastaAtiva={filtroPasta}
      onFiltroPastaAtivaChange={setFiltroPasta}
      bodyParts={bodyParts}
      availableTargets={availableTargets}
      availableEquipments={availableEquipments}
      onBodyPartChange={(value) => {
        setSelectedBodyPart(value);
        setSelectedTarget('');
        setSelectedEquipment('');
        setSearchQuery('');
        setExercisesResults([]);
        if (value) setFiltroPasta('target');
      }}
      onTargetChange={(value) => {
        setSelectedTarget(value);
        setSelectedEquipment('');
        if (value) setFiltroPasta('equipment');
      }}
      onEquipmentChange={setSelectedEquipment}
      exercises={exercisesResults}
      loading={loadingExercises}
      selectedExercises={exercicios}
      onAdd={addExercise}
      readOnly={readOnly}
      layout={layout}
      pickMode={intercalationPick ? 'intercalate' : 'main'}
      onCancelPick={() => setIntercalationPick(null)}
      appearance={appearance}
    />
  );

  const canSave =
    !saving &&
    validatePersonalWorkoutTemplate({ nome, exercicios }).ok;

  const light = appearance === 'light';

  return (
    <div className={`flex flex-col gap-3 ${fillViewport ? 'h-full min-h-0 flex-1' : 'lg:flex-1 lg:min-h-0'}`}>
      <div
        className={`flex items-center gap-3 shrink-0 ${
          light ? `rounded-xl border px-3 py-2 ${LIGHT_EDITOR.panel}` : ''
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (dirty) {
              const ok = confirm('Há alterações não salvas neste plano. Deseja sair mesmo assim?');
              if (!ok) return;
            }
            onCancel();
          }}
          className={`h-9 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
            light
              ? LIGHT_EDITOR.btnSecondary
              : 'border border-white/15 bg-white/10 text-[#E8EDED] hover:bg-white/15'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          {light ? 'Voltar' : 'Biblioteca'}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${light ? LIGHT_EDITOR.title : 'text-[#E8EDED]'}`}>
            {readOnly ? 'Visualizar treino' : initial?.id ? 'Editar treino' : 'Novo treino'}
          </p>
          <p className={`text-[11px] truncate ${light ? LIGHT_EDITOR.muted : 'text-[#E8EDED]/55'}`}>
            {nome.trim() || (light ? 'Defina o nome, a cor e os exercícios' : 'Novo plano')}
          </p>
        </div>
      </div>

      <PersonalCreateWorkoutDesktop
        responsive
        fillViewport={fillViewport}
        appearance={appearance}
        catalog={catalog('list')}
        title={nome || 'Plano sendo montado'}
        exercises={drafts}
        expandedIds={expandedIds}
        gifUrlFor={(exercise: SelectedExerciseDraft) => templateExerciseGifUrl(exercise.id)}
        readOnly={readOnly}
        dirty={dirty}
        saving={saving}
        canSave={!readOnly && canSave}
        saveLabel={initial?.id ? 'Salvar plano' : 'Criar plano'}
        emptyTitle="Seu plano ainda está vazio."
        emptyHint="Escolha exercícios no catálogo para montar este modelo."
        headerExtra={
          <>
            <label className={`block text-[10px] font-semibold uppercase tracking-[0.08em] ${light ? LIGHT_EDITOR.faint : 'text-[#E8EDED]/45'}`}>
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => {
                if (readOnly) return;
                setNome(e.target.value);
                markDirty();
              }}
              readOnly={readOnly}
              placeholder="Nome do plano"
              className={`w-full h-9 px-2.5 text-xs rounded-lg outline-none ${
                light
                  ? LIGHT_EDITOR.input
                  : 'border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 focus:ring-2 focus:ring-[#4CCB7A]/35'
              }`}
            />
            <label className={`block text-[10px] font-semibold uppercase tracking-[0.08em] ${light ? LIGHT_EDITOR.faint : 'text-[#E8EDED]/45'}`}>
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => {
                if (readOnly) return;
                setDescricao(e.target.value);
                markDirty();
              }}
              readOnly={readOnly}
              placeholder="Descrição (opcional)"
              rows={2}
              className={`w-full px-2.5 py-2 text-xs rounded-lg outline-none resize-none ${
                light
                  ? LIGHT_EDITOR.input
                  : 'border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 focus:ring-2 focus:ring-[#4CCB7A]/35'
              }`}
            />
            <div className={light ? `rounded-lg border px-2.5 py-2 ${LIGHT_EDITOR.panelMuted}` : ''}>
              <span className={`mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] ${light ? LIGHT_EDITOR.faint : 'text-[#E8EDED]/60'}`}>
                Cor do treino
              </span>
              <TreinosColorSwatches
                value={cor}
                appearance={appearance === 'light' ? 'light' : 'dark'}
                size={light ? 'md' : 'sm'}
                disabled={readOnly}
                onChange={(next) => {
                  if (readOnly) return;
                  setCor(next);
                  markDirty();
                }}
              />
            </div>
          </>
        }
        onToggleExpanded={(draftId) => {
          setExpandedIds((prev) =>
            prev.includes(draftId) ? prev.filter((id) => id !== draftId) : [...prev, draftId]
          );
        }}
        onSeriesChange={updateSeries}
        onIntercalationsChange={updateIntercalations}
        onPickIntercalation={(draftId, afterSeriesId) => {
          if (readOnly) return;
          setIntercalationPick({ draftId, afterSeriesId });
        }}
        onRepeatIntercalation={(draftId, afterSeriesId, source) => {
          if (readOnly) return;
          setExercicios((prev) =>
            prev.map((item) => {
              if (item.id !== draftId) return item;
              return {
                ...item,
                prescription: {
                  ...item.prescription,
                  intercalations: repeatIntercalatedOccurrence(
                    item.prescription.series,
                    item.prescription.intercalations,
                    afterSeriesId,
                    source
                  ),
                },
              };
            })
          );
          markDirty();
        }}
        onTrainerNoteChange={updateTrainerNote}
        onDuplicate={(draftId) => {
          const next = insertDuplicatedTemplateExercise(exercicios, draftId);
          const index = exercicios.findIndex((item) => item.id === draftId);
          const copy = index >= 0 ? next[index + 1] : undefined;
          setExercicios(next);
          if (copy) setExpandedIds((prev) => [...prev, copy.id]);
          markDirty();
        }}
        onRemove={(draftId) => {
          setExercicios(exercicios.filter((item) => item.id !== draftId).map((item, order) => ({ ...item, order })));
          setExpandedIds((prev) => prev.filter((id) => id !== draftId));
          markDirty();
        }}
        onReorder={(from, to) => {
          setExercicios(reorderTemplateExercises(exercicios, from, to));
          markDirty();
        }}
        onSave={async () => {
          const check = validatePersonalWorkoutTemplate({ nome, exercicios });
          if (!check.ok) {
            alert(check.message);
            return;
          }
          await onSave({
            id: initial?.id,
            nome: nome.trim(),
            descricao: descricao.trim() || undefined,
            cor,
            exercicios: exercicios.map((item, order) =>
              draftToTemplateExercise(templateExerciseToDraft(item), order)
            ),
          });
          setDirty(false);
          onDirtyChange?.(false);
        }}
      />
    </div>
  );
}

export default PersonalWorkoutTemplateEditor;
