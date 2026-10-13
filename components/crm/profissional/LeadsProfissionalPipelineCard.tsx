'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Bell, Brain, Dumbbell, GripVertical, Phone, UtensilsCrossed } from 'lucide-react';
import LeadPatientAvatar from '@/components/crm/LeadPatientAvatar';
import LeadCardTagManager from '@/components/crm/medico/LeadCardTagManager';
import { MedicoLeadsCrmThemeBridge } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import {
  useProfissionalCrmRole,
  useProfissionalCrmTheme,
} from '@/components/crm/profissional/ProfissionalCrmProvider';
import { formatLeadAge, getLeadIdleTone } from '@/lib/crm/leadAge';
import { leadCrmTagStyle } from '@/lib/crm/leadCrmTagUtils';
import {
  formatOrcamentoBrl,
  getLeadMedicoOrigemBadge,
} from '@/lib/crm/leadProfissionalCrmUtils';
import { formatLeadTaskCounter, summarizeLeadTasks } from '@/lib/crm/leadTaskSummary';
import {
  buildPatientWhatsappUrl,
  buildWhatsappUrl,
  phoneFieldsFromPaciente,
  resolveWhatsappCanonicalDigits,
} from '@/lib/phone/buildWhatsappUrl';
import { buildTelHref } from '@/lib/phone/buildTelHref';
import { phoneFieldsFromLead } from '@/lib/whatsapp/resolveLeadPhone';
import type { LeadProfissional } from '@/types/leadProfissional';
import type { CrmTag, LeadCrmTagSnapshot } from '@/types/crmTag';
import type { Lembrete } from '@/types/lembrete';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  lead: LeadProfissional;
  paciente?: PacienteCompleto | null;
  photoUrl?: string | null;
  lembretes?: Lembrete[];
  profissionalId?: string;
  availableTags?: CrmTag[];
  onOpen: (lead: LeadProfissional) => void;
  onOpenAbaProfissional?: (pacienteId: string) => void;
  onCreateReminder?: (pacienteId: string, pacienteNome: string) => void;
  onTagsChange?: (leadId: string, tags: LeadCrmTagSnapshot[]) => void;
  onTagsCatalogChange?: (tags: CrmTag[]) => void;
  onCreateTag?: (data: { label: string; color: string; backgroundColor?: string }) => Promise<CrmTag>;
  onUpdateTag?: (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => Promise<void>;
  onArchiveTag?: (tagId: string) => Promise<void>;
};

const IDLE_TONE_CLASS = {
  neutral: 'text-slate-500 dark:text-slate-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
};

function formatLeadCardDisplayName(
  paciente: PacienteCompleto | null | undefined,
  leadName: string
): string {
  const raw =
    paciente?.dadosIdentificacao?.nomeCompleto?.trim() ||
    paciente?.nome?.trim() ||
    leadName?.trim() ||
    '';
  if (!raw) return 'Lead';
  const partes = raw.split(/\s+/).filter((p) => p.length > 0);
  if (partes.length === 0) return 'Lead';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

export default function LeadsProfissionalPipelineCard({
  lead,
  paciente,
  photoUrl,
  lembretes = [],
  profissionalId,
  availableTags = [],
  onOpen,
  onOpenAbaProfissional,
  onCreateReminder,
  onTagsChange,
  onTagsCatalogChange,
  onCreateTag,
  onUpdateTag,
  onArchiveTag,
}: Props) {
  const t = useProfissionalCrmTheme();
  const role = useProfissionalCrmRole();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead, status: lead.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  const orcamento = lead.orcamento || 0;
  const tags = lead.crmTags ?? [];
  const visibleTags = tags.slice(0, 2);
  const extraTags = tags.length - visibleTags.length;
  const leadPhoneFields = phoneFieldsFromLead(lead);
  const telefoneLimpo =
    resolveWhatsappCanonicalDigits(phoneFieldsFromPaciente(paciente)) ??
    resolveWhatsappCanonicalDigits(leadPhoneFields);
  const telHref =
    buildTelHref(phoneFieldsFromPaciente(paciente)) ?? buildTelHref(leadPhoneFields);
  const hasTelefone = Boolean(telefoneLimpo);
  const badge = getLeadMedicoOrigemBadge(lead);
  const displayName = formatLeadCardDisplayName(paciente, lead.name);
  const compartilhadoEm = lead.dataCompartilhamento || lead.createdAt;
  const idleLabel = formatLeadAge(compartilhadoEm);
  const idleTone = getLeadIdleTone(compartilhadoEm);
  const pacienteId = lead.pacienteId || paciente?.id;
  const tasks = summarizeLeadTasks(lembretes);
  const taskLabel = formatLeadTaskCounter(tasks);
  const pendingLembretes = tasks.pending;

  const canWhatsApp = hasTelefone;
  const canAba = Boolean(pacienteId && onOpenAbaProfissional);
  const canLembrete = Boolean(pacienteId && onCreateReminder);
  const canManageTags = Boolean(
    profissionalId &&
      onTagsChange &&
      onTagsCatalogChange &&
      onCreateTag &&
      onUpdateTag &&
      onArchiveTag
  );

  const iconBtn =
    'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30 lg:h-8 lg:w-8';

  const openWhatsApp = () => {
    const url =
      buildPatientWhatsappUrl(paciente) ?? buildWhatsappUrl(leadPhoneFields);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${t.pipelineCard} min-h-[118px] grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] gap-x-2 gap-y-1.5 shadow-sm transition-shadow hover:shadow-md lg:rounded-2xl lg:shadow-[0_1px_2px_rgba(15,23,42,0.05)]`}
      onClick={() => onOpen(lead)}
    >
      <button
        type="button"
        className={`row-start-1 col-start-1 self-start mt-0.5 shrink-0 ${t.pipelineCardGrip} cursor-grab active:cursor-grabbing`}
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        aria-label="Arrastar card"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <LeadPatientAvatar photoUrl={photoUrl} className="row-start-1 col-start-2 mt-0.5 h-8 w-8 self-start lg:h-10 lg:w-10" />

      <div className="row-start-1 col-start-3 min-w-0 flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold leading-tight lg:text-[15px] ${t.textPrimary}`} title={displayName}>
            {displayName}
          </p>
          {lead.medicoNome ? (
            <p className={`mt-0.5 hidden truncate text-[11px] lg:block ${t.textMuted}`} title={lead.medicoNome}>
              {lead.medicoNome}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(lead);
          }}
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold lg:rounded-lg lg:px-2 lg:py-1 lg:text-xs lg:font-bold ${
            orcamento > 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
              : `${t.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
          }`}
        >
          {orcamento > 0 ? formatOrcamentoBrl(orcamento) : '+ Valor'}
        </button>
      </div>

      <div
        className="row-start-2 col-start-3 min-w-0 flex flex-wrap items-center justify-start gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={`inline-flex shrink-0 max-w-[min(100%,9.5rem)] items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badge.bgClass} ${badge.textClass}`}
          title={badge.label}
        >
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${badge.dotClass}`} />
          <span className="truncate">{badge.shortLabel}</span>
        </span>
        {visibleTags.map((tag) => (
          <span
            key={tag.tagId}
            className="inline-flex max-w-[88px] truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium border"
            style={leadCrmTagStyle(tag)}
          >
            {tag.label}
          </span>
        ))}
        {extraTags > 0 && (
          <span className={`text-[9px] font-medium ${t.textSubtle}`}>+{extraTags}</span>
        )}
        {canManageTags && (
          <MedicoLeadsCrmThemeBridge theme={t}>
            <LeadCardTagManager
              medicoId={profissionalId!}
              leadId={lead.id}
              appliedTags={tags}
              availableTags={availableTags}
              onAppliedChange={(next) => onTagsChange!(lead.id, next)}
              onTagsCatalogChange={onTagsCatalogChange!}
              onCreateTag={onCreateTag!}
              onUpdateTag={onUpdateTag!}
              onArchiveTag={onArchiveTag!}
            />
          </MedicoLeadsCrmThemeBridge>
        )}
      </div>

      <div
        className={`col-span-3 flex items-center justify-between gap-2 mt-0.5 pt-2 border-t ${t.divider}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="WhatsApp"
            disabled={!canWhatsApp}
            onClick={(e) => {
              e.stopPropagation();
              if (canWhatsApp) openWhatsApp();
            }}
            className={`${iconBtn} ${t.btnSecondary}`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </button>

          <a
            href={hasTelefone && telHref ? telHref : undefined}
            aria-label="Ligar"
            onClick={(e) => {
              if (!hasTelefone) e.preventDefault();
              e.stopPropagation();
            }}
            className={`${iconBtn} ${t.btnSecondary} ${!hasTelefone ? 'opacity-30 pointer-events-none' : ''}`}
          >
            <Phone className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            disabled={!canAba}
            aria-label={
              role === 'nutri' ? 'Aba Nutri' : role === 'psiquiatra' ? 'Aba Psiquiatria' : 'Aba Personal'
            }
            title={
              role === 'nutri'
                ? 'Abrir Nutri'
                : role === 'psiquiatra'
                  ? 'Abrir Psiquiatria'
                  : 'Abrir Personal'
            }
            onClick={(e) => {
              e.stopPropagation();
              if (pacienteId && onOpenAbaProfissional) onOpenAbaProfissional(pacienteId);
            }}
            className={`${iconBtn} ${t.btnSecondary}`}
          >
            {role === 'nutri' ? (
              <UtensilsCrossed className="w-3.5 h-3.5" />
            ) : role === 'psiquiatra' ? (
              <Brain className="w-3.5 h-3.5" />
            ) : (
              <Dumbbell className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            disabled={!canLembrete}
            aria-label="Lembretes"
            onClick={(e) => {
              e.stopPropagation();
              if (pacienteId && onCreateReminder) onCreateReminder(pacienteId, displayName);
            }}
            className={`relative ${iconBtn} ${t.btnSecondary}`}
          >
            <Bell className="w-3.5 h-3.5" />
            {pendingLembretes > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
                {pendingLembretes > 9 ? '9+' : pendingLembretes}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-medium tabular-nums ${IDLE_TONE_CLASS[idleTone]}`}
            title="Dias desde o compartilhamento"
          >
            {idleLabel}
          </span>
          {taskLabel && (
            <span
              className={`text-[10px] font-medium tabular-nums ${
                tasks.overdue > 0 ? 'text-amber-600 dark:text-amber-400' : t.textSubtle
              }`}
            >
              {taskLabel}
              {tasks.overdue > 0 ? ' ⚠' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
