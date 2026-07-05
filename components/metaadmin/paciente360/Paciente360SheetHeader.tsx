'use client';

import { Bell, FileText, MessageCircle } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import {
  getLeadPhone,
  isValidLeadPhone,
} from '@/lib/crm/leadContactHelpers';
import {
  PACIENTE360_RISCO_LABELS,
  PACIENTE360_STATUS_LABELS,
} from '@/lib/paciente360/paciente360Labels';
import {
  buildPaciente360WhatsAppMessage,
  buildPaciente360WhatsAppUrl,
} from '@/lib/paciente360/paciente360WhatsAppMessages';
import type { LeadMedico } from '@/types/leadMedico';
import type { Paciente360RiskLevel, Paciente360Summary } from '@/types/paciente360';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  summary: Paciente360Summary;
  lead: LeadMedico;
  paciente?: PacienteCompleto | null;
  onOpenProntuario?: () => void;
  onCreateReminder?: () => void;
};

const RISCO_CHIP: Record<Paciente360RiskLevel, string> = {
  baixo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  medio: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  alto: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  indeterminado: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300',
};

export default function Paciente360SheetHeader({
  summary,
  lead,
  paciente,
  onOpenProntuario,
  onCreateReminder,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const statusLabel = PACIENTE360_STATUS_LABELS[summary.statusComposto] ?? summary.statusComposto;
  const tags = summary.tagsAutomaticas.slice(0, 3);
  const proximaAcao = summary.proximaAcao?.label ?? 'Acompanhar evolução';

  const phoneRaw = getLeadPhone(lead, paciente);
  const hasTelefone = isValidLeadPhone(lead, paciente);
  const waUrl = hasTelefone
    ? buildPaciente360WhatsAppUrl(phoneRaw, buildPaciente360WhatsAppMessage(summary, lead))
    : null;
  const canProntuario = Boolean(summary.pacienteId && onOpenProntuario);
  const canLembrete = Boolean(summary.pacienteId && onCreateReminder);

  const actionBtn = `inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium ${t.btnSecondary} disabled:opacity-40`;

  return (
    <div className={`rounded-xl border p-3 ${t.panelBorder} ${t.infoBox}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.label}`}>Paciente 360</p>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.badgeCount}`}>
          {statusLabel}
        </span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISCO_CHIP[summary.risco.nivel]}`}
        >
          Risco {PACIENTE360_RISCO_LABELS[summary.risco.nivel]}
        </span>
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${t.badgeCount}`}
          >
            {tag}
          </span>
        ))}
      </div>

      <p className={`text-xs mt-2 leading-snug ${t.textMuted}`}>
        <span className={`font-semibold ${t.textPrimary}`}>Próxima ação:</span>{' '}
        <span className="line-clamp-2">{proximaAcao}</span>
      </p>

      <div className="flex flex-wrap items-stretch gap-1.5 mt-3">
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={actionBtn}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Telefone não disponível"
            className={actionBtn}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            WhatsApp
          </button>
        )}

        {canLembrete && (
          <button type="button" onClick={onCreateReminder} className={actionBtn}>
            <Bell className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Lembrete
          </button>
        )}

        {canProntuario && (
          <button type="button" onClick={onOpenProntuario} className={actionBtn}>
            <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Prontuário
          </button>
        )}
      </div>
    </div>
  );
}

export function Paciente360SheetHeaderUnavailable() {
  const t = useMedicoLeadsCrmTheme();
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${t.panelBorder} ${t.infoBox}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.label}`}>Paciente 360</p>
      <p className={`text-xs mt-1.5 ${t.textSubtle}`}>
        Sem paciente vinculado — timeline comercial disponível abaixo.
      </p>
    </div>
  );
}
