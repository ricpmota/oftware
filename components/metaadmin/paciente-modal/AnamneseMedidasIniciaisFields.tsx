'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import { calcularGrauObesidade, getCorGrauObesidade } from '@/lib/metaadmin/pacienteModalObesidadeDisplay';
import { anamneseInputClass, anamneseInputReadonlyClass } from '@/components/metaadmin/paciente-modal/anamneseSectionUi';

type Props = {
  paciente: PacienteCompleto;
  setPaciente?: React.Dispatch<React.SetStateAction<PacienteCompleto | null>>;
  readOnly?: boolean;
};

export function AnamneseMedidasIniciaisFields({ paciente, setPaciente, readOnly = false }: Props) {
  const medidas = paciente.dadosClinicos?.medidasIniciais;
  const inputClass = readOnly ? anamneseInputReadonlyClass : anamneseInputClass;
  const disabled = readOnly || !setPaciente;

  const patchMedidas = (patch: Partial<NonNullable<typeof medidas>>) => {
    if (!setPaciente) return;
    setPaciente((p) =>
      p
        ? {
            ...p,
            dadosClinicos: {
              ...p.dadosClinicos,
              medidasIniciais: { ...p.dadosClinicos?.medidasIniciais, ...patch },
            },
          }
        : p
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Peso (kg)</label>
        <input
          type="number"
          min="20"
          max="400"
          readOnly={disabled}
          disabled={disabled}
          value={medidas?.peso || ''}
          onChange={(e) => {
            const peso = parseFloat(e.target.value) || 0;
            const altura = medidas?.altura || 0;
            const imc = altura > 0 ? parseFloat((peso / Math.pow(altura / 100, 2)).toFixed(2)) : 0;
            patchMedidas({ peso, imc });
          }}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Altura (cm)</label>
        <input
          type="number"
          min="120"
          max="230"
          readOnly={disabled}
          disabled={disabled}
          value={medidas?.altura || ''}
          onChange={(e) => {
            const altura = parseFloat(e.target.value) || 0;
            const peso = medidas?.peso || 0;
            const imc = altura > 0 ? parseFloat((peso / Math.pow(altura / 100, 2)).toFixed(2)) : 0;
            patchMedidas({ altura, imc });
          }}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">IMC (kg/m²)</label>
        <input
          type="text"
          value={medidas?.imc?.toFixed(2) || ''}
          readOnly
          className={anamneseInputReadonlyClass}
        />
        {medidas?.imc ? (
          <p className={`mt-1.5 text-xs md:mt-2 md:text-sm ${getCorGrauObesidade(calcularGrauObesidade(medidas.imc))}`}>
            <strong>Grau:</strong> {calcularGrauObesidade(medidas.imc)}
          </p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Circunf. Abdominal (cm)</label>
        <input
          type="number"
          min="40"
          max="200"
          readOnly={disabled}
          disabled={disabled || !!medidas?.circunferenciaNaoInformada}
          value={medidas?.circunferenciaAbdominal || ''}
          onChange={(e) => patchMedidas({ circunferenciaAbdominal: parseFloat(e.target.value) || 0 })}
          className={inputClass}
        />
      </div>
      <div className="col-span-2 md:col-span-4">
        <label className={`flex items-start gap-2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={!!medidas?.circunferenciaNaoInformada}
            onChange={(e) => {
              const checked = e.target.checked;
              patchMedidas({
                circunferenciaNaoInformada: checked,
                circunferenciaAbdominal: checked ? 0 : medidas?.circunferenciaAbdominal ?? 0,
              });
            }}
            className="mt-0.5 rounded border-gray-300"
          />
          <span className="text-sm text-gray-800 dark:text-gray-200">
            Paciente não soube informar a circunferência abdominal
          </span>
        </label>
      </div>
    </div>
  );
}
