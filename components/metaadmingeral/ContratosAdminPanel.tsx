'use client';

import { useMemo, useState } from 'react';
import ContratosMedicoPacienteAdmin from '@/components/metaadmingeral/ContratosMedicoPacienteAdmin';

type ContratosTab = 'medico-paciente';

export default function ContratosAdminPanel() {
  const [activeTab, setActiveTab] = useState<ContratosTab>('medico-paciente');

  const tabs = useMemo(
    () => [{ id: 'medico-paciente' as const, label: 'Médico × Paciente' }],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#E8EDED]">Contratos</h2>
        <a
          href="/contratopadrao"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#4CCB7A] hover:underline"
        >
          Abrir editor do contrato
        </a>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#4CCB7A]/20 text-[#4CCB7A] ring-1 ring-[#4CCB7A]/40'
                : 'text-[#E8EDED]/70 hover:bg-white/5 hover:text-[#E8EDED]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'medico-paciente' && <ContratosMedicoPacienteAdmin />}
    </div>
  );
}
