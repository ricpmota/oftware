import type { Indicacao } from '@/types/indicacao';
import type { LeadMedico, LeadReferralSnapshot, LeadReferralType } from '@/types/leadMedico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { SolicitacaoMedico } from '@/types/solicitacaoMedico';

export type ResolveLeadReferralContext = {
  medicoId: string;
  medicoNome?: string;
  paciente?: PacienteCompleto | null;
  solicitacao?: Pick<SolicitacaoMedico, 'referral'> | null;
  indicacao?: Indicacao | null;
};

export function normalizeLeadReferral(raw: unknown): LeadReferralSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const type = data.type as LeadReferralType | undefined;
  if (!type) return undefined;
  const captured = data.capturedAt as { toDate?: () => Date } | Date | undefined;
  const capturedAt =
    captured instanceof Date
      ? captured
      : typeof captured?.toDate === 'function'
        ? captured.toDate()
        : undefined;
  const updatedAtRaw = data.updatedAt as { toDate?: () => Date } | Date | undefined;
  const updatedAt =
    updatedAtRaw instanceof Date
      ? updatedAtRaw
      : typeof updatedAtRaw?.toDate === 'function'
        ? updatedAtRaw.toDate()
        : undefined;
  return {
    type,
    sourceId: typeof data.sourceId === 'string' ? data.sourceId : undefined,
    sourceName: typeof data.sourceName === 'string' ? data.sourceName : undefined,
    sourceContact: typeof data.sourceContact === 'string' ? data.sourceContact : undefined,
    indicacaoId: typeof data.indicacaoId === 'string' ? data.indicacaoId : undefined,
    capturedAt,
    updatedAt,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
    updatedManually: data.updatedManually === true,
    note: typeof data.note === 'string' ? data.note : undefined,
  };
}

export function referralToFirestore(referral: LeadReferralSnapshot): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: referral.type,
    capturedAt: referral.capturedAt ?? new Date(),
  };
  if (referral.updatedAt) payload.updatedAt = referral.updatedAt;
  if (referral.updatedBy) payload.updatedBy = referral.updatedBy;
  if (referral.updatedManually) payload.updatedManually = true;
  if (referral.note) payload.note = referral.note;

  if (referral.type !== 'desconhecido') {
    if (referral.sourceId) payload.sourceId = referral.sourceId;
    if (referral.sourceName) payload.sourceName = referral.sourceName;
    if (referral.sourceContact) payload.sourceContact = referral.sourceContact;
    if (referral.indicacaoId) payload.indicacaoId = referral.indicacaoId;
  }

  return payload;
}

export function formatReferralChangeDescription(referral: LeadReferralSnapshot): string {
  const badge = getLeadReferralBadge({ referral });
  return `Origem alterada para ${badge.label}.`;
}

/** Tipo efetivo para filtros e KPIs (CRM lê só o snapshot do lead). */
export function getEffectiveReferralType(lead: Pick<LeadMedico, 'referral'>): LeadReferralType {
  return lead.referral?.type ?? 'desconhecido';
}

export function matchesReferralFilter(
  lead: Pick<LeadMedico, 'referral'>,
  filter: LeadReferralType | 'desconhecido' | ''
): boolean {
  if (!filter) return true;
  const type = getEffectiveReferralType(lead);
  if (filter === 'desconhecido') return type === 'desconhecido';
  if (filter === 'medico') return type === 'medico' || type === 'dr_link';
  return type === filter;
}

export function resolveLeadReferral(
  lead: LeadMedico,
  ctx: ResolveLeadReferralContext
): LeadReferralSnapshot {
  if (lead.referral?.type && lead.referral.updatedManually) return lead.referral;
  if (lead.referral?.type) return lead.referral;

  if (ctx.solicitacao?.referral?.type) {
    return { ...ctx.solicitacao.referral, capturedAt: ctx.solicitacao.referral.capturedAt ?? new Date() };
  }

  if (ctx.indicacao) {
    return {
      type: 'paciente',
      sourceId: ctx.indicacao.id,
      sourceName: ctx.indicacao.indicadoPorNome || ctx.indicacao.indicadoPor,
      sourceContact: ctx.indicacao.indicadoPorTelefone,
      indicacaoId: ctx.indicacao.id,
      capturedAt: ctx.indicacao.criadoEm,
    };
  }

  const pacienteRaw = ctx.paciente as (PacienteCompleto & { referral?: Record<string, unknown> }) | null | undefined;
  const pacienteReferral = pacienteRaw?.referral;
  if (pacienteReferral && typeof pacienteReferral === 'object') {
    const tipo = String(pacienteReferral.tipo || '');
    if (tipo === 'nutricionista') {
      return {
        type: 'nutricionista',
        sourceId: String(pacienteReferral.nutricionistaId || ''),
        capturedAt:
          pacienteReferral.criadoEm instanceof Date
            ? pacienteReferral.criadoEm
            : (pacienteReferral.criadoEm as { toDate?: () => Date })?.toDate?.(),
      };
    }
  }

  if (ctx.paciente?.medicoRecomendadoId && ctx.paciente.medicoRecomendadoId === ctx.medicoId) {
    return {
      type: 'medico',
      sourceId: ctx.medicoId,
      sourceName: ctx.medicoNome,
      capturedAt: ctx.paciente.dataCadastro,
    };
  }

  return { type: 'desconhecido', capturedAt: new Date() };
}

export type LeadReferralBadge = {
  label: string;
  shortLabel: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
};

const BADGE_BY_TYPE: Record<LeadReferralType, Omit<LeadReferralBadge, 'label' | 'shortLabel'>> = {
  nutricionista: {
    dotClass: 'bg-violet-500',
    bgClass: 'bg-violet-50 dark:bg-violet-950/40',
    textClass: 'text-violet-800 dark:text-violet-200',
  },
  personal: {
    dotClass: 'bg-emerald-500',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    textClass: 'text-emerald-800 dark:text-emerald-200',
  },
  paciente: {
    dotClass: 'bg-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    textClass: 'text-amber-900 dark:text-amber-200',
  },
  medico: {
    dotClass: 'bg-sky-500',
    bgClass: 'bg-sky-50 dark:bg-sky-950/40',
    textClass: 'text-sky-800 dark:text-sky-200',
  },
  dr_link: {
    dotClass: 'bg-sky-500',
    bgClass: 'bg-sky-50 dark:bg-sky-950/40',
    textClass: 'text-sky-800 dark:text-sky-200',
  },
  manual: {
    dotClass: 'bg-slate-700',
    bgClass: 'bg-slate-100 dark:bg-slate-800/60',
    textClass: 'text-slate-800 dark:text-slate-200',
  },
  landing: {
    dotClass: 'bg-indigo-500',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40',
    textClass: 'text-indigo-800 dark:text-indigo-200',
  },
  desconhecido: {
    dotClass: 'bg-slate-300 dark:bg-slate-600',
    bgClass: 'bg-slate-50 dark:bg-white/5',
    textClass: 'text-slate-500 dark:text-slate-400',
  },
};

function badgePrefix(type: LeadReferralType): string {
  switch (type) {
    case 'nutricionista':
      return 'Nutri';
    case 'personal':
      return 'Personal';
    case 'paciente':
      return 'Indicação';
    case 'medico':
    case 'dr_link':
      return 'Direto';
    case 'manual':
      return 'Manual';
    case 'landing':
      return 'Landing';
    default:
      return 'Origem desconhecida';
  }
}

export function getLeadReferralBadge(lead: Pick<LeadMedico, 'referral'>): LeadReferralBadge {
  const type = getEffectiveReferralType(lead);
  const styles = BADGE_BY_TYPE[type];
  const name = lead.referral?.sourceName?.trim();
  const prefix = badgePrefix(type);

  if (type === 'desconhecido') {
    return { label: 'Origem desconhecida', shortLabel: 'Desconhecida', ...styles };
  }

  const label = name ? `${prefix} ${name}` : prefix;
  const shortLabel = name ? `${prefix} ${name.split(' ')[0]}` : prefix;
  return { label, shortLabel, ...styles };
}

export type LeadReferralKpis = {
  nutricionista: number;
  personal: number;
  paciente: number;
  medico: number;
  manual: number;
  landing: number;
  desconhecido: number;
};

export function computeLeadReferralKpis(leads: LeadMedico[]): LeadReferralKpis {
  const kpis: LeadReferralKpis = {
    nutricionista: 0,
    personal: 0,
    paciente: 0,
    medico: 0,
    manual: 0,
    landing: 0,
    desconhecido: 0,
  };

  for (const lead of leads) {
    const type = getEffectiveReferralType(lead);
    if (type === 'dr_link') {
      kpis.medico += 1;
    } else {
      kpis[type] += 1;
    }
  }

  return kpis;
}

export function buildIndicacaoByPhoneMap(indicacoes: Indicacao[]): Map<string, Indicacao> {
  const map = new Map<string, Indicacao>();
  for (const ind of indicacoes) {
    const phone = ind.telefonePaciente?.replace(/\D/g, '');
    if (phone && !map.has(phone)) {
      map.set(phone, ind);
    }
  }
  return map;
}

export function findIndicacaoForLead(
  lead: Pick<LeadMedico, 'telefone'>,
  indicacaoByPhone: Map<string, Indicacao>
): Indicacao | null {
  const phone = lead.telefone?.replace(/\D/g, '');
  if (!phone) return null;
  return indicacaoByPhone.get(phone) ?? null;
}
