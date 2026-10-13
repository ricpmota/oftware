'use client';

import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  MessageCircle,
  Minus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { labPatientInitials } from '@/components/LabResultCard';
import { normalizeAuthPhotoUrl } from '@/lib/firebase/resolvePacienteAuthUidForPhoto';
import {
  EMPTY_CONSULTA_RESUMO,
  type CardapioResumo,
  type ConsultaAgendaItem,
  type ConsultaAgendaResumo,
  type TreinoResumo,
} from '@/lib/metaadmin/profissionalPacienteResumo';
import { buildPatientWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import type { PacienteCompleto } from '@/types/obesidade';

const STATUS_TRATAMENTO: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-800' },
  em_tratamento: { label: 'Em tratamento', className: 'bg-emerald-100 text-emerald-800' },
  concluido: { label: 'Concluído', className: 'bg-sky-100 text-sky-800' },
  abandono: { label: 'Abandono', className: 'bg-rose-100 text-rose-800' },
};

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  try {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (
      typeof value === 'object' &&
      value &&
      'toDate' in value &&
      typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
      const d = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatDateBr(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatConsultaDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function tempoTratamentoLabel(inicio: Date | null): string | null {
  if (!inicio) return null;
  const days = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / 86_400_000));
  if (days < 7) return days <= 1 ? '1 dia' : `${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks < 9) return weeks === 1 ? '1 semana' : `${weeks} semanas`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 mês' : `${months} meses`;
}

function dataSolicitacaoPaciente(paciente: PacienteCompleto, fallback?: Date): Date | null {
  return (
    toDateSafe(paciente.dataCadastro) ||
    toDateSafe(paciente.dadosIdentificacao?.dataCadastro) ||
    toDateSafe(fallback) ||
    null
  );
}

function dataInicioPaciente(paciente: PacienteCompleto): Date | null {
  return (
    toDateSafe(paciente.planoTerapeutico?.startDate) ||
    toDateSafe(paciente.planoTerapeutico?.dataInicioTratamento) ||
    null
  );
}

function whatsappUrlPaciente(paciente: PacienteCompleto): string | null {
  return buildPatientWhatsappUrl(paciente);
}

function AuthAvatar({
  name,
  photoUrl,
  tone,
  size = 'md',
}: {
  name: string;
  photoUrl?: string | null;
  tone: 'nutri' | 'personal';
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-10 w-10 text-[11px]' : 'h-11 w-11 text-xs';
  const src = normalizeAuthPhotoUrl(photoUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const ring =
    tone === 'nutri'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : 'bg-amber-50 text-amber-700 ring-amber-100';
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover object-center ring-2 ring-white shadow-sm`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ${ring}`}
      aria-hidden
    >
      {labPatientInitials(name)}
    </div>
  );
}

function StepDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          ok ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
        }`}
      >
        {ok ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Minus className="h-3.5 w-3.5" />}
      </span>
      <span className={`text-[10px] font-semibold ${ok ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/80">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ConsultaCard({ item, tone }: { item: ConsultaAgendaItem; tone: 'done' | 'soon' | 'missed' }) {
  const styles =
    tone === 'done'
      ? 'bg-emerald-50 ring-emerald-200 text-emerald-900'
      : tone === 'soon'
        ? 'bg-sky-50 ring-sky-200 text-sky-900'
        : 'bg-amber-50 ring-amber-200 text-amber-900';
  const title =
    tone === 'done' ? 'Consulta realizada' : tone === 'soon' ? 'Consulta agendada' : 'Consulta não executada';
  const time = [item.startTime, item.endTime].filter(Boolean).join(' – ');
  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${styles}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-0.5 text-sm font-semibold">
        {formatConsultaDate(item.date)}
        {time ? ` · ${time}` : ''}
      </p>
    </div>
  );
}

export type PacienteVinculoListItemProps = {
  kind: 'nutricionista' | 'personal';
  paciente: PacienteCompleto;
  dataCompartilhamento?: Date;
  shareStatus?: string;
  photoUrl?: string | null;
  cardapio?: CardapioResumo;
  treino?: TreinoResumo;
  consulta?: ConsultaAgendaResumo;
  loadingResumo?: boolean;
  loadingConsulta?: boolean;
  onOpenPatient: () => void;
  onEndShare?: () => void;
  loadingAction?: boolean;
};

export function PacienteVinculoListItem({
  kind,
  paciente,
  dataCompartilhamento,
  shareStatus,
  photoUrl,
  cardapio,
  treino,
  consulta = EMPTY_CONSULTA_RESUMO,
  loadingResumo,
  loadingConsulta,
  onOpenPatient,
  onEndShare,
  loadingAction,
}: PacienteVinculoListItemProps) {
  const [open, setOpen] = useState(false);
  const isNutri = kind === 'nutricionista';
  const nome = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente sem nome';
  const st = STATUS_TRATAMENTO[paciente.statusTratamento || 'pendente'] ?? STATUS_TRATAMENTO.pendente;
  const waUrl = whatsappUrlPaciente(paciente);
  const solicitacao = formatDateBr(dataSolicitacaoPaciente(paciente, dataCompartilhamento));
  const inicioDate = dataInicioPaciente(paciente);
  const inicio = formatDateBr(inicioDate);
  const tempo = tempoTratamentoLabel(inicioDate);
  const hasConsulta =
    Boolean(consulta.proxima || consulta.ultimaRealizada || consulta.ultimaNaoRealizada);

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-colors ${
        isNutri ? 'border-slate-200 hover:border-emerald-200' : 'border-slate-200 hover:border-amber-200'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button type="button" onClick={onOpenPatient} className="shrink-0 rounded-full">
          <AuthAvatar name={nome} photoUrl={photoUrl} tone={isNutri ? 'nutri' : 'personal'} />
        </button>
        <button type="button" onClick={onOpenPatient} className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{nome}</p>
            <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.className}`}>
              {st.label}
            </span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
              title="Abrir WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          ) : null}
          {onEndShare ? (
            <button
              type="button"
              onClick={onEndShare}
              disabled={loadingAction}
              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              title="Encerrar compartilhamento"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 ${open ? 'bg-slate-100 text-slate-800' : ''}`}
            aria-expanded={open}
            title={open ? 'Ocultar detalhes' : 'Ver detalhes'}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/80 px-3 py-3">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              Acompanhamento
            </p>
            <div className="grid grid-cols-3 gap-2">
              <InfoTile label="Solicitação" value={solicitacao || '—'} />
              <InfoTile label="Início" value={inicio || '—'} />
              <InfoTile label="Tempo" value={tempo || '—'} />
            </div>
          </div>

          {isNutri ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Nutrição
              </p>
              {loadingResumo && !cardapio ? (
                <p className="text-xs text-slate-400">Carregando cardápio…</p>
              ) : (
                <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200/80">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                      Anamnese
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        cardapio?.anamneseRealizada
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cardapio?.anamneseRealizada ? 'Realizada' : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    {(cardapio?.refeicoes ?? []).map((refeicao) => (
                      <StepDot key={refeicao.key} ok={refeicao.preenchida} label={refeicao.label} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Treino
              </p>
              {loadingResumo && !treino ? (
                <p className="text-xs text-slate-400">Carregando treino…</p>
              ) : (
                <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200/80">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Anamnese</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        treino?.anamneseRealizada
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {treino?.anamneseRealizada ? 'Realizada' : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    {(treino?.dias ?? []).map((dia) => (
                      <StepDot key={dia.weekday} ok={dia.temTreino} label={dia.label} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isNutri ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                Consulta
              </p>
              {loadingConsulta ? (
                <p className="text-xs text-slate-400">Carregando agenda…</p>
              ) : !hasConsulta ? (
                <div className="rounded-xl bg-white px-3 py-3 text-sm text-slate-500 ring-1 ring-slate-200/80">
                  Nenhuma consulta agendada.
                </div>
              ) : (
                <div className="space-y-2">
                  {consulta.proxima ? <ConsultaCard item={consulta.proxima} tone="soon" /> : null}
                  {consulta.ultimaRealizada ? (
                    <ConsultaCard item={consulta.ultimaRealizada} tone="done" />
                  ) : null}
                  {consulta.ultimaNaoRealizada ? (
                    <ConsultaCard item={consulta.ultimaNaoRealizada} tone="missed" />
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {shareStatus && shareStatus !== 'ativo' ? (
            <p className="text-[11px] text-slate-400">Compartilhamento: {shareStatus}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default PacienteVinculoListItem;
