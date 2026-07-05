'use client';

import type { ContratoTratamentoStatusAssinatura } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';

export type ContratoPacienteStatusBadgeVariant =
  | 'aguardando_paciente'
  | 'aguardando_medico'
  | 'assinado_completo'
  | 'preparando_assinatura';

export type ContratoPacienteStatusBadgeProps = {
  status: ContratoTratamentoStatusAssinatura;
  /** Quando aguardando_paciente sem link de assinatura. */
  semLinkAssinatura?: boolean;
  className?: string;
};

function resolveVariant(
  status: ContratoTratamentoStatusAssinatura,
  semLinkAssinatura?: boolean
): ContratoPacienteStatusBadgeVariant {
  if (status === 'assinado_completo') return 'assinado_completo';
  if (status === 'aguardando_medico') return 'aguardando_medico';
  if (status === 'aguardando_paciente' && semLinkAssinatura) return 'preparando_assinatura';
  return 'aguardando_paciente';
}

const BADGE_CONFIG: Record<
  ContratoPacienteStatusBadgeVariant,
  { label: string; className: string }
> = {
  aguardando_paciente: {
    label: 'Assinatura pendente',
    className: 'bg-amber-400/20 text-amber-100 border-amber-400/35',
  },
  aguardando_medico: {
    label: 'Contrato assinado',
    className: 'bg-[#4CCB7A]/20 text-[#4CCB7A] border-[#4CCB7A]/35',
  },
  assinado_completo: {
    label: 'Contrato assinado',
    className: 'bg-[#4CCB7A]/20 text-[#4CCB7A] border-[#4CCB7A]/35',
  },
  preparando_assinatura: {
    label: 'Preparando assinatura',
    className: 'bg-orange-400/15 text-orange-100 border-orange-400/30',
  },
};

export default function ContratoPacienteStatusBadge({
  status,
  semLinkAssinatura = false,
  className = '',
}: ContratoPacienteStatusBadgeProps) {
  const variant = resolveVariant(status, semLinkAssinatura);
  const config = BADGE_CONFIG[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-tight ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
