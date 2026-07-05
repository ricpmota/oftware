'use client';

import { CheckCircle2, Clock, Home, MapPin, Stethoscope, User } from 'lucide-react';
import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import { CONTRATO_TRATAMENTO_STATUS_LABELS } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import {
  contratoFluxoPacientePrimeiro,
  contratoPacienteJaAssinou,
  normalizarStatusAssinaturaPaciente,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoFluxoAssinatura';
import {
  medicoJaAssinouContrato,
  pacienteAssinaturaPendente,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoStatusUi';
import ContratoTratamentoStatusBadge from '@/components/metaadmin/ContratoTratamentoStatusBadge';
import {
  formatContratoOpcaoEntregaResumo,
  type ContratoOpcaoEntregaMaterial,
} from '@/lib/contratos/contratoOpcaoEntregaMaterial';

export type ContratoTratamentoStatusPanelProps = {
  documento: ContratoTratamentoDocumentoRecord | null;
  sincronizandoPaciente?: boolean;
};

function formatDataHora(d: Date | undefined | null): string {
  if (!d || Number.isNaN(d.getTime())) return '';
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
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${circleClass}`}
      >
        {state === 'done' ? (
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        ) : (
          <Icon className="h-4 w-4" aria-hidden />
        )}
      </div>
      <span className={`text-xs leading-tight ${labelClass}`}>{label}</span>
      {detail ? <span className="text-[10px] text-gray-500 leading-tight px-1">{detail}</span> : null}
    </div>
  );
}

function OpcaoPacienteCard({
  opcao,
  escolhidaEm,
}: {
  opcao: ContratoOpcaoEntregaMaterial;
  escolhidaEm?: Date | null;
}) {
  const Icon = opcao === 'domicilio' ? Home : MapPin;
  const resumo = formatContratoOpcaoEntregaResumo(opcao);
  const escolhidaEmFmt = formatDataHora(escolhidaEm);

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-3.5 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600/90">
        Escolha do paciente
      </p>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{resumo}</p>
          {escolhidaEmFmt ? (
            <p className="text-xs text-gray-600">Registrada em {escolhidaEmFmt}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}

function FluxoAssinaturaDetalhado({
  documento,
  status,
  sincronizandoPaciente,
}: {
  documento: ContratoTratamentoDocumentoRecord;
  status: ContratoTratamentoDocumentoRecord['statusAssinatura'];
  sincronizandoPaciente?: boolean;
}) {
  const pacienteAssinou = contratoPacienteJaAssinou(documento);
  const medicoAssinou = medicoJaAssinouContrato(status, documento);
  const completo = status === 'assinado_completo';

  const pacienteStep: StepState = pacienteAssinou ? 'done' : 'current';
  const medicoStep: StepState = medicoAssinou ? 'done' : pacienteAssinou ? 'current' : 'pending';

  const pacienteDetail = documento.pacienteAssinadoEm
    ? formatDataHora(documento.pacienteAssinadoEm)
    : undefined;
  const medicoDetail = documento.medicoAssinadoEm
    ? formatDataHora(documento.medicoAssinadoEm)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="relative px-2 pt-1">
        <div
          className="absolute left-[calc(25%+1.25rem)] right-[calc(25%+1.25rem)] top-5 h-0.5 bg-gray-200"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-2">
          <StepIndicator
            label="Paciente"
            state={pacienteStep}
            icon={User}
            detail={pacienteDetail}
          />
          <StepIndicator label="Médico" state={medicoStep} icon={Stethoscope} detail={medicoDetail} />
        </div>
      </div>

      {documento.opcaoEntregaMaterial ? (
        <OpcaoPacienteCard
          opcao={documento.opcaoEntregaMaterial}
          escolhidaEm={documento.opcaoEntregaMaterialEm}
        />
      ) : null}

      <div className="rounded-xl border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
        {pacienteAssinou ? (
          <div className="px-3.5 py-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Paciente assinou o contrato
            </div>
            {documento.pacienteAssinadoEm ? (
              <InfoRow label="Assinatura" value={formatDataHora(documento.pacienteAssinadoEm)} />
            ) : null}
            {documento.pdfFinalAssinadoUrl ? (
              <p className="text-xs text-emerald-700/90">PDF com assinatura do paciente disponível.</p>
            ) : null}
          </div>
        ) : sincronizandoPaciente ? (
          <div className="px-3.5 py-3 flex items-center gap-2 text-sm text-amber-800">
            <Clock className="h-4 w-4 shrink-0 animate-pulse" aria-hidden />
            Verificando assinatura do paciente…
          </div>
        ) : null}

        {medicoAssinou ? (
          <div className="px-3.5 py-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Médico assinou digitalmente
            </div>
            {documento.medicoAssinadoEm ? (
              <InfoRow label="Assinatura" value={formatDataHora(documento.medicoAssinadoEm)} />
            ) : null}
          </div>
        ) : pacienteAssinou ? (
          <div className="px-3.5 py-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              Aguardando assinatura do médico
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Assine digitalmente sobre o PDF já assinado pelo paciente para concluir o contrato.
            </p>
          </div>
        ) : null}
      </div>

      {completo ? (
        <p className="text-sm text-emerald-800 leading-relaxed rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2">
          Contrato completo — médico e paciente assinaram digitalmente.
        </p>
      ) : null}

      {documento.hashDocumento ? (
        <p className="text-[11px] text-gray-500 font-mono truncate" title={documento.hashDocumento}>
          ID documento: {documento.hashDocumento.slice(0, 12).toUpperCase()}…
        </p>
      ) : null}
    </div>
  );
}

export default function ContratoTratamentoStatusPanel({
  documento,
  sincronizandoPaciente = false,
}: ContratoTratamentoStatusPanelProps) {
  const status = documento
    ? normalizarStatusAssinaturaPaciente(documento.statusAssinatura, documento)
    : 'rascunho';
  const medicoAssinou = medicoJaAssinouContrato(status, documento);
  const pacientePendente = pacienteAssinaturaPendente(status);
  const completo = status === 'assinado_completo';
  const aguardandoPaciente = status === 'aguardando_paciente';
  const aguardandoMedico = status === 'aguardando_medico';
  const fluxoPacientePrimeiro = contratoFluxoPacientePrimeiro(documento);
  const pacienteAssinou = contratoPacienteJaAssinou(documento);
  const mostrarFluxoDetalhado =
    Boolean(documento) &&
    (pacienteAssinou || aguardandoMedico || completo || medicoAssinou);

  return (
    <section className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">Status do contrato</h4>
        <ContratoTratamentoStatusBadge status={status} />
      </div>

      {mostrarFluxoDetalhado && documento ? (
        <FluxoAssinaturaDetalhado
          documento={documento}
          status={status}
          sincronizandoPaciente={sincronizandoPaciente}
        />
      ) : (
        <>
          {aguardandoPaciente ? (
            <p className="text-sm font-medium text-amber-900">🟡 Paciente pendente</p>
          ) : (
            <p className="text-xs text-gray-600">{CONTRATO_TRATAMENTO_STATUS_LABELS[status]}</p>
          )}

          {!documento ? (
            <p className="text-sm text-gray-700 leading-relaxed">
              O contrato ainda não foi registrado para este paciente. Solicite a assinatura do
              paciente no portal para iniciar o fluxo.
            </p>
          ) : status === 'rascunho' ? (
            <p className="text-sm text-gray-700 leading-relaxed">
              Contrato em rascunho. Use &quot;Solicitar assinatura do paciente&quot; para enviar ao
              portal /meta.
            </p>
          ) : null}

          {aguardandoPaciente && fluxoPacientePrimeiro ? (
            <div className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3 space-y-2">
              <p>
                O paciente receberá o contrato no portal /meta e precisa escolher a forma de
                recebimento do tratamento antes de assinar.
              </p>
              <p>Após a assinatura do paciente, você poderá assinar digitalmente como médico.</p>
            </div>
          ) : null}

          {documento?.opcaoEntregaMaterial && aguardandoPaciente ? (
            <OpcaoPacienteCard
              opcao={documento.opcaoEntregaMaterial}
              escolhidaEm={documento.opcaoEntregaMaterialEm}
            />
          ) : null}

          {sincronizandoPaciente && aguardandoPaciente ? (
            <p className="text-xs text-amber-800 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 animate-pulse" aria-hidden />
              Verificando se o paciente concluiu a assinatura…
            </p>
          ) : null}

          {medicoAssinou ? (
            <ul className="space-y-2 text-sm border-t border-gray-100 pt-3">
              {documento?.pacienteAssinadoEm || aguardandoMedico || completo ? (
                <li className="flex items-start gap-2 text-green-800">
                  <span aria-hidden>✅</span>
                  <span>
                    Paciente assinou
                    {documento?.pacienteAssinadoEm ? (
                      <span className="block text-xs text-green-700/90 mt-0.5">
                        {formatDataHora(documento.pacienteAssinadoEm)}
                      </span>
                    ) : null}
                  </span>
                </li>
              ) : null}
              <li className="flex items-start gap-2 text-green-800">
                <span aria-hidden>✅</span>
                <span>
                  Médico assinou digitalmente
                  {documento?.medicoAssinadoEm ? (
                    <span className="block text-xs text-green-700/90 mt-0.5">
                      {formatDataHora(documento.medicoAssinadoEm)}
                    </span>
                  ) : null}
                </span>
              </li>
              {pacientePendente && !completo && !aguardandoMedico ? (
                <li className="flex items-start gap-2 text-amber-900">
                  <span aria-hidden>⏳</span>
                  <span>Aguardando assinatura do paciente</span>
                </li>
              ) : null}
            </ul>
          ) : null}

          {aguardandoPaciente && !fluxoPacientePrimeiro ? (
            <div className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">
              <p>Fluxo legado: médico já assinou. Aguardando assinatura do paciente no portal.</p>
            </div>
          ) : null}

          {documento?.hashDocumento ? (
            <p className="text-[11px] text-gray-500 font-mono truncate" title={documento.hashDocumento}>
              ID: {documento.hashDocumento.slice(0, 12).toUpperCase()}…
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
