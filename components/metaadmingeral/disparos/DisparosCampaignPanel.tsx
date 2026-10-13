'use client';

import { useState } from 'react';
import { processedCount, progressPercent } from '@/lib/disparos/campaign';
import { DISPAROS_GAP_MAX_MS, disparoGapLabel } from '@/lib/disparos/sendGap';
import {
  campaignStatusLabel,
  ignoreReasonLabel,
  itemStatusLabel,
  phoneChoiceLabel,
} from '@/lib/disparos/labels';
import type { CampaignItemStatus, DisparoCampaign, DisparoCampaignItem } from '@/lib/disparos/types';
import { DisparosBadge, DisparosSectionTitle, DisparosStat, DisparosSoftCard } from '@/components/metaadmingeral/disparos/disparosUi';

function itemTone(status: CampaignItemStatus): 'success' | 'warn' | 'danger' | 'muted' | 'info' {
  if (status === 'sent') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'processing') return 'info';
  if (status === 'ignored') return 'muted';
  if (status === 'needs_review') return 'warn';
  return 'warn';
}

function intervalLabel(campaign: { intervaloMs: number; intervalMinutes: number }): string {
  if (campaign.intervaloMs > 0 && campaign.intervaloMs <= DISPAROS_GAP_MAX_MS) {
    return disparoGapLabel();
  }
  const minutes = campaign.intervalMinutes || Math.round(campaign.intervaloMs / 60_000);
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
}

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

type Props = {
  campaign: DisparoCampaign | null;
  items: DisparoCampaignItem[];
  onPause: () => void;
  onResume: (retryFailed: boolean) => void;
  onCancel: () => void;
  onConnect: () => void;
  onUpdateList: () => Promise<void>;
  itemQuery: string;
  itemStatus: 'todos' | CampaignItemStatus;
  onItemQuery: (value: string) => void;
  onItemStatus: (value: 'todos' | CampaignItemStatus) => void;
  hasPrevItems: boolean;
  hasNextItems: boolean;
  onPrevItems: () => void;
  onNextItems: () => void;
};

export default function DisparosCampaignPanel({
  campaign,
  items,
  onPause,
  onResume,
  onCancel,
  onConnect,
  onUpdateList,
  itemQuery,
  itemStatus,
  onItemQuery,
  onItemStatus,
  hasPrevItems,
  hasNextItems,
  onPrevItems,
  onNextItems,
}: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const [confirmList, setConfirmList] = useState(false);
  const [updatingList, setUpdatingList] = useState(false);
  const [listMessage, setListMessage] = useState<string | null>(null);

  if (!campaign) {
    return (
      <DisparosSoftCard>
        <DisparosSectionTitle
          title="Acompanhamento"
          hint="Quando um disparo for iniciado, o progresso e a atividade aparecem aqui."
        />
      </DisparosSoftCard>
    );
  }

  const percent = progressPercent(campaign.totals);
  const done = processedCount(campaign.totals);
  const canPause = campaign.status === 'preparando' || campaign.status === 'em_andamento';
  const canResume = campaign.status === 'pausada';
  const senderDown = campaign.pauseReason === 'sender_unavailable';
  const remetente = campaign.remetente.profileName || campaign.remetente.phone || 'Nenhum número conectado';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DisparosSectionTitle
          title={campaign.name}
          hint={`${campaignStatusLabel(campaign.status)} · ${phoneChoiceLabel(campaign.phoneChoice)} · intervalo de ${intervalLabel(campaign)}`}
        />
        {canPause ? (
          <button
            type="button"
            onClick={onPause}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-[#E8EDED]"
          >
            Pausar disparo
          </button>
        ) : null}
        {canResume ? (
          <button
            type="button"
            onClick={() => {
              if (campaign.totals.failed > 0) setConfirmRetry(true);
              else onResume(false);
            }}
            className="rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015]"
          >
            Continuar disparo
          </button>
        ) : null}
        {campaign.status === 'concluida' ? (
          <button
            type="button"
            onClick={() => setConfirmList(true)}
            className="rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015]"
          >
            Atualizar lista com enviados
          </button>
        ) : null}
        {campaign.status !== 'cancelada' && campaign.status !== 'concluida' ? (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="rounded-xl border border-rose-400/40 px-4 py-2.5 text-sm font-medium text-rose-100"
          >
            Cancelar disparo
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <DisparosStat label="Total" value={campaign.totals.total.toLocaleString('pt-BR')} />
        <DisparosStat label="Pendentes" value={campaign.totals.pending.toLocaleString('pt-BR')} />
        <DisparosStat label="Enviados" value={campaign.totals.sent.toLocaleString('pt-BR')} />
        <DisparosStat label="Falhas" value={campaign.totals.failed.toLocaleString('pt-BR')} />
        <DisparosStat label="Ignorados" value={campaign.totals.ignored.toLocaleString('pt-BR')} />
        <DisparosStat label="Revisão" value={campaign.totals.revisao.toLocaleString('pt-BR')} />
      </div>

      {senderDown ? (
        <DisparosSoftCard>
          <p className="text-sm font-semibold text-rose-200">WhatsApp desconectado</p>
          <p className="mt-1 text-sm text-[#E8EDED]/75">Disparo pausado automaticamente.</p>
          <button
            type="button"
            onClick={onConnect}
            className="mt-4 rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015]"
          >
            Conectar WhatsApp
          </button>
        </DisparosSoftCard>
      ) : null}

      <DisparosSoftCard>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm text-[#E8EDED]">
            {done.toLocaleString('pt-BR')} / {campaign.totals.total.toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-[#E8EDED]/60">
            {percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% concluído
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#4CCB7A]" style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <p className="mt-4 text-sm text-[#E8EDED]/65">
          Próximo envio: {formatWhen(campaign.nextRunAt)}. Intervalo: {intervalLabel(campaign)}. Remetente:{' '}
          {remetente}. Status: {campaignStatusLabel(campaign.status)}. Itens já enviados não são reenviados.
        </p>
      </DisparosSoftCard>

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-base font-semibold text-[#E8EDED]">Atividade</h4>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={itemQuery}
              onChange={(event) => onItemQuery(event.target.value)}
              placeholder="Nome ou telefone"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#E8EDED]"
            />
            <select
              value={itemStatus}
              onChange={(event) => onItemStatus(event.target.value as 'todos' | CampaignItemStatus)}
              className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-[#E8EDED]"
              aria-label="Filtrar destinatários"
            >
              <option value="todos">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="sent">Enviados</option>
              <option value="failed">Falhas</option>
              <option value="ignored">Ignorados</option>
              <option value="needs_review">Revisão</option>
            </select>
          </div>
        </div>
        <div className="mt-3 space-y-3 md:hidden">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-[#E8EDED]">{item.nome || item.primeiroNome || '—'}</p>
                <DisparosBadge label={itemStatusLabel(item.status)} tone={itemTone(item.status)} />
              </div>
              <p className="mt-2 text-[#E8EDED]/70">{item.telefone || ignoreReasonLabel(item.ignoreReason) || '—'}</p>
              <p className="mt-1 text-xs text-[#E8EDED]/45">
                {formatWhen(item.updatedAt)} · {item.remetenteLabel || '—'}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[#E8EDED]/45">
                <th className="px-3 py-3 font-medium">Destinatário</th>
                <th className="px-3 py-3 font-medium">Telefone</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Horário</th>
                <th className="px-3 py-3 font-medium">Remetente</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 text-[#E8EDED]">
                  <td className="px-3 py-3">{item.nome || '—'}</td>
                  <td className="px-3 py-3">{item.telefone || '—'}</td>
                  <td className="px-3 py-3">
                    <DisparosBadge label={itemStatusLabel(item.status)} tone={itemTone(item.status)} />
                    {item.ignoreReason ? (
                      <span className="ml-2 text-xs text-[#E8EDED]/45">{ignoreReasonLabel(item.ignoreReason)}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-[#E8EDED]/70">{formatWhen(item.updatedAt)}</td>
                  <td className="px-3 py-3 text-[#E8EDED]/70">{item.remetenteLabel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-[#E8EDED]/60">
          <span>{items.length.toLocaleString('pt-BR')} nesta página</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrevItems}
              onClick={onPrevItems}
              className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!hasNextItems}
              onClick={onNextItems}
              className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
      {confirmRetry ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-5">
            <h4 className="text-base font-semibold text-[#E8EDED]">Quer tentar novamente os que falharam?</h4>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              {campaign.totals.failed.toLocaleString('pt-BR')} número
              {campaign.totals.failed === 1 ? '' : 's'} falharam. Quem já recebeu a mensagem não entra de novo.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setConfirmRetry(false);
                  onResume(false);
                }}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED]"
              >
                Continuar sem eles
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmRetry(false);
                  onResume(true);
                }}
                className="rounded-xl bg-[#4CCB7A] px-4 py-2 text-sm font-semibold text-[#062015]"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {listMessage ? <p className="text-sm text-[#E8EDED]/70">{listMessage}</p> : null}
      {confirmList ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-5">
            <h4 className="text-base font-semibold text-[#E8EDED]">Atualizar a lista?</h4>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              A base desta campanha fica só com os números que foram enviados. Os que falharam e os que não receberam
              mensagem saem da lista. O histórico da campanha permanece.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={updatingList}
                onClick={() => setConfirmList(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED] disabled:opacity-40"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={updatingList}
                onClick={() => {
                  setUpdatingList(true);
                  void onUpdateList()
                    .then(() => {
                      setConfirmList(false);
                      setListMessage('Lista atualizada com os números enviados.');
                    })
                    .catch((error: unknown) => {
                      setListMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a lista.');
                    })
                    .finally(() => setUpdatingList(false));
                }}
                className="rounded-xl bg-[#4CCB7A] px-4 py-2 text-sm font-semibold text-[#062015] disabled:opacity-40"
              >
                {updatingList ? 'Atualizando…' : 'Atualizar lista'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmCancel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-5">
            <h4 className="text-base font-semibold text-[#E8EDED]">Cancelar disparo?</h4>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              Novos envios param. O histórico e os itens já enviados permanecem. Uma campanha cancelada não volta a
              rodar.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmCancel(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED]">
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCancel(false);
                  onCancel();
                }}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Cancelar disparo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
