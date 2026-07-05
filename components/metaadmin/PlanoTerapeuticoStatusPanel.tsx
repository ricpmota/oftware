'use client';

import { CheckCircle2, Clock, ExternalLink, FileSignature, Loader2, Stethoscope, User } from 'lucide-react';
import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';
import {
  PLANO_TERAPEUTICO_STATUS_LABELS,
  planoMedicoJaAssinou,
  planoPacienteAguardandoEasySign,
  planoPacienteEscolheuPlano,
  planoPacienteJaAssinou,
  planoPodeSerCancelado,
  planoTerapeuticoStatusBadgeClass,
} from '@/lib/planoTerapeutico/planoTerapeuticoStatusUi';
import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { openPlanoTerapeuticoPdfUrl } from '@/utils/planoTerapeuticoPdfGenerate';

export type PlanoTerapeuticoStatusPanelProps = {
  plano: PlanoTerapeuticoInterativoDocumento | null;
  onAbrirPagina?: () => void;
  abrindoPagina?: boolean;
  onAssinarMedico?: () => void;
  assinandoMedico?: boolean;
  onCancelarPlano?: () => void;
  cancelandoPlano?: boolean;
};

function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

type StepState = 'done' | 'current' | 'pending';

function StepIndicator({
  label,
  state,
  icon: Icon,
  detail,
}: {
  label: string;
  state: StepState;
  icon: typeof User;
  detail?: string;
}) {
  const circleClass =
    state === 'done'
      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200'
      : state === 'current'
        ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100'
        : 'bg-white text-gray-400 border-gray-200';

  const labelClass =
    state === 'done'
      ? 'text-emerald-800 font-semibold'
      : state === 'current'
        ? 'text-indigo-900 font-semibold'
        : 'text-gray-500 font-medium';

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1 text-center">
      <div
        className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 transition-colors ${circleClass}`}
      >
        {state === 'done' ? (
          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        ) : (
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        )}
      </div>
      <span className={`text-[10px] sm:text-xs leading-tight ${labelClass}`}>{label}</span>
      {detail ? (
        <span className="text-[9px] sm:text-[10px] text-gray-500 leading-tight px-0.5">{detail}</span>
      ) : null}
    </div>
  );
}

export default function PlanoTerapeuticoStatusPanel({
  plano,
  onAbrirPagina,
  abrindoPagina = false,
  onAssinarMedico,
  assinandoMedico = false,
  onCancelarPlano,
  cancelandoPlano = false,
}: PlanoTerapeuticoStatusPanelProps) {
  const status = plano?.status ?? 'rascunho';
  const cancelado = status === 'cancelado';
  const escolheu = planoPacienteEscolheuPlano(plano);
  const pacienteAssinou = planoPacienteJaAssinou(plano);
  const aguardandoEasySign = planoPacienteAguardandoEasySign(plano);
  const medicoAssinou = planoMedicoJaAssinou(plano);

  const compartilhadoStep: StepState = plano ? 'done' : 'pending';
  const escolhaStep: StepState = escolheu ? 'done' : plano ? 'current' : 'pending';
  const pacienteStep: StepState = pacienteAssinou
    ? 'done'
    : aguardandoEasySign
      ? 'current'
      : escolheu
        ? 'current'
        : 'pending';
  const medicoStep: StepState = medicoAssinou
    ? 'done'
    : pacienteAssinou
      ? 'current'
      : 'pending';

  const pdfPaciente =
    plano?.pdfFinalAssinadoUrl?.trim() || plano?.pdfUrl?.trim();
  const pdfMedico = plano?.pdfAssinadoMedicoUrl?.trim() || pdfPaciente;

  return (
    <section className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">Status do plano terapêutico</h4>
        {plano ? (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight ${planoTerapeuticoStatusBadgeClass(status)}`}
          >
            {PLANO_TERAPEUTICO_STATUS_LABELS[status]}
          </span>
        ) : null}
      </div>

      {!plano ? (
        <p className="text-sm text-gray-700 leading-relaxed">
          Nenhum plano compartilhado ainda. Abra a página do plano com o paciente para iniciar o
          acompanhamento.
        </p>
      ) : cancelado ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Este plano foi cancelado. O paciente pode escolher novamente em um novo plano
            compartilhado.
          </p>
          {onAbrirPagina ? (
            <button
              type="button"
              onClick={onAbrirPagina}
              disabled={abrindoPagina}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
              {abrindoPagina ? 'Abrindo…' : 'Gerar novo plano com o paciente'}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="relative px-1 pt-1">
            <div
              className="absolute left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] top-4 sm:top-5 h-0.5 bg-gray-200"
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-1">
              <StepIndicator
                label="Compartilhado"
                state={compartilhadoStep}
                icon={ExternalLink}
                detail={formatDataHora(plano.compartilhadoEm)}
              />
              <StepIndicator
                label="Escolhido"
                state={escolhaStep}
                icon={User}
                detail={formatDataHora(plano.escolhaPacienteEm)}
              />
              <StepIndicator
                label="Paciente"
                state={pacienteStep}
                icon={FileSignature}
                detail={
                  pacienteAssinou
                    ? formatDataHora(plano.acceptedAt ?? plano.pacienteAssinadoEm)
                    : aguardandoEasySign
                      ? 'EasySign'
                      : undefined
                }
              />
              <StepIndicator
                label="Médico"
                state={medicoStep}
                icon={Stethoscope}
                detail={formatDataHora(plano.medicoAssinadoEm)}
              />
            </div>
          </div>

          {plano.escolhaPaciente ? (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-3.5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600/90">
                Escolha do paciente
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {plano.escolhaPaciente.rotuloExibicao}
              </p>
              <p className="text-sm text-gray-700">
                Investimento:{' '}
                <span className="font-semibold tabular-nums">
                  {formatarMoedaBRL(plano.escolhaPaciente.valorTotal)}
                </span>
              </p>
            </div>
          ) : status === 'compartilhado' ? (
            <div className="flex items-center gap-2 text-sm text-amber-800 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              Aguardando o paciente escolher o plano na página compartilhada.
            </div>
          ) : null}

          {pacienteAssinou ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Paciente confirmou o plano
              </div>
              {plano.pacienteAssinaturaNome ? (
                <p className="text-sm text-emerald-900">{plano.pacienteAssinaturaNome}</p>
              ) : null}
              {pdfPaciente ? (
                <button
                  type="button"
                  onClick={() => openPlanoTerapeuticoPdfUrl(pdfPaciente)}
                  className="text-xs font-medium text-emerald-800 underline hover:text-emerald-950"
                >
                  Ver PDF do plano
                </button>
              ) : null}
            </div>
          ) : aguardandoEasySign ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-3 text-sm text-indigo-900">
              PDF gerado — paciente deve concluir a assinatura digital na BRy EasySign.
            </div>
          ) : escolheu ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-3 text-sm text-indigo-900">
              Plano escolhido — aguardando confirmação do paciente na página.
            </div>
          ) : null}

          {pacienteAssinou && !medicoAssinou && onAssinarMedico ? (
            <button
              type="button"
              onClick={onAssinarMedico}
              disabled={assinandoMedico || !pdfPaciente}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {assinandoMedico ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <FileSignature className="w-4 h-4" aria-hidden />
              )}
              {assinandoMedico ? 'Assinando PDF…' : 'Assinar PDF do plano (médico)'}
            </button>
          ) : null}

          {medicoAssinou && pdfMedico ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3 space-y-1">
              <p className="text-sm font-semibold text-emerald-800">Médico assinou o PDF</p>
              <button
                type="button"
                onClick={() => openPlanoTerapeuticoPdfUrl(pdfMedico)}
                className="text-xs font-medium text-emerald-800 underline hover:text-emerald-950"
              >
                Abrir PDF assinado
              </button>
            </div>
          ) : null}

          {onAbrirPagina && !pacienteAssinou ? (
            <button
              type="button"
              onClick={onAbrirPagina}
              disabled={abrindoPagina}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
              {abrindoPagina ? 'Abrindo…' : 'Reabrir página do plano'}
            </button>
          ) : null}

          {planoPodeSerCancelado(plano) && onCancelarPlano ? (
            <button
              type="button"
              onClick={onCancelarPlano}
              disabled={cancelandoPlano}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
            >
              {cancelandoPlano ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : null}
              {cancelandoPlano ? 'Cancelando…' : 'Cancelar / excluir este plano'}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
