'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import { AnamneseCheckGroup, AnamneseCheckItem } from '@/components/meta/anamneseChecklistUi';
import { CIRURGIAS_GRUPOS, CIRURGIAS_NENHUMA } from '@/lib/meta/metaChatInicial/constants';
import { alternarCirurgia, pacienteComCirurgias } from '@/lib/meta/metaChatInicial/cirurgias';

type Props = {
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  tone?: 'light' | 'dark';
};

export default function CirurgiasChecklist({ paciente, setPaciente, tone = 'light' }: Props) {
  const atual = (paciente.dadosClinicos?.cirurgiasRealizadas || {}) as Record<string, unknown>;

  const aplicar = (key: string) => {
    setPaciente((p) =>
      pacienteComCirurgias(
        p,
        alternarCirurgia((p.dadosClinicos?.cirurgiasRealizadas || {}) as Record<string, unknown>, key)
      )
    );
  };

  const item = (key: string, label: string) => (
    <AnamneseCheckItem
      key={key}
      label={label}
      checked={Boolean(atual[key])}
      onChange={() => aplicar(key)}
      tone={tone}
    />
  );

  return (
    <div className="space-y-3">
      {CIRURGIAS_GRUPOS.map((grupo) => (
        <AnamneseCheckGroup key={grupo.id} title={grupo.titulo} tone={tone}>
          {grupo.opcoes.map((opcao) => item(opcao.key, opcao.label))}
        </AnamneseCheckGroup>
      ))}

      <AnamneseCheckGroup tone={tone}>
        {item(CIRURGIAS_NENHUMA.key, CIRURGIAS_NENHUMA.label)}
      </AnamneseCheckGroup>
    </div>
  );
}
