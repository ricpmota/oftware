'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  ChoiceButton,
  FieldLabel,
  inputClassName,
} from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import {
  META_CHAT_STEP_COMORBIDADES,
  META_CHAT_STEP_DIAGNOSTICO,
  META_CHAT_STEP_MOTIVACAO,
  META_CHAT_STEP_RISCOS,
  META_CHAT_STEP_SINTOMAS_GI,
  META_CHAT_STEP_DEPRESSAO,
  META_CHAT_STEP_IDEACAO_SUICIDA,
  META_CHAT_STEP_TIREOIDE,
  MOTIVACAO_OPTIONS,
  SINTOMAS_GI_OPTIONS,
  TIREOIDE_OPTIONS,
  filterRiskQuestionsForSexo,
  riskOptionLabel,
} from '@/lib/meta/metaChatInicial';
import type { RiskOption } from '@/lib/meta/metaChatInicial/constants';
import DiagnosticoCondicoesPicker from '@/components/meta/DiagnosticoCondicoesPicker';
import ComorbidadesChecklist from '@/components/meta/ComorbidadesChecklist';
import CirurgiasChecklist from '@/components/meta/CirurgiasChecklist';
import MedicamentosDiabetesPicker from '@/components/meta/MedicamentosDiabetesPicker';
import { comRespostaTriagemHumor, respostaDepressao, respostaIdeacao, TRIAGEM_SIM_NAO } from '@/lib/meta/metaChatInicial/triagemHumor';

export type AnamneseV2SectionId =
  | 'motivacao'
  | 'diagnostico'
  | 'medicamentosDiabetes'
  | 'comorbidades'
  | 'cirurgias'
  | 'medicacoes'
  | 'alergias'
  | 'riscos'
  | 'tireoide'
  | 'sintomasGi'
  | 'triagemDepressao'
  | 'triagemIdeacao';

type Props = {
  sectionId: AnamneseV2SectionId;
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
};

export function AnamneseV2EditUI({ sectionId, paciente, setPaciente }: Props) {
  const dc = paciente.dadosClinicos;

  if (sectionId === 'motivacao') {
    const m = (dc?.motivacao || {}) as Record<string, boolean>;
    return (
      <div className="space-y-3">
        <div className="space-y-2.5">
          {MOTIVACAO_OPTIONS.map(({ key, label }) => (
            <ChoiceButton
              key={key}
              selected={!!m[key]}
              onClick={() =>
                setPaciente((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    motivacao: { ...(p.dadosClinicos?.motivacao || {}), [key]: !m[key] },
                  },
                }))
              }
            >
              {label}
            </ChoiceButton>
          ))}
        </div>
        {m.outro && (
          <input
            type="text"
            className={inputClassName}
            value={dc?.motivacaoOutro || ''}
            onChange={(e) =>
              setPaciente((p) => ({
                ...p,
                dadosClinicos: { ...p.dadosClinicos, motivacaoOutro: e.target.value },
              }))
            }
            placeholder="Qual?"
          />
        )}
      </div>
    );
  }

  if (sectionId === 'diagnostico') {
    return <DiagnosticoCondicoesPicker paciente={paciente} setPaciente={setPaciente} />;
  }

  if (sectionId === 'medicamentosDiabetes') {
    return <MedicamentosDiabetesPicker paciente={paciente} setPaciente={setPaciente} />;
  }

  if (sectionId === 'comorbidades') {
    return <ComorbidadesChecklist paciente={paciente} setPaciente={setPaciente} />;
  }

  if (sectionId === 'cirurgias') {
    return <CirurgiasChecklist paciente={paciente} setPaciente={setPaciente} />;
  }

  if (sectionId === 'medicacoes') {
    const meds = dc?.medicacoesUsoAtual || [];
    return (
      <div className="space-y-3">
        {meds.map((med, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1">
              <FieldLabel>Categoria</FieldLabel>
              <select
                value={med.categoria}
                onChange={(e) => {
                  const next = [...meds];
                  next[index] = { ...med, categoria: e.target.value as typeof med.categoria };
                  setPaciente((p) => ({
                    ...p,
                    dadosClinicos: { ...p.dadosClinicos, medicacoesUsoAtual: next },
                  }));
                }}
                className={inputClassName}
              >
                <option value="metformina">Metformina</option>
                <option value="sglt2i">SGLT2i (dapagliflozina/empagliflozina)</option>
                <option value="insulina">Insulina basal/bolus</option>
                <option value="statina">Estatina</option>
                <option value="anti_hipertensivo">Anti-hipertensivo (IECA/BRA, BCC, tiazídico)</option>
                <option value="antidepressivo">Antidepressivo/ansiolítico</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <FieldLabel>Fármaco</FieldLabel>
              <input
                type="text"
                className={inputClassName}
                value={med.nomeFarmaco}
                onChange={(e) => {
                  const next = [...meds];
                  next[index] = { ...med, nomeFarmaco: e.target.value };
                  setPaciente((p) => ({
                    ...p,
                    dadosClinicos: { ...p.dadosClinicos, medicacoesUsoAtual: next },
                  }));
                }}
                placeholder="Nome do fármaco"
              />
            </div>
            <div className="w-full sm:w-28">
              <FieldLabel>Dose</FieldLabel>
              <input
                type="text"
                className={inputClassName}
                value={med.dose}
                onChange={(e) => {
                  const next = [...meds];
                  next[index] = { ...med, dose: e.target.value };
                  setPaciente((p) => ({
                    ...p,
                    dadosClinicos: { ...p.dadosClinicos, medicacoesUsoAtual: next },
                  }));
                }}
                placeholder="Dose"
              />
            </div>
            <div className="w-full sm:w-28">
              <FieldLabel>Frequência</FieldLabel>
              <input
                type="text"
                className={inputClassName}
                value={med.frequencia}
                onChange={(e) => {
                  const next = [...meds];
                  next[index] = { ...med, frequencia: e.target.value };
                  setPaciente((p) => ({
                    ...p,
                    dadosClinicos: { ...p.dadosClinicos, medicacoesUsoAtual: next },
                  }));
                }}
                placeholder="Freq."
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setPaciente((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    medicacoesUsoAtual: meds.filter((_, i) => i !== index),
                  },
                }))
              }
              className="self-end rounded-lg p-2 text-red-600 hover:bg-red-50"
              aria-label="Remover medicação"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setPaciente((p) => ({
              ...p,
              dadosClinicos: {
                ...p.dadosClinicos,
                medicacoesUsoAtual: [
                  ...(p.dadosClinicos?.medicacoesUsoAtual || []),
                  { categoria: 'outro', nomeFarmaco: '', dose: '', frequencia: '' },
                ],
              },
            }))
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          <Plus className="h-4 w-4" />
          Adicionar medicação
        </button>
      </div>
    );
  }

  if (sectionId === 'alergias') {
    const al = dc?.alergias;
    return (
      <div className="space-y-3">
        <ChoiceButton
          selected={!!al?.semAlergias}
          onClick={() =>
            setPaciente((p) => ({
              ...p,
              dadosClinicos: {
                ...p.dadosClinicos,
                alergias: { ...p.dadosClinicos?.alergias, semAlergias: !al?.semAlergias },
              },
            }))
          }
        >
          Sem alergias conhecidas
        </ChoiceButton>
        <ChoiceButton
          selected={!!al?.medicamentosa}
          onClick={() =>
            setPaciente((p) => ({
              ...p,
              dadosClinicos: {
                ...p.dadosClinicos,
                alergias: {
                  ...p.dadosClinicos?.alergias,
                  medicamentosa: al?.medicamentosa ? undefined : { farmaco: '', reacao: '' },
                },
              },
            }))
          }
        >
          Medicamentosa
        </ChoiceButton>
        {al?.medicamentosa && (
          <div className="space-y-2 pl-1">
            <input
              type="text"
              className={inputClassName}
              value={al.medicamentosa.farmaco || ''}
              onChange={(e) =>
                setPaciente((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    alergias: {
                      ...p.dadosClinicos?.alergias,
                      medicamentosa: {
                        ...p.dadosClinicos?.alergias?.medicamentosa!,
                        farmaco: e.target.value,
                      },
                    },
                  },
                }))
              }
              placeholder="Fármaco"
            />
            <input
              type="text"
              className={inputClassName}
              value={al.medicamentosa.reacao || ''}
              onChange={(e) =>
                setPaciente((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    alergias: {
                      ...p.dadosClinicos?.alergias,
                      medicamentosa: {
                        ...p.dadosClinicos?.alergias?.medicamentosa!,
                        reacao: e.target.value,
                      },
                    },
                  },
                }))
              }
              placeholder="Reação"
            />
          </div>
        )}
        <ChoiceButton
          selected={al?.alimento !== undefined}
          onClick={() =>
            setPaciente((p) => ({
              ...p,
              dadosClinicos: {
                ...p.dadosClinicos,
                alergias: {
                  ...p.dadosClinicos?.alergias,
                  alimento: al?.alimento !== undefined ? undefined : '',
                },
              },
            }))
          }
        >
          Alimento
        </ChoiceButton>
        {al?.alimento !== undefined && (
          <input
            type="text"
            className={inputClassName}
            value={al.alimento || ''}
            onChange={(e) =>
              setPaciente((p) => ({
                ...p,
                dadosClinicos: {
                  ...p.dadosClinicos,
                  alergias: { ...p.dadosClinicos?.alergias, alimento: e.target.value },
                },
              }))
            }
            placeholder="Especificar alimento"
          />
        )}
        <ChoiceButton
          selected={al?.latexAdesivo !== undefined}
          onClick={() =>
            setPaciente((p) => ({
              ...p,
              dadosClinicos: {
                ...p.dadosClinicos,
                alergias: {
                  ...p.dadosClinicos?.alergias,
                  latexAdesivo: al?.latexAdesivo !== undefined ? undefined : '',
                },
              },
            }))
          }
        >
          Látex/adesivo
        </ChoiceButton>
        {al?.latexAdesivo !== undefined && (
          <input
            type="text"
            className={inputClassName}
            value={al.latexAdesivo || ''}
            onChange={(e) =>
              setPaciente((p) => ({
                ...p,
                dadosClinicos: {
                  ...p.dadosClinicos,
                  alergias: { ...p.dadosClinicos?.alergias, latexAdesivo: e.target.value },
                },
              }))
            }
            placeholder="Especificar"
          />
        )}
      </div>
    );
  }

  if (sectionId === 'riscos') {
    const sexo = paciente.dadosIdentificacao?.sexoBiologico;
    const questions = filterRiskQuestionsForSexo(sexo);
    const riscos = (dc?.riscos || {}) as Record<string, RiskOption | string>;

    return (
      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.key} className="space-y-2">
            <FieldLabel>{q.label}</FieldLabel>
            {q.hint && <p className="text-xs text-slate-500">{q.hint}</p>}
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <ChoiceButton
                  key={opt}
                  selected={riscos[q.key] === opt}
                  onClick={() =>
                    setPaciente((p) => ({
                      ...p,
                      dadosClinicos: {
                        ...p.dadosClinicos,
                        riscos: {
                          ...(p.dadosClinicos?.riscos || {}),
                          [q.key]: opt,
                        } as PacienteCompleto['dadosClinicos']['riscos'],
                      },
                    }))
                  }
                >
                  {riskOptionLabel(opt)}
                </ChoiceButton>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sectionId === 'tireoide') {
    const selected = dc?.historiaTireoidiana;
    return (
      <div className="space-y-3">
        <div className="space-y-2.5">
          {TIREOIDE_OPTIONS.map(({ value, label }) => (
            <ChoiceButton
              key={value}
              selected={selected === value}
              onClick={() =>
                setPaciente((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    historiaTireoidiana: value,
                  },
                }))
              }
            >
              {label}
            </ChoiceButton>
          ))}
        </div>
        {selected === 'outro' && (
          <input
            type="text"
            className={inputClassName}
            value={dc?.historiaTireoidianaOutro || ''}
            onChange={(e) =>
              setPaciente((p) => ({
                ...p,
                dadosClinicos: { ...p.dadosClinicos, historiaTireoidianaOutro: e.target.value },
              }))
            }
            placeholder="Qual?"
          />
        )}
      </div>
    );
  }

  if (sectionId === 'sintomasGi') {
    const sintomasGI = (dc?.sintomasGI || {}) as Record<string, boolean>;
    return (
      <div className="space-y-2.5">
        {SINTOMAS_GI_OPTIONS.map(({ key, label }) => (
          <ChoiceButton
            key={key}
            selected={!!sintomasGI[key]}
            onClick={() =>
              setPaciente((p) => {
                const cur = (p.dadosClinicos?.sintomasGI || {}) as Record<string, boolean>;
                return {
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    sintomasGI: { ...cur, [key]: !cur[key] },
                  },
                };
              })
            }
          >
            {label}
          </ChoiceButton>
        ))}
      </div>
    );
  }

  if (sectionId === 'triagemDepressao' || sectionId === 'triagemIdeacao') {
    const campo =
      sectionId === 'triagemDepressao' ? 'depressaoOuAnedonia30Dias' : 'ideacaoSuicida12Meses';
    const selected =
      sectionId === 'triagemDepressao' ? respostaDepressao(dc) : respostaIdeacao(dc);
    return (
      <div className="space-y-2.5">
        {TRIAGEM_SIM_NAO.map(({ value, label }) => (
          <ChoiceButton
            key={value}
            selected={selected === value}
            onClick={() => setPaciente((p) => comRespostaTriagemHumor(p, campo, value))}
          >
            {label}
          </ChoiceButton>
        ))}
      </div>
    );
  }

  return null;
}

export const ANAMNESE_V2_SECTION_CHAT_STEP = {
  motivacao: META_CHAT_STEP_MOTIVACAO,
  diagnostico: META_CHAT_STEP_DIAGNOSTICO,
  comorbidades: META_CHAT_STEP_COMORBIDADES,
  riscos: META_CHAT_STEP_RISCOS,
  tireoide: META_CHAT_STEP_TIREOIDE,
  sintomasGi: META_CHAT_STEP_SINTOMAS_GI,
  triagemDepressao: META_CHAT_STEP_DEPRESSAO,
  triagemIdeacao: META_CHAT_STEP_IDEACAO_SUICIDA,
} as const;
