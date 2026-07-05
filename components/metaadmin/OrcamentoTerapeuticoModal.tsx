'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, ExternalLink, Loader2, Settings, Sparkles, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import type { PacienteCompleto } from '@/types/obesidade';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';
import { subscribePlanoTerapeuticoAtual } from '@/lib/metaadmin/planoTerapeuticoService';
import PlanoTerapeuticoStatusPanel from '@/components/metaadmin/PlanoTerapeuticoStatusPanel';
import MesaNegociacaoTerapeuticaPanel from '@/components/metaadmin/mesaNegociacao/MesaNegociacaoTerapeuticaPanel';
import { MedicoService } from '@/services/medicoService';
import { sanitizeDoctorSignatureProviderForClient } from '@/lib/metaadmin/sanitizeDoctorSignatureProviderForClient';
import { runPlanoTerapeuticoSignedPrint } from '@/lib/signature/runPlanoTerapeuticoSignedPrint';
import {
  calcularComposicaoDesdeConfig,
  calcularEstimativaPlanoInicialV2,
  extrairContextoOrcamentoPaciente,
  formatarDadoOpcional,
  formatarPesoKg,
  type ComposicaoOrcamento,
  type EstimativaPlanoInicialV1,
} from '@/lib/metaadmin/orcamentoTerapeuticoUtils';

type Props = {
  open: boolean;
  paciente: PacienteCompleto;
  config: OrcamentoTerapeuticoConfig;
  onClose: () => void;
  onEditarValoresPadrao: () => void;
  onPlanoGerado?: (mensagem: string) => void;
};

function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 shrink-0">{rotulo}</span>
      <span className="text-slate-900 font-medium text-right">{valor}</span>
    </div>
  );
}

export default function OrcamentoTerapeuticoModal({
  open,
  paciente,
  config,
  onClose,
  onEditarValoresPadrao,
  onPlanoGerado,
}: Props) {
  const contexto = useMemo(() => extrairContextoOrcamentoPaciente(paciente), [paciente]);

  const [estimativa, setEstimativa] = useState<EstimativaPlanoInicialV1>(() =>
    calcularEstimativaPlanoInicialV2(contexto)
  );
  const [composicao, setComposicao] = useState<ComposicaoOrcamento>(() =>
    calcularComposicaoDesdeConfig(calcularEstimativaPlanoInicialV2(contexto), config)
  );
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [planoAtual, setPlanoAtual] = useState<PlanoTerapeuticoInterativoDocumento | null>(null);
  const [ultimaPublicUrl, setUltimaPublicUrl] = useState<string | null>(null);
  const [assinandoMedico, setAssinandoMedico] = useState(false);
  const [cancelandoPlano, setCancelandoPlano] = useState(false);
  const [mesaNegociacaoAberta, setMesaNegociacaoAberta] = useState(false);
  const [preparandoPlanoMesa, setPreparandoPlanoMesa] = useState(false);

  const aplicarCalculoDesdeConfig = useCallback(
    (est: EstimativaPlanoInicialV1, cfg: OrcamentoTerapeuticoConfig) => {
      setComposicao(calcularComposicaoDesdeConfig(est, cfg));
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const ctx = extrairContextoOrcamentoPaciente(paciente);
    const estV2 = calcularEstimativaPlanoInicialV2(ctx);
    setEstimativa(estV2);
    aplicarCalculoDesdeConfig(estV2, config);
  }, [open, paciente, config, aplicarCalculoDesdeConfig]);

  useEffect(() => {
    const pacienteId = paciente.id?.trim();
    if (!open || !pacienteId) {
      setPlanoAtual(null);
      return;
    }
    return subscribePlanoTerapeuticoAtual(pacienteId, setPlanoAtual);
  }, [open, paciente.id]);

  const criarPlanoSemAbrir = useCallback(async (): Promise<boolean> => {
    const pacienteId = paciente.id?.trim();
    if (!pacienteId || gerandoPlano) return Boolean(planoAtual?.id);

    if (planoAtual?.id) return true;

    const user = auth.currentUser;
    if (!user) {
      onPlanoGerado?.('Faça login novamente para continuar.');
      return false;
    }

    setPreparandoPlanoMesa(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmin/plano-terapeutico', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          metaKg: contexto.kgDesejados,
          metaPercentual: contexto.percentualDesejado,
          pesoAtual: contexto.pesoAtual,
          pesoInicial: contexto.pesoInicial,
          metaDescricao: contexto.metaDescricao,
          nomePaciente: contexto.nome,
          estimativaEquilibrada: estimativa,
          origemEstimativaEquilibrada: 'v2_deterministica',
          descontoManual: composicao.desconto,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        publicUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        onPlanoGerado?.(data.error ?? 'Não foi possível preparar o plano.');
        return false;
      }
      if (data.publicUrl) setUltimaPublicUrl(data.publicUrl);
      return true;
    } catch {
      onPlanoGerado?.('Erro ao preparar o plano.');
      return false;
    } finally {
      setPreparandoPlanoMesa(false);
    }
  }, [
    paciente.id,
    gerandoPlano,
    planoAtual?.id,
    contexto,
    estimativa,
    composicao.desconto,
    onPlanoGerado,
  ]);

  const handleAbrirMesaNegociacao = useCallback(async () => {
    if (planoAtual?.id) {
      setMesaNegociacaoAberta(true);
      return;
    }
    const ok = await criarPlanoSemAbrir();
    if (ok) setMesaNegociacaoAberta(true);
  }, [planoAtual?.id, criarPlanoSemAbrir]);

  const abrirPaginaPlano = useCallback(
    async (url: string) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    []
  );

  const resolverUrlPlanoAtual = useCallback(async (): Promise<string | null> => {
    const urlLocal = planoAtual?.publicUrl?.trim() || ultimaPublicUrl?.trim();
    if (urlLocal) return urlLocal;

    const pacienteId = paciente.id?.trim();
    const orcamentoId = planoAtual?.id?.trim();
    if (!pacienteId || !orcamentoId) return null;

    const user = auth.currentUser;
    if (!user) return null;

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmin/plano-terapeutico/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pacienteId, orcamentoId }),
      });
      const data = (await res.json()) as { ok?: boolean; publicUrl?: string; error?: string };
      if (!res.ok || !data.ok || !data.publicUrl) return null;
      setUltimaPublicUrl(data.publicUrl);
      return data.publicUrl;
    } catch {
      return null;
    }
  }, [planoAtual?.id, planoAtual?.publicUrl, ultimaPublicUrl, paciente.id]);

  const gerarNovoPlano = useCallback(async (): Promise<string | null> => {
    const pacienteId = paciente.id?.trim();
    if (!pacienteId || gerandoPlano) return null;

    const user = auth.currentUser;
    if (!user) {
      onPlanoGerado?.('Faça login novamente para abrir a página do plano.');
      return null;
    }

    setGerandoPlano(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmin/plano-terapeutico', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          metaKg: contexto.kgDesejados,
          metaPercentual: contexto.percentualDesejado,
          pesoAtual: contexto.pesoAtual,
          pesoInicial: contexto.pesoInicial,
          metaDescricao: contexto.metaDescricao,
          nomePaciente: contexto.nome,
          estimativaEquilibrada: estimativa,
          origemEstimativaEquilibrada: 'v2_deterministica',
          descontoManual: composicao.desconto,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        publicUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.publicUrl) {
        onPlanoGerado?.(data.error ?? 'Não foi possível criar a página do plano.');
        return null;
      }
      setUltimaPublicUrl(data.publicUrl);
      return data.publicUrl;
    } catch {
      onPlanoGerado?.('Erro ao criar página do plano.');
      return null;
    } finally {
      setGerandoPlano(false);
    }
  }, [paciente.id, gerandoPlano, contexto, estimativa, composicao.desconto, onPlanoGerado]);

  const handleReabrirPagina = useCallback(async () => {
    setGerandoPlano(true);
    try {
      let url = await resolverUrlPlanoAtual();
      if (!url && !planoAtual?.id) {
        url = await gerarNovoPlano();
      }
      if (!url) {
        onPlanoGerado?.(
          'Não foi possível abrir a página do plano. Salve a proposta e tente novamente.'
        );
        return;
      }
      await abrirPaginaPlano(url);
      onPlanoGerado?.('Página do plano aberta em nova aba.');
    } finally {
      setGerandoPlano(false);
    }
  }, [resolverUrlPlanoAtual, gerarNovoPlano, planoAtual?.id, abrirPaginaPlano, onPlanoGerado]);

  const handleAbrirPaginaPlano = useCallback(() => {
    void handleReabrirPagina();
  }, [handleReabrirPagina]);

  const handleAssinarMedico = useCallback(async () => {
    const pacienteId = paciente.id?.trim();
    const orcamentoId = planoAtual?.id?.trim();
    const pdfUrl =
      planoAtual?.pdfFinalAssinadoUrl?.trim() || planoAtual?.pdfUrl?.trim();
    if (!pacienteId || !orcamentoId || !pdfUrl || assinandoMedico) return;

    setAssinandoMedico(true);
    try {
      const medicoId = planoAtual?.medicoId?.trim();
      const medico = medicoId ? await MedicoService.getMedicoById(medicoId) : null;
      const providerConfig = sanitizeDoctorSignatureProviderForClient(
        medico?.doctorSignatureProvider
      );

      const result = await runPlanoTerapeuticoSignedPrint({
        patientId: pacienteId,
        originalPdfUrl: pdfUrl,
        providerConfig,
      });

      if (result.outcome !== 'opened') {
        onPlanoGerado?.(result.message || 'Assinatura pendente no provedor.');
        return;
      }

      const user = auth.currentUser;
      if (!user) throw new Error('Faça login para continuar.');
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmin/plano-terapeutico/assinar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          orcamentoId,
          signedPdfUrl: result.signedPdfUrl,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        onPlanoGerado?.(data.error ?? 'Não foi possível registrar a assinatura do médico.');
        return;
      }
      onPlanoGerado?.('PDF do plano assinado pelo médico.');
    } catch (e) {
      onPlanoGerado?.(e instanceof Error ? e.message : 'Erro ao assinar PDF do plano.');
    } finally {
      setAssinandoMedico(false);
    }
  }, [paciente.id, planoAtual, assinandoMedico, onPlanoGerado]);

  const handleCancelarPlano = useCallback(async () => {
    const pacienteId = paciente.id?.trim();
    const orcamentoId = planoAtual?.id?.trim();
    if (!pacienteId || !orcamentoId || cancelandoPlano) return;

    const confirmar = window.confirm(
      'Cancelar todos os planos pendentes deste paciente? Você poderá montar e salvar uma nova proposta personalizada em seguida.'
    );
    if (!confirmar) return;

    setCancelandoPlano(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Faça login para continuar.');
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmin/plano-terapeutico/cancelar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pacienteId, orcamentoId, cancelarTodos: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        plano?: PlanoTerapeuticoInterativoDocumento;
        cancelados?: number;
      };
      if (!res.ok || !data.ok) {
        onPlanoGerado?.(data.error ?? 'Não foi possível cancelar o plano.');
        return;
      }
      setPlanoAtual(null);
      setUltimaPublicUrl(null);
      onPlanoGerado?.(
        data.cancelados && data.cancelados > 0
          ? `${data.cancelados} plano(s) cancelado(s). Monte e salve a nova proposta.`
          : 'Nenhum plano pendente encontrado.'
      );
    } catch (e) {
      onPlanoGerado?.(e instanceof Error ? e.message : 'Erro ao cancelar plano.');
    } finally {
      setCancelandoPlano(false);
    }
  }, [paciente.id, planoAtual?.id, cancelandoPlano, onPlanoGerado]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex flex-col overflow-hidden md:items-center md:justify-center md:bg-black/55 md:backdrop-blur-sm md:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[92vh] md:max-w-2xl md:rounded-2xl shadow-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden border-0 md:border md:border-slate-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="orcamento-terapeutico-titulo"
      >
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] md:pt-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                <Calculator className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2
                  id="orcamento-terapeutico-titulo"
                  className="text-base sm:text-lg font-semibold text-slate-900"
                >
                  Orçamento Terapêutico
                </h2>
                <button
                  type="button"
                  onClick={onEditarValoresPadrao}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
                  title="Editar valores padrão do médico"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Editar valores padrão
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
              aria-label="Fechar orçamento"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-5 sm:px-6 py-5 space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Dados do paciente
            </p>
            <LinhaDado rotulo="Nome" valor={contexto.nome} />
            <LinhaDado rotulo="Peso inicial" valor={formatarPesoKg(contexto.pesoInicial)} />
            <LinhaDado rotulo="Peso atual" valor={formatarPesoKg(contexto.pesoAtual)} />
            <LinhaDado rotulo="Meta de perda" valor={contexto.metaDescricao} />
            <LinhaDado
              rotulo="Kg desejados"
              valor={formatarDadoOpcional(contexto.kgDesejados, (v) => `${v} kg`)}
            />
            <LinhaDado
              rotulo="% de perda desejado"
              valor={formatarDadoOpcional(contexto.percentualDesejado, (v) => `${v}%`)}
            />
            <LinhaDado rotulo="Medicamento" valor={formatarDadoOpcional(contexto.medicamento)} />
            <LinhaDado
              rotulo="IMC inicial"
              valor={formatarDadoOpcional(contexto.imcInicial, (v) => String(v))}
            />
            <LinhaDado
              rotulo="IMC atual"
              valor={formatarDadoOpcional(contexto.imcAtual, (v) => String(v))}
            />
            <LinhaDado
              rotulo="Status do tratamento"
              valor={formatarDadoOpcional(contexto.statusTratamento)}
            />
            {contexto.adesaoMedia != null && (
              <LinhaDado
                rotulo="Adesão média"
                valor={`${Math.round(contexto.adesaoMedia)}%`}
              />
            )}
          </section>

          <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-2">
              Resumo da meta
            </p>
            <p className="text-sm text-indigo-950">
              Meta cadastrada:{' '}
              <span className="font-semibold">{contexto.metaDescricao}</span>
            </p>
            {contexto.percentualDesejado != null && (
              <p className="text-sm text-indigo-800 mt-1">
                Percentual estimado:{' '}
                <span className="font-semibold">{contexto.percentualDesejado}%</span>
              </p>
            )}
          </section>

          <PlanoTerapeuticoStatusPanel
            plano={planoAtual}
            onAbrirPagina={handleReabrirPagina}
            abrindoPagina={gerandoPlano}
            onAssinarMedico={() => void handleAssinarMedico()}
            assinandoMedico={assinandoMedico}
            onCancelarPlano={() => void handleCancelarPlano()}
            cancelandoPlano={cancelandoPlano}
          />

          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">
                Mesa de Negociação Terapêutica
              </p>
              <p className="text-sm text-amber-950/90 mb-3">
                Monte o Plano Personalizado, salve a proposta e o paciente verá na aba
                correspondente para aprovar e assinar.
              </p>
              <button
                type="button"
                onClick={() => void handleAbrirMesaNegociacao()}
                disabled={preparandoPlanoMesa || gerandoPlano}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-950 bg-amber-200/80 border border-amber-300 rounded-xl hover:bg-amber-200 transition-colors disabled:opacity-60"
              >
                {preparandoPlanoMesa ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {preparandoPlanoMesa ? 'Preparando plano…' : 'Abrir Mesa de Negociação'}
              </button>
            </section>
        </div>

        <div className="flex-shrink-0 px-4 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white/95 backdrop-blur-md">
          <button
            type="button"
            onClick={() => void handleAbrirPaginaPlano()}
            disabled={gerandoPlano}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {gerandoPlano ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
            )}
            {gerandoPlano ? 'Abrindo página do plano…' : planoAtual ? 'Abrir página do plano com o paciente' : 'Criar e abrir página do plano'}
          </button>
        </div>
      </div>

      {mesaNegociacaoAberta && planoAtual && (
        <MesaNegociacaoTerapeuticaPanel
          open={mesaNegociacaoAberta}
          onClose={() => setMesaNegociacaoAberta(false)}
          plano={planoAtual}
          pesoAtual={contexto.pesoAtual}
          onPropostaEnviada={(msg) => onPlanoGerado?.(msg)}
          onPlanoAtualizado={setPlanoAtual}
          onAbrirPaginaPaciente={() => void handleReabrirPagina()}
        />
      )}

      {mesaNegociacaoAberta && !planoAtual && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white px-6 py-4 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <p className="text-sm text-slate-700">Preparando plano para negociação…</p>
          </div>
        </div>
      )}
    </div>
  );
}
