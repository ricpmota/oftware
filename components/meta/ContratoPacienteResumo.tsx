'use client';

import { Lock, MapPin, Shield, ShieldCheck, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ItemResumo = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
};

const ITENS_RESUMO: ItemResumo[] = [
  {
    icon: UserRound,
    title: 'Acompanhamento médico personalizado',
  },
  {
    icon: ShieldCheck,
    title: 'Consentimento informado para o tratamento prescrito',
  },
  {
    icon: MapPin,
    title: 'Escolha da modalidade de aplicação (clínica ou domiciliar)',
    subtitle: 'Você poderá optar conforme sua preferência.',
  },
  {
    icon: Lock,
    title: 'Tratamento de dados pessoais e assinatura eletrônica',
  },
  {
    icon: Shield,
    title:
      'A assinatura é obrigatória para garantir segurança, conformidade legal e continuidade do seu atendimento.',
  },
];

export default function ContratoPacienteResumo() {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
      aria-labelledby="contrato-paciente-resumo-titulo"
    >
      <h3
        id="contrato-paciente-resumo-titulo"
        className="text-sm font-semibold text-[#E8EDED] sm:text-base"
      >
        Este contrato inclui:
      </h3>
      <ul className="mt-3 space-y-3">
        {ITENS_RESUMO.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex items-start gap-3 text-sm text-[#E8EDED]/85">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 text-[#4CCB7A]"
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <span className="block leading-snug">{item.title}</span>
                {item.subtitle ? (
                  <span className="block text-xs leading-relaxed text-[#E8EDED]/60">
                    {item.subtitle}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
