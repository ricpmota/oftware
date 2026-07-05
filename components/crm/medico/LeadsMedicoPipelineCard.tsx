'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import LeadReferralEditorModal from '@/components/crm/medico/LeadReferralEditorModal';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Bell, FileText, GripVertical, Phone, User } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import LeadCardTagManager from '@/components/crm/medico/LeadCardTagManager';
import Paciente360MiniSummary from '@/components/metaadmin/paciente360/Paciente360MiniSummary';
import { formatLeadAge, getLeadIdleTone } from '@/lib/crm/leadAge';
import { getLeadCardAlert } from '@/lib/crm/leadCardAlert';
import { leadCrmTagStyle } from '@/lib/crm/leadCrmTagUtils';
import { getLeadPhone, getLeadPhoneDigits, isValidLeadPhone } from '@/lib/crm/leadContactHelpers';
import { formatOrcamentoBrl } from '@/lib/crm/leadMedicoCrmUtils';
import { getLeadReferralBadge } from '@/lib/crm/resolveLeadReferral';
import { formatLeadTaskCounter, summarizeLeadTasks } from '@/lib/crm/leadTaskSummary';
import {
  buildPaciente360WhatsAppMessage,
  buildPaciente360WhatsAppUrl,
} from '@/lib/paciente360/paciente360WhatsAppMessages';
import type { Paciente360Summary } from '@/types/paciente360';
import type { LeadMedico, LeadReferralSnapshot } from '@/types/leadMedico';
import type { Lembrete } from '@/types/lembrete';
import type { CrmTag, LeadCrmTagSnapshot } from '@/types/crmTag';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  lead: LeadMedico;
  paciente?: PacienteCompleto | null;
  paciente360Summary?: Paciente360Summary;
  lembretes?: Lembrete[];
  medicoId?: string;
  availableTags?: CrmTag[];
  onOpen: (lead: LeadMedico) => void;
  onTagsChange?: (leadId: string, tags: LeadCrmTagSnapshot[]) => void;
  onTagsCatalogChange?: (tags: CrmTag[]) => void;
  onCreateTag?: (data: { label: string; color: string; backgroundColor?: string }) => Promise<CrmTag>;
  onUpdateTag?: (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => Promise<void>;
  onArchiveTag?: (tagId: string) => Promise<void>;
  onOpenProntuario?: (pacienteId: string) => void;
  onCreateReminder?: () => void;
  medicoNome?: string;
  userEmail?: string | null;
  pacientes?: PacienteCompleto[];
  onReferralSaved?: (leadId: string, referral: LeadReferralSnapshot) => void;
};

const IDLE_TONE_CLASS = {
  neutral: 'text-slate-500 dark:text-slate-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
};

export default function LeadsMedicoPipelineCard({
  lead,
  paciente,
  paciente360Summary,
  lembretes,
  medicoId,
  availableTags = [],
  onOpen,
  onTagsChange,
  onTagsCatalogChange,
  onCreateTag,
  onUpdateTag,
  onArchiveTag,
  onOpenProntuario,
  onCreateReminder,
  medicoNome,
  userEmail,
  pacientes = [],
  onReferralSaved,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [referralEditorOpen, setReferralEditorOpen] = useState(false);
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

  const phoneRaw = getLeadPhone(lead, paciente);
  const telefoneLimpo = getLeadPhoneDigits(lead, paciente);
  const hasTelefone = isValidLeadPhone(lead, paciente);
  const waUrl = hasTelefone
    ? buildPaciente360WhatsAppUrl(phoneRaw, buildPaciente360WhatsAppMessage(paciente360Summary, lead))
    : null;

  const pacienteId = paciente360Summary?.pacienteId;
  const canProntuario = Boolean(pacienteId && onOpenProntuario);
  const canLembrete = Boolean(pacienteId && onCreateReminder);

  const tasks = summarizeLeadTasks(lembretes);
  const taskLabel = formatLeadTaskCounter(tasks);
  const pendingLembretes = tasks.pending;
  const alert = getLeadCardAlert({ lead, summary: paciente360Summary, tasks });

  const idleLabel = formatLeadAge(lead.dataStatus);
  const idleTone = getLeadIdleTone(lead.dataStatus);

  const iconBtn =
    'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none';

  const canManageTags = Boolean(
    medicoId &&
      onTagsChange &&
      onTagsCatalogChange &&
      onCreateTag &&
      onUpdateTag &&
      onArchiveTag
  );

  const referralBadge = getLeadReferralBadge(lead);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${t.pipelineCard} min-h-[118px] grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-2 gap-y-1.5 cursor-pointer group shadow-sm hover:shadow-md transition-shadow`}
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

      <div className="row-start-1 col-start-2 self-start flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300 overflow-hidden">
        <User className="w-4 h-4" aria-hidden />
      </div>

      <div className="row-start-1 col-start-3 min-w-0 flex items-start justify-between gap-1">
        <p className={`font-semibold text-sm leading-tight truncate ${t.textPrimary}`}>{lead.name}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(lead);
          }}
          className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
            orcamento > 0
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (medicoId && onReferralSaved) setReferralEditorOpen(true);
          }}
          className={`inline-flex shrink-0 max-w-[min(100%,9.5rem)] items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium border border-transparent transition-opacity ${
            medicoId && onReferralSaved ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
          } ${referralBadge.bgClass} ${referralBadge.textClass}`}
          title={medicoId && onReferralSaved ? `${referralBadge.label} — clique para editar` : referralBadge.label}
        >
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${referralBadge.dotClass}`} />
          <span className="truncate">{referralBadge.shortLabel}</span>
        </button>
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
          <LeadCardTagManager
            medicoId={medicoId!}
            leadId={lead.id}
            appliedTags={tags}
            availableTags={availableTags}
            onAppliedChange={(next) => onTagsChange!(lead.id, next)}
            onTagsCatalogChange={onTagsCatalogChange!}
            onCreateTag={onCreateTag!}
            onUpdateTag={onUpdateTag!}
            onArchiveTag={onArchiveTag!}
          />
        )}
      </div>

      {paciente360Summary && (
        <div className="col-span-3 min-w-0 w-full">
          <Paciente360MiniSummary
            summary={paciente360Summary}
            className="mt-0 w-full max-w-full sm:max-h-14"
            lineClamp={2}
          />
        </div>
      )}

      <div
        className={`col-span-3 flex items-center justify-between gap-2 mt-0.5 pt-2 border-t ${t.divider}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          <a
            href={waUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            onClick={(e) => {
              if (!waUrl) e.preventDefault();
              e.stopPropagation();
            }}
            className={`${iconBtn} ${t.btnSecondary} ${!waUrl ? 'opacity-30 pointer-events-none' : ''}`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>

          <a
            href={hasTelefone && telefoneLimpo ? `tel:+${telefoneLimpo}` : undefined}
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
            disabled={!canProntuario}
            aria-label="Prontuário"
            onClick={() => {
              if (pacienteId && onOpenProntuario) onOpenProntuario(pacienteId);
            }}
            className={`${iconBtn} ${t.btnSecondary}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={!canLembrete}
            aria-label="Lembretes"
            onClick={() => onCreateReminder?.()}
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
          <span className={`text-[10px] font-medium tabular-nums ${IDLE_TONE_CLASS[idleTone]}`}>
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
          {alert.show && (
            <AlertTriangle
              className={`w-3.5 h-3.5 shrink-0 ${
                alert.tone === 'danger' ? 'text-rose-500' : 'text-amber-500'
              }`}
              aria-label="Alerta"
            />
          )}
        </div>
      </div>

      {referralEditorOpen && medicoId && onReferralSaved && (
        <LeadReferralEditorModal
          open={referralEditorOpen}
          lead={lead}
          medicoId={medicoId}
          medicoNome={medicoNome}
          userEmail={userEmail}
          pacientes={pacientes}
          onClose={() => setReferralEditorOpen(false)}
          onSaved={(referral) => {
            onReferralSaved(lead.id, referral);
            setReferralEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
