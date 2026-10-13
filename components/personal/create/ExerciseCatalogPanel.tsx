'use client';

import { CheckCircle, Dumbbell, Plus, Search } from 'lucide-react';
import type { Exercise } from '@/types/exercise';
import {
  translateBodyPart,
  translateEquipment,
  translateExerciseName,
  translateTarget,
} from '@/data/exerciseTranslations';
import { catalogExerciseIsAdded } from '@/lib/personal/workoutDraft';
import { LIGHT_EDITOR, type WorkoutEditorAppearance } from '@/components/personal/create/workoutEditorAppearance';

type FiltroPasta = 'bodyPart' | 'target' | 'equipment';

type ExerciseCatalogPanelProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBodyPart: string;
  selectedTarget: string;
  selectedEquipment: string;
  criarFiltroPastaAtiva: FiltroPasta;
  onFiltroPastaAtivaChange: (value: FiltroPasta) => void;
  bodyParts: string[];
  availableTargets: string[];
  availableEquipments: string[];
  onBodyPartChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onEquipmentChange: (value: string) => void;
  exercises: Exercise[];
  loading: boolean;
  selectedExercises: Array<{ id?: string; exerciseId?: string }>;
  onAdd: (exercise: Exercise) => void;
  readOnly?: boolean;
  layout?: 'grid' | 'list';
  pickMode?: 'main' | 'intercalate';
  onCancelPick?: () => void;
  appearance?: WorkoutEditorAppearance;
};

export function ExerciseCatalogPanel({
  searchQuery,
  onSearchQueryChange,
  selectedBodyPart,
  selectedTarget,
  selectedEquipment,
  criarFiltroPastaAtiva,
  onFiltroPastaAtivaChange,
  bodyParts,
  availableTargets,
  availableEquipments,
  onBodyPartChange,
  onTargetChange,
  onEquipmentChange,
  exercises,
  loading,
  selectedExercises,
  onAdd,
  readOnly = false,
  layout = 'grid',
  pickMode = 'main',
  onCancelPick,
  appearance = 'dark',
}: ExerciseCatalogPanelProps) {
  const isList = layout === 'list';
  const intercalate = pickMode === 'intercalate';
  const light = appearance === 'light';

  return (
    <section
      className={`min-w-0 flex flex-col overflow-hidden h-full min-h-full rounded-xl border ${
        light ? LIGHT_EDITOR.panel : 'border-white/10 bg-[#0A1F44]/70'
      }`}
    >
      <div
        className={`px-3 py-2 flex items-center justify-between gap-2 shrink-0 border-b ${
          light ? `border-zinc-200 ${LIGHT_EDITOR.header}` : 'border-white/10'
        }`}
      >
        <h3 className={`text-sm font-semibold ${light ? LIGHT_EDITOR.title : 'text-[#E8EDED]'}`}>
          {intercalate ? 'Selecionar exercício para intercalar' : 'Catálogo'}
        </h3>
        {intercalate && onCancelPick ? (
          <button
            type="button"
            onClick={onCancelPick}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
              light ? LIGHT_EDITOR.btnSecondary : 'text-[#E8EDED]/70 hover:text-[#E8EDED]'
            }`}
          >
            Cancelar
          </button>
        ) : (
          <span className={`text-[10px] ${light ? LIGHT_EDITOR.faint : 'text-[#E8EDED]/55'}`}>
            {exercises.length} resultados
          </span>
        )}
      </div>

      <div className={`grid grid-cols-3 shrink-0 border-b ${light ? 'border-zinc-200' : 'border-white/10'}`}>
        {(
          [
            { key: 'bodyPart', label: 'Corpo', selected: selectedBodyPart.length > 0 },
            { key: 'target', label: 'Músculo', selected: selectedTarget.length > 0 },
            { key: 'equipment', label: 'Equip.', selected: selectedEquipment.length > 0 },
          ] as const
        ).map(({ key, label, selected }) => {
          const isAtiva = criarFiltroPastaAtiva === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onFiltroPastaAtivaChange(key)}
              className={`py-2 text-center text-[11px] font-semibold border-r last:border-r-0 ${
                light ? 'border-zinc-200' : 'border-white/10'
              } ${
                isAtiva
                  ? light
                    ? LIGHT_EDITOR.tabActive
                    : 'bg-[#4CCB7A]/14 text-[#4CCB7A]'
                  : selected
                    ? light
                      ? LIGHT_EDITOR.tabHasValue
                      : 'text-[#4CCB7A]/90'
                    : light
                      ? LIGHT_EDITOR.tabIdle
                      : 'text-[#E8EDED]/55'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className={`p-2 space-y-2 shrink-0 border-b ${light ? `border-zinc-200 ${LIGHT_EDITOR.header}` : 'border-white/10'}`}>
        {criarFiltroPastaAtiva === 'bodyPart' && (
          <select
            value={selectedBodyPart}
            onChange={(e) => onBodyPartChange(e.target.value)}
            className={`w-full h-9 px-2 text-xs rounded-lg outline-none ${
              light
                ? LIGHT_EDITOR.input
                : 'border border-white/15 bg-white/10 text-[#E8EDED]'
            }`}
          >
            <option value="">Parte do corpo</option>
            {bodyParts.map((bp) => (
              <option key={bp} value={bp}>
                {translateBodyPart(bp)}
              </option>
            ))}
          </select>
        )}
        {criarFiltroPastaAtiva === 'target' && (
          <select
            value={selectedTarget}
            onChange={(e) => onTargetChange(e.target.value)}
            className={`w-full h-9 px-2 text-xs rounded-lg outline-none ${
              light
                ? LIGHT_EDITOR.input
                : 'border border-white/15 bg-white/10 text-[#E8EDED]'
            }`}
          >
            <option value="">Músculo alvo</option>
            {availableTargets.map((t) => {
              const translated = translateTarget(t);
              return (
                <option key={t} value={t}>
                  {translated.charAt(0).toUpperCase() + translated.slice(1)}
                </option>
              );
            })}
          </select>
        )}
        {criarFiltroPastaAtiva === 'equipment' && (
          <select
            value={selectedEquipment}
            onChange={(e) => onEquipmentChange(e.target.value)}
            className={`w-full h-9 px-2 text-xs rounded-lg outline-none ${
              light
                ? LIGHT_EDITOR.input
                : 'border border-white/15 bg-white/10 text-[#E8EDED]'
            }`}
          >
            <option value="">Equipamento</option>
            {availableEquipments.map((eq) => (
              <option key={eq} value={eq}>
                {translateEquipment(eq)}
              </option>
            ))}
          </select>
        )}
        <div className="relative">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${light ? 'text-zinc-400' : 'text-[#4CCB7A]'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Buscar exercício..."
            className={`w-full h-9 pl-8 pr-2 text-xs rounded-lg outline-none ${
              light
                ? LIGHT_EDITOR.input
                : 'border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 focus:ring-2 focus:ring-[#4CCB7A]/35'
            }`}
          />
        </div>
      </div>

      <div className={`p-2 min-h-0 flex-1 overflow-y-auto ${light ? LIGHT_EDITOR.list : ''}`}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${light ? 'border-zinc-700' : 'border-[#4CCB7A]'}`} />
          </div>
        ) : exercises.length > 0 ? (
          <div className={isList ? 'space-y-1.5' : 'grid grid-cols-2 gap-1.5'}>
            {exercises.map((exercise) => {
              const isAdded = intercalate
                ? false
                : catalogExerciseIsAdded(selectedExercises, exercise.id);
              const disabled = isAdded || readOnly;
              if (isList) {
                return (
                  <div
                    key={exercise.id}
                    className={`flex items-center gap-2 rounded-lg border overflow-hidden ${
                      isAdded
                        ? light
                          ? LIGHT_EDITOR.cardAdded
                          : 'border-[#4CCB7A]/25 bg-[#4CCB7A]/[0.07]'
                        : light
                          ? LIGHT_EDITOR.card
                          : 'border-white/[0.08] bg-white/[0.03]'
                    }`}
                  >
                    <div
                      className={`relative shrink-0 ${
                        light ? 'h-28 w-28 bg-zinc-200' : 'h-14 w-14 bg-white/5'
                      }`}
                    >
                      {exercise.gifUrl ? (
                        <img
                          src={exercise.gifUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Dumbbell className={light ? 'h-8 w-8 text-zinc-400' : 'w-4 h-4 text-white/20'} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-1.5 pr-1">
                      <p
                        className={`line-clamp-2 leading-tight font-medium ${
                          light ? 'text-sm text-zinc-900' : 'text-[11px] text-[#E8EDED]'
                        }`}
                      >
                        {translateExerciseName(exercise.name)}
                      </p>
                      <p className={`truncate mt-0.5 ${light ? 'text-[11px] text-zinc-500' : 'text-[9px] text-[#E8EDED]/45'}`}>
                        {translateTarget(exercise.target)}
                        {exercise.equipment ? ` · ${translateEquipment(exercise.equipment)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => !disabled && onAdd(exercise)}
                      disabled={disabled}
                      aria-label={
                        isAdded
                          ? `${translateExerciseName(exercise.name)} já adicionado`
                          : `Adicionar ${translateExerciseName(exercise.name)}`
                      }
                      className={`mr-1.5 flex shrink-0 items-center justify-center rounded-full ${
                        light ? 'h-10 w-10' : 'h-8 w-8'
                      } ${
                        isAdded
                          ? light
                            ? LIGHT_EDITOR.btnAdded
                            : 'bg-[#4CCB7A]/90 text-[#0A1F44]'
                          : light
                            ? `${LIGHT_EDITOR.btnAdd} disabled:opacity-40`
                            : 'bg-white/10 text-[#E8EDED] hover:bg-[#4CCB7A]/85 hover:text-[#0A1F44] disabled:opacity-40'
                      }`}
                    >
                      {isAdded ? (
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.25} />
                      ) : (
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
                      )}
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => !disabled && onAdd(exercise)}
                  disabled={disabled}
                  aria-label={
                    isAdded
                      ? `${translateExerciseName(exercise.name)} já adicionado`
                      : `Adicionar ${translateExerciseName(exercise.name)}`
                  }
                  className={`group relative text-left rounded-xl border overflow-hidden transition-all duration-200 ${
                    isAdded
                      ? 'border-[#4CCB7A]/25 bg-[#4CCB7A]/[0.07] opacity-70'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] active:scale-[0.98] disabled:opacity-50'
                  }`}
                >
                  {exercise.gifUrl ? (
                    <div className="relative w-full aspect-[4/3] bg-white/5">
                      <img
                        src={exercise.gifUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0A1F44]/70 to-transparent pointer-events-none" />
                      <span
                        className={`absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md ${
                          isAdded
                            ? 'bg-[#4CCB7A]/90 text-[#0A1F44]'
                            : 'bg-black/35 text-white/90 ring-1 ring-white/15 group-hover:bg-[#4CCB7A]/85 group-hover:text-[#0A1F44]'
                        }`}
                        aria-hidden
                      >
                        {isAdded ? (
                          <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.25} />
                        ) : (
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[4/3] bg-white/[0.04] flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-white/20" />
                    </div>
                  )}
                  <div className="p-1.5 space-y-0.5">
                    <p className="text-[11px] font-medium text-[#E8EDED]/95 line-clamp-2 leading-tight min-h-[2rem]">
                      {translateExerciseName(exercise.name)}
                    </p>
                    <p className="text-[9px] text-[#E8EDED]/45 truncate">
                      {translateTarget(exercise.target)}
                      {exercise.equipment ? ` · ${translateEquipment(exercise.equipment)}` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className={`text-center py-6 text-xs ${light ? LIGHT_EDITOR.faint : 'text-[#E8EDED]/50'}`}>
            Use os filtros para encontrar exercícios.
          </p>
        )}
      </div>
    </section>
  );
}

export default ExerciseCatalogPanel;
