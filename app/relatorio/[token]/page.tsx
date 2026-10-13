'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Activity, CalendarDays, Circle, Copy, CreditCard, FileText, FlaskConical, Image as ImageIcon, Instagram, Mail, MapPin, MessageCircle, Percent, Phone, Pill, Printer, Scale, Share2, Stethoscope, Syringe, TrendingDown, User, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { resolveOrganizationShellLogoUrl } from '@/lib/organization/resolveOrganizationShellLogoUrl';
import {
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_TEXT,
  DEFAULT_PUBLIC_PAGE_LOGO_SRC,
} from '@/lib/whiteLabel/publicPagesTheme';
import { EvolucaoTratamentoChart } from '@/components/EvolucaoTratamentoChart';
import { BioImpedanciaDisplay } from '@/components/bodymap/BioImpedanciaDisplay';
import { LabStatusLegend } from '@/components/LabResultCard';
import { ModalResultadoTratamento } from '@/components/paciente/ModalResultadoTratamento';
import { ProtocoloGraficoBadge } from '@/components/paciente/ProtocoloGraficoBadge';
import ProfissionalExamesPacienteTab from '@/components/profissional/exames/ProfissionalExamesPacienteTab';
import { ExamesImagemPacientePanel } from '@/components/metaadmin/ExamesImagemPacientePanel';
import PrescricoesPacienteTab from '@/components/meta/PrescricoesPacienteTab';
import PublicDoctorDepoimentos from '@/components/drprovisorio/PublicDoctorDepoimentos';
import { SeloVerificadoInstagram } from '@/components/drprovisorio/seloVerificado';
import {
  ControleFinanceiroPacientePanel,
  pagamentoVazioParaPaciente,
} from '@/components/profissional/ControleFinanceiroPacientePanel';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Prescricao } from '@/types/prescricao';
import type { SolicitacaoExamesSalva } from '@/utils/solicitacaoExamesPdfDownload';
import type { MedicoPerfilRelatorio } from '@/utils/relatorioPacientePdf';
import {
  downloadRelatorioImpressaoPdf,
  type RelatorioImpressaoSecao,
} from '@/utils/relatorioImpressaoPdf';
import { buildDepoimentoResultadoFromPaciente } from '@/utils/buildDepoimentoResultadoFromPaciente';
import { listarProtocolosTirzepatida, totalMgRealizadoProtocolo } from '@/utils/tirzepatidaProtocoloDisplay';
import { MedidasCorporaisResumo } from '@/components/paciente/MedidasCorporaisResumo';
import { calcMetaProgressPct } from '@/lib/paciente/metaProgresso';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { DEFAULT_WHITE_LABEL_PRIMARY_COLOR } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { gerarSlugDrMedico } from '@/utils/medicoDrSlug';

/** Logo oficial da organização (escura, para fundo claro). */
const RELATORIO_ORGANIZATION_LOGO_SRC = resolveOrganizationShellLogoUrl(null, {
  darkBackground: false,
  fallbackSrc: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
});

type ExamesAba = 'laboratoriais' | 'imagens' | 'historico';
type PacienteInfoAba = 'info' | 'endereco' | 'tratamento' | 'medidas';
type RelatorioSecaoAba = 'evolucao' | 'bio' | 'exames' | 'financeiro';

function getStatusLabel(s?: string): string {
  switch (s) {
    case 'em_tratamento':
      return 'Em tratamento';
    case 'concluido':
      return 'Concluído';
    case 'abandono':
      return 'Abandono';
    default:
      return 'Pendente';
  }
}

function getStatusClass(s?: string): string {
  switch (s) {
    case 'em_tratamento':
      return 'bg-emerald-100 text-emerald-800';
    case 'concluido':
      return 'bg-sky-100 text-sky-800';
    case 'abandono':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

function calcIdadeAnos(data: unknown): number | null {
  if (!data) return null;
  try {
    const d = data instanceof Date ? data : new Date(data as string | number);
    if (isNaN(d.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - d.getFullYear();
    const mes = hoje.getMonth() - d.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < d.getDate())) idade--;
    return idade > 0 ? idade : null;
  } catch {
    return null;
  }
}

function iniciaisNome(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getSexoLabel(s?: string): string {
  if (!s) return '-';
  if (s === 'M') return 'Masculino';
  if (s === 'F') return 'Feminino';
  return s;
}

function formatData(str: string | undefined): string {
  if (!str) return '-';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '-';
  }
}

function formatMgRelatorio(total: number): string {
  const rounded = Math.round(total * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
}

function resumoTratamentoPorProtocolos(paciente: PacienteCompleto) {
  return listarProtocolosTirzepatida(paciente).map((proto) => {
    const d = buildDepoimentoResultadoFromPaciente(paciente, 0, '', {
      protocoloIndice: proto.indice,
    });
    return {
      indice: proto.indice,
      ativo: proto.ativo,
      perdaKg: d.perdaTotalKg,
      perdaCm: d.perdaAbdominalCm,
      totalMg: totalMgRealizadoProtocolo(paciente, proto),
    };
  });
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function RelatorioInfoCell({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100${className ? ` ${className}` : ''}`}
    >
      <dt className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-700/80" aria-hidden />
        {label}
      </dt>
      <dd className="break-all text-sm font-semibold leading-tight text-slate-900">{value}</dd>
    </div>
  );
}

function ResultMetricCard({
  label,
  value,
  sideLabel,
  sideValue,
  icon: Icon,
  pct,
  pageBg,
  accentColor,
}: {
  label: string;
  value: string;
  sideLabel?: string;
  sideValue?: string | null;
  icon: LucideIcon;
  pct?: number | null;
  pageBg: string;
  accentColor: string;
}) {
  const pctLabel =
    pct != null && Number.isFinite(pct) ? `${Math.round(Math.min(100, Math.max(0, pct)))}%` : '—';
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-3 shadow-sm sm:px-3">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: pageBg, color: accentColor }}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {sideValue ? (
          <div className="flex min-w-0 flex-col sm:min-h-[2.5rem] sm:flex-row sm:items-stretch">
            <div className="min-w-0 flex-1 sm:pr-2">
              <p className="text-[11px] font-medium leading-snug text-gray-500 sm:text-[12px]">{label}</p>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums leading-tight text-gray-900 sm:text-[16px]">
                {value}
              </p>
            </div>
            <div
              className="my-2 h-px w-full shrink-0 bg-gray-200 sm:mx-0.5 sm:my-0 sm:h-auto sm:w-px sm:self-stretch"
              aria-hidden
            />
            <div className="min-w-0 flex-1 sm:pl-2">
              <p className="text-[11px] font-medium leading-snug text-gray-500 sm:text-[12px]">
                {sideLabel || 'Meta'}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums leading-tight text-gray-900 sm:text-[16px]">
                {sideValue}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-medium leading-snug text-gray-500 sm:text-[12px]">{label}</p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums leading-tight text-gray-900 sm:text-[16px]">
              {value}
            </p>
          </>
        )}
      </div>
      {pct !== undefined ? (
        <div
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full"
          style={{ backgroundColor: pageBg, color: accentColor }}
          title="Porcentagem da meta"
        >
          <span className="text-[8px] font-semibold uppercase tracking-wide opacity-70">Meta</span>
          <span className="text-[12px] font-bold tabular-nums leading-none">{pctLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function RelatorioPacientePage() {
  const params = useParams();
  const token = params?.token as string | undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    paciente: PacienteCompleto;
    medicoPerfil: MedicoPerfilRelatorio | null;
    pagamento: PagamentoPaciente | null;
    prescricoes: Prescricao[];
    solicitacoesExames: SolicitacaoExamesSalva[];
    pacienteFotoPerfilUrl: string | null;
  } | null>(null);
  const [showProtocoloMenu, setShowProtocoloMenu] = useState(false);
  const [protocoloIndice, setProtocoloIndice] = useState(1);
  const [showResultado, setShowResultado] = useState(false);
  const [examesAba, setExamesAba] = useState<ExamesAba>('laboratoriais');
  const [pacienteInfoAba, setPacienteInfoAba] = useState<PacienteInfoAba>('info');
  const [secaoAba, setSecaoAba] = useState<RelatorioSecaoAba>('evolucao');
  const [isMobile, setIsMobile] = useState(false);
  const [showModalEvolucao, setShowModalEvolucao] = useState(false);
  const [evolucaoEscolhida, setEvolucaoEscolhida] = useState<boolean | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [showModalImprimir, setShowModalImprimir] = useState(false);
  const [imprimindoSecao, setImprimindoSecao] = useState<RelatorioImpressaoSecao | null>(null);
  const [erroImpressao, setErroImpressao] = useState<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('relatorio-app-lock');
    return () => html.classList.remove('relatorio-app-lock');
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }
    fetch(`/api/relatorio-paciente/${token}/dados`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Link não encontrado ou expirado.' : 'Erro ao carregar relatório.');
        }
        return res.json();
      })
      .then((body) => {
        setData({
          paciente: body.paciente,
          medicoPerfil: body.medicoPerfil,
          pagamento: body.pagamento ?? null,
          prescricoes: body.prescricoes ?? [],
          solicitacoesExames: body.solicitacoesExames ?? [],
          pacienteFotoPerfilUrl: body.pacienteFotoPerfilUrl ?? null,
        });
      })
      .catch((err) => setError(err.message || 'Erro ao carregar.'))
      .finally(() => setLoading(false));
  }, [token]);

  const protocolos = useMemo(
    () => (data?.paciente ? listarProtocolosTirzepatida(data.paciente) : []),
    [data?.paciente]
  );

  useEffect(() => {
    if (!data?.paciente) return;
    const last = protocolos[protocolos.length - 1]?.indice ?? 1;
    setProtocoloIndice(last);
    setShowProtocoloMenu(false);
  }, [data?.paciente?.id]);

  const resultado = useMemo(() => {
    if (!data?.paciente) return null;
    return buildDepoimentoResultadoFromPaciente(data.paciente, 0, '', { protocoloIndice });
  }, [data?.paciente, protocoloIndice]);

  const historicoInicial = useMemo(
    () =>
      data
        ? { prescricoes: data.prescricoes, solicitacoes: data.solicitacoesExames }
        : undefined,
    [data]
  );

  const linkIndicacao = useMemo(() => {
    const slugMedico = data?.medicoPerfil?.slug || gerarSlugDrMedico(data?.medicoPerfil?.nome || '');
    const slugPaciente = gerarSlugDrMedico(
      (data?.paciente?.dadosIdentificacao?.nomeCompleto || data?.paciente?.nome || '').trim()
    );
    if (!slugMedico || !slugPaciente) return null;
    return `/dr/${slugMedico}/paciente/${slugPaciente}`;
  }, [data?.medicoPerfil?.slug, data?.medicoPerfil?.nome, data?.paciente]);

  const executarAcaoLink = useCallback(
    (comEvolucao: boolean, acao: 'copiar' | 'whatsapp') => {
      if (!linkIndicacao) return;
      const path = comEvolucao
        ? `${linkIndicacao}${linkIndicacao.includes('?') ? '&' : '?'}evolucao=1`
        : linkIndicacao;
      const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
      const tituloMedico = data?.medicoPerfil?.genero === 'F' ? 'Dra.' : 'Dr.';
      const medicoNome = data?.medicoPerfil?.nome || '';
      const medicoLabel = medicoNome ? `${tituloMedico} ${medicoNome}` : 'médico';
      const msgComEvolucao = `Oi! Tudo bem?

Queria te indicar o método que usei para emagrecer. Fiz meu tratamento com ${medicoLabel} do *Método Emagrecer*, dentro do sistema da Oftware, e tive um resultado muito bom.

Nesse link você consegue ver também *meu histórico de evolução no tratamento*, como peso inicial e progresso ao longo do tempo:

${url}

Se você estiver pensando em cuidar do peso ou da saúde metabólica, vale a pena conhecer. Depois me conta o que achou 🙂`;
      const msgSemEvolucao = `Oi! Tudo bem?

Queria te indicar o *Método Emagrecer*, que foi o tratamento que usei para perder peso com acompanhamento médico pela plataforma da Oftware.

Nesse link você consegue entender como funciona o método e, se quiser, iniciar o processo com um médico:

${url}

Achei muito organizado e sério. Se tiver interesse, dá uma olhada 🙂`;
      const msg = comEvolucao ? msgComEvolucao : msgSemEvolucao;
      if (acao === 'copiar') {
        void navigator.clipboard.writeText(url).then(() => {
          setLinkCopiado(true);
          window.setTimeout(() => setLinkCopiado(false), 2500);
        }).catch(() => {});
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
      setShowModalEvolucao(false);
      setEvolucaoEscolhida(null);
    },
    [linkIndicacao, data?.medicoPerfil?.genero, data?.medicoPerfil?.nome]
  );

  const handleCompartilharMedico = useCallback(() => {
    if (!linkIndicacao) return;
    setEvolucaoEscolhida(null);
    setShowModalEvolucao(true);
  }, [linkIndicacao]);

  const handleImprimirSecao = useCallback(
    async (secao: RelatorioImpressaoSecao) => {
      if (!data || imprimindoSecao) return;
      setImprimindoSecao(secao);
      setErroImpressao(null);
      try {
        await downloadRelatorioImpressaoPdf({
          secao,
          paciente: data.paciente,
          medico: data.medicoPerfil,
          pagamento: data.pagamento,
          prescricoes: data.prescricoes,
          solicitacoesExames: data.solicitacoesExames,
          protocoloIndice,
          logoSrc: RELATORIO_ORGANIZATION_LOGO_SRC,
          token,
        });
        setShowModalImprimir(false);
      } catch (err) {
        console.error(err);
        setErroImpressao('Não foi possível gerar o PDF. Tente de novo.');
      } finally {
        setImprimindoSecao(null);
      }
    },
    [data, imprimindoSecao, protocoloIndice, token]
  );

  if (loading) {
    return (
      <div className="relatorio-app-shell min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="relatorio-app-shell min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-medium mb-2">Não foi possível exibir o relatório</p>
          <p className="text-gray-600">{error || 'Dados não disponíveis.'}</p>
        </div>
      </div>
    );
  }

  const p = data.paciente;
  const medico = data.medicoPerfil;
  const tituloMedico = medico?.genero === 'F' ? 'Dra.' : 'Dr.';
  const medicoNome = medico?.nome || 'Médico';
  const crm =
    medico?.crm?.estado && medico?.crm?.numero ? `CRM-${medico.crm.estado} ${medico.crm.numero}` : '';
  const tratamentosPorProtocolo = resumoTratamentoPorProtocolos(p);
  const bioRegistros =
    ((p as PacienteCompleto & { bioimpedanciaRegistros?: BioImpedanciaRegistro[] }).bioimpedanciaRegistros) ||
    [];
  const sexoBio = p.dadosIdentificacao?.sexoBiologico;
  const imagemSrcBio =
    sexoBio === 'F' ? '/bioimpedancia/mulher-frente.png' : '/bioimpedancia/homem-frente.png';
  const imageAltBio = sexoBio === 'F' ? 'Body map feminino' : 'Body map masculino';
  const nome = (p.dadosIdentificacao?.nomeCompleto || p.nome || '').trim();
  const email = (p.dadosIdentificacao?.email || p.email || '').trim();
  const tel = (p.dadosIdentificacao?.telefone || '').trim();
  const cpf = (p.dadosIdentificacao?.cpf || '').trim();
  const sexo = getSexoLabel(p.dadosIdentificacao?.sexoBiologico);
  const cidade = (p.dadosIdentificacao?.endereco?.cidade || '').trim();
  const estado = (p.dadosIdentificacao?.endereco?.estado || '').trim();
  const status = getStatusLabel(p.statusTratamento);
  const statusClass = getStatusClass(p.statusTratamento);
  const idadeAnos = calcIdadeAnos(p.dadosIdentificacao?.dataNascimento);
  const fotoPaciente = data.pacienteFotoPerfilUrl?.trim() || null;
  const iniciais = iniciaisNome(nome || 'Paciente');
  const dataNascStr = formatData(
    typeof p.dadosIdentificacao?.dataNascimento === 'string'
      ? p.dadosIdentificacao.dataNascimento
      : p.dadosIdentificacao?.dataNascimento
        ? new Date(p.dadosIdentificacao.dataNascimento as Date).toISOString()
        : undefined
  );
  const mostrarSeletorProtocolo = protocolos.length > 1;
  const d = resultado;
  const pageBg = medico?.pageBg || DEFAULT_DR_PAGE_BACKGROUND;
  const pageText = medico?.pageText || DEFAULT_DR_PAGE_TEXT;
  const accentColor = medico?.primaryColor || DEFAULT_WHITE_LABEL_PRIMARY_COLOR;
  const medicoWa = medico?.telefone
    ? buildWhatsappUrl({
        telefone: medico.telefone,
        telefoneDdi: medico.telefoneDdi,
        telefonePais: medico.telefonePais,
      })
    : null;
  const instagramUsuario = medico?.instagramUsuario?.trim() || null;
  const instagramUrl = instagramUsuario
    ? `https://www.instagram.com/${encodeURIComponent(instagramUsuario)}/`
    : null;
  const alturaCm = p.dadosClinicos?.medidasIniciais?.altura;
  const alturaM = alturaCm != null && Number(alturaCm) > 0 ? Number(alturaCm) / 100 : null;
  const imcInicialMedida = p.dadosClinicos?.medidasIniciais?.imc;
  const imcInicial =
    imcInicialMedida != null && imcInicialMedida > 0
      ? imcInicialMedida
      : d?.pesoInicialKg != null && alturaM
        ? d.pesoInicialKg / (alturaM * alturaM)
        : null;
  const imcFinal =
    d?.pesoAtualKg != null && alturaM ? d.pesoAtualKg / (alturaM * alturaM) : null;
  const pctMetaPeso = d
    ? calcMetaProgressPct(
        d.pesoInicialKg != null && d.pesoAtualKg != null ? d.pesoAtualKg - d.pesoInicialKg : null,
        d.metaPesoKgLoss
      )
    : null;
  const pctMetaCirc = d
    ? calcMetaProgressPct(
        d.comprimentoAbdominalInicialCm != null && d.comprimentoAbdominalAtualCm != null
          ? d.comprimentoAbdominalAtualCm - d.comprimentoAbdominalInicialCm
          : null,
        d.metaAbdominalCmLoss
      )
    : null;
  const pctMetaImc = pctMetaPeso;
  const pagamentoInicial = data.pagamento || pagamentoVazioParaPaciente(p.id);
  const tabExamesClass = (ativa: boolean) =>
    `inline-flex min-w-0 flex-1 items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium rounded-t-md border-b-2 -mb-px transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
      ativa
        ? 'border-green-600 text-green-700'
        : 'border-transparent text-gray-600 hover:text-black'
    }`;

  return (
    <div className="relatorio-app-shell min-h-screen bg-white text-gray-900">
      <div className="relatorio-app-scroll min-h-0 flex-1">
      <header
        className="relative isolate overflow-hidden px-4 py-4 sm:py-5"
        style={{
          background: `linear-gradient(165deg, ${pageBg} 0%, ${pageBg}f2 60%, ${pageBg}e6 100%)`,
          color: pageText,
        }}
      >
        <div className="drprov-hero-grid pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            background: `radial-gradient(ellipse 65% 50% at 16% 52%, ${accentColor}, transparent 70%)`,
          }}
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={RELATORIO_ORGANIZATION_LOGO_SRC}
              alt="Método Emagrecer"
              className="h-6 sm:h-7 w-auto max-w-[130px] sm:max-w-[150px] object-contain object-right brightness-0 invert opacity-95"
            />
          </div>

          <div
            className="grid items-start gap-4 sm:gap-5"
            style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}
          >
            <div className="relative h-[130px] w-[130px] shrink-0 sm:h-[148px] sm:w-[148px]">
              {medico?.fotoPerfilUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={medico.fotoPerfilUrl}
                  alt={`${tituloMedico} ${medicoNome}`}
                  className="h-full w-full rounded-full border-[3px] border-white/90 object-cover shadow-lg"
                  style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.28), 0 0 0 3px ${accentColor}50` }}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-white/90 shadow-lg"
                  style={{
                    background: `linear-gradient(145deg, ${accentColor}, #2F8FA3)`,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.28), 0 0 0 3px ${accentColor}50`,
                  }}
                >
                  <Stethoscope className="h-12 w-12 text-white sm:h-14 sm:w-14" strokeWidth={1.75} />
                </div>
              )}
              {medico?.isVerificado ? <SeloVerificadoInstagram ringClassName="ring-transparent" /> : null}
            </div>
            <div className="min-w-0 pt-1">
              <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-tight sm:text-[30px]">
                {tituloMedico} {medicoNome}
              </h1>
              <span
                className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0A1F44]"
                style={{ backgroundColor: accentColor }}
              >
                Médico
              </span>
              {crm ? (
                <p className="mt-2.5 text-[15px] font-medium opacity-85 sm:text-[16px]">{crm}</p>
              ) : (
                <p className="mt-2.5 text-[15px] font-medium opacity-50 sm:text-[16px]">Médico responsável</p>
              )}
            </div>
          </div>

          {linkIndicacao || medico?.id || medicoWa || medico?.telefone || instagramUrl ? (
            <div className="mt-4 flex items-center gap-2 sm:justify-center">
              {linkIndicacao ? (
                <button
                  type="button"
                  onClick={handleCompartilharMedico}
                  className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[#0A1F44] shadow-sm transition hover:opacity-95 sm:flex-none sm:px-3 sm:text-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  <Share2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Compartilhar o médico</span>
                </button>
              ) : null}
              {medico?.id ? (
                <PublicDoctorDepoimentos
                  medicoId={medico.id}
                  accentColor={accentColor}
                  pageBg={pageBg}
                  variant="headerButton"
                />
              ) : null}
              {medicoWa ? (
                <a
                  href={medicoWa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-0 text-xs font-bold text-[#0A1F44] shadow-sm transition hover:opacity-95 md:w-auto md:px-3 md:text-sm"
                  style={{ backgroundColor: accentColor }}
                  aria-label="Falar pelo WhatsApp"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">WhatsApp</span>
                </a>
              ) : medico?.telefone ? (
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-0 text-xs font-bold md:w-auto md:px-3 md:text-sm"
                  style={{ backgroundColor: accentColor, color: '#0A1F44' }}
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">WhatsApp</span>
                </span>
              ) : null}
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-0 text-xs font-bold text-[#0A1F44] shadow-sm transition hover:opacity-95 md:w-auto md:px-3 md:text-sm"
                  style={{ backgroundColor: accentColor }}
                  aria-label="Abrir Instagram do médico"
                  title="Instagram"
                >
                  <Instagram className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="hidden md:inline">Instagram</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-2 py-4 sm:space-y-6 sm:px-4 sm:py-6">
        <h2
          className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold text-[#0A1F44] shadow-sm sm:text-lg"
          style={{ backgroundColor: accentColor }}
        >
          <FileText className="h-5 w-5 shrink-0" aria-hidden />
          Relatório Médico
        </h2>

        <section
          className="animate-fade-in sm:rounded-xl sm:border sm:border-slate-200 sm:bg-slate-50/50 sm:p-5 sm:shadow-sm"
          style={{ animationDelay: '0.05s', animationFillMode: 'both' } as React.CSSProperties}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-white bg-emerald-50 shadow-md sm:h-20 sm:w-20">
              {fotoPaciente ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoPaciente}
                  alt={nome || 'Paciente'}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800">
                  {iniciais ? (
                    <span className="text-lg font-bold tracking-wide">{iniciais}</span>
                  ) : (
                    <User className="h-8 w-8" strokeWidth={1.75} />
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
                {nome || 'Paciente'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {idadeAnos != null ? `${idadeAnos} ${idadeAnos === 1 ? 'ano' : 'anos'}` : 'Idade não informada'}
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none ${statusClass}`}
              >
                {status}
              </span>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex min-w-0 border-b border-slate-200">
              {(
                [
                  { id: 'info' as const, label: 'Info' },
                  { id: 'endereco' as const, label: 'Endereço' },
                  { id: 'tratamento' as const, label: 'Tratamento' },
                  { id: 'medidas' as const, label: 'Medidas' },
                ] as const
              ).map((tab, idx) => {
                const ativa = pacienteInfoAba === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPacienteInfoAba(tab.id)}
                    className={`flex min-w-0 flex-1 items-center justify-center px-0.5 py-2.5 text-[10px] font-semibold whitespace-nowrap transition-colors sm:px-1 sm:text-[12px] ${
                      idx > 0 ? 'border-l border-slate-200' : ''
                    } ${
                      ativa
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {pacienteInfoAba === 'info' ? (
              <dl className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                <RelatorioInfoCell
                  className="col-span-2 sm:col-span-1"
                  icon={Mail}
                  label="E-mail"
                  value={email || '-'}
                />
                <RelatorioInfoCell icon={Phone} label="Tel" value={tel || '-'} />
                <RelatorioInfoCell icon={CreditCard} label="CPF" value={cpf || '-'} />
                <RelatorioInfoCell icon={CalendarDays} label="Nascimento" value={dataNascStr} />
                <RelatorioInfoCell icon={UserRound} label="Sexo" value={sexo} />
              </dl>
            ) : null}

            {pacienteInfoAba === 'endereco' ? (
              <dl className="grid grid-cols-2 gap-2 p-3">
                <RelatorioInfoCell icon={MapPin} label="Cidade" value={cidade || '-'} />
                <RelatorioInfoCell icon={MapPin} label="Estado" value={estado || '-'} />
              </dl>
            ) : null}

            {pacienteInfoAba === 'tratamento' ? (
              <div className="space-y-2.5 p-3">
                {tratamentosPorProtocolo.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem protocolo cadastrado.</p>
                ) : (
                  tratamentosPorProtocolo.map((t) => (
                    <div
                      key={t.indice}
                      className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100"
                    >
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                        <Syringe className="h-3.5 w-3.5" aria-hidden />
                        Protocolo {t.indice}
                        {t.ativo ? (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-emerald-800">
                            atual
                          </span>
                        ) : null}
                      </p>
                      <dl className="grid grid-cols-3 gap-2">
                        <RelatorioInfoCell
                          icon={Scale}
                          label="Perda kg"
                          value={t.perdaKg != null ? `${t.perdaKg.toFixed(1)} kg` : '-'}
                        />
                        <RelatorioInfoCell
                          icon={Circle}
                          label="Perda cm"
                          value={t.perdaCm != null ? `${t.perdaCm.toFixed(1)} cm` : '-'}
                        />
                        <RelatorioInfoCell
                          icon={Syringe}
                          label="Mg"
                          value={t.totalMg > 0 ? `${formatMgRelatorio(t.totalMg)} mg` : '-'}
                        />
                      </dl>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {pacienteInfoAba === 'medidas' ? (
              <div className="p-3">
                <MedidasCorporaisResumo paciente={p} ativo />
              </div>
            ) : null}
          </div>
        </section>

        <section
          className="animate-fade-in overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' } as React.CSSProperties}
        >
          <div className="flex min-w-0 border-b border-slate-200">
            {(
              [
                { id: 'evolucao' as const, label: 'Evolução' },
                { id: 'bio' as const, label: 'Bio' },
                { id: 'exames' as const, label: 'Exames' },
                { id: 'financeiro' as const, label: 'Financeiro' },
              ] as const
            ).map((tab, idx) => {
              const ativa = secaoAba === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSecaoAba(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center px-0.5 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors sm:px-1 sm:text-[12px] ${
                    idx > 0 ? 'border-l border-slate-200' : ''
                  } ${
                    ativa ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {secaoAba === 'evolucao' ? (
            <div>
              {d && (d.evolucao.length > 0 || d.pesoInicialKg != null) ? (
                <>
                  {mostrarSeletorProtocolo ? (
                    <div className="mb-2 flex items-center justify-end px-2 pt-2">
                      <ProtocoloGraficoBadge
                        className="relative z-10 shrink-0"
                        protocolos={protocolos}
                        protocoloIndice={protocoloIndice}
                        menuAberto={showProtocoloMenu}
                        onToggle={() => setShowProtocoloMenu((v) => !v)}
                        onSelect={(indice) => {
                          setProtocoloIndice(indice);
                          setShowProtocoloMenu(false);
                        }}
                      />
                    </div>
                  ) : null}
                  {d.evolucao.length > 0 ? (
                    <div className={`relative mb-4 px-2 ${mostrarSeletorProtocolo ? '' : 'pt-2'}`}>
                      <EvolucaoTratamentoChart
                        evolucao={d.evolucao}
                        pacienteId={d.pacienteId || p.id}
                        invertedModal={false}
                        hideTitle
                        compact
                      />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:gap-3 sm:px-5 sm:pb-5">
                    <ResultMetricCard
                      label="Peso inicial"
                      value={d.pesoInicialKg != null ? `${d.pesoInicialKg.toFixed(1)} kg` : '—'}
                      sideLabel="Meta"
                      sideValue={
                        d.metaPesoKgLoss != null && d.metaPesoKgLoss > 0
                          ? `−${d.metaPesoKgLoss.toFixed(1).replace(/\.0$/, '')} kg`
                          : null
                      }
                      icon={Scale}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                    <ResultMetricCard
                      label="Peso final"
                      value={d.pesoAtualKg != null ? `${d.pesoAtualKg.toFixed(1)} kg` : '—'}
                      sideLabel="Diferença"
                      sideValue={
                        d.pesoInicialKg != null && d.pesoAtualKg != null
                          ? `${d.pesoAtualKg - d.pesoInicialKg > 0 ? '+' : d.pesoAtualKg - d.pesoInicialKg < 0 ? '−' : ''}${Math.abs(d.pesoAtualKg - d.pesoInicialKg).toFixed(1)} kg`
                          : null
                      }
                      icon={Scale}
                      pct={pctMetaPeso}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                    <ResultMetricCard
                      label="Circunferência inicial"
                      value={
                        d.comprimentoAbdominalInicialCm != null
                          ? `${d.comprimentoAbdominalInicialCm.toFixed(1)} cm`
                          : '—'
                      }
                      sideLabel="Meta"
                      sideValue={
                        d.metaAbdominalCmLoss != null && d.metaAbdominalCmLoss > 0
                          ? `−${d.metaAbdominalCmLoss.toFixed(1).replace(/\.0$/, '')} cm`
                          : null
                      }
                      icon={Circle}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                    <ResultMetricCard
                      label="Circunferência final"
                      value={
                        d.comprimentoAbdominalAtualCm != null
                          ? `${d.comprimentoAbdominalAtualCm.toFixed(1)} cm`
                          : '—'
                      }
                      sideLabel="Diferença"
                      sideValue={
                        d.comprimentoAbdominalInicialCm != null && d.comprimentoAbdominalAtualCm != null
                          ? `${d.comprimentoAbdominalAtualCm - d.comprimentoAbdominalInicialCm > 0 ? '+' : d.comprimentoAbdominalAtualCm - d.comprimentoAbdominalInicialCm < 0 ? '−' : ''}${Math.abs(d.comprimentoAbdominalAtualCm - d.comprimentoAbdominalInicialCm).toFixed(1)} cm`
                          : null
                      }
                      icon={Circle}
                      pct={pctMetaCirc}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                    <ResultMetricCard
                      label="IMC inicial"
                      value={imcInicial != null ? imcInicial.toFixed(1) : '—'}
                      icon={Activity}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                    <ResultMetricCard
                      label="IMC final"
                      value={imcFinal != null ? imcFinal.toFixed(1) : '—'}
                      icon={Activity}
                      pct={pctMetaImc}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                    <ResultMetricCard
                      label="Perda percentual (kg)"
                      value={d.perdaPercentual != null ? `-${d.perdaPercentual.toFixed(1)}%` : '—'}
                      icon={TrendingDown}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                    <ResultMetricCard
                      label="Perda percentual (cm)"
                      value={
                        d.perdaPercentualAbdominal != null
                          ? `-${d.perdaPercentualAbdominal.toFixed(1)}%`
                          : '—'
                      }
                      icon={Percent}
                      pageBg={pageBg}
                      accentColor={accentColor}
                    />
                  </div>
                </>
              ) : (
                <p className="px-3 py-6 text-center text-sm text-slate-500">Sem evolução registrada.</p>
              )}
            </div>
          ) : null}

          {secaoAba === 'bio' ? (
            <div className="p-2 sm:p-3">
              <BioImpedanciaDisplay
                paciente={p}
                registros={bioRegistros}
                imagemSrc={imagemSrcBio}
                imageAlt={imageAltBio}
                modoNutricionista
                isMobile={isMobile}
                permitirEdicaoRegistro={false}
              />
            </div>
          ) : null}

          {secaoAba === 'exames' ? (
            <div className="p-3 sm:p-5">
              <div className="mb-4 flex flex-nowrap gap-0 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setExamesAba('laboratoriais')}
                  className={tabExamesClass(examesAba === 'laboratoriais')}
                >
                  <FlaskConical className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">Laboratoriais</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExamesAba('imagens')}
                  className={tabExamesClass(examesAba === 'imagens')}
                >
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">Imagem</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExamesAba('historico')}
                  className={tabExamesClass(examesAba === 'historico')}
                  aria-label="Histórico de prescrições e exames"
                >
                  <Pill className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">Histórico</span>
                </button>
              </div>

              {examesAba === 'laboratoriais' ? (
                <>
                  <ProfissionalExamesPacienteTab paciente={p} hideImagemTab />
                  <LabStatusLegend className="mt-3" />
                </>
              ) : null}

              {examesAba === 'imagens' ? (
                <div className="min-h-[min(70vh,420px)]">
                  <ExamesImagemPacientePanel
                    pacienteId={p.id}
                    nomePacienteProntuario={nome || 'Paciente'}
                    examesDeImagem={p.examesDeImagem}
                    onAdicionarExame={() => {}}
                    onRemoverExame={() => {}}
                    confirmarNomePacienteDoAnexo={async () => true}
                    somenteLeitura
                    layout="datesSplit"
                  />
                </div>
              ) : null}

              {examesAba === 'historico' ? (
                <PrescricoesPacienteTab paciente={p} historicoInicial={historicoInicial} />
              ) : null}
            </div>
          ) : null}

          {secaoAba === 'financeiro' ? (
            <div className="min-h-[28rem] p-3 sm:p-5">
              <ControleFinanceiroPacientePanel
                open
                mode="embedded"
                readOnly
                flushMobile
                paciente={p}
                pagamentoInicial={pagamentoInicial}
                onClose={() => {}}
              />
            </div>
          ) : null}
        </section>

        <div
          className="pt-4 border-t border-slate-200 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'both' } as React.CSSProperties}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResultado(true)}
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg sm:flex-none sm:px-5"
            >
              <Share2 className="w-5 h-5 shrink-0" aria-hidden />
              <span className="truncate">Compartilhar meu resultado</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErroImpressao(null);
                setShowModalImprimir(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 px-4 py-3 bg-white text-slate-800 font-medium rounded-xl border border-slate-300 hover:bg-slate-50 transition-all duration-200 shadow-sm sm:px-5"
            >
              <Printer className="w-5 h-5 shrink-0" aria-hidden />
              Imprimir
            </button>
          </div>
        </div>
      </main>
      </div>

      <ModalResultadoTratamento
        open={showResultado}
        data={d}
        onClose={() => setShowResultado(false)}
        paciente={p}
      />

      {showModalImprimir ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            if (!imprimindoSecao) setShowModalImprimir(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="relatorio-imprimir-titulo"
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="relatorio-imprimir-titulo" className="text-lg font-semibold text-slate-900 mb-1">
              Imprimir relatório
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Escolha o que entra no PDF. O arquivo traz o cabeçalho do médico, os dados do paciente e a seção selecionada.
            </p>
            <div className="flex flex-col gap-2">
              {(
                [
                  { id: 'evolucao', label: 'Evolução' },
                  { id: 'bio', label: 'Bio' },
                  { id: 'exames', label: 'Exames' },
                  { id: 'financeiro', label: 'Financeiro' },
                ] as const
              ).map((opcao) => {
                const gerando = imprimindoSecao === opcao.id;
                return (
                  <button
                    key={opcao.id}
                    type="button"
                    disabled={imprimindoSecao !== null}
                    onClick={() => void handleImprimirSecao(opcao.id)}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-800 rounded-lg font-medium"
                  >
                    {gerando ? 'Gerando PDF...' : opcao.label}
                  </button>
                );
              })}
            </div>
            {erroImpressao ? <p className="mt-3 text-sm text-red-600">{erroImpressao}</p> : null}
            <button
              type="button"
              disabled={imprimindoSecao !== null}
              onClick={() => setShowModalImprimir(false)}
              className="mt-4 w-full px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {showModalEvolucao && linkIndicacao ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            {evolucaoEscolhida !== null ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Como deseja compartilhar?</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => executarAcaoLink(evolucaoEscolhida, 'copiar')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                  >
                    <Copy size={18} /> {linkCopiado ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => executarAcaoLink(evolucaoEscolhida, 'whatsapp')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    <MessageCircle size={18} /> Enviar no WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Compartilhar evolução</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Quer mostrar sua evolução no tratamento para quem você está indicando? Assim a pessoa consegue ver, com números e gráficos, os resultados reais que você está alcançando.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setEvolucaoEscolhida(true)}
                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                  >
                    Sim, quero compartilhar minha evolução
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvolucaoEscolhida(false)}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium"
                  >
                    Não, prefiro não compartilhar agora
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
