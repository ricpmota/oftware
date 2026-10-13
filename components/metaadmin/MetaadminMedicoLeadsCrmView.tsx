'use client';

import { LeadsMedicoCrmView } from '@/components/crm/medico';
import type { LeadMedico } from '@/types/leadMedico';

type Props = {
  themeHome: 'light' | 'dark';
  medicoId?: string | null;
  userEmail?: string | null;
  onOpenMessages?: (lead: LeadMedico) => void;
};

export default function MetaadminMedicoLeadsCrmView({
  themeHome,
  medicoId,
  userEmail,
  onOpenMessages,
}: Props) {
  const isDark = themeHome === 'dark';
  const titleCls = isDark ? 'text-[#E8EDED]' : 'text-gray-900 dark:text-white';
  const subtitleCls = isDark ? 'text-[#E8EDED]/60' : 'text-gray-600 dark:text-gray-400';

  if (!medicoId) {
    return (
      <div
        className={`rounded-2xl border p-8 text-center max-w-lg mx-auto ${
          isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        <h2 className={`text-lg font-semibold mb-2 ${titleCls}`}>Perfil médico não encontrado</h2>
        <p className={`text-sm ${subtitleCls}`}>
          Complete o cadastro do médico para visualizar os leads de pacientes.
        </p>
      </div>
    );
  }

  return (
    <LeadsMedicoCrmView
      themeHome={themeHome}
      medicoId={medicoId}
      userEmail={userEmail}
      onOpenMessages={onOpenMessages}
    />
  );
}
