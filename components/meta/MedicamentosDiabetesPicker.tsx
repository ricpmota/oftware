'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import { ChoiceButton, inputClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import { MEDICAMENTOS_DIABETES_OPTIONS } from '@/lib/meta/metaChatInicial/constants';
import {
  alternarMedicamentoDiabetes,
  pacienteComMedicamentosDiabetes,
} from '@/lib/meta/metaChatInicial/medicamentosDiabetes';

type Props = {
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  tone?: 'light' | 'dark';
};

export default function MedicamentosDiabetesPicker({ paciente, setPaciente, tone = 'light' }: Props) {
  const atual = (paciente.dadosClinicos?.medicamentosDiabetes || {}) as Record<string, unknown>;
  const dark = tone === 'dark';

  const aplicar = (key: string) => {
    setPaciente((p) =>
      pacienteComMedicamentosDiabetes(
        p,
        alternarMedicamentoDiabetes((p.dadosClinicos?.medicamentosDiabetes || {}) as Record<string, unknown>, key)
      )
    );
  };

  return (
    <div className="space-y-2.5">
      {dark ? (
        <div className="flex flex-col gap-2">
          {MEDICAMENTOS_DIABETES_OPTIONS.map((opcao) => {
            const ativo = Boolean(atual[opcao.key]);
            return (
              <button
                key={opcao.key}
                type="button"
                onClick={() => aplicar(opcao.key)}
                className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  ativo
                    ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold'
                    : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'
                }`}
              >
                {opcao.label}
              </button>
            );
          })}
        </div>
      ) : (
        MEDICAMENTOS_DIABETES_OPTIONS.map((opcao) => (
          <ChoiceButton key={opcao.key} selected={Boolean(atual[opcao.key])} onClick={() => aplicar(opcao.key)}>
            {opcao.label}
          </ChoiceButton>
        ))
      )}

      {Boolean(atual.outros) && (
        <input
          type="text"
          className={
            dark
              ? 'mt-1 w-full rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40'
              : inputClassName
          }
          value={String(atual.outrosDescricao || '')}
          onChange={(e) => {
            const texto = e.target.value;
            setPaciente((p) => {
              const cur = (p.dadosClinicos?.medicamentosDiabetes || {}) as Record<string, unknown>;
              return pacienteComMedicamentosDiabetes(p, { ...cur, outrosDescricao: texto });
            });
          }}
          placeholder="Qual medicamento?"
        />
      )}
    </div>
  );
}
