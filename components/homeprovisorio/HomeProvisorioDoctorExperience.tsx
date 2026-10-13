'use client';

import { Users, Inbox, Activity, ClipboardList } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

const TILES = [
  { icon: Users, label: 'Pacientes' },
  { icon: Inbox, label: 'Solicitações' },
  { icon: Activity, label: 'Acompanhamentos' },
  { icon: ClipboardList, label: 'Pendências' },
] as const;

export default function HomeProvisorioDoctorExperience({ accentColor, pageBg }: Props) {
  return (
    <section className="drprov-rise">
      <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="order-2 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:order-1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-bold text-gray-900">Painel do médico</p>
            <span className="text-[10px] font-medium text-gray-400">Demonstração</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {TILES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3.5"
              >
                <span
                  className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: pageBg, color: accentColor }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-[12px] font-semibold text-gray-800">{label}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Organizado</p>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 text-center lg:order-2 lg:text-left">
          <h2 className="text-[1.25rem] font-bold tracking-tight text-gray-900 sm:text-[1.6rem]">
            Para o médico, organização.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-gray-500 sm:text-[14px] lg:mx-0">
            Solicitações, acompanhamentos e pendências no mesmo ambiente — para conduzir a jornada
            com clareza.
          </p>
        </div>
      </div>
    </section>
  );
}
