'use client';

import { Lock } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function PublicDoctorSecurity({ accentColor, pageBg }: Props) {
  return (
    <section
      className="drprov-rise rounded-2xl border px-4 py-4 shadow-sm sm:px-5"
      style={{
        backgroundColor: `${pageBg}10`,
        borderColor: `${pageBg}22`,
      }}
    >
      <div className="flex gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: pageBg, color: accentColor }}
        >
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-gray-900">
            Privacidade e segurança
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
            Seus dados são tratados dentro do ambiente da plataforma para dar continuidade ao seu
            atendimento.
          </p>
        </div>
      </div>
    </section>
  );
}
