'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import { calcularGrauObesidade, getCorGrauObesidade } from '@/lib/metaadmin/pacienteModalObesidadeDisplay';

type Props = {
  paciente: PacienteCompleto;
  setPaciente?: React.Dispatch<React.SetStateAction<PacienteCompleto | null>>;
  readOnly?: boolean;
};

function formatarNumero(valor: number, casas: number, fixo = true) {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: fixo ? casas : 0,
    maximumFractionDigits: casas,
  });
}

const inputClass =
  'min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-semibold leading-none text-slate-900 outline-none [appearance:textfield] focus:ring-0 dark:text-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export function AnamneseMedidasIniciaisFields({ paciente, setPaciente, readOnly = false }: Props) {
  const medidas = paciente.dadosClinicos?.medidasIniciais;
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
    <div>
      <div className="grid grid-cols-2 items-start gap-x-4 gap-y-2 md:grid-cols-4">
        <div className="min-w-0">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Peso
          </label>
          {disabled ? (
            <p className="mt-0.5 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
              {medidas?.peso ? (
                <>
                  {formatarNumero(medidas.peso, 1, false)}
                  <span className="ml-1 text-xs font-normal text-slate-400">kg</span>
                </>
              ) : (
                <span className="text-sm font-normal text-slate-400">—</span>
              )}
            </p>
          ) : (
            <div className="mt-0.5 flex items-baseline gap-1 border-b border-slate-200 focus-within:border-emerald-400 dark:border-slate-700">
              <input
                type="number"
                min="20"
                max="400"
                aria-label="Peso em quilogramas"
                value={medidas?.peso || ''}
                onChange={(e) => {
                  const peso = parseFloat(e.target.value) || 0;
                  const altura = medidas?.altura || 0;
                  const imc = altura > 0 ? parseFloat((peso / Math.pow(altura / 100, 2)).toFixed(2)) : 0;
                  patchMedidas({ peso, imc });
                }}
                className={inputClass}
              />
              <span className="shrink-0 text-xs text-slate-400">kg</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Altura
          </label>
          {disabled ? (
            <p className="mt-0.5 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
              {medidas?.altura ? (
                <>
                  {formatarNumero(medidas.altura, 0)}
                  <span className="ml-1 text-xs font-normal text-slate-400">cm</span>
                </>
              ) : (
                <span className="text-sm font-normal text-slate-400">—</span>
              )}
            </p>
          ) : (
            <div className="mt-0.5 flex items-baseline gap-1 border-b border-slate-200 focus-within:border-emerald-400 dark:border-slate-700">
              <input
                type="number"
                min="120"
                max="230"
                aria-label="Altura em centímetros"
                value={medidas?.altura || ''}
                onChange={(e) => {
                  const altura = parseFloat(e.target.value) || 0;
                  const peso = medidas?.peso || 0;
                  const imc = altura > 0 ? parseFloat((peso / Math.pow(altura / 100, 2)).toFixed(2)) : 0;
                  patchMedidas({ altura, imc });
                }}
                className={inputClass}
              />
              <span className="shrink-0 text-xs text-slate-400">cm</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">IMC</p>
          <p className="mt-0.5 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
            {medidas?.imc ? formatarNumero(medidas.imc, 2) : <span className="text-sm font-normal text-slate-400">—</span>}
          </p>
          {medidas?.imc ? (
            <p
              className={`mt-1 inline-flex rounded-full bg-[color-mix(in_srgb,var(--state-warning)_12%,var(--surface-card))] px-2 py-0.5 text-[11px] font-medium ${getCorGrauObesidade(calcularGrauObesidade(medidas.imc))}`}
            >
              {calcularGrauObesidade(medidas.imc)}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Circunferência
          </label>
          {disabled || medidas?.circunferenciaNaoInformada ? (
            <p className="mt-0.5 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
              {medidas?.circunferenciaAbdominal && !medidas.circunferenciaNaoInformada ? (
                <>
                  {formatarNumero(medidas.circunferenciaAbdominal, 1, false)}
                  <span className="ml-1 text-xs font-normal text-slate-400">cm</span>
                </>
              ) : (
                <span className="text-sm font-normal text-slate-400">—</span>
              )}
            </p>
          ) : (
            <div className="mt-0.5 flex items-baseline gap-1 border-b border-slate-200 focus-within:border-emerald-400 dark:border-slate-700">
              <input
                type="number"
                min="40"
                max="200"
                aria-label="Circunferência abdominal em centímetros"
                value={medidas?.circunferenciaAbdominal || ''}
                onChange={(e) => patchMedidas({ circunferenciaAbdominal: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
              <span className="shrink-0 text-xs text-slate-400">cm</span>
            </div>
          )}
          <label className={`mt-1.5 flex items-start gap-1.5 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              disabled={disabled}
              aria-label="Paciente não soube informar a circunferência abdominal"
              checked={!!medidas?.circunferenciaNaoInformada}
              onChange={(e) => {
                const checked = e.target.checked;
                patchMedidas({
                  circunferenciaNaoInformada: checked,
                  circunferenciaAbdominal: checked ? 0 : medidas?.circunferenciaAbdominal ?? 0,
                });
              }}
              className="mt-0.5 rounded border-slate-300"
            />
            <span className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">Não soube informar</span>
          </label>
        </div>
      </div>
    </div>
  );
}
