'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  FileSignature,
  Loader2,
  Search,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import {
  buildContratoTratamentoTexto,
  obterContratoTratamentoAtual,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoService';
import { requestSolicitarContratoAssinaturaPaciente } from '@/lib/documentos/contrato-tratamento/requestSolicitarContratoAssinaturaPaciente';
import {
  contratoPacienteJaAssinou,
  normalizarStatusAssinaturaPaciente,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoFluxoAssinatura';
import { contratoMedicoAssinaturaPendente } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPacienteDisponibilidade';
import { medicoJaAssinouContrato } from '@/lib/documentos/contrato-tratamento/contratoTratamentoStatusUi';
import { sanitizeDoctorSignatureProviderForClient } from '@/lib/metaadmin/sanitizeDoctorSignatureProviderForClient';
import { runContratoTratamentoMedicoAssinaAposPaciente } from '@/lib/signature/runContratoTratamentoSignedPrint';
import ContratoTratamentoStatusBadge from '@/components/metaadmin/ContratoTratamentoStatusBadge';

export type ContratosPacientesModalProps = {
  open: boolean;
  onClose: () => void;
  pacientes: PacienteCompleto[];
  medico: Medico;
  sidebarCollapsed?: boolean;
  onAbrirContratoPaciente?: (paciente: PacienteCompleto) => void;
};

type PacienteContratoRow = {
  paciente: PacienteCompleto;
  documento: ContratoTratamentoDocumentoRecord | null;
  loading?: boolean;
  erro?: string;
};

type AssinaturaDotState = 'assinado' | 'pendente' | 'aguardando' | 'sem_contrato';

type FiltroContratoResumo = 'todos' | 'sem_contrato' | 'paciente_pendente' | 'medico_pendente' | 'completos';

type FiltroStatusTratamento = 'todos' | 'pendente' | 'em_tratamento' | 'concluido' | 'abandono';

const STATUS_TRATAMENTO_OPCOES: { value: FiltroStatusTratamento; label: string }[] = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_tratamento', label: 'Em Tratamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'abandono', label: 'Abandono' },
];

function nomePaciente(p: PacienteCompleto): string {
  return p.dadosIdentificacao?.nomeCompleto?.trim() || p.nome?.trim() || 'Paciente';
}

function statusTratamentoPaciente(p: PacienteCompleto): string {
  return p.statusTratamento || 'pendente';
}

function AssinaturaDot({
  label,
  state,
  icon: Icon,
}: {
  label: string;
  state: AssinaturaDotState;
  icon: typeof User;
}) {
  const circleClass =
    state === 'assinado'
      ? 'bg-emerald-500 text-white border-emerald-500'
      : state === 'pendente'
        ? 'bg-amber-100 text-amber-700 border-amber-400 ring-2 ring-amber-100'
        : state === 'aguardando'
          ? 'bg-indigo-100 text-indigo-600 border-indigo-300'
          : 'bg-gray-100 text-gray-400 border-gray-200';

  return (
    <div className="flex flex-col items-center gap-1 min-w-[4.5rem] text-center">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${circleClass}`}
        title={
          state === 'assinado'
            ? `${label} assinou`
            : state === 'pendente'
              ? `${label} pendente`
              : state === 'aguardando'
                ? `Aguardando ${label.toLowerCase()}`
                : 'Sem contrato'
        }
      >
        {state === 'assinado' ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        ) : (
          <Icon className="h-4 w-4" aria-hidden />
        )}
      </div>
      <span className="text-[10px] font-medium text-gray-600 leading-tight">{label}</span>
    </div>
  );
}

function resolveDotStates(
  documento: ContratoTratamentoDocumentoRecord | null
): {
  paciente: AssinaturaDotState;
  medico: AssinaturaDotState;
  status: ContratoTratamentoDocumentoRecord['statusAssinatura'];
} {
  if (!documento) {
    return { paciente: 'sem_contrato', medico: 'sem_contrato', status: 'rascunho' };
  }

  const status = normalizarStatusAssinaturaPaciente(documento.statusAssinatura, documento);
  const pacienteAssinou = contratoPacienteJaAssinou(documento);
  const medicoAssinou = medicoJaAssinouContrato(status, documento);

  const paciente: AssinaturaDotState = pacienteAssinou
    ? 'assinado'
    : status === 'aguardando_paciente'
      ? 'pendente'
      : 'aguardando';

  const medico: AssinaturaDotState = medicoAssinou
    ? 'assinado'
    : status === 'aguardando_medico'
      ? 'pendente'
      : pacienteAssinou
        ? 'aguardando'
        : 'sem_contrato';

  return { paciente, medico, status };
}

function getCategoriaContratoRow(documento: ContratoTratamentoDocumentoRecord | null): FiltroContratoResumo {
  const { status, paciente, medico } = resolveDotStates(documento);
  if (!documento) return 'sem_contrato';
  if (status === 'assinado_completo' || (paciente === 'assinado' && medico === 'assinado')) {
    return 'completos';
  }
  if (medico === 'pendente') return 'medico_pendente';
  if (paciente === 'pendente') return 'paciente_pendente';
  if (status === 'rascunho') return 'sem_contrato';
  return 'sem_contrato';
}

function podeGerarContrato(documento: ContratoTratamentoDocumentoRecord | null): boolean {
  if (!documento) return true;
  return documento.statusAssinatura === 'rascunho';
}

function podeAssinarMedico(
  documento: ContratoTratamentoDocumentoRecord | null
): documento is ContratoTratamentoDocumentoRecord {
  if (!documento) return false;
  if (!contratoMedicoAssinaturaPendente(documento)) return false;
  return Boolean(documento.pdfFinalAssinadoUrl?.trim());
}

function ResumoBadge({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs transition-all border ${className} ${
        active
          ? 'ring-2 ring-purple-400 ring-offset-1 shadow-sm font-semibold'
          : 'hover:opacity-90'
      }`}
    >
      {children}
    </button>
  );
}

export default function ContratosPacientesModal({
  open,
  onClose,
  pacientes,
  medico,
  sidebarCollapsed = false,
  onAbrirContratoPaciente,
}: ContratosPacientesModalProps) {
  const [rows, setRows] = useState<PacienteContratoRow[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatusTratamento, setFiltroStatusTratamento] = useState<FiltroStatusTratamento>('todos');
  const [filtroContratoResumo, setFiltroContratoResumo] = useState<FiltroContratoResumo>('todos');
  const [bulkAction, setBulkAction] = useState<'gerar' | 'medico' | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ atual: number; total: number } | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [resultadoBulk, setResultadoBulk] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  const providerConfig = sanitizeDoctorSignatureProviderForClient(medico?.doctorSignatureProvider);

  const desktopPanelOffset = sidebarCollapsed ? 'lg:left-16' : 'lg:left-64';

  const carregarContratos = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoadingLista(true);
    setErroGeral(null);
    setResultadoBulk(null);

    try {
      const resultados = await Promise.all(
        pacientes.map(async (paciente) => {
          try {
            const documento = await obterContratoTratamentoAtual(paciente.id);
            return { paciente, documento, loading: false } satisfies PacienteContratoRow;
          } catch {
            return {
              paciente,
              documento: null,
              loading: false,
              erro: 'Erro ao carregar',
            } satisfies PacienteContratoRow;
          }
        })
      );

      if (loadId !== loadIdRef.current) return;
      setRows(resultados);
    } catch (e) {
      if (loadId !== loadIdRef.current) return;
      setErroGeral(e instanceof Error ? e.message : 'Erro ao carregar contratos.');
    } finally {
      if (loadId === loadIdRef.current) setLoadingLista(false);
    }
  }, [pacientes]);

  useEffect(() => {
    if (!open) {
      setBusca('');
      setFiltroStatusTratamento('todos');
      setFiltroContratoResumo('todos');
      setBulkAction(null);
      setBulkProgress(null);
      setErroGeral(null);
      setResultadoBulk(null);
      return;
    }
    void carregarContratos();
  }, [open, carregarContratos]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bulkAction) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, bulkAction]);

  const resumo = useMemo(() => {
    let semContrato = 0;
    let pacientePendente = 0;
    let medicoPendente = 0;
    let completos = 0;

    for (const row of rows) {
      const categoria = getCategoriaContratoRow(row.documento);
      if (categoria === 'completos') completos++;
      else if (categoria === 'medico_pendente') medicoPendente++;
      else if (categoria === 'paciente_pendente') pacientePendente++;
      else if (categoria === 'sem_contrato') semContrato++;
    }

    return { semContrato, pacientePendente, medicoPendente, completos, total: rows.length };
  }, [rows]);

  const rowsFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();

    return rows.filter((r) => {
      if (filtroStatusTratamento !== 'todos' && statusTratamentoPaciente(r.paciente) !== filtroStatusTratamento) {
        return false;
      }

      if (filtroContratoResumo !== 'todos') {
        const categoria = getCategoriaContratoRow(r.documento);
        if (categoria !== filtroContratoResumo) return false;
      }

      if (q && !nomePaciente(r.paciente).toLowerCase().includes(q)) return false;

      return true;
    });
  }, [rows, busca, filtroStatusTratamento, filtroContratoResumo]);

  const elegiveisGerar = useMemo(
    () => rowsFiltradas.filter((r) => podeGerarContrato(r.documento)),
    [rowsFiltradas]
  );

  const elegiveisMedico = useMemo(
    () => rowsFiltradas.filter((r) => podeAssinarMedico(r.documento)),
    [rowsFiltradas]
  );

  const toggleFiltroResumo = (filtro: FiltroContratoResumo) => {
    setFiltroContratoResumo((prev) => (prev === filtro ? 'todos' : filtro));
  };

  const atualizarDocumentoPaciente = (pacienteId: string, documento: ContratoTratamentoDocumentoRecord | null) => {
    setRows((prev) =>
      prev.map((r) => (r.paciente.id === pacienteId ? { ...r, documento, erro: undefined } : r))
    );
  };

  const handleGerarTodos = async () => {
    if (elegiveisGerar.length === 0) return;

    const statusLabel =
      filtroStatusTratamento === 'todos'
        ? 'na lista filtrada'
        : STATUS_TRATAMENTO_OPCOES.find((o) => o.value === filtroStatusTratamento)?.label ?? '';

    if (
      !window.confirm(
        `Gerar e solicitar assinatura do contrato para ${elegiveisGerar.length} paciente(s) ${statusLabel}?`
      )
    ) {
      return;
    }

    setBulkAction('gerar');
    setBulkProgress({ atual: 0, total: elegiveisGerar.length });
    setErroGeral(null);
    setResultadoBulk(null);

    let sucesso = 0;
    let falhas = 0;

    for (let i = 0; i < elegiveisGerar.length; i++) {
      const row = elegiveisGerar[i];
      setBulkProgress({ atual: i + 1, total: elegiveisGerar.length });

      try {
        const { hashDocumento } = await buildContratoTratamentoTexto(medico, row.paciente, {
          medicoId: medico.id,
          pacienteId: row.paciente.id,
          hashDocumento: row.documento?.hashDocumento || undefined,
        });

        await requestSolicitarContratoAssinaturaPaciente({
          pacienteId: row.paciente.id,
          medicoId: medico.id,
          hashDocumento,
          documentoId: row.documento?.id,
        });

        const docAtualizado = await obterContratoTratamentoAtual(row.paciente.id);
        atualizarDocumentoPaciente(row.paciente.id, docAtualizado);
        sucesso++;
      } catch (e) {
        falhas++;
        setRows((prev) =>
          prev.map((r) =>
            r.paciente.id === row.paciente.id
              ? {
                  ...r,
                  erro: e instanceof Error ? e.message : 'Falha ao gerar contrato',
                }
              : r
          )
        );
      }
    }

    setBulkAction(null);
    setBulkProgress(null);
    setResultadoBulk(
      falhas === 0
        ? `Contrato solicitado para ${sucesso} paciente(s).`
        : `${sucesso} com sucesso, ${falhas} com erro.`
    );
  };

  const handleAssinarMedicoTodos = async () => {
    if (elegiveisMedico.length === 0) return;
    if (
      !window.confirm(
        `Assinar digitalmente como médico para ${elegiveisMedico.length} paciente(s)? Cada assinatura pode abrir uma janela do provedor.`
      )
    ) {
      return;
    }

    setBulkAction('medico');
    setBulkProgress({ atual: 0, total: elegiveisMedico.length });
    setErroGeral(null);
    setResultadoBulk(null);

    let sucesso = 0;
    let falhas = 0;

    for (let i = 0; i < elegiveisMedico.length; i++) {
      const row = elegiveisMedico[i];
      const documento = row.documento!;
      const pacientePdfAssinado = documento.pdfFinalAssinadoUrl?.trim();
      if (!pacientePdfAssinado) {
        falhas++;
        continue;
      }

      setBulkProgress({ atual: i + 1, total: elegiveisMedico.length });

      try {
        await runContratoTratamentoMedicoAssinaAposPaciente({
          patientId: row.paciente.id,
          paciente: row.paciente,
          medico,
          medicoId: medico.id,
          documentoId: documento.id,
          pacientePdfUrl: pacientePdfAssinado,
          hashDocumento: documento.hashDocumento,
          providerConfig: providerConfig ?? undefined,
        });

        const docAtualizado = await obterContratoTratamentoAtual(row.paciente.id);
        atualizarDocumentoPaciente(row.paciente.id, docAtualizado);
        sucesso++;
      } catch (e) {
        falhas++;
        setRows((prev) =>
          prev.map((r) =>
            r.paciente.id === row.paciente.id
              ? {
                  ...r,
                  erro: e instanceof Error ? e.message : 'Falha ao assinar',
                }
              : r
          )
        );
      }
    }

    setBulkAction(null);
    setBulkProgress(null);
    setResultadoBulk(
      falhas === 0
        ? `Assinatura médica concluída para ${sucesso} paciente(s).`
        : `${sucesso} com sucesso, ${falhas} com erro.`
    );
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[10039] bg-black/40 ${desktopPanelOffset}`}
        role="presentation"
        onClick={() => {
          if (!bulkAction) onClose();
        }}
        aria-hidden
      />

      <div
        className={`fixed inset-0 z-[10040] flex flex-col bg-white text-gray-900 shadow-xl ${desktopPanelOffset} lg:shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contratos-pacientes-titulo"
      >
        <header className="flex-shrink-0 flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50/90 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h2 id="contratos-pacientes-titulo" className="text-lg sm:text-xl font-bold text-gray-900">
              Contratos de Tratamento
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Acompanhe assinaturas de pacientes e médico. Use os filtros para ações em lote.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(bulkAction)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar paciente..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
              />
            </div>
            <select
              value={filtroStatusTratamento}
              onChange={(e) => setFiltroStatusTratamento(e.target.value as FiltroStatusTratamento)}
              className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
            >
              {STATUS_TRATAMENTO_OPCOES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <ResumoBadge
              active={filtroContratoResumo === 'todos'}
              onClick={() => setFiltroContratoResumo('todos')}
              className="bg-gray-100 text-gray-700 border-gray-200"
            >
              {resumo.total} paciente(s)
            </ResumoBadge>
            <ResumoBadge
              active={filtroContratoResumo === 'sem_contrato'}
              onClick={() => toggleFiltroResumo('sem_contrato')}
              className="bg-amber-50 text-amber-800 border-amber-100"
            >
              {resumo.semContrato} sem contrato
            </ResumoBadge>
            <ResumoBadge
              active={filtroContratoResumo === 'paciente_pendente'}
              onClick={() => toggleFiltroResumo('paciente_pendente')}
              className="bg-amber-50 text-amber-900 border-amber-200"
            >
              {resumo.pacientePendente} paciente pendente
            </ResumoBadge>
            <ResumoBadge
              active={filtroContratoResumo === 'medico_pendente'}
              onClick={() => toggleFiltroResumo('medico_pendente')}
              className="bg-indigo-50 text-indigo-900 border-indigo-200"
            >
              {resumo.medicoPendente} médico pendente
            </ResumoBadge>
            <ResumoBadge
              active={filtroContratoResumo === 'completos'}
              onClick={() => toggleFiltroResumo('completos')}
              className="bg-emerald-50 text-emerald-800 border-emerald-200"
            >
              {resumo.completos} completo(s)
            </ResumoBadge>
          </div>

          {(filtroStatusTratamento !== 'todos' || filtroContratoResumo !== 'todos' || busca.trim()) && (
            <p className="text-xs text-gray-500">
              Exibindo {rowsFiltradas.length} de {rows.length} paciente(s)
              {filtroStatusTratamento !== 'todos'
                ? ` · status: ${STATUS_TRATAMENTO_OPCOES.find((o) => o.value === filtroStatusTratamento)?.label}`
                : ''}
            </p>
          )}

          {erroGeral ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erroGeral}
            </p>
          ) : null}

          {resultadoBulk ? (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {resultadoBulk}
            </p>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
          {loadingLista ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-sm">Carregando contratos…</p>
            </div>
          ) : rowsFiltradas.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-sm">Nenhum paciente encontrado com os filtros atuais.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rowsFiltradas.map((row) => {
                const { paciente: dotPaciente, medico: dotMedico, status } = resolveDotStates(row.documento);
                const nome = nomePaciente(row.paciente);
                const statusTrat = statusTratamentoPaciente(row.paciente);

                return (
                  <li key={row.paciente.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirContratoPaciente?.(row.paciente)}
                      className="w-full text-left rounded-xl border border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/30 transition-colors px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{nome}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <ContratoTratamentoStatusBadge status={status} className="text-[10px]" />
                            <span className="text-[10px] text-gray-500 capitalize">
                              {statusTrat === 'em_tratamento'
                                ? 'Em Tratamento'
                                : statusTrat === 'concluido'
                                  ? 'Concluído'
                                  : statusTrat === 'abandono'
                                    ? 'Abandono'
                                    : 'Pendente'}
                            </span>
                            {row.erro ? (
                              <span className="text-[10px] text-red-600">{row.erro}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <AssinaturaDot label="Paciente" state={dotPaciente} icon={User} />
                          <div className="h-8 w-px bg-gray-200" aria-hidden />
                          <AssinaturaDot label="Médico" state={dotMedico} icon={Stethoscope} />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex-shrink-0 border-t border-gray-200 bg-gray-50/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
          {bulkProgress ? (
            <p className="text-sm text-gray-600 flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              Processando {bulkProgress.atual} de {bulkProgress.total}…
            </p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleGerarTodos()}
              disabled={Boolean(bulkAction) || loadingLista || elegiveisGerar.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-sm font-medium text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkAction === 'gerar' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileSignature className="h-5 w-5" />
              )}
              Gerar contrato em todos
              {elegiveisGerar.length > 0 ? (
                <span className="text-xs font-normal text-purple-700">({elegiveisGerar.length})</span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => void handleAssinarMedicoTodos()}
              disabled={Boolean(bulkAction) || loadingLista || elegiveisMedico.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-sm font-medium text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkAction === 'medico' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Stethoscope className="h-5 w-5" />
              )}
              Assinar como médico em todos
              {elegiveisMedico.length > 0 ? (
                <span className="text-xs font-normal text-indigo-700">({elegiveisMedico.length})</span>
              ) : null}
            </button>
          </div>
        </footer>
      </div>
    </>,
    document.body
  );
}
