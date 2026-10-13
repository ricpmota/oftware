'use client';

import { Stethoscope, UtensilsCrossed, Dumbbell, UserCheck } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioConnectedTeam({ accentColor, pageBg }: Props) {
  return (
    <section className="drprov-rise rounded-2xl border border-gray-100 bg-white px-3.5 py-6 sm:px-6 sm:py-8">
      <h2 className="text-center text-[1.25rem] font-bold tracking-tight text-gray-900 sm:text-[1.6rem]">
        Equipe conectada
      </h2>
      <p className="mx-auto mt-2 max-w-md text-center text-[13px] text-gray-500 sm:text-[14px]">
        Cada profissional no seu ambiente — o mesmo paciente no centro do ecossistema.
      </p>

      <div className="relative mx-auto mt-8 flex max-w-lg flex-col items-center gap-5">
        <div className="flex w-full justify-center gap-3 sm:gap-5">
          <RolePill icon={Stethoscope} label="Médico" accentColor={accentColor} pageBg={pageBg} />
          <RolePill icon={UtensilsCrossed} label="Nutrição" accentColor={accentColor} pageBg={pageBg} />
          <RolePill icon={Dumbbell} label="Treino" accentColor={accentColor} pageBg={pageBg} />
        </div>

        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400" aria-hidden>
          <span className="h-px w-8 bg-gray-200 sm:w-12" />
          conectados
          <span className="h-px w-8 bg-gray-200 sm:w-12" />
        </div>

        <div
          className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm"
          style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}12` }}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: pageBg, color: accentColor }}
          >
            <UserCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[14px] font-bold text-gray-900">Paciente</p>
            <p className="text-[12px] text-gray-500">Jornada única, visão compartilhada</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RolePill({
  icon: Icon,
  label,
  accentColor,
  pageBg,
}: {
  icon: typeof Stethoscope;
  label: string;
  accentColor: string;
  pageBg: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-2 py-3 sm:px-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: pageBg, color: accentColor }}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">{label}</span>
    </div>
  );
}
