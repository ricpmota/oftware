'use client';

import { useState } from 'react';
import { CalendarDays, GraduationCap, Users } from 'lucide-react';
import WhiteLabelAvailabilityManager from '@/components/metaadmingeral/WhiteLabelAvailabilityManager';
import CadastroMedicoMentoradosAdmin from '@/components/metaadmingeral/CadastroMedicoMentoradosAdmin';
import { LeadsWhiteLabelCrmView } from '@/components/crm/whiteLabel';

type AdminTab = 'calendar' | 'leads' | 'mentorados';

type LeadsWhiteLabelAdminProps = {
  /** Dentro da página Organizações (sem padding/título duplicado). */
  embedded?: boolean;
};

export default function LeadsWhiteLabelAdmin({ embedded = false }: LeadsWhiteLabelAdminProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('calendar');

  const tabDescriptions: Record<AdminTab, string> = {
    calendar: 'Calendário de disponibilidade para reuniões',
    leads: 'CRM comercial — pipeline, score e timeline',
    mentorados: 'Cadastros de implantação — onboarding pós-mentoria',
  };

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 md:p-6 space-y-4'}>
      <div>
        <h2 className={`font-bold text-[#E8EDED] ${embedded ? 'text-lg' : 'text-xl'}`}>
          Leads White Label
        </h2>
        <p className="text-sm text-[#E8EDED]/60 mt-0.5">
          Médicos interessados em adquirir uma organização na plataforma. {tabDescriptions[activeTab]}
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-full sm:w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-sm'
              : 'text-[#E8EDED]/70 hover:text-[#E8EDED] hover:bg-white/5'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Calendário
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'leads'
              ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-sm'
              : 'text-[#E8EDED]/70 hover:text-[#E8EDED] hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          CRM / Leads
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mentorados')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'mentorados'
              ? 'bg-[#4CCB7A] text-[#0A1F44] shadow-sm'
              : 'text-[#E8EDED]/70 hover:text-[#E8EDED] hover:bg-white/5'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Mentorados
        </button>
      </div>

      {activeTab === 'calendar' && <WhiteLabelAvailabilityManager />}
      {activeTab === 'leads' && <LeadsWhiteLabelCrmView />}
      {activeTab === 'mentorados' && <CadastroMedicoMentoradosAdmin />}
    </div>
  );
}
