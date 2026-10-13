'use client';

import { Pencil, Plus } from 'lucide-react';
import { getWorkoutDraftSummary } from '@/lib/personal/workoutDraft';
import { resolveTreinoColor } from '@/lib/metapersonal/treinosPlannerTheme';
import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';

type Props = {
  templates: PersonalWorkoutTemplate[];
  loading: boolean;
  selectedTemplateId: string | null;
  onSelect: (template: PersonalWorkoutTemplate) => void;
  onNovoTreino: () => void;
  onEdit: (template: PersonalWorkoutTemplate) => void;
};

export function TreinosSalvosCarousel({
  templates,
  loading,
  selectedTemplateId,
  onSelect,
  onNovoTreino,
  onEdit,
}: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Treinos salvos</h2>
        <p className="text-sm text-gray-500">Sua biblioteca de treinos reutilizáveis.</p>
      </div>

      <div className="flex items-stretch gap-3">
        <button
          type="button"
          onClick={onNovoTreino}
          className="flex h-28 w-40 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/70 text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-50"
        >
          <Plus className="h-5 w-5" />
          <span className="mt-1.5 text-sm font-semibold">+ Novo treino</span>
        </button>

        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex min-w-min gap-3">
            {loading ? (
              <div className="flex h-28 min-w-[200px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-400">
                Carregando biblioteca…
              </div>
            ) : templates.length === 0 ? (
              <div className="flex h-28 min-w-[220px] items-center rounded-xl border border-dashed border-gray-300 bg-white px-4 text-sm text-gray-500">
                Nenhum treino salvo ainda.
              </div>
            ) : (
              templates.map((template) => {
                const id = template.id || template.nome;
                const selected = selectedTemplateId === template.id;
                const summary = getWorkoutDraftSummary(template.exercicios);
                const tone = resolveTreinoColor(template.cor, template.nome);
                return (
                  <article
                    key={id}
                    className={`relative flex h-28 w-56 shrink-0 flex-col overflow-hidden rounded-2xl border bg-white p-3 pl-3.5 shadow-sm transition ${
                      selected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'border-gray-200 hover:border-emerald-300 hover:shadow'
                    }`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-[3px] ${tone.accent}`} aria-hidden />
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        onClick={() => onSelect(template)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="w-full truncate text-sm font-semibold text-gray-900">{template.nome}</p>
                        {template.descricao ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{template.descricao}</p>
                        ) : (
                          <p className="mt-0.5 text-xs text-gray-400">Sem descrição</p>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(template)}
                        className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                        aria-label={`Editar ${template.nome}`}
                        title="Editar treino"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className={`mt-auto text-xs font-medium ${tone.badge}`}>
                      {summary.exerciseCount} exercício{summary.exerciseCount === 1 ? '' : 's'}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
