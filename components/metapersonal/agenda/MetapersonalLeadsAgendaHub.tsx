'use client';

import { useState, type ReactNode } from 'react';
import LeadsAgendaSegmentedTabs, {
  type LeadsAgendaTab,
} from '@/components/crm/LeadsAgendaSegmentedTabs';
import MetapersonalAgendamentosWorkspace from '@/components/metapersonal/agenda/MetapersonalAgendamentosWorkspace';

type Props = {
  leadsContent: ReactNode;
};

export default function MetapersonalLeadsAgendaHub({ leadsContent }: Props) {
  const [activeTab, setActiveTab] = useState<LeadsAgendaTab>('leads');

  return (
    <div className="space-y-4">
      <LeadsAgendaSegmentedTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'leads' ? leadsContent : <MetapersonalAgendamentosWorkspace />}
    </div>
  );
}
