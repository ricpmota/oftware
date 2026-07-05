'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileSignature,
  Loader2,
} from 'lucide-react';
import ControleStepper from '@/components/planoTerapeutico/ControleStepper';
import ModalidadeAcompanhamentoCards from '@/components/planoTerapeutico/ModalidadeAcompanhamentoCards';
import PlanoTerapeuticoGraficoPrevisto from '@/components/planoTerapeutico/PlanoTerapeuticoGraficoPrevisto';
import PropostaNegociacaoPacientePanel from '@/components/planoTerapeutico/PropostaNegociacaoPacientePanel';
import PlanoPersonalizadoPacienteLeitura from '@/components/planoTerapeutico/PlanoPersonalizadoPacienteLeitura';
import {
  carregarNegociacaoSessao,
  negociacaoPersistidaFromSalva,
  propostaMedicoDisponivel,
  recalcularPlanoNegociado,
  type NegociacaoTerapeuticaPersistida,
} from '@/lib/treatment-negotiation';
import { LABEL_ANALISE_EXAMES } from '@/lib/treatment-negotiation/constants';
import {
  calcularPesoAlvo,
  formatarMetaKg,
  formatarPrazoMeses,
  metaInicialDoPlano,
  montarResumoDinamico,
} from '@/lib/planoTerapeutico/planoTerapeuticoPlanoUi';
import {
  clampMesesPersonalizado,
  clampMetaPersonalizada,
  calcularMesesInicialPersonalizadoParaMeta,
  doseMensalInicial,
  dosesMensaisDaConfig,
  META_PERSONALIZADA_MAX_KG,
  META_PERSONALIZADA_MIN_KG,
  META_PERSONALIZADA_STEP_KG,
  MODALIDADES_PLANO,
  PRAZO_PERSONALIZADO_MAX_MESES,
  PRAZO_PERSONALIZADO_MIN_MESES,
  RITMOS_ESCALONAMENTO,
  resolvePlanoPorModalidade,
  type ModalidadePlanoId,
  type RitmoEscalonamentoId,
} from '@/lib/planoTerapeutico/modalidadesPlano';
import { configuracaoComercialFromPlanoSalvo, formatarMoedaBRL, formatarPesoKg } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import {
  faixaPesoAoFimPeriodo,
  perdaTotalFaixaPeriodoComLimite,
} from '@/lib/planoTerapeutico/faixaPerdaPeso';
import {
  montarDadosGraficoTratamento,
  montarMarcosClinicosGrafico,
} from '@/lib/treatment-designer/graficoPlano';
import { usePlanoDiffRef } from '@/lib/treatment-designer/usePlanoDiff';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type {
  CenarioPlanoTerapeutico,
  EscolhaPlanoPaciente,
  PlanoTerapeuticoPublicoPayload,
} from '@/types/planoTerapeuticoInterativo';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';
import type { Medico } from '@/types/medico';
import {
  buildPlanoTerapeuticoJsPdfDocument,
  openPlanoTerapeuticoPdfUrl,
  type PlanoTerapeuticoPdfContext,
} from '@/utils/planoTerapeuticoPdfGenerate';
import { arrayBufferToBase64 } from '@/lib/signature/requestSandboxPrescriptionSignature';
import {
  requestPlanoPacienteEnsureSignLink,
  requestPlanoPacienteSyncSignStatus,
} from '@/lib/signature/requestPlanoPacienteEasySign';
import {
  planoPacienteAguardandoEasySign,
  planoPacienteJaAssinou,
} from '@/lib/planoTerapeutico/planoTerapeuticoStatusUi';

const SYNC_POLL_MS = 4000;

type BrandingPublico = {
  publicName: string;
  logoUrl: string;
};

type Props = {
  orcamentoId: string;
  token: string;
};

function montarEscolhaPaciente(args: {
  modalidade: ModalidadePlanoId;
  mesesPrazo: number;
  metaKg: number;
  doseMensalMg: number;
  ritmoEscalonamento: RitmoEscalonamentoId;
  valorTotal: number;
}): EscolhaPlanoPaciente {
  const rotuloExibicao =
    MODALIDADES_PLANO.find((m) => m.id === args.modalidade)?.rotulo ?? args.modalidade;
  return {
    modalidade: args.modalidade,
    valorTotal: args.valorTotal,
    rotuloExibicao,
    ...(args.modalidade === 'personalizado'
      ? {
          mesesPrazo: args.mesesPrazo,
          metaKg: args.metaKg,
          doseMensalMg: args.doseMensalMg,
          ritmoEscalonamento: args.ritmoEscalonamento,
        }
      : {}),
  };
}

function avancarDoseDisponivel(doses: number[], atual: number, delta: number): number {
  const idx = doses.findIndex((d) => Math.abs(d - atual) < 0.01);
  const base = idx >= 0 ? idx : 0;
  const next = base + delta;
  if (next < 0 || next >= doses.length) return doses[Math.max(0, Math.min(doses.length - 1, base))];
  return doses[next];
}

function ResumoDinamicoChain({
  prazo,
  perdaSemanalMin,
  perdaSemanalMax,
  doseTotal,
  aplicacoes,
  consultas,
}: {
  prazo: string;
  perdaSemanalMin: number;
  perdaSemanalMax: number;
  doseTotal: string;
  aplicacoes: number;
  consultas: number;
}) {
  const perdaSemanal =
    perdaSemanalMin === perdaSemanalMax
      ? `${perdaSemanalMin.toFixed(1)} kg/semana`
      : `${perdaSemanalMin.toFixed(1)}–${perdaSemanalMax.toFixed(1)} kg/semana`;

  const itens = [
    { rotulo: 'Prazo estimado', valor: prazo },
    { rotulo: 'Ritmo médio esperado', valor: perdaSemanal },
    { rotulo: 'Dose total prevista', valor: doseTotal },
    { rotulo: 'Aplicações previstas', valor: String(aplicacoes) },
    { rotulo: 'Consultas previstas', valor: String(consultas) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-y-2 gap-x-1 text-sm">
      {itens.map((item, i) => (
        <div key={item.rotulo} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-300 px-1">↓</span>}
          <span className="text-slate-500">{item.rotulo}</span>
          <span className="font-semibold text-slate-900 tabular-nums ml-1">{item.valor}</span>
        </div>
      ))}
    </div>
  );
}

export default function PlanoTerapeuticoInterativoClient({ orcamentoId, token }: Props) {
  const [plano, setPlano] = useState<PlanoTerapeuticoPublicoPayload | null>(null);
  const [branding, setBranding] = useState<BrandingPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalidade, setModalidade] = useState<ModalidadePlanoId>('trimestral');
  const [mesesPrazo, setMesesPrazo] = useState(PRAZO_PERSONALIZADO_MIN_MESES);
  const [metaKg, setMetaKg] = useState(META_PERSONALIZADA_MIN_KG);
  const [doseMensalMg, setDoseMensalMg] = useState(2.5);
  const [ritmoEscalonamento, setRitmoEscalonamento] = useState<RitmoEscalonamentoId>('lento');
  const [composicaoAberta, setComposicaoAberta] = useState(false);
  const [cenariosPersonalizado, setCenariosPersonalizado] = useState<Record<
    string,
    CenarioPlanoTerapeutico
  > | null>(null);
  const [motorPersonalizadoErro, setMotorPersonalizadoErro] = useState<string | null>(null);
  const [personalizadoAtualizando, setPersonalizadoAtualizando] = useState(false);
  const [pdfContext, setPdfContext] = useState<{
    ctx: PlanoTerapeuticoPdfContext;
    medico: Medico | null;
    organizationBranding: OrganizationBrandingStored | null;
  } | null>(null);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState<string | null>(null);
  const [signLinkUrl, setSignLinkUrl] = useState<string | null>(null);
  const [sincronizandoAssinatura, setSincronizandoAssinatura] = useState(false);
  const escolhaSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escolhaInFlightRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const aguardandoRetornoAssinaturaRef = useRef(false);
  const [negociacaoLocal, setNegociacaoLocal] = useState<NegociacaoTerapeuticaPersistida | null>(
    null
  );

  const configuracaoComercial = useMemo((): OrcamentoTerapeuticoConfig | null => {
    if (!plano) return null;
    return configuracaoComercialFromPlanoSalvo(plano.configuracaoComercialUsada);
  }, [plano]);

  const negociacaoDoServidor = useMemo((): NegociacaoTerapeuticaPersistida | null => {
    if (!plano?.negociacaoTerapeutica?.parametros) return null;
    return negociacaoPersistidaFromSalva(
      plano.id,
      plano.negociacaoTerapeutica,
      configuracaoComercial
    );
  }, [plano?.id, plano?.negociacaoTerapeutica, configuracaoComercial]);

  const negociacaoAtiva = negociacaoDoServidor ?? negociacaoLocal;

  const carregar = useCallback(async (opts?: { silencioso?: boolean }) => {
    const silencioso = opts?.silencioso ?? false;
    if (silencioso) {
      setPersonalizadoAtualizando(true);
    } else {
      setLoading(true);
      setErro(null);
    }
    try {
      const res = await fetch(
        `/api/plano-terapeutico/${encodeURIComponent(orcamentoId)}?t=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (!silencioso) {
          setErro(json.error || 'Não foi possível carregar o plano.');
          setPlano(null);
        }
        return;
      }
      const carregado = json.plano as PlanoTerapeuticoPublicoPayload;
      setPlano(carregado);
      if (carregado.negociacaoTerapeutica?.parametros) {
        const configSalva = configuracaoComercialFromPlanoSalvo(carregado.configuracaoComercialUsada);
        const persistida = negociacaoPersistidaFromSalva(
          carregado.id,
          carregado.negociacaoTerapeutica,
          configSalva
        );
        setNegociacaoLocal(persistida);
        if (!silencioso && persistida && propostaMedicoDisponivel(persistida.status)) {
          setModalidade('personalizado');
        }
      } else {
        const salvaSessao = carregarNegociacaoSessao(orcamentoId);
        setNegociacaoLocal(salvaSessao?.parametros ? salvaSessao : null);
      }

      if (!silencioso) {
        setBranding(
          json.branding?.logoUrl
            ? {
                publicName: json.branding.publicName ?? '',
                logoUrl: json.branding.logoUrl,
              }
            : null
        );
        if (json.pdfContext) {
          const pc = json.pdfContext as {
            pacienteNome: string;
            pacienteCpf?: string;
            pacienteDataNascimento?: string;
            pacienteSexo?: string;
            metaDescricao?: string;
            medico: Medico | null;
            organizationBranding: OrganizationBrandingStored | null;
          };
          setPdfContext({
            ctx: {
              pacienteNome: pc.pacienteNome,
              pacienteCpf: pc.pacienteCpf,
              pacienteDataNascimento: pc.pacienteDataNascimento,
              pacienteSexo: pc.pacienteSexo,
              metaDescricao: pc.metaDescricao,
            },
            medico: pc.medico,
            organizationBranding: pc.organizationBranding,
          });
        }
        const configSalva = configuracaoComercialFromPlanoSalvo(carregado.configuracaoComercialUsada);
        const metaInicial = clampMetaPersonalizada(metaInicialDoPlano(carregado.metaKg));
        const doseInicial = doseMensalInicial(configSalva);
        setMetaKg(metaInicial);
        setDoseMensalMg(doseInicial);
        setMesesPrazo(
          calcularMesesInicialPersonalizadoParaMeta({
            pesoAtualKg: carregado.contextoPaciente.pesoAtualKg,
            metaKg: metaInicial,
            metaPercentual:
              carregado.contextoPaciente.metaPercentual ?? carregado.metaPercentual,
            doseMensalMg: doseInicial,
            ritmoEscalonamento: 'lento',
            doseReferenciaMg: doseInicial,
          })
        );
      }
    } catch {
      if (!silencioso) setErro('Falha de conexão ao carregar o plano.');
    } finally {
      if (silencioso) setPersonalizadoAtualizando(false);
      else setLoading(false);
    }
  }, [orcamentoId, token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (modalidade !== 'personalizado') return;
    setMotorPersonalizadoErro(null);
  }, [modalidade]);

  const pesoAtual = plano?.contextoPaciente.pesoAtualKg ?? null;

  const dosesDisponiveis = useMemo(
    () => (configuracaoComercial ? dosesMensaisDaConfig(configuracaoComercial) : [2.5]),
    [configuracaoComercial]
  );

  const propostaPersonalizadoDisponivel = propostaMedicoDisponivel(negociacaoAtiva?.status);
  const isPersonalizadoModalidade = modalidade === 'personalizado';
  const personalizadoAguardandoMedico =
    isPersonalizadoModalidade && !propostaPersonalizadoDisponivel;
  const personalizadoComPropostaVisivel =
    isPersonalizadoModalidade &&
    propostaPersonalizadoDisponivel &&
    Boolean(negociacaoAtiva?.parametros);
  const precisaPlanoContinuo = !isPersonalizadoModalidade || propostaPersonalizadoDisponivel;

  const planoContinuo = useMemo(() => {
    if (!plano || !configuracaoComercial) return null;

    if (modalidade === 'personalizado') {
      if (negociacaoAtiva?.parametros && propostaPersonalizadoDisponivel) {
        try {
          return recalcularPlanoNegociado({
            parametros: negociacaoAtiva.parametros,
            configuracaoComercial,
            pesoAtual,
            metaPercentual: plano.contextoPaciente.metaPercentual ?? plano.metaPercentual,
          });
        } catch {
          return null;
        }
      }
      return null;
    }

    const cenariosLegados = plano.cenarios;
    return resolvePlanoPorModalidade({
      cenariosLegados,
      mesesPrazo,
      metaKgSlider: metaKg,
      metaKgOriginal: plano.metaKg,
      metaPercentual: plano.contextoPaciente.metaPercentual ?? plano.metaPercentual,
      pesoAtual,
      modalidade,
      configuracaoComercial,
      doseMensalMg,
      ritmoEscalonamento,
      descontoManual: plano.descontoManual,
    });
  }, [
    plano,
    configuracaoComercial,
    mesesPrazo,
    metaKg,
    pesoAtual,
    modalidade,
    doseMensalMg,
    ritmoEscalonamento,
    negociacaoAtiva,
    propostaPersonalizadoDisponivel,
  ]);

  const resumo = useMemo(
    () => (planoContinuo ? montarResumoDinamico(planoContinuo) : null),
    [planoContinuo]
  );

  usePlanoDiffRef(resumo);

  const planoJaAceito = planoPacienteJaAssinou(plano);
  const planoAguardandoEasySign = planoPacienteAguardandoEasySign(plano);
  const planoCancelado = plano?.status === 'cancelado';

  const escolhaAtual = useMemo((): EscolhaPlanoPaciente | null => {
    if (!planoContinuo) return null;
    if (modalidade === 'personalizado' && negociacaoAtiva?.parametros) {
      const p = negociacaoAtiva.parametros;
      return montarEscolhaPaciente({
        modalidade: 'personalizado',
        mesesPrazo: p.mesesPrazo,
        metaKg: p.metaKg,
        doseMensalMg: p.doseMensalMg,
        ritmoEscalonamento: p.ritmoEscalonamento,
        valorTotal: planoContinuo.valorTotal,
      });
    }
    return montarEscolhaPaciente({
      modalidade,
      mesesPrazo,
      metaKg,
      doseMensalMg,
      ritmoEscalonamento,
      valorTotal: planoContinuo.valorTotal,
    });
  }, [
    planoContinuo,
    modalidade,
    mesesPrazo,
    metaKg,
    doseMensalMg,
    ritmoEscalonamento,
    negociacaoAtiva,
  ]);

  const handleSelectModalidade = useCallback(
    (id: ModalidadePlanoId) => {
      setModalidade(id);
      if (id === 'personalizado') {
        void carregar({ silencioso: true });
      }
      if (id !== 'personalizado' || !plano || !configuracaoComercial) return;
      setMesesPrazo(
        calcularMesesInicialPersonalizadoParaMeta({
          pesoAtualKg: plano.contextoPaciente.pesoAtualKg,
          metaKg,
          metaPercentual: plano.contextoPaciente.metaPercentual ?? plano.metaPercentual,
          doseMensalMg,
          ritmoEscalonamento,
          doseReferenciaMg: doseMensalInicial(configuracaoComercial),
        })
      );
    },
    [plano, configuracaoComercial, metaKg, doseMensalMg, ritmoEscalonamento, carregar]
  );

  useEffect(() => {
    if (modalidade !== 'personalizado') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void carregar({ silencioso: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = personalizadoAguardandoMedico
      ? window.setInterval(() => void carregar({ silencioso: true }), 15000)
      : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (interval) window.clearInterval(interval);
    };
  }, [modalidade, carregar, personalizadoAguardandoMedico]);

  const sincronizarEscolha = useCallback(async () => {
    if (!escolhaAtual || planoJaAceito || planoCancelado || escolhaInFlightRef.current) return;
    escolhaInFlightRef.current = true;
    try {
      await fetch(
        `/api/plano-terapeutico/${encodeURIComponent(orcamentoId)}/escolha?t=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ escolha: escolhaAtual }),
        }
      );
    } catch {
      // silencioso — médico verá quando conseguir salvar
    } finally {
      escolhaInFlightRef.current = false;
    }
  }, [escolhaAtual, planoJaAceito, planoCancelado, orcamentoId, token]);

  useEffect(() => {
    if (!plano || planoJaAceito || planoCancelado || planoAguardandoEasySign || !escolhaAtual) return;
    if (escolhaSyncRef.current) clearTimeout(escolhaSyncRef.current);
    escolhaSyncRef.current = setTimeout(() => {
      void sincronizarEscolha();
    }, 800);
    return () => {
      if (escolhaSyncRef.current) clearTimeout(escolhaSyncRef.current);
    };
  }, [plano, planoJaAceito, planoCancelado, planoAguardandoEasySign, escolhaAtual, sincronizarEscolha]);

  const aplicarPlanoSincronizado = useCallback(
    (result: {
      pdfFinalAssinadoUrl: string;
      pacienteAssinadoEm: string;
      plano?: Record<string, unknown>;
    }) => {
      if (result.plano) {
        setPlano(result.plano as PlanoTerapeuticoPublicoPayload);
      } else {
        setPlano((prev) =>
          prev
            ? {
                ...prev,
                status: 'aceito',
                pdfUrl: result.pdfFinalAssinadoUrl,
                pdfFinalAssinadoUrl: result.pdfFinalAssinadoUrl,
                acceptedAt: result.pacienteAssinadoEm,
                pacienteSignStatus: 'assinado',
                pacienteAssinadoEm: result.pacienteAssinadoEm,
              }
            : prev
        );
      }
      aguardandoRetornoAssinaturaRef.current = false;
      setSignLinkUrl(null);
    },
    []
  );

  const sincronizarAssinatura = useCallback(async (): Promise<boolean> => {
    if (planoJaAceito) return true;
    if (syncInFlightRef.current) return false;

    syncInFlightRef.current = true;
    setSincronizandoAssinatura(true);
    try {
      const result = await requestPlanoPacienteSyncSignStatus({ orcamentoId, token });
      if (result.pending) return false;
      aplicarPlanoSincronizado(result);
      return true;
    } catch {
      return false;
    } finally {
      syncInFlightRef.current = false;
      setSincronizandoAssinatura(false);
    }
  }, [aplicarPlanoSincronizado, orcamentoId, planoJaAceito, token]);

  const sincronizarAssinaturaRef = useRef(sincronizarAssinatura);
  sincronizarAssinaturaRef.current = sincronizarAssinatura;

  const abrirAssinaturaEasySign = useCallback((url: string) => {
    aguardandoRetornoAssinaturaRef.current = true;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const garantirLinkAssinatura = useCallback(async (): Promise<string | null> => {
    if (signLinkUrl?.trim()) return signLinkUrl.trim();
    try {
      const result = await requestPlanoPacienteEnsureSignLink({ orcamentoId, token });
      setSignLinkUrl(result.pacienteSignLinkUrl);
      return result.pacienteSignLinkUrl;
    } catch (e) {
      setErroAssinatura(e instanceof Error ? e.message : 'Não foi possível abrir a assinatura.');
      return null;
    }
  }, [orcamentoId, signLinkUrl, token]);

  useEffect(() => {
    if (!planoAguardandoEasySign || planoJaAceito) return;

    let cancelled = false;
    void (async () => {
      const link = await garantirLinkAssinatura();
      if (!cancelled && link) setSignLinkUrl(link);
    })();

    const interval = window.setInterval(() => {
      if (aguardandoRetornoAssinaturaRef.current || planoAguardandoEasySign) {
        void sincronizarAssinaturaRef.current();
      }
    }, SYNC_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [planoAguardandoEasySign, planoJaAceito, garantirLinkAssinatura]);

  useEffect(() => {
    const onFocus = () => {
      if (aguardandoRetornoAssinaturaRef.current) {
        void sincronizarAssinaturaRef.current();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleAssinarPlano = useCallback(async () => {
    if (!escolhaAtual || !resumo || !pdfContext || planoJaAceito || aceitando) return;
    if (!termosAceitos) {
      setErroAssinatura('Confirme que leu e concorda com o plano apresentado.');
      return;
    }

    setAceitando(true);
    setErroAssinatura(null);
    try {
      const dataDocumento = new Date();
      const docPdf = await buildPlanoTerapeuticoJsPdfDocument(
        {
          escolha: escolhaAtual,
          resumo: {
            prazoMeses: resumo.prazoMeses,
            perdaSemanalMinKg: resumo.perdaSemanalMinKg,
            perdaSemanalMaxKg: resumo.perdaSemanalMaxKg,
            doseTotalMg: resumo.doseTotalMg,
            aplicacoes: resumo.aplicacoes,
            consultas: resumo.consultas,
          },
          medico: pdfContext.medico,
          ctx: pdfContext.ctx,
          dataDocumento,
          organizationBranding: pdfContext.organizationBranding,
        },
        { omitManualSignatureBlock: true }
      );
      const pdfBase64 = arrayBufferToBase64(docPdf.output('arraybuffer') as ArrayBuffer);

      const res = await fetch(
        `/api/plano-terapeutico/${encodeURIComponent(orcamentoId)}/aceitar?t=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escolha: escolhaAtual,
            pdfBase64,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErroAssinatura(json.error || 'Não foi possível preparar a assinatura.');
        return;
      }

      setPlano(json.plano as PlanoTerapeuticoPublicoPayload);

      const link = typeof json.pacienteSignLinkUrl === 'string' ? json.pacienteSignLinkUrl.trim() : '';
      if (json.pendingSignature && link) {
        setSignLinkUrl(link);
        abrirAssinaturaEasySign(link);
        return;
      }

      if (!json.pendingSignature) {
        setPlano(json.plano as PlanoTerapeuticoPublicoPayload);
      }
    } catch {
      setErroAssinatura('Falha de conexão ao assinar o plano.');
    } finally {
      setAceitando(false);
    }
  }, [
    escolhaAtual,
    resumo,
    pdfContext,
    planoJaAceito,
    aceitando,
    termosAceitos,
    orcamentoId,
    token,
    abrirAssinaturaEasySign,
  ]);

  const handleContinuarAssinatura = useCallback(async () => {
    setErroAssinatura(null);
    const link = signLinkUrl?.trim() || (await garantirLinkAssinatura());
    if (link) abrirAssinaturaEasySign(link);
  }, [abrirAssinaturaEasySign, garantirLinkAssinatura, signLinkUrl]);

  const isPersonalizado = modalidade === 'personalizado';
  const metaPacienteCadastrada =
    plano?.metaKg ?? plano?.contextoPaciente.metaKg ?? null;

  const perdaPrevistaKg = planoContinuo?.perdaPrevistaKg ?? 0;
  const faixaPerdaPeriodo = useMemo(
    () =>
      planoContinuo && pesoAtual != null
        ? perdaTotalFaixaPeriodoComLimite(
            pesoAtual,
            planoContinuo.estimativa.duracaoSemanas
          )
        : null,
    [planoContinuo, pesoAtual]
  );
  const faixaPesoFimPeriodo = useMemo(
    () =>
      pesoAtual != null && planoContinuo
        ? faixaPesoAoFimPeriodo(pesoAtual, planoContinuo.estimativa.duracaoSemanas)
        : null,
    [pesoAtual, planoContinuo]
  );
  const pesoPrevistoPeriodo = useMemo(
    () =>
      faixaPesoFimPeriodo != null
        ? faixaPesoFimPeriodo.pesoMedioKg
        : pesoAtual != null
          ? calcularPesoAlvo(pesoAtual, perdaPrevistaKg)
          : null,
    [faixaPesoFimPeriodo, pesoAtual, perdaPrevistaKg]
  );

  const pesoAlvo = useMemo(() => {
    if (pesoAtual == null) return null;
    return calcularPesoAlvo(pesoAtual, perdaPrevistaKg);
  }, [pesoAtual, perdaPrevistaKg]);

  const pesoAlvoGrafico = pesoAlvo;

  const dadosGrafico = useMemo(() => {
    if (!planoContinuo) return [];
    return montarDadosGraficoTratamento(planoContinuo, pesoAlvoGrafico);
  }, [planoContinuo, pesoAlvoGrafico]);

  const marcosGrafico = useMemo(() => {
    if (!planoContinuo || pesoAtual == null || pesoAtual <= 0) return [];
    const maxSemana = planoContinuo.estimativa.duracaoSemanas;
    return montarMarcosClinicosGrafico(
      planoContinuo.marcosClinicos,
      pesoAtual,
      ritmoEscalonamento
    ).filter((marco) => marco.semana <= maxSemana);
  }, [planoContinuo, pesoAtual, ritmoEscalonamento]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8]">
        <p className="text-slate-600 text-sm">Carregando…</p>
      </div>
    );
  }

  if (planoCancelado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8] px-4">
        <div className="max-w-md text-center rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
          <p className="text-slate-800 font-medium">Plano cancelado</p>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Este plano foi cancelado pelo médico. Solicite um novo link para escolher o plano
            terapêutico novamente.
          </p>
        </div>
      </div>
    );
  }

  if (erro || !plano || (precisaPlanoContinuo && !personalizadoComPropostaVisivel && (!planoContinuo || !resumo))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8] px-4">
        <div className="max-w-md text-center rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
          <p className="text-slate-800 font-medium">Plano indisponível</p>
          <p className="text-sm text-slate-500 mt-2">
            {erro ?? motorPersonalizadoErro ?? 'Link inválido ou expirado.'}
          </p>
        </div>
      </div>
    );
  }

  if (!planoContinuo && !personalizadoAguardandoMedico) {
    return null;
  }

  const est = planoContinuo?.estimativa;
  const comp = planoContinuo?.composicao;

  const inclusoesPlano = {
    consultas: est?.consultasIncluidas ?? 0,
    aplicacoes: est?.numeroAplicacoes ?? 0,
    bioimpedancias: est?.bioimpedanciasIncluidas ?? 0,
    exames: est && est.examesIncluidos > 0 ? est.examesIncluidos : null,
    doseTotalMg: est?.quantidadeMedicacaoMg ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-900">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16 space-y-6">
        {branding?.logoUrl && (
          <header className="flex justify-center pt-2">
            <img
              src={branding.logoUrl}
              alt={branding.publicName || 'Logo'}
              className="h-9 sm:h-11 w-auto max-w-[200px] object-contain"
            />
          </header>
        )}

        <section className="space-y-4">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight text-center">
            Plano terapêutico
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-xl bg-white border border-slate-200/90 px-3 sm:px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Peso atual
              </p>
              <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1 tabular-nums">
                {formatarPesoKg(pesoAtual)}
              </p>
            </div>
            {isPersonalizado && !personalizadoAguardandoMedico && negociacaoAtiva?.parametros ? (
              <>
                <div className="rounded-xl bg-white border border-slate-200/90 px-3 sm:px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Meta
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-teal-800 mt-1 tabular-nums">
                    {formatarMetaKg(negociacaoAtiva.parametros.metaKg)}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200/90 px-3 sm:px-4 py-3 sm:col-span-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Peso alvo
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1 tabular-nums">
                    {pesoAlvo != null ? formatarPesoKg(pesoAlvo) : '—'}
                  </p>
                </div>
              </>
            ) : isPersonalizado && personalizadoAguardandoMedico ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200/90 px-3 sm:px-4 py-3 sm:col-span-3">
                <p className="text-sm text-amber-950 leading-relaxed">
                  Converse com seu médico para vocês definirem um plano personalizado para sua meta.
                </p>
              </div>
            ) : !isPersonalizado ? (
              <>
                <div className="rounded-xl bg-white border border-slate-200/90 px-3 sm:px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Sua meta
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-slate-700 mt-1 tabular-nums">
                    {metaPacienteCadastrada != null
                      ? formatarMetaKg(metaPacienteCadastrada)
                      : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200/90 px-3 sm:px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Perda média
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-teal-800 mt-1 tabular-nums">
                    {faixaPerdaPeriodo
                      ? `${faixaPerdaPeriodo.minKg.toFixed(1)}–${faixaPerdaPeriodo.maxKg.toFixed(1)} kg`
                      : formatarMetaKg(perdaPrevistaKg)}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200/90 px-3 sm:px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Estimativa ao fim do período
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1 tabular-nums">
                    {faixaPesoFimPeriodo != null
                      ? `${formatarPesoKg(faixaPesoFimPeriodo.pesoMinKg)} a ${formatarPesoKg(faixaPesoFimPeriodo.pesoMaxKg)}`
                      : pesoPrevistoPeriodo != null
                        ? formatarPesoKg(pesoPrevistoPeriodo)
                        : '—'}
                  </p>
                  {faixaPesoFimPeriodo != null && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Média estimada: {formatarPesoKg(faixaPesoFimPeriodo.pesoMedioKg)}
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <ModalidadeAcompanhamentoCards
            modalidade={modalidade}
            onSelect={handleSelectModalidade}
            inclusoes={inclusoesPlano}
          >
            {!isPersonalizado && (
              <>
                <ControleStepper
                  label="Dose inicial"
                  valorExibido={`${doseMensalMg} mg`}
                  onIncrementar={() =>
                    setDoseMensalMg((d) => avancarDoseDisponivel(dosesDisponiveis, d, 1))
                  }
                  onDecrementar={() =>
                    setDoseMensalMg((d) => avancarDoseDisponivel(dosesDisponiveis, d, -1))
                  }
                  podeIncrementar={
                    avancarDoseDisponivel(dosesDisponiveis, doseMensalMg, 1) !== doseMensalMg
                  }
                  podeDecrementar={
                    avancarDoseDisponivel(dosesDisponiveis, doseMensalMg, -1) !== doseMensalMg
                  }
                  ariaLabelMais="Aumentar dose"
                  ariaLabelMenos="Diminuir dose"
                />

                {(modalidade === 'trimestral' || modalidade === 'semestral') && (
                  <div>
                    <p className="text-sm font-medium text-slate-800 mb-2">Ritmo de evolução</p>
                    <div className="grid grid-cols-2 gap-2">
                      {RITMOS_ESCALONAMENTO.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRitmoEscalonamento(r.id)}
                          className={`rounded-xl border px-3 py-3 text-center transition-colors min-h-[3rem] ${
                            ritmoEscalonamento === r.id
                              ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600/30'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <p
                            className={`text-sm font-semibold ${
                              ritmoEscalonamento === r.id ? 'text-teal-900' : 'text-slate-900'
                            }`}
                          >
                            {r.rotulo}
                          </p>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
                      O ritmo define a velocidade esperada de evolução até os marcos de perda. A
                      meta final permanece a mesma.
                    </p>
                  </div>
                )}
              </>
            )}

            {isPersonalizado && (
              <div className="relative min-h-[3rem]">
                {personalizadoAtualizando && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-white/75 backdrop-blur-[2px]"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-amber-700 shrink-0" aria-hidden />
                    <p className="text-sm text-amber-950">Atualizando proposta…</p>
                  </div>
                )}

                {personalizadoAguardandoMedico && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4">
                    <p className="text-sm text-amber-950 leading-relaxed">
                      Converse com seu médico para definirem juntos um plano personalizado. Quando
                      ele salvar a proposta, os detalhes aparecerão aqui para você aprovar e
                      assinar.
                    </p>
                  </div>
                )}

                {propostaPersonalizadoDisponivel && negociacaoAtiva?.parametros && (
                    <PropostaNegociacaoPacientePanel
                      orcamentoId={orcamentoId}
                      token={token}
                      negociacao={negociacaoAtiva}
                      onAtualizar={(atualizado) => {
                        setNegociacaoLocal(atualizado);
                        setPlano((prev) =>
                          prev
                            ? {
                                ...prev,
                                negociacaoTerapeutica: {
                                  status: atualizado.status,
                                  enviadaEm: atualizado.enviadaEm,
                                  nomePlano: atualizado.nomePlano,
                                  descricaoCurta: atualizado.descricaoCurta,
                                  parametros: atualizado.parametros,
                                  mensagemPaciente: atualizado.mensagemPaciente,
                                  vistaProposta: atualizado.vistaProposta,
                                },
                              }
                            : prev
                        );
                      }}
                    >
                      {planoContinuo ? (
                        <PlanoPersonalizadoPacienteLeitura
                          plano={planoContinuo}
                          parametros={negociacaoAtiva.parametros}
                          pesoAlvo={pesoAlvo}
                        />
                      ) : (
                        <p className="text-sm text-slate-500 py-2">
                          Carregando detalhes do plano personalizado…
                        </p>
                      )}
                    </PropostaNegociacaoPacientePanel>
                  )}
              </div>
            )}
          </ModalidadeAcompanhamentoCards>

          {planoContinuo?.guardrailAplicado && planoContinuo.mensagemGuardrail && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {planoContinuo.mensagemGuardrail}
            </p>
          )}
        </section>

        {!personalizadoAguardandoMedico && resumo && (
        <section className="rounded-xl bg-white/80 border border-slate-200/80 px-4 py-3">
          <ResumoDinamicoChain
            prazo={formatarPrazoMeses(resumo.prazoMeses, { usarClampSlider: false })}
            perdaSemanalMin={resumo.perdaSemanalMinKg}
            perdaSemanalMax={resumo.perdaSemanalMaxKg}
            doseTotal={`${resumo.doseTotalMg.toFixed(0)} mg`}
            aplicacoes={resumo.aplicacoes}
            consultas={resumo.consultas}
          />
        </section>
        )}

        {!personalizadoAguardandoMedico && planoContinuo && (
        <section className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Estimativa de Evolução do Tratamento
          </h2>
          <PlanoTerapeuticoGraficoPrevisto
            dados={dadosGrafico}
            chartId={orcamentoId}
            rotuloLinhaAlvo={isPersonalizado ? 'Meta do plano terapêutico' : 'Meta do período'}
            marcosClinicos={marcosGrafico}
            fases={planoContinuo.fases}
          />
        </section>
        )}

        {!personalizadoAguardandoMedico && planoContinuo && comp && (
        <section className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">Investimento</h2>
          {modalidade === 'trimestral' &&
            (configuracaoComercial?.descontoPlanoTrimestralPercentual ?? 0) > 0 && (
              <p className="text-xs text-teal-700 mt-1">
                −{configuracaoComercial.descontoPlanoTrimestralPercentual}% trimestral
              </p>
            )}
          {modalidade === 'semestral' &&
            (configuracaoComercial?.descontoPlanoSemestralPercentual ?? 0) > 0 && (
              <p className="text-xs text-teal-700 mt-1">
                −{configuracaoComercial.descontoPlanoSemestralPercentual}% semestral
              </p>
            )}
          <p className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-3 tracking-tight tabular-nums">
            {formatarMoedaBRL(planoContinuo.valorTotal)}
          </p>

          <button
            type="button"
            onClick={() => setComposicaoAberta((v) => !v)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Composição
            <ChevronDown
              className={`w-4 h-4 transition-transform ${composicaoAberta ? 'rotate-180' : ''}`}
            />
          </button>

          {composicaoAberta && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-0">
              {[
                { titulo: 'Medicação', valor: comp.custoMedicacaoLiquido },
                { titulo: 'Consultas', valor: comp.consultasAcompanhamento },
                { titulo: 'Bioimpedância', valor: comp.bioimpedancia },
                { titulo: LABEL_ANALISE_EXAMES, valor: comp.exames },
                { titulo: 'Aplicações (kits)', valor: comp.custoKits },
                { titulo: 'Outros', valor: comp.outrosCustos },
                ...(comp.margem > 0 ? [{ titulo: 'Margem', valor: comp.margem }] : []),
                ...(comp.descontoManual > 0
                  ? [{ titulo: 'Descontos', valor: -comp.descontoManual }]
                  : []),
                ...(comp.descontoMedicacaoVolume > 0
                  ? [
                      {
                        titulo: 'Ajuste na medicação (volume)',
                        valor: -comp.descontoMedicacaoVolume,
                      },
                    ]
                  : []),
              ].map((linha) => (
                <div
                  key={linha.titulo}
                  className="flex justify-between gap-3 py-2.5 text-sm border-b border-slate-50 last:border-0"
                >
                  <span className="text-slate-600">{linha.titulo}</span>
                  <span className="font-medium text-slate-800 tabular-nums">
                    {formatarMoedaBRL(linha.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {!personalizadoAguardandoMedico && (
        <section className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <FileSignature className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Confirmar plano terapêutico</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Ao confirmar, você registra sua escolha de plano e autoriza o início do tratamento
                conforme apresentado nesta página.
              </p>
            </div>
          </div>

          {planoJaAceito ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                Plano assinado digitalmente com sucesso
              </div>
              {plano?.pacienteAssinaturaNome ? (
                <p className="text-sm text-emerald-900">{plano.pacienteAssinaturaNome}</p>
              ) : null}
              {plano?.escolhaPaciente ? (
                <p className="text-xs text-emerald-800">
                  Plano escolhido: {plano.escolhaPaciente.rotuloExibicao} ·{' '}
                  {formatarMoedaBRL(plano.escolhaPaciente.valorTotal)}
                </p>
              ) : null}
              {(plano?.pdfFinalAssinadoUrl || plano?.pdfUrl) ? (
                <button
                  type="button"
                  onClick={() =>
                    openPlanoTerapeuticoPdfUrl(plano.pdfFinalAssinadoUrl || plano.pdfUrl!)
                  }
                  className="mt-2 text-sm font-medium text-teal-700 hover:text-teal-900 underline"
                >
                  Ver PDF do plano assinado
                </button>
              ) : null}
            </div>
          ) : planoAguardandoEasySign ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                {sincronizandoAssinatura ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                ) : (
                  <FileSignature className="w-4 h-4 shrink-0" aria-hidden />
                )}
                Assinatura digital pendente
              </div>
              <p className="text-sm text-indigo-800 leading-relaxed">
                Conclua a assinatura digital na janela aberta. Ao finalizar, esta página será
                atualizada automaticamente.
              </p>
              {erroAssinatura ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {erroAssinatura}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleContinuarAssinatura()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                Assinar contrato digitalmente
              </button>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={termosAceitos}
                  onChange={(e) => setTermosAceitos(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  Li e concordo com o plano terapêutico personalizado apresentado, incluindo prazo,
                  investimento e estimativas de evolução.
                </span>
              </label>

              {erroAssinatura ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {erroAssinatura}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleAssinarPlano()}
                disabled={aceitando || !planoContinuo || !pdfContext}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                {aceitando ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <FileSignature className="w-4 h-4" aria-hidden />
                )}
                {aceitando ? 'Preparando assinatura…' : 'Assinar contrato digitalmente'}
              </button>
            </>
          )}
        </section>
        )}
      </main>
    </div>
  );
}
