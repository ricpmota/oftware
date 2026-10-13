'use client';

import { Trash2 } from 'lucide-react';
import { campaignStatusLabel, whatsappStatusLabel } from '@/lib/disparos/labels';
import type { CampaignStatus, DisparoCampaign } from '@/lib/disparos/types';
import { DisparosBadge, DisparosSectionTitle } from '@/components/metaadmingeral/disparos/disparosUi';

function tone(status: CampaignStatus): 'success' | 'warn' | 'danger' | 'muted' | 'info' {
  if (status === 'concluida') return 'success';
  if (status === 'erro' || status === 'cancelada') return 'danger';
  if (status === 'pausada') return 'warn';
  if (status === 'em_andamento' || status === 'agendada') return 'info';
  return 'muted';
}

function queuedCount(campaign: DisparoCampaign): number {
  return campaign.totals.pending + campaign.totals.processing + campaign.totals.sent + campaign.totals.failed;
}

function remetenteLabel(campaign: DisparoCampaign): string {
  return campaign.remetente.profileName || campaign.remetente.phone || whatsappStatusLabel(campaign.remetente.connectionStatus);
}

type Props = {
  campaigns: DisparoCampaign[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (campaign: DisparoCampaign) => void;
};

function DeleteCampaignButton({ campaign, onDelete }: { campaign: DisparoCampaign; onDelete: (campaign: DisparoCampaign) => void }) {
  return (
    <button
      type="button"
      aria-label={`Excluir ${campaign.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onDelete(campaign);
      }}
      className="rounded-lg p-2 text-rose-200 hover:bg-rose-500/15"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export default function DisparosHistoryTable({ campaigns, activeId, onOpen, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <DisparosSectionTitle
        title="Histórico de disparos"
        hint="Campanhas gravadas. Abrir uma campanha mostra o progresso persistido."
      />
      {campaigns.length === 0 ? (
        <p className="text-sm text-[#E8EDED]/50">Nenhuma campanha gravada.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(campaign.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(campaign.id);
                  }
                }}
                className={`w-full rounded-2xl border p-4 text-left ${
                  campaign.id === activeId ? 'border-[#4CCB7A]/40 bg-[#4CCB7A]/10' : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-[#E8EDED]">{campaign.name}</span>
                  <div className="flex items-center gap-2">
                    <DisparosBadge label={campaignStatusLabel(campaign.status)} tone={tone(campaign.status)} />
                    <DeleteCampaignButton campaign={campaign} onDelete={onDelete} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#E8EDED]/60">
                  {new Date(campaign.createdAt).toLocaleString('pt-BR')} · {remetenteLabel(campaign)}
                </p>
                <p className="mt-1 text-sm text-[#E8EDED]/70">
                  {queuedCount(campaign).toLocaleString('pt-BR')} destinatários ·{' '}
                  {campaign.totals.sent.toLocaleString('pt-BR')} enviados ·{' '}
                  {campaign.totals.failed.toLocaleString('pt-BR')} falhas
                </p>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[#E8EDED]/45">
                  <th className="px-3 py-3 font-medium">Campanha</th>
                  <th className="px-3 py-3 font-medium">Data</th>
                  <th className="px-3 py-3 font-medium">Remetente</th>
                  <th className="px-3 py-3 font-medium">Destinatários</th>
                  <th className="px-3 py-3 font-medium">Enviados</th>
                  <th className="px-3 py-3 font-medium">Falhas</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">
                    <span className="sr-only">Excluir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className={`cursor-pointer border-b border-white/5 text-[#E8EDED] hover:bg-white/[0.04] ${
                      campaign.id === activeId ? 'bg-[#4CCB7A]/10' : ''
                    }`}
                    onClick={() => onOpen(campaign.id)}
                  >
                    <td className="px-3 py-3">{campaign.name}</td>
                    <td className="px-3 py-3 text-[#E8EDED]/70">
                      {new Date(campaign.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-3">{remetenteLabel(campaign)}</td>
                    <td className="px-3 py-3">{queuedCount(campaign).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-3">{campaign.totals.sent.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-3">{campaign.totals.failed.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-3">
                      <DisparosBadge label={campaignStatusLabel(campaign.status)} tone={tone(campaign.status)} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <DeleteCampaignButton campaign={campaign} onDelete={onDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
