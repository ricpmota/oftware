'use client';

import { useState } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import { ChoiceButton, inputClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import {
  DIABETES_TIPO_OPCOES,
  DIAGNOSTICO_LABELS,
  DIAGNOSTICO_OPCOES_ATIVAS,
} from '@/lib/meta/metaChatInicial/constants';
import {
  definirTipoDiabetes,
  diagnosticosLegadoSelecionados,
  lerDiagnosticoTipos,
  pacienteComDiagnosticos,
  removerDiabetes,
  rotuloDiabetesSelecionado,
  toggleDiagnosticoOpcao,
  type DiabetesTipo,
} from '@/lib/meta/metaChatInicial/diagnosticoCondicoes';

type Props = {
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  tone?: 'light' | 'dark';
};

export default function DiagnosticoCondicoesPicker({ paciente, setPaciente, tone = 'light' }: Props) {
  const [modalAberto, setModalAberto] = useState(false);
  const selected = lerDiagnosticoTipos(paciente.dadosClinicos);
  const rotuloDiabetes = rotuloDiabetesSelecionado(selected);
  const legado = diagnosticosLegadoSelecionados(selected);
  const dark = tone === 'dark';

  const aplicar = (next: ReturnType<typeof toggleDiagnosticoOpcao>) => {
    setPaciente((p) => pacienteComDiagnosticos(p, next));
  };

  const escolherDiabetes = (tipo: DiabetesTipo) => {
    aplicar(definirTipoDiabetes(selected, tipo));
    setModalAberto(false);
  };

  const chipClass = (ativo: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
      ativo
        ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold'
        : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'
    }`;

  return (
    <div className="space-y-3">
      <div className={dark ? 'flex flex-wrap gap-2' : 'space-y-2.5'}>
        {dark ? (
          <button type="button" className={chipClass(!!rotuloDiabetes)} onClick={() => setModalAberto(true)}>
            Diabetes{rotuloDiabetes ? ` (${rotuloDiabetes.toLowerCase()})` : ''}
          </button>
        ) : (
          <ChoiceButton selected={!!rotuloDiabetes} onClick={() => setModalAberto(true)}>
            <span className="block">Diabetes</span>
            {rotuloDiabetes ? (
              <span className="mt-0.5 block text-xs font-medium text-emerald-700">{rotuloDiabetes}</span>
            ) : null}
          </ChoiceButton>
        )}

        {DIAGNOSTICO_OPCOES_ATIVAS.map((value) => {
          const ativo = selected.includes(value);
          const label = DIAGNOSTICO_LABELS[value];
          if (dark) {
            return (
              <button
                key={value}
                type="button"
                className={chipClass(ativo)}
                onClick={() => aplicar(toggleDiagnosticoOpcao(selected, value))}
              >
                {label}
              </button>
            );
          }
          return (
            <ChoiceButton
              key={value}
              selected={ativo}
              onClick={() => aplicar(toggleDiagnosticoOpcao(selected, value))}
            >
              {label}
            </ChoiceButton>
          );
        })}
      </div>

      {legado.length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs font-medium ${dark ? 'text-[#E8EDED]/60' : 'text-slate-500'}`}>
            Respostas anteriores
          </p>
          <div className={dark ? 'flex flex-wrap gap-2' : 'space-y-2.5'}>
            {legado.map((value) => {
              const label = DIAGNOSTICO_LABELS[value] || value;
              if (dark) {
                return (
                  <button
                    key={value}
                    type="button"
                    className={chipClass(true)}
                    onClick={() => aplicar(toggleDiagnosticoOpcao(selected, value))}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <ChoiceButton
                  key={value}
                  selected
                  onClick={() => aplicar(toggleDiagnosticoOpcao(selected, value))}
                >
                  {label}
                </ChoiceButton>
              );
            })}
          </div>
          {selected.includes('outro') && (
            <input
              type="text"
              className={
                dark
                  ? 'min-w-[120px] w-full rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40'
                  : inputClassName
              }
              value={paciente.dadosClinicos?.diagnosticoPrincipal?.outro || ''}
              onChange={(e) => {
                const texto = e.target.value;
                setPaciente((p) => {
                  const atualizado = pacienteComDiagnosticos(p, selected);
                  const tipo = atualizado.dadosClinicos.diagnosticoPrincipal?.tipo;
                  if (!tipo) return atualizado;
                  return {
                    ...atualizado,
                    dadosClinicos: {
                      ...atualizado.dadosClinicos,
                      diagnosticoPrincipal: { tipo, outro: texto },
                    },
                  };
                });
              }}
              placeholder="Especificar outro"
            />
          )}
        </div>
      )}

      {modalAberto && (
        <div
          className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => setModalAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="diabetes-tipo-titulo"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="diabetes-tipo-titulo" className="text-lg font-semibold text-slate-900">
              Qual tipo de diabetes?
            </h3>
            <p className="mt-1 text-sm text-slate-500">Escolha o diagnóstico ou cancele para voltar.</p>
            <div className="mt-4 space-y-2.5">
              {DIABETES_TIPO_OPCOES.map((opcao) => (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => escolherDiabetes(opcao.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected.includes(opcao.value)
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">{opcao.label}</span>
                  <span className="mt-1 block text-sm text-slate-600">{opcao.descricao}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              {rotuloDiabetes ? (
                <button
                  type="button"
                  className="text-sm font-medium text-slate-500 hover:text-slate-800"
                  onClick={() => {
                    aplicar(removerDiabetes(selected));
                    setModalAberto(false);
                  }}
                >
                  Desmarcar
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setModalAberto(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
