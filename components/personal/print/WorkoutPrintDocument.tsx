'use client';

import type { WorkoutPrintData } from '@/lib/personal/workoutPrint';
import { formatPrintRestSec } from '@/lib/personal/workoutPrint';

export function WorkoutPrintDocument({ data }: { data: WorkoutPrintData }) {
  return (
    <div className="bg-white text-black">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="text-lg font-bold text-[#0A1F44] leading-tight">TREINO PERSONALIZADO</div>
            <div className="text-[9px] sm:text-xs text-[#0A1F44]/80 mt-1">Oftware</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icones/logotipo-metodo-28.png"
            alt=""
            className="h-8 sm:h-10 w-auto object-contain shrink-0"
          />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Paciente</p>
            <p className="font-semibold text-[#0A1F44]">{data.patientName}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Treino</p>
            <p className="font-semibold text-[#0A1F44]">{data.title}</p>
          </div>
          {data.scheduledDateLabel ? (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Data programada</p>
              <p className="font-semibold text-[#0A1F44]">{data.scheduledDateLabel}</p>
            </div>
          ) : null}
          {data.trainerName ? (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Personal</p>
              <p className="font-semibold text-[#0A1F44]">{data.trainerName}</p>
            </div>
          ) : null}
        </div>

        {data.exercises.map((exercise) => (
          <article
            key={`${exercise.order}-${exercise.name}`}
            className="border-t border-gray-200 pt-4 break-inside-avoid"
          >
            <h3 className="text-sm font-bold text-[#0A1F44]">
              {String(exercise.order).padStart(2, '0')}. {exercise.name}
            </h3>
            {exercise.meta ? (
              <p className="text-xs text-gray-600 mt-0.5">{exercise.meta}</p>
            ) : null}
            <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold">Série</th>
                    <th className="px-2 py-2 text-left font-semibold">Repetições</th>
                    <th className="px-2 py-2 text-left font-semibold">Carga</th>
                    <th className="px-2 py-2 text-left font-semibold">Descanso</th>
                  </tr>
                </thead>
                <tbody>
                  {exercise.series.map((row, rowIndex) =>
                    row.kind === 'intercalated' ? (
                      <tr key={`int-${rowIndex}`} className="border-t border-gray-100 bg-slate-50">
                        <td className="px-2 py-2" colSpan={4}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            ⇄ Intercalado
                          </p>
                          <p className="font-semibold text-[#0A1F44]">{row.name}</p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            Série {row.order} · {row.reps} reps · {row.loadLabel} ·{' '}
                            {formatPrintRestSec(row.restSec)}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      <tr key={`main-${row.order}-${rowIndex}`} className="border-t border-gray-100">
                        <td className="px-2 py-2">{row.order}</td>
                        <td className="px-2 py-2">{row.reps}</td>
                        <td className="px-2 py-2">{row.loadLabel}</td>
                        <td className="px-2 py-2">{formatPrintRestSec(row.restSec)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            {exercise.trainerNote ? (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                  Orientação do personal
                </p>
                <p className="text-xs text-gray-800 whitespace-pre-wrap mt-0.5 leading-relaxed">
                  {exercise.trainerNote}
                </p>
              </div>
            ) : null}
          </article>
        ))}

        <div>
          <div className="text-sm font-bold text-[#0A1F44] mb-2">Resumo do treino</div>
          <p className="text-sm text-gray-800">
            {data.exerciseCount} exercício{data.exerciseCount === 1 ? '' : 's'} · {data.seriesCount} série
            {data.seriesCount === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-gray-600 mt-1">Treino: {data.title}</p>
          {data.scheduledDateLabel ? (
            <p className="text-xs text-gray-600">Data programada: {data.scheduledDateLabel}</p>
          ) : null}
        </div>

        <p className="text-xs text-gray-600 pt-2">
          Plano de treino gerado pela Oftware · Data de impressão: {data.printedAt}
        </p>
      </div>
    </div>
  );
}

export default WorkoutPrintDocument;
