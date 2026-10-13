'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import {
  AutomacoesChannelBadge,
  AutomacoesConstructionBanner,
  AutomacoesInfoNote,
  AutomacoesPageHeader,
  AutomacoesPlaceholderTable,
  AutomacoesStatusBadge,
} from '@/components/metaadmingeral/automacoes/automacoesCenterUi';
import {
  buildOrganizationAutomationSummary,
  listOrganizationAutomationDetails,
  mergeAutomationOrganizationSettings,
  organizationGovernanceStatusLabel,
  organizationGovernanceStatusTone,
  type OrganizationAutomationDetailRow,
} from '@/lib/metaadmingeral/automationOrganizationSettings';
import {
  channelLabel,
  statusLabel,
  statusTone,
} from '@/lib/metaadmingeral/automationCenterLabels';
import { listOrganizations } from '@/lib/organization/organizationRegistry';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';
import type { AutomationOrganizationSettingDto } from '@/types/automationCenter';

type Props = {
  user: User | null;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function GovernanceSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4CCB7A] disabled:opacity-50 ${
        checked ? 'bg-[#4CCB7A]' : 'bg-white/15'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow mt-1 transition duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function OrganizationDetailModal({
  organization,
  settings,
  user,
  onClose,
  onSettingUpdated,
}: {
  organization: OrganizationDefinition;
  settings: AutomationOrganizationSettingDto[];
  user: User | null;
  onClose: () => void;
  onSettingUpdated: (setting: AutomationOrganizationSettingDto) => void;
}) {
  const orgSettings = useMemo(
    () => mergeAutomationOrganizationSettings(settings, organization.id),
    [settings, organization.id],
  );
  const details = useMemo(
    () => listOrganizationAutomationDetails(organization.id, orgSettings),
    [organization.id, orgSettings],
  );
  const summary = useMemo(
    () => buildOrganizationAutomationSummary(organization.id, orgSettings),
    [organization.id, orgSettings],
  );

  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [errorByAutomation, setErrorByAutomation] = useState<Record<string, string>>({});

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleToggle = useCallback(
    async (row: OrganizationAutomationDetailRow, enabled: boolean) => {
      if (!user) return;

      const automationId = row.automationId;
      setSaveStates((prev) => ({ ...prev, [automationId]: 'saving' }));
      setErrorByAutomation((prev) => {
        const next = { ...prev };
        delete next[automationId];
        return next;
      });

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/metaadmingeral/automacoes/organization-settings', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: organization.id,
            automationId,
            enabled,
          }),
        });

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          setting?: AutomationOrganizationSettingDto;
        } | null;

        if (!res.ok || data?.ok === false || !data?.setting) {
          throw new Error(data?.error ?? 'Não foi possível salvar a liberação.');
        }

        onSettingUpdated(data.setting);
        setSaveStates((prev) => ({ ...prev, [automationId]: 'saved' }));
        window.setTimeout(() => {
          setSaveStates((prev) =>
            prev[automationId] === 'saved' ? { ...prev, [automationId]: 'idle' } : prev,
          );
        }, 2000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao salvar.';
        setSaveStates((prev) => ({ ...prev, [automationId]: 'error' }));
        setErrorByAutomation((prev) => ({ ...prev, [automationId]: message }));
      }
    },
    [onSettingUpdated, organization.id, user],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-automation-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">
              Governança por organização
            </p>
            <h3 id="org-automation-detail-title" className="mt-1 text-lg font-semibold text-[#E8EDED]">
              {organization.name}
            </h3>
            <p className="mt-1 text-sm font-mono text-[#E8EDED]/50">{organization.id}</p>
            <p className="mt-2 text-sm text-[#E8EDED]/65">
              {summary.enabledCount} de {summary.totalAvailable} automações liberadas ·{' '}
              {summary.whatsappEnabled} WhatsApp · {summary.emailEnabled} E-mail
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[#E8EDED]/60 hover:bg-white/10 hover:text-[#E8EDED] transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!user ? (
          <div className="px-5 py-8 text-sm text-amber-200/90">Faça login para editar liberações.</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
                <th className="px-5 py-3 font-medium">Automação</th>
                <th className="px-3 py-3 font-medium">Canal</th>
                <th className="px-3 py-3 font-medium">Status global</th>
                <th className="px-3 py-3 font-medium">Liberada</th>
                <th className="px-5 py-3 font-medium">Template padrão</th>
              </tr>
            </thead>
            <tbody>
              {details.map((row) => {
                const saveState = saveStates[row.automationId] ?? 'idle';
                const templateLabel = row.defaultTemplateName ?? row.defaultTemplateId ?? '—';

                return (
                  <tr key={row.automationId} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 text-[#E8EDED]">
                      <div className="font-medium">{row.automationName}</div>
                      <div className="text-xs font-mono text-[#E8EDED]/45 mt-0.5">{row.automationId}</div>
                    </td>
                    <td className="px-3 py-3">
                      <AutomacoesChannelBadge channel={channelLabel(row.channel)} />
                    </td>
                    <td className="px-3 py-3">
                      <AutomacoesStatusBadge
                        label={statusLabel(row.globalStatus)}
                        tone={statusTone(row.globalStatus)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <GovernanceSwitch
                          checked={row.enabledForOrganization}
                          disabled={!user || saveState === 'saving'}
                          onChange={(enabled) => void handleToggle(row, enabled)}
                        />
                        {saveState === 'saving' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#E8EDED]/60" />
                        ) : null}
                        {saveState === 'saved' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#4CCB7A]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Salvo
                          </span>
                        ) : null}
                        {saveState === 'error' ? (
                          <span className="text-xs text-red-400">{errorByAutomation[row.automationId]}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#E8EDED]/85">
                      <div className="text-sm">{templateLabel}</div>
                      {row.defaultTemplateId ? (
                        <div className="text-xs font-mono text-[#E8EDED]/45 mt-0.5">{row.defaultTemplateId}</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AutomacoesOrganizacoesPanel({ user }: Props) {
  const organizations = listOrganizations();
  const [settings, setSettings] = useState<AutomationOrganizationSettingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationDefinition | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/organization-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        settings?: AutomationOrganizationSettingDto[];
      } | null;

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? 'Não foi possível carregar governança.');
      }

      setSettings(data?.settings ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar governança.');
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSettingUpdated = useCallback((setting: AutomationOrganizationSettingDto) => {
    setSettings((prev) => {
      const key = `${setting.organizationId}_${setting.automationId}`;
      const filtered = prev.filter(
        (item) => `${item.organizationId}_${item.automationId}` !== key,
      );
      return [...filtered, setting];
    });
  }, []);

  const handleRowClick = useCallback(
    (rowIndex: number) => {
      const organization = organizations[rowIndex];
      if (organization) setSelectedOrganization(organization);
    },
    [organizations],
  );

  const handleClose = useCallback(() => setSelectedOrganization(null), []);

  return (
    <div className="space-y-6">
      <AutomacoesPageHeader
        title="Organizações"
        subtitle="Liberação de automações e adoção por organização white label"
      />

      <AutomacoesConstructionBanner />

      <AutomacoesInfoNote>
        Governança persistida em Firestore (<code className="font-mono text-[#4CCB7A]/90">automationOrganizationSettings</code>
        ) por <code className="font-mono text-[#4CCB7A]/90">organizationId</code>. Sem registro no Firestore,
        usa o seed em memória como fallback. Clique em uma organização para liberar ou bloquear automações.
      </AutomacoesInfoNote>

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#E8EDED]/60">
          <Loader2 className="h-7 w-7 animate-spin text-[#4CCB7A]" />
        </div>
      ) : (
        <AutomacoesPlaceholderTable
          title="Organizações"
          headers={[
            'Organização',
            'Automações liberadas',
            'Total disponível',
            'WhatsApp liberadas',
            'E-mail liberadas',
            'Status',
          ]}
          onRowClick={handleRowClick}
          rows={organizations.map((organization) => {
            const orgSettings = mergeAutomationOrganizationSettings(settings, organization.id);
            const summary = buildOrganizationAutomationSummary(organization.id, orgSettings);

            return [
              <div key={`${organization.id}-org`}>
                <span className="font-medium text-[#E8EDED]">{organization.name}</span>
                <p className="mt-0.5 text-xs font-mono text-[#E8EDED]/45">{organization.id}</p>
              </div>,
              `${summary.enabledCount} / ${summary.totalAvailable}`,
              String(summary.totalAvailable),
              String(summary.whatsappEnabled),
              String(summary.emailEnabled),
              <AutomacoesStatusBadge
                key={`${organization.id}-st`}
                label={organizationGovernanceStatusLabel(summary.governanceStatus)}
                tone={organizationGovernanceStatusTone(summary.governanceStatus)}
              />,
            ];
          })}
        />
      )}

      {selectedOrganization ? (
        <OrganizationDetailModal
          organization={selectedOrganization}
          settings={settings}
          user={user}
          onClose={handleClose}
          onSettingUpdated={handleSettingUpdated}
        />
      ) : null}
    </div>
  );
}
