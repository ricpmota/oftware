'use client';

import { Stethoscope, UtensilsCrossed, Dumbbell } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioPatientExperience({ accentColor, pageBg }: Props) {
  return (
    <section className="drprov-rise">
      <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="text-center lg:text-left">
          <h2 className="text-[1.25rem] font-bold tracking-tight text-gray-900 sm:text-[1.6rem]">
            Tudo em um só lugar.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-gray-500 sm:text-[14px] lg:mx-0">
            O paciente acompanha etapas, equipe e próximos passos em um ambiente único — sem
            espalhar a jornada em vários aplicativos.
          </p>
        </div>

        {/* CSS phone mock — demo only */}
        <div className="mx-auto w-full max-w-[280px]">
          <div
            className="overflow-hidden rounded-[1.75rem] border-[6px] border-[#0A1F44] bg-white shadow-xl"
            style={{ boxShadow: `0 20px 40px rgba(10,31,68,0.18)` }}
          >
            <div className="flex justify-center bg-[#0A1F44] py-2">
              <span className="h-1 w-16 rounded-full bg-white/25" aria-hidden />
            </div>
            <div className="space-y-3 bg-[#F7F8FA] px-3.5 py-4">
              <div>
                <p className="text-[12px] text-gray-500">Olá, Antônio</p>
                <p className="text-[15px] font-bold text-gray-900">Seu acompanhamento</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Próxima etapa
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-gray-900">Reavaliação</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Meta
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${accentColor}22`, color: pageBg }}
                  >
                    Em acompanhamento
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full w-[58%] rounded-full"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Equipe
                </p>
                <div className="flex gap-2">
                  {[
                    { icon: Stethoscope, label: 'Médico' },
                    { icon: UtensilsCrossed, label: 'Nutrição' },
                    { icon: Dumbbell, label: 'Treino' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-gray-50 py-2"
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} aria-hidden />
                      <span className="text-[9px] font-medium text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-[9px] text-gray-400">Demonstração da plataforma</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
