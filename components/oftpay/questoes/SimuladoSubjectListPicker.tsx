'use client';

import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import {
  countAvailableForSubjectAndDifficulty,
  countAvailableForTopicAndDifficulty,
  maxSimuladoQuantidade,
  parseQuantidadeInput,
  type SubjectGroupConfig,
} from '@/lib/oftpay/simuladoSubjectListPicker';
import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import { ChevronRight } from 'lucide-react';

function DisponiveisComTodas({
  disponiveis,
  quantidade,
  onSelectAll,
}: {
  disponiveis: number;
  quantidade: number;
  onSelectAll: () => void;
}) {
  const maxQty = maxSimuladoQuantidade(disponiveis);
  const canSelectAll = disponiveis > 0 && quantidade < maxQty;

  return (
    <span className="text-xs text-gray-500 pb-1.5 inline-flex items-center gap-1.5">
      {disponiveis} disp.
      {canSelectAll && (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-[10px] font-medium text-violet-600/75 hover:text-violet-700"
        >
          Todas
        </button>
      )}
    </span>
  );
}

interface SimuladoSubjectListPickerProps {
  publicadas: OftpayQuestaoDoc[];
  groups: SubjectGroupConfig[];
  onGroupsChange: (groups: SubjectGroupConfig[]) => void;
}

export default function SimuladoSubjectListPicker({
  publicadas,
  groups,
  onGroupsChange,
}: SimuladoSubjectListPickerProps) {
  const updateSubjectGroup = (key: string, patch: Partial<SubjectGroupConfig>) => {
    onGroupsChange(
      groups.map((group) => {
        if (group.key !== key) return group;
        const next = { ...group, ...patch };
        if (patch.included === true) {
          next.topics = next.topics.map((t) => ({ ...t, included: false }));
        }
        return next;
      })
    );
  };

  const updateTopicRow = (
    subjectKey: string,
    topicKey: string,
    patch: Partial<SubjectGroupConfig['topics'][number]>
  ) => {
    onGroupsChange(
      groups.map((group) => {
        if (group.key !== subjectKey) return group;
        const topics = group.topics.map((topic) => {
          if (topic.key !== topicKey) return topic;
          return { ...topic, ...patch };
        });
        const nextGroup: SubjectGroupConfig = { ...group, topics };
        if (patch.included === true) {
          nextGroup.included = false;
        }
        return nextGroup;
      })
    );
  };

  const toggleSubjectExpanded = (key: string) => {
    onGroupsChange(
      groups.map((group) =>
        group.key === key ? { ...group, expanded: !group.expanded } : group
      )
    );
  };

  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-500">Nenhum assunto com questões publicadas ainda.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Lista por assunto
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          Navegue pelos assuntos, expanda os tópicos e marque o que deseja incluir no simulado.
        </p>
      </div>

      <ul className="space-y-3 max-h-[520px] overflow-y-auto overscroll-y-contain pr-1">
        {groups.map((group) => {
          const selectedTopicsCount = group.topics.filter((t) => t.included).length;
          const subjectDisponiveis = countAvailableForSubjectAndDifficulty(
            publicadas,
            group.label,
            group.dificuldade
          );
          const isActive = group.included || selectedTopicsCount > 0;

          return (
            <li
              key={group.key}
              className={`rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-violet-300 bg-violet-50/40 shadow-sm ring-1 ring-violet-200/60'
                  : 'border-gray-200 bg-gray-50/30 hover:border-gray-300 hover:bg-white'
              }`}
            >
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-start gap-3">
                  <label className="flex items-start gap-2 min-w-[160px] flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={group.included}
                      onChange={(e) =>
                        updateSubjectGroup(group.key, { included: e.target.checked })
                      }
                      className="mt-1 rounded border-gray-300 text-violet-600"
                    />
                    <span>
                      <span className="inline-flex items-center gap-0.5">
                        <span className="text-sm font-semibold text-gray-900">{group.label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSubjectExpanded(group.key);
                          }}
                          className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                          aria-label={group.expanded ? 'Recolher tópicos' : 'Ver tópicos'}
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${group.expanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      </span>
                      <span className="text-xs text-gray-500 block">
                        {group.totalPublicadas} publicada(s) · {group.topics.length} tópico
                        {group.topics.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                  </label>

                  {group.included && (
                    <div className="flex flex-wrap gap-2 items-end w-full sm:w-auto">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                          Dificuldade
                        </label>
                        <select
                          value={group.dificuldade}
                          onChange={(e) => {
                            const dificuldade = e.target.value as QuestaoDificuldade;
                            const disp = countAvailableForSubjectAndDifficulty(
                              publicadas,
                              group.label,
                              dificuldade
                            );
                            updateSubjectGroup(group.key, {
                              dificuldade,
                              quantidade: Math.min(
                                group.quantidade,
                                maxSimuladoQuantidade(disp)
                              ),
                            });
                          }}
                          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white"
                        >
                          <option value="facil">Fácil</option>
                          <option value="medio">Médio</option>
                          <option value="dificil">Difícil</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                          Qtd.
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={maxSimuladoQuantidade(subjectDisponiveis)}
                          value={group.quantidade === 0 ? '' : group.quantidade}
                          onChange={(e) =>
                            updateSubjectGroup(group.key, {
                              quantidade: parseQuantidadeInput(
                                e.target.value,
                                maxSimuladoQuantidade(subjectDisponiveis)
                              ),
                            })
                          }
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <DisponiveisComTodas
                        disponiveis={subjectDisponiveis}
                        quantidade={group.quantidade}
                        onSelectAll={() =>
                          updateSubjectGroup(group.key, {
                            quantidade: maxSimuladoQuantidade(subjectDisponiveis),
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                {group.expanded && (
                  <div className="border-t border-gray-200/80 pt-3 space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Tópicos mapeados
                    </p>
                    <ul className="space-y-2">
                      {group.topics.map((topic) => {
                        const topicDisponiveis = countAvailableForTopicAndDifficulty(
                          publicadas,
                          topic.label,
                          topic.dificuldade,
                          group.label
                        );
                        const topicDisabled = group.included;

                        return (
                          <li
                            key={topic.key}
                            className={`rounded-lg border p-3 ${
                              topic.included && !topicDisabled
                                ? 'border-violet-200 bg-white'
                                : 'border-gray-100 bg-white/80'
                            } ${topicDisabled ? 'opacity-60' : ''}`}
                          >
                            <div className="flex flex-wrap items-start gap-3">
                              <label
                                className={`flex items-start gap-2 min-w-[140px] flex-1 ${
                                  topicDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={topicDisabled ? group.included : topic.included}
                                  disabled={topicDisabled}
                                  onChange={(e) =>
                                    updateTopicRow(group.key, topic.key, {
                                      included: e.target.checked,
                                    })
                                  }
                                  className="mt-0.5 rounded border-gray-300 text-violet-600 disabled:opacity-70"
                                />
                                <span>
                                  <span className="text-sm font-medium text-gray-900 block">
                                    {topic.label}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {topic.totalPublicadas} publicada(s)
                                  </span>
                                </span>
                              </label>

                              {topic.included && !topicDisabled && (
                                <div className="flex flex-wrap gap-2 items-end">
                                  <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                      Dificuldade
                                    </label>
                                    <select
                                      value={topic.dificuldade}
                                      onChange={(e) => {
                                        const dificuldade = e.target.value as QuestaoDificuldade;
                                        const disp = countAvailableForTopicAndDifficulty(
                                          publicadas,
                                          topic.label,
                                          dificuldade,
                                          group.label
                                        );
                                        updateTopicRow(group.key, topic.key, {
                                          dificuldade,
                                          quantidade: Math.min(
                                            topic.quantidade,
                                            maxSimuladoQuantidade(disp)
                                          ),
                                        });
                                      }}
                                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white"
                                    >
                                      <option value="facil">Fácil</option>
                                      <option value="medio">Médio</option>
                                      <option value="dificil">Difícil</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                      Qtd.
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={maxSimuladoQuantidade(topicDisponiveis)}
                                      value={topic.quantidade === 0 ? '' : topic.quantidade}
                                      onChange={(e) =>
                                        updateTopicRow(group.key, topic.key, {
                                          quantidade: parseQuantidadeInput(
                                            e.target.value,
                                            maxSimuladoQuantidade(topicDisponiveis)
                                          ),
                                        })
                                      }
                                      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white"
                                    />
                                  </div>
                                  <DisponiveisComTodas
                                    disponiveis={topicDisponiveis}
                                    quantidade={topic.quantidade}
                                    onSelectAll={() =>
                                      updateTopicRow(group.key, topic.key, {
                                        quantidade: maxSimuladoQuantidade(topicDisponiveis),
                                      })
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
