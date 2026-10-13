'use client';

import {
  AutomacoesChannelBadge,
  AutomacoesConstructionBanner,
  AutomacoesInfoNote,
  AutomacoesPageHeader,
  AutomacoesPlaceholderTable,
  AutomacoesStatusBadge,
} from '@/components/metaadmingeral/automacoes/automacoesCenterUi';
import { listAutomationCenterCatalog } from '@/lib/metaadmingeral/automationCenterCatalog';
import {
  categoryLabel,
  channelLabel,
  formatAutomationBoolean,
  formatAutomationTimeWindow,
  statusLabel,
  statusTone,
} from '@/lib/metaadmingeral/automationCenterLabels';

export default function AutomacoesCatalogPanel() {
  const catalog = listAutomationCenterCatalog();

  return (
    <div className="space-y-6">
      <AutomacoesPageHeader
        title="Automações"
        subtitle="Catálogo global de automações disponíveis na plataforma"
      />

      <AutomacoesConstructionBanner />

      <AutomacoesInfoNote>
        Catálogo central em memória ({catalog.length} itens). Nesta etapa não há persistência Firestore nem
        alteração de envios — apenas visão global para gestão futura.
      </AutomacoesInfoNote>

      <AutomacoesPlaceholderTable
        title="Catálogo global"
        headers={[
          'Nome',
          'Categoria',
          'Canal',
          'Status Global',
          'Override por organização',
          'Ativação pelo médico',
          'Opt-in paciente',
          'Janela de horário',
        ]}
        rows={catalog.map((item) => [
          <div key={`${item.id}-name`}>
            <span className="font-medium text-[#E8EDED]">{item.name}</span>
            <p className="mt-0.5 text-xs text-[#E8EDED]/50 max-w-xs line-clamp-2">{item.description}</p>
          </div>,
          categoryLabel(item.category),
          <AutomacoesChannelBadge key={`${item.id}-ch`} channel={channelLabel(item.channel)} />,
          <AutomacoesStatusBadge
            key={`${item.id}-st`}
            label={statusLabel(item.status)}
            tone={statusTone(item.status)}
          />,
          formatAutomationBoolean(item.allowOrganizationOverride),
          formatAutomationBoolean(item.allowDoctorActivation),
          formatAutomationBoolean(item.requiresPatientOptIn),
          formatAutomationTimeWindow(item.allowedStartTime, item.allowedEndTime),
        ])}
      />
    </div>
  );
}
