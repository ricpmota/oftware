'use client';

import { useState, type ReactNode } from 'react';
import LeadsAgendaSegmentedTabs, {
  type LeadsAgendaTab,
} from '@/components/crm/LeadsAgendaSegmentedTabs';
import MetanutriAgendamentosWorkspace from '@/components/metanutri/agenda/MetanutriAgendamentosWorkspace';

type Props = {
  leadsContent: ReactNode;
};

export default function MetanutriLeadsAgendaHub({ leadsContent }: Props) {
  const [activeTab, setActiveTab] = useState<LeadsAgendaTab>('leads');

  return (
    <div className="space-y-4">
      <LeadsAgendaSegmentedTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'leads' ? leadsContent : <MetanutriAgendamentosWorkspace />}
    </div>
  );
}
