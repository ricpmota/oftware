'use client';

import type { LucideIcon } from 'lucide-react';
import { Activity, Users, ShieldCheck } from 'lucide-react';

const DEFAULT_BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Activity,
    title: 'Acompanhamento estruturado',
    text: 'Plano individualizado e organizado.',
  },
  {
    icon: Users,
    title: 'Equipe integrada',
    text: 'Medicina, nutrição e treino quando fizer parte.',
  },
  {
    icon: ShieldCheck,
    title: 'Ambiente seguro',
    text: 'Dados protegidos na plataforma.',
  },
];

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function PublicDoctorBenefits({ accentColor, pageBg }: Props) {
  return (
    <section className="drprov-rise rounded-2xl border border-gray-100 bg-white px-2.5 py-4 shadow-sm sm:px-4 sm:py-5">
      <h2 className="mb-4 text-center text-[18px] font-bold tracking-tight text-gray-900 sm:text-[20px]">
        Por que escolher este acompanhamento?
      </h2>
      <div className="grid grid-cols-3 gap-0">
        {DEFAULT_BENEFITS.map(({ icon: Icon, title, text }, index) => (
          <div
            key={title}
            className={`drprov-rise flex flex-col items-center px-1.5 text-center sm:px-3 ${
              index > 0 ? 'border-l border-gray-100' : ''
            }`}
            style={{ animationDelay: `${180 + index * 90}ms` }}
          >
            <span
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10"
              style={{ backgroundColor: pageBg, color: accentColor }}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </span>
            <h3 className="text-[11px] font-semibold leading-snug text-gray-900 sm:text-[13px]">
              {title}
            </h3>
            <p className="mt-1 text-[10px] leading-snug text-gray-500 sm:text-[12px]">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
