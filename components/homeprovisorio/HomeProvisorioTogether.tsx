'use client';

import { Stethoscope, UtensilsCrossed, Dumbbell, UserCheck, Brain } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

const ROLES = [
  {
    icon: UserCheck,
    title: 'Você',
    text: 'No centro da jornada — com clareza do que fazer e com quem contar.',
  },
  {
    icon: Stethoscope,
    title: 'Médico',
    text: 'Conduz o acompanhamento e alinha decisões com a equipe.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Nutricionista',
    text: 'Organiza a alimentação no ritmo real da sua rotina.',
  },
  {
    icon: Brain,
    title: 'Psiquiatra',
    text: 'Acompanha aspectos de saúde mental relacionados ao tratamento, quando indicados.',
  },
  {
    icon: Dumbbell,
    title: 'Personal',
    text: 'Ajusta o movimento ao momento do tratamento.',
  },
] as const;

export default function HomeProvisorioTogether({ accentColor, pageBg }: Props) {
  return (
    <section className="homeprov-bleed border-y border-[var(--homeprov-navy)]/8 bg-white py-16 md:py-20">
      <div className="homeprov-inner">
        <div className="max-w-2xl">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accentColor }}
          >
            Equipe
          </p>
          <h2 className="homeprov-display mt-3 text-[2rem] font-medium leading-[1.12] text-[var(--homeprov-ink)] sm:text-[2.4rem]">
            Não é cada um no seu canto.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--homeprov-muted)] sm:text-[16px]">
            Médico, nutricionista, psiquiatra e personal compartilham a mesma visão da sua jornada —
            com acompanhamento integrado quando necessário, para você não carregar sozinho a ponte
            entre os profissionais.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {ROLES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="border-t border-[var(--homeprov-navy)]/12 pt-5">
              <span
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: `${pageBg}`, color: accentColor }}
              >
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
              </span>
              <h3 className="homeprov-display text-[1.2rem] font-medium text-[var(--homeprov-ink)]">
                {title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--homeprov-muted)]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
