'use client';

import { useState, type ReactNode } from 'react';
import LeadsAgendaSegmentedTabs, {
  type LeadsAgendaTab,
} from '@/components/crm/LeadsAgendaSegmentedTabs';
import MetaadminAgendamentosWorkspace from '@/components/metaadmin/agenda/MetaadminAgendamentosWorkspace';

type Props = {
  leadsContent: ReactNode;
};

export default function MetaadminLeadsAgendaHub({ leadsContent }: Props) {
  const [activeTab, setActiveTab] = useState<LeadsAgendaTab>('leads');

  return (
    <div className="space-y-4">
      <LeadsAgendaSegmentedTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'leads' ? leadsContent : <MetaadminAgendamentosWorkspace />}
    </div>
  );
}
