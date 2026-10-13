'use client';

import { useState } from 'react';
import {
  Bell,
  FileText,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react';
import LeadWhatsAppPresetModal from '@/components/crm/medico/LeadWhatsAppPresetModal';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import {
  getLeadEmail,
  getLeadPhone,
  getLeadPhoneFields,
  isValidLeadPhone,
} from '@/lib/crm/leadContactHelpers';
import { buildTelHref } from '@/lib/phone/buildTelHref';
import { getPaciente360PrimaryAction } from '@/lib/paciente360/paciente360QuickActions';
import {
  buildPaciente360WhatsAppMessage,
  buildPaciente360WhatsAppUrl,
} from '@/lib/paciente360/paciente360WhatsAppMessages';
import type { LeadMedico } from '@/types/leadMedico';
import type { Paciente360Summary } from '@/types/paciente360';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  summary?: Paciente360Summary;
  lead: LeadMedico;
  paciente?: PacienteCompleto | null;
  variant?: 'full' | 'compact';
  onOpenProntuario?: () => void;
  onOpenPaciente?: () => void;
  onCreateReminder?: () => void;
  organizationPublicName?: string | null;
};

function primaryShortLabel(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= 12) return trimmed;
  const first = trimmed.split(/\s+/)[0];
  return first.length >= 4 ? first : trimmed.slice(0, 12);
}

export default function Paciente360QuickActions({
  summary,
  lead,
  paciente,
  variant = 'full',
  onOpenProntuario,
  onOpenPaciente,
  onCreateReminder,
  organizationPublicName,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [whatsAppPresetOpen, setWhatsAppPresetOpen] = useState(false);
  const phoneRaw = getLeadPhone(lead, paciente);
  const phoneFields = getLeadPhoneFields(lead, paciente);
  const telHref = buildTelHref(phoneFields);
  const hasTelefone = isValidLeadPhone(lead, paciente);
  const email = getLeadEmail(lead, paciente);
  const hasEmail = Boolean(email);
  const hasPaciente = Boolean(summary?.pacienteId);
  const canProntuario = hasPaciente && Boolean(onOpenProntuario);
  const canLembrete = hasPaciente && Boolean(onCreateReminder);
  const medicoId = lead.medicoId;
  const canWhatsAppPresets = hasTelefone && Boolean(medicoId) && Boolean(phoneRaw);

  const waMessage = buildPaciente360WhatsAppMessage(summary, lead, {
    organizationName: organizationPublicName,
  });
  const waUrl = hasTelefone
    ? buildPaciente360WhatsAppUrl(phoneRaw, waMessage, phoneFields)
    : null;

  const primary = getPaciente360PrimaryAction(summary);

  const openWhatsAppPicker = () => {
    if (canWhatsAppPresets) {
      setWhatsAppPresetOpen(true);
      return;
    }
    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const runPrimary = () => {
    if (primary.kind === 'whatsapp') {
      openWhatsAppPicker();
      return;
    }
    if (primary.kind === 'prontuario' && onOpenProntuario) {
      onOpenProntuario();
      return;
    }
    if (onOpenPaciente) {
      onOpenPaciente();
      return;
    }
    if (onOpenProntuario) {
      onOpenProntuario();
    }
  };

  const actionBtn =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const whatsAppControl =
    canWhatsAppPresets ? (
      <button
        type="button"
        aria-label="WhatsApp"
        title="Abrir WhatsApp"
        onClick={openWhatsAppPicker}
        className={`${actionBtn} min-w-[2.75rem] sm:min-w-0 ${t.btnSecondary}`}
      >
        <MessageCircle className="w-4 h-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">WhatsApp</span>
        <span className="sm:hidden">WA</span>
      </button>
    ) : (
      <a
        href={waUrl ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        aria-disabled={!waUrl}
        title={waUrl ? 'Abrir WhatsApp' : 'Telefone não disponível'}
        onClick={(e) => {
          if (!waUrl) e.preventDefault();
        }}
        className={`${actionBtn} min-w-[2.75rem] sm:min-w-0 ${t.btnSecondary} ${
          waUrl ? '' : 'pointer-events-none opacity-40'
        }`}
      >
        <MessageCircle className="w-4 h-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">WhatsApp</span>
        <span className="sm:hidden">WA</span>
      </a>
    );

  const presetModal =
    whatsAppPresetOpen && medicoId && phoneRaw ? (
      <LeadWhatsAppPresetModal
        open={whatsAppPresetOpen}
        lead={lead}
        phoneRaw={phoneRaw}
        ident={phoneFields}
        medicoId={medicoId}
        organizationName={organizationPublicName}
        paciente360Summary={summary}
        onClose={() => setWhatsAppPresetOpen(false)}
      />
    ) : null;

  if (variant === 'compact') {
    return (
      <>
        <div className="flex flex-wrap items-stretch gap-1.5">
          <button
            type="button"
            onClick={runPrimary}
            disabled={primary.kind === 'whatsapp' && !hasTelefone}
            className={`h-9 flex-1 min-w-[5.5rem] rounded-lg px-2.5 text-xs font-semibold truncate ${t.btnPrimary} disabled:opacity-50`}
          >
            <span className="hidden sm:inline">{primary.label}</span>
            <span className="sm:hidden">{primaryShortLabel(primary.label)}</span>
          </button>

          {whatsAppControl}

          <a
            href={hasTelefone && telHref ? telHref : undefined}
            aria-label="Ligar"
            aria-disabled={!hasTelefone}
            title={hasTelefone ? 'Ligar' : 'Telefone não disponível'}
            onClick={(e) => {
              if (!hasTelefone) e.preventDefault();
            }}
            className={`${actionBtn} min-w-[2.75rem] sm:min-w-0 ${t.btnSecondary} ${
              hasTelefone ? '' : 'pointer-events-none opacity-40'
            }`}
          >
            <Phone className="w-4 h-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Ligar</span>
            <span className="sm:hidden">Tel</span>
          </a>

          <a
            href={hasEmail ? `mailto:${email}` : undefined}
            aria-label="E-mail"
            aria-disabled={!hasEmail}
            title={hasEmail ? 'Enviar e-mail' : 'E-mail não disponível'}
            onClick={(e) => {
              if (!hasEmail) e.preventDefault();
            }}
            className={`${actionBtn} min-w-[2.75rem] sm:min-w-0 ${t.btnSecondary} ${
              hasEmail ? '' : 'pointer-events-none opacity-40'
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">E-mail</span>
            <span className="sm:hidden">Mail</span>
          </a>
        </div>
        {presetModal}
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.label}`}>Ações rápidas</p>

        <button
          type="button"
          onClick={runPrimary}
          disabled={primary.kind === 'whatsapp' && !hasTelefone}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold ${t.btnPrimary} disabled:opacity-50`}
        >
          {primary.label}
        </button>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {canWhatsAppPresets ? (
            <button
              type="button"
              onClick={openWhatsAppPicker}
              className={`${actionBtn} ${t.btnSecondary}`}
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden />
              WhatsApp
            </button>
          ) : (
            <a
              href={waUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!waUrl}
              onClick={(e) => {
                if (!waUrl) e.preventDefault();
              }}
              className={`${actionBtn} ${t.btnSecondary} ${!waUrl ? 'pointer-events-none opacity-40' : ''}`}
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden />
              WhatsApp
            </a>
          )}

          <a
            href={hasTelefone && telHref ? telHref : undefined}
            aria-disabled={!hasTelefone}
            onClick={(e) => {
              if (!hasTelefone) e.preventDefault();
            }}
            className={`${actionBtn} ${t.btnSecondary} ${!hasTelefone ? 'pointer-events-none opacity-40' : ''}`}
          >
            <Phone className="w-3.5 h-3.5" aria-hidden />
            Ligar
          </a>

          <a
            href={hasEmail ? `mailto:${email}` : undefined}
            aria-disabled={!hasEmail}
            onClick={(e) => {
              if (!hasEmail) e.preventDefault();
            }}
            className={`${actionBtn} ${t.btnSecondary} ${!hasEmail ? 'pointer-events-none opacity-40' : ''}`}
          >
            <Mail className="w-3.5 h-3.5" aria-hidden />
            E-mail
          </a>

          {canProntuario && (
            <button type="button" onClick={onOpenProntuario} className={`${actionBtn} ${t.btnSecondary}`}>
              <FileText className="w-3.5 h-3.5" aria-hidden />
              Prontuário
            </button>
          )}

          {canLembrete && (
            <button type="button" onClick={onCreateReminder} className={`${actionBtn} ${t.btnSecondary}`}>
              <Bell className="w-3.5 h-3.5" aria-hidden />
              Adicionar lembrete
            </button>
          )}
        </div>
      </div>
      {presetModal}
    </>
  );
}
