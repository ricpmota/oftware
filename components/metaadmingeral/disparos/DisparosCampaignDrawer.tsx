'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DISPAROS_DEFAULT_INTERVAL_MINUTES,
  DISPAROS_MAX_INTERVAL_MINUTES,
  DISPAROS_MESSAGE_MAX_LENGTH,
  DISPAROS_MIN_INTERVAL_MINUTES,
} from '@/lib/disparos/constants';
import { formatEstimatedDuration, renderDisparoMessage } from '@/lib/disparos/campaign';
import { phoneChoiceLabel, whatsappStatusLabel } from '@/lib/disparos/labels';
import type {
  AudienceChoice,
  DisparosWhatsappView,
  ImportedContact,
  NewDisparoDraft,
  PhoneChoice,
} from '@/lib/disparos/types';

type Props = {
  open: boolean;
  validCount: number;
  selectedCount: number;
  previewContact: ImportedContact | null;
  connection: DisparosWhatsappView;
  onClose: () => void;
  onStart: (draft: NewDisparoDraft) => void;
};

const STEPS = ['Destinatários', 'Telefone', 'Mensagem', 'Intervalo', 'Revisão'] as const;

export default function DisparosCampaignDrawer({
  open,
  validCount,
  selectedCount,
  previewContact,
  connection,
  onClose,
  onStart,
}: Props) {
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState('');
  const [audience, setAudience] = useState<AudienceChoice>('validos');
  const [phoneChoice, setPhoneChoice] = useState<PhoneChoice>('telefone1');
  const [message, setMessage] = useState('Olá, {nome}! Tudo bem? Temos uma novidade para você.');
  const [intervalMinutes, setIntervalMinutes] = useState(DISPAROS_DEFAULT_INTERVAL_MINUTES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const audienceCount = audience === 'validos' ? validCount : selectedCount;
  const preview = previewContact
    ? renderDisparoMessage(message, previewContact.primeiroNome)
    : 'A prévia aparece quando a base tem um contato válido nesta página.';
  const nameValid = campaignName.trim().length > 0;
  const intervalValid =
    Number.isInteger(intervalMinutes) &&
    intervalMinutes >= DISPAROS_MIN_INTERVAL_MINUTES &&
    intervalMinutes <= DISPAROS_MAX_INTERVAL_MINUTES;
  const messageValid = message.trim().length > 0 && message.trim().length <= DISPAROS_MESSAGE_MAX_LENGTH;
  const canAdvance =
    (step === 0 && audienceCount > 0 && nameValid) ||
    (step === 1 && audienceCount > 0) ||
    (step === 2 && messageValid) ||
    (step === 3 && intervalValid && audienceCount > 0);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <button type="button" aria-label="Fechar" className="hidden flex-1 sm:block" onClick={onClose} />
      <div className="flex h-full w-full flex-col bg-[#0A1F44] shadow-2xl sm:max-w-xl sm:border-l sm:border-white/10">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#E8EDED]/45">
              Etapa {step + 1} de {STEPS.length}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[#E8EDED]">{STEPS[step]}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[#E8EDED]/60 hover:text-[#E8EDED]">
            Fechar
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {step === 0 ? (
            <fieldset className="space-y-3">
              <label className="block text-sm font-medium text-[#E8EDED]">
                Nome da campanha
                <input
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  placeholder="Aniversário Facilité 8 anos - PMJP"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-normal text-[#E8EDED]"
                />
              </label>
              <legend className="text-sm font-medium text-[#E8EDED]">Destinatários</legend>
              <Choice
                checked={audience === 'validos'}
                name="audiencia"
                label="Todos os contatos válidos"
                onChange={() => setAudience('validos')}
              />
              <Choice
                checked={audience === 'selecionados'}
                name="audiencia"
                label="Somente selecionados"
                onChange={() => setAudience('selecionados')}
              />
              <p className="text-sm text-[#E8EDED]/70">
                {audienceCount.toLocaleString('pt-BR')} contatos nesta escolha. Quem não tiver o telefone escolhido fica ignorado, sem envio.
              </p>
            </fieldset>
          ) : null}

          {step === 1 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-[#E8EDED]">Qual telefone utilizar?</legend>
              <Choice
                checked={phoneChoice === 'telefone1'}
                name="telefone"
                label="Telefone 1"
                onChange={() => setPhoneChoice('telefone1')}
              />
              <Choice
                checked={phoneChoice === 'telefone2'}
                name="telefone"
                label="Telefone 2"
                onChange={() => setPhoneChoice('telefone2')}
              />
              <Choice
                checked={phoneChoice === 'telefone1_ou_telefone2'}
                name="telefone"
                label="Telefone 1 e, se estiver ausente, Telefone 2"
                onChange={() => setPhoneChoice('telefone1_ou_telefone2')}
              />
              <p className="text-sm text-[#E8EDED]/60">Cada pessoa recebe uma mensagem, em um único número.</p>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#E8EDED]">
                Mensagem
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={8}
                  maxLength={DISPAROS_MESSAGE_MAX_LENGTH}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-normal text-[#E8EDED]"
                />
              </label>
              <p className="text-sm text-[#E8EDED]/60">
                Variáveis disponíveis: <code className="text-[#4CCB7A]">{'{nome}'}</code>
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Prévia</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#E8EDED]">{preview}</p>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#E8EDED]">
                Intervalo entre envios
                <span className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={DISPAROS_MIN_INTERVAL_MINUTES}
                    max={DISPAROS_MAX_INTERVAL_MINUTES}
                    step={1}
                    value={intervalMinutes}
                    onChange={(event) => setIntervalMinutes(Number(event.target.value))}
                    className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"
                  />
                  <span className="text-sm font-normal text-[#E8EDED]/70">minutos</span>
                </span>
              </label>
              <p className="text-xs text-[#E8EDED]/50">
                Mínimo de {DISPAROS_MIN_INTERVAL_MINUTES} minuto. O intervalo fica na campanha. O navegador não
                precisa permanecer aberto quando o envio existir.
              </p>
              {!intervalValid ? (
                <p className="text-sm text-rose-200">Informe um intervalo inteiro dentro do mínimo do sistema.</p>
              ) : null}
              <dl className="grid gap-3 text-sm text-[#E8EDED]/80 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Destinatários</dt>
                  <dd className="mt-1 text-base text-[#E8EDED]">{audienceCount.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Intervalo</dt>
                  <dd className="mt-1 text-base text-[#E8EDED]">{intervalMinutes} minutos</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Tempo estimado</dt>
                  <dd className="mt-1 text-base text-[#E8EDED]">
                    {formatEstimatedDuration(audienceCount, intervalValid ? intervalMinutes : 0)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3 text-sm text-[#E8EDED]/80">
              <ReviewRow label="Campanha" value={campaignName.trim() || '—'} />
              <ReviewRow label="Destinatários" value={audienceCount.toLocaleString('pt-BR')} />
              <ReviewRow label="Telefone" value={phoneChoiceLabel(phoneChoice)} />
              <ReviewRow label="Intervalo" value={`${intervalMinutes} minutos`} />
              <ReviewRow
                label="Duração estimada"
                value={formatEstimatedDuration(audienceCount, intervalMinutes)}
              />
              <ReviewRow label="WhatsApp remetente" value={connection.profileName || connection.phone || 'Nenhum número conectado'} />
              <ReviewRow label="Sessão" value={connection.sessionId} />
              <ReviewRow label="Conexão" value={whatsappStatusLabel(connection.status)} />
              <div>
                <p className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Mensagem</p>
                <p className="mt-1 whitespace-pre-wrap text-[#E8EDED]">{message.trim()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Exemplo personalizado</p>
                <p className="mt-2 whitespace-pre-wrap text-[#E8EDED]">{preview}</p>
              </div>
              <p className="text-sm text-amber-100/80">
                Iniciar grava a campanha e o snapshot dos destinatários. O servidor envia um por vez, no intervalo
                escolhido, mesmo com esta página fechada. Faça o primeiro teste com 1 ou 2 números seus.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep((current) => current - 1))}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-[#E8EDED]"
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => setStep((current) => current + 1)}
              className="rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled={!messageValid || !intervalValid || !nameValid || audienceCount === 0}
              onClick={() =>
                onStart({
                  name: campaignName.trim(),
                  audience,
                  phoneChoice,
                  messageTemplate: message.trim(),
                  intervalMinutes,
                })
              }
              className="rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Iniciar disparo
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Choice({
  checked,
  name,
  label,
  onChange,
}: {
  checked: boolean;
  name: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm text-[#E8EDED]">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
      <span className="text-[#E8EDED]/50">{label}</span>
      <span className="text-[#E8EDED] sm:text-right">{value}</span>
    </div>
  );
}
