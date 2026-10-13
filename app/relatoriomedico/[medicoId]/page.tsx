'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardAbandonmentReasons from '@/components/metaadmin/dashboard/DashboardAbandonmentReasons';
import DashboardAgeDistribution from '@/components/metaadmin/dashboard/DashboardAgeDistribution';
import DashboardWeightEvolution from '@/components/metaadmin/dashboard/DashboardWeightEvolution';
import type { WeightAgeFilter, WeightSexFilter } from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';
import { ChevronLeft, CreditCard, FileText, Instagram, Mail, MapPin, Phone, Stethoscope, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MetodoEmagrecerIcon, { type MetodoEmagrecerIconName } from '@/components/metodo/MetodoEmagrecerIcon';
import PublicDoctorDepoimentos from '@/components/drprovisorio/PublicDoctorDepoimentos';
import { auth } from '@/lib/firebase';
import { isMetaAdminGeralEmail } from '@/lib/meta/anamneseInteligenteGate';
import {
  medicoPodeSerAbertoNoRelatorio,
  resolverMedicoDaSessao,
  sessaoPodeEntrarRelatoriosMedicos,
} from '@/lib/relatorio/relatorioMedicoAcesso';
import { metaAdminGeralAcessarUrl } from '@/lib/metaadmin/metaAdminGeralLogin';
import { buildOrganizationClinicalOutcomeMetrics } from '@/lib/metaadmingeral/buildOrganizationClinicalOutcomeMetrics';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import {
  buildFinanceiroDemografico,
  buildRelatorioMedicoFinanceiro,
  buildRelatorioMedicoPerfil,
  contarStatusPacientes,
  distribuicaoFaixaEtaria,
  type FinanceiroDemoBarra,
} from '@/lib/relatorio/buildRelatorioMedico';
import { resolveOrganizationShellLogoUrl } from '@/lib/organization/resolveOrganizationShellLogoUrl';
import {
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_TEXT,
  DEFAULT_PUBLIC_PAGE_LOGO_SRC,
} from '@/lib/whiteLabel/publicPagesTheme';
import { DEFAULT_WHITE_LABEL_PRIMARY_COLOR, resolveMedicoWhiteLabel } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { SeloVerificadoInstagram } from '@/components/drprovisorio/seloVerificado';
import { MedicoService } from '@/services/medicoService';
import { PacienteService } from '@/services/pacienteService';
import { PagamentoService } from '@/services/pagamentoService';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, VendaAvulsa } from '@/types/pagamento';
import { normalizeMedicoInstagramUsuario } from '@/utils/instagramUsuario';

const LOGO_SRC = resolveOrganizationShellLogoUrl(null, {
  darkBackground: false,
  fallbackSrc: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
});

type Aba = 'estatisticas' | 'financeiro';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMedida(value: number, unidade: string): string {
  const texto = value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `${texto} ${unidade}`;
}

function mesCurto(mesKey: string): string {
  const [ano, mes] = mesKey.split('-').map(Number);
  const nome = MESES_CURTOS[(mes || 1) - 1] || mesKey;
  return `${nome}/${String(ano || '').slice(2)}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100">
      <dt className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-700/80" aria-hidden />
        {label}
      </dt>
      <dd className="break-all text-sm font-semibold leading-tight text-slate-900">{value}</dd>
    </div>
  );
}

function PerfilSexo({
  feminino,
  masculino,
  outro,
  semSexo,
}: {
  feminino: number;
  masculino: number;
  outro: number;
  semSexo: number;
}) {
  const total = feminino + masculino + outro;
  const faixas = [
    { label: 'Feminino', value: feminino, color: '#059669' },
    { label: 'Masculino', value: masculino, color: '#2563eb' },
    { label: 'Outro', value: outro, color: '#7c3aed' },
  ].filter((item) => item.value > 0);

  return (
    <div className="rounded-[18px] border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Sexo</h3>
      {total === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Sem dados de sexo.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {faixas.map((faixa) => (
            <li key={faixa.label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-sm text-slate-600">{faixa.label}</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-2 rounded-full"
                  style={{ width: `${(faixa.value / total) * 100}%`, backgroundColor: faixa.color }}
                />
              </span>
              <span className="w-10 text-right text-sm font-semibold text-slate-900">{faixa.value}</span>
            </li>
          ))}
        </ul>
      )}
      {semSexo > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          {semSexo} paciente{semSexo === 1 ? '' : 's'} sem informação
        </p>
      ) : null}
    </div>
  );
}

function PerfilCidades({
  cidades,
  totalComCidade,
}: {
  cidades: { label: string; quantidade: number }[];
  totalComCidade: number;
}) {
  const cores = ['#0A1F44', '#1e3a5f', '#334155', '#64748b', '#94a3b8'];
  const maior = cidades[0]?.quantidade || 1;

  return (
    <div className="rounded-[18px] border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Cidade</h3>
      {cidades.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nenhuma cidade cadastrada.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {cidades.map((cidade, index) => (
            <li key={cidade.label} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-sm text-slate-600">{cidade.label}</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-2 rounded-full"
                  style={{
                    width: `${(cidade.quantidade / maior) * 100}%`,
                    backgroundColor: cores[index] || cores[cores.length - 1],
                  }}
                />
              </span>
              <span className="w-8 text-right text-sm font-semibold text-slate-900">{cidade.quantidade}</span>
            </li>
          ))}
        </ul>
      )}
      {totalComCidade > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          {totalComCidade} paciente{totalComCidade === 1 ? '' : 's'} com cidade
        </p>
      ) : null}
    </div>
  );
}

function GraficoFinanceiroDemo({ titulo, dados }: { titulo: string; dados: FinanceiroDemoBarra[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{titulo}</h3>
      {dados.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Sem pagamentos de pacientes neste recorte.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados.slice(0, 12)} margin={{ top: 8, right: 8, left: 0, bottom: 56 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="nome"
                interval={0}
                angle={-28}
                textAnchor="end"
                height={64}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)} mil` : String(value))}
              />
              <Tooltip
                formatter={(value) => formatBrl(Number(value ?? 0))}
                contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="vendido" name="Vendido" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recebido" name="Recebido" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="aberto" name="Aberto" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  metodoIcon,
  hint,
}: {
  label: string;
  value: string;
  metodoIcon: MetodoEmagrecerIconName;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-slate-200 bg-white p-3 sm:p-4">
      <MetodoEmagrecerIcon icon={metodoIcon} size={40} />
      <p className="mt-3 text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[26px] font-extrabold leading-none text-slate-900 sm:text-[30px]">{value}</p>
      {hint ? <p className="mt-1.5 text-[12px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function RelatorioMedicoPage() {
  const params = useParams();
  const router = useRouter();
  const medicoId = typeof params?.medicoId === 'string' ? decodeURIComponent(params.medicoId) : '';
  const [authReady, setAuthReady] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [visitanteEmail, setVisitanteEmail] = useState<string | null>(null);
  const [redirecionando, setRedirecionando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);
  const [pacientes, setPacientes] = useState<PacienteCompleto[]>([]);
  const [pagamentos, setPagamentos] = useState<Record<string, PagamentoPaciente>>({});
  const [vendasAvulsas, setVendasAvulsas] = useState<VendaAvulsa[]>([]);
  const [aba, setAba] = useState<Aba>('estatisticas');
  const [filtroDose, setFiltroDose] = useState('todas');
  const [filtroFaixaPeso, setFiltroFaixaPeso] = useState<WeightAgeFilter>('todas');
  const [filtroSexoPeso, setFiltroSexoPeso] = useState<WeightSexFilter>('todos');

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('relatorio-app-lock');
    return () => html.classList.remove('relatorio-app-lock');
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAutorizado(false);
        setRedirecionando(true);
        setAuthReady(true);
        router.replace(metaAdminGeralAcessarUrl(`/relatoriomedico/${encodeURIComponent(medicoId)}`));
        return;
      }
      setRedirecionando(false);
      void (async () => {
        try {
          const email = user.email || null;
          setVisitanteEmail(email);
          const proprio = isMetaAdminGeralEmail(email) ? null : await resolverMedicoDaSessao(user);
          setAutorizado(sessaoPodeEntrarRelatoriosMedicos({ email, medico: proprio }));
        } catch {
          setAutorizado(false);
        } finally {
          setAuthReady(true);
        }
      })();
    });
    return () => unsubscribe();
  }, [medicoId, router]);

  useEffect(() => {
    if (!authReady || !autorizado) return;
    if (!medicoId) {
      setError('Médico não informado.');
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [medicoData, pacientesData, vendasData] = await Promise.all([
          MedicoService.getMedicoById(medicoId),
          PacienteService.getPacientesByMedico(medicoId),
          PagamentoService.getAllVendasAvulsas(medicoId),
        ]);
        if (cancelado) return;
        if (!medicoData) {
          setError('Médico não encontrado.');
          setMedico(null);
          return;
        }
        if (
          !medicoPodeSerAbertoNoRelatorio({
            visitanteEmail,
            alvoVerificado: medicoData.isVerificado === true,
          })
        ) {
          setError('Só é possível entrar no relatório de um médico verificado.');
          setMedico(null);
          return;
        }

        const pagamentosLista = await Promise.all(
          pacientesData.map(async (paciente) => {
            try {
              const pagamento = await PagamentoService.getPagamentoPorPacienteId(paciente.id);
              return pagamento ? ([paciente.id, pagamento] as const) : null;
            } catch {
              return null;
            }
          }),
        );
        if (cancelado) return;

        const pagamentosMap: Record<string, PagamentoPaciente> = {};
        for (const entry of pagamentosLista) {
          if (entry) pagamentosMap[entry[0]] = entry[1];
        }

        setMedico(medicoData);
        setPacientes(pacientesData);
        setVendasAvulsas(vendasData);
        setPagamentos(pagamentosMap);
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar o relatório.');
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [authReady, autorizado, medicoId, visitanteEmail]);

  const status = useMemo(() => contarStatusPacientes(pacientes), [pacientes]);
  const perfilPacientes = useMemo(() => buildRelatorioMedicoPerfil(pacientes), [pacientes]);
  const clinico = useMemo(() => buildOrganizationClinicalOutcomeMetrics(pacientes), [pacientes]);
  const financeiro = useMemo(
    () =>
      buildRelatorioMedicoFinanceiro({
        pacientes,
        pagamentosPacientes: pagamentos,
        vendasAvulsas,
      }),
    [pacientes, pagamentos, vendasAvulsas],
  );
  const faixasEtarias = useMemo(() => distribuicaoFaixaEtaria(pacientes), [pacientes]);
  const idsPacientes = useMemo(() => pacientes.map((paciente) => paciente.id), [pacientes]);
  const financeiroDemo = useMemo(
    () => buildFinanceiroDemografico(financeiro.linhas, pacientes),
    [financeiro.linhas, pacientes],
  );
  const graficoMensal = useMemo(
    () =>
      financeiro.meses.map((mes) => ({
        mes: mesCurto(mes.mesKey),
        Faturado: mes.valorTotal,
        Recebido: mes.valorPago,
        'Em aberto': mes.valorPendente,
      })),
    [financeiro.meses],
  );

  const perfil = useMemo(() => {
    if (!medico) return null;
    const wl = resolveMedicoWhiteLabel({
      nome: medico.nome,
      genero: medico.genero,
      fotoPerfilUrl: medico.fotoPerfilUrl,
      whiteLabel: medico.whiteLabel,
      organizationId: medico.organizationId,
    });
    const cidade = medico.cidades?.[0];
    return {
      titulo: medico.genero === 'F' ? 'Dra.' : 'Dr.',
      nome: medico.nome || 'Médico',
      crm:
        medico.crm?.estado && medico.crm?.numero
          ? `CRM-${medico.crm.estado} ${medico.crm.numero}`
          : '',
      foto: wl.profilePhotoUrl || medico.fotoPerfilUrl || null,
      verificado: medico.isVerificado === true,
      email: medico.email || '',
      telefone: medico.telefone || '',
      cidade: cidade?.cidade
        ? cidade.estado
          ? `${cidade.cidade} - ${cidade.estado}`
          : cidade.cidade
        : '',
      endereco: medico.localizacao?.endereco || '',
      pageBg: wl.publicPages.dr.backgroundColor || DEFAULT_DR_PAGE_BACKGROUND,
      pageText: wl.publicPages.dr.textColor || DEFAULT_DR_PAGE_TEXT,
      accentColor: wl.primaryColor || DEFAULT_WHITE_LABEL_PRIMARY_COLOR,
      instagram: normalizeMedicoInstagramUsuario(medico.instagramUsuario),
      whatsapp: medico.telefone
        ? buildWhatsappUrl({
            telefone: medico.telefone,
            telefoneDdi: medico.telefoneDdi,
            telefonePais: medico.telefonePais,
          })
        : null,
    };
  }, [medico]);

  useEffect(() => {
    if (!perfil) return;
    document.title = `Relatório · ${perfil.titulo} ${perfil.nome}`;
  }, [perfil]);

  if (!authReady || redirecionando || (autorizado && loading)) {
    return (
      <div className="relatorio-app-shell min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="relatorio-app-shell min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-lg font-bold text-slate-900">Acesso restrito</p>
          <p className="mt-2 text-sm text-slate-600">Só médicos cadastrados e verificados podem entrar.</p>
        </div>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="relatorio-app-shell min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <p className="mb-2 font-medium text-red-600">Não foi possível exibir o relatório</p>
          <p className="text-gray-600">{error || 'Dados não disponíveis.'}</p>
        </div>
      </div>
    );
  }

  const instagramUrl = perfil.instagram
    ? `https://www.instagram.com/${encodeURIComponent(perfil.instagram)}/`
    : null;

  return (
    <div className="relatorio-app-shell min-h-screen bg-white text-gray-900">
      <div className="relatorio-app-scroll min-h-0 flex-1">
        <header
          className="relative isolate overflow-hidden px-4 py-4 sm:py-5"
          style={{
            background: `linear-gradient(165deg, ${perfil.pageBg} 0%, ${perfil.pageBg}f2 60%, ${perfil.pageBg}e6 100%)`,
            color: perfil.pageText,
          }}
        >
          <div className="drprov-hero-grid pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              background: `radial-gradient(ellipse 65% 50% at 16% 52%, ${perfil.accentColor}, transparent 70%)`,
            }}
            aria-hidden
          />
          <div className="relative z-[1] mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Link
                href="/relatoriomedicos"
                className="inline-flex items-center gap-0.5 text-sm font-semibold opacity-90"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Médicos
              </Link>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="Método Emagrecer"
                className="h-6 w-auto max-w-[130px] object-contain object-right brightness-0 invert opacity-95 sm:h-7 sm:max-w-[150px]"
              />
            </div>
            <div
              className="grid items-start gap-4 sm:gap-5"
              style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}
            >
              <div className="relative h-[130px] w-[130px] shrink-0 sm:h-[148px] sm:w-[148px]">
                {perfil.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={perfil.foto}
                    alt={`${perfil.titulo} ${perfil.nome}`}
                    className="h-full w-full rounded-full border-[3px] border-white/90 object-cover shadow-lg"
                    style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.28), 0 0 0 3px ${perfil.accentColor}50` }}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-white/90 shadow-lg"
                    style={{
                      background: `linear-gradient(145deg, ${perfil.accentColor}, #2F8FA3)`,
                      boxShadow: `0 8px 24px rgba(0,0,0,0.28), 0 0 0 3px ${perfil.accentColor}50`,
                    }}
                  >
                    <Stethoscope className="h-12 w-12 text-white sm:h-14 sm:w-14" strokeWidth={1.75} />
                  </div>
                )}
                {perfil.verificado ? <SeloVerificadoInstagram ringClassName="ring-transparent" /> : null}
              </div>
              <div className="min-w-0 pt-1">
                <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-tight sm:text-[30px]">
                  {perfil.titulo} {perfil.nome}
                </h1>
                <span
                  className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0A1F44]"
                  style={{ backgroundColor: perfil.accentColor }}
                >
                  Médico
                </span>
                <p className={`mt-2.5 text-[15px] font-medium sm:text-[16px] ${perfil.crm ? 'opacity-85' : 'opacity-50'}`}>
                  {perfil.crm || 'Médico responsável'}
                </p>
              </div>
            </div>

            {perfil.whatsapp || perfil.telefone || instagramUrl ? (
              <div className="mt-4 flex items-center gap-2 sm:justify-center">
                {perfil.whatsapp ? (
                  <a
                    href={perfil.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-[#0A1F44] shadow-sm transition hover:opacity-95 sm:text-sm"
                    style={{ backgroundColor: perfil.accentColor }}
                  >
                    <WhatsAppIcon className="h-4 w-4 shrink-0" />
                    WhatsApp
                  </a>
                ) : perfil.telefone ? (
                  <span
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold sm:text-sm"
                    style={{ backgroundColor: perfil.accentColor, color: '#0A1F44' }}
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {perfil.telefone}
                  </span>
                ) : null}
                {instagramUrl ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-[#0A1F44] shadow-sm transition hover:opacity-95 sm:text-sm"
                    style={{ backgroundColor: perfil.accentColor }}
                  >
                    <Instagram className="h-4 w-4 shrink-0" aria-hidden />
                    Instagram
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-4xl space-y-4 px-2 py-4 sm:space-y-6 sm:px-4 sm:py-6">
          <h2
            className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold text-[#0A1F44] shadow-sm sm:text-lg"
            style={{ backgroundColor: perfil.accentColor }}
          >
            <FileText className="h-5 w-5 shrink-0" aria-hidden />
            Relatório do médico
          </h2>

          <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <dl className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
              <InfoCell icon={Mail} label="E-mail" value={perfil.email || '-'} />
              <InfoCell icon={Phone} label="Telefone" value={perfil.telefone || '-'} />
              <InfoCell icon={CreditCard} label="CRM" value={perfil.crm || '-'} />
              <InfoCell icon={MapPin} label="Cidade" value={perfil.cidade || '-'} />
              <InfoCell icon={MapPin} label="Endereço" value={perfil.endereco || '-'} />
              <InfoCell icon={UserRound} label="Pacientes" value={String(status.total)} />
            </dl>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex min-w-0 border-b border-slate-200">
              {(
                [
                  { id: 'estatisticas' as const, label: 'Estatísticas' },
                  { id: 'financeiro' as const, label: 'Financeiro' },
                ] as const
              ).map((tab, idx) => {
                const ativa = aba === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAba(tab.id)}
                    className={`flex min-w-0 flex-1 items-center justify-center px-1 py-2.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
                      idx > 0 ? 'border-l border-slate-200' : ''
                    } ${ativa ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {aba === 'estatisticas' ? (
              <div className="space-y-4 p-3 sm:p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Pacientes" value={String(status.total)} metodoIcon="paciente" />
                  <StatCard
                    label="Em tratamento"
                    value={String(status.emTratamento)}
                    metodoIcon="em-tratamento"
                    hint="Acompanhamento ativo"
                  />
                  <StatCard label="Pendente" value={String(status.pendente)} metodoIcon="pendente" hint="Aguardando início" />
                  <StatCard
                    label="Concluído"
                    value={String(status.concluido)}
                    metodoIcon="concluido"
                    hint="Tratamentos finalizados"
                  />
                  <StatCard label="Abandono" value={String(status.abandono)} metodoIcon="abandono" hint="Interrompidos" />
                  <StatCard
                    label="Total mg"
                    value={formatMedida(clinico.totalAplicacoesMg, 'mg')}
                    metodoIcon="aplicacao"
                    hint="Total aplicado"
                  />
                  <StatCard
                    label="Kg perdido"
                    value={formatMedida(clinico.kgPerdidoTotal, 'kg')}
                    metodoIcon="bio-impedancia"
                    hint="Total perdido"
                  />
                  <StatCard
                    label="Cm perdido"
                    value={formatMedida(clinico.circunferenciaAbdominalReduzidaTotalCm, 'cm')}
                    metodoIcon="grafico"
                    hint="Circunferência abdominal"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PerfilSexo
                    feminino={perfilPacientes.feminino}
                    masculino={perfilPacientes.masculino}
                    outro={perfilPacientes.outro}
                    semSexo={perfilPacientes.semSexo}
                  />
                  <PerfilCidades cidades={perfilPacientes.cidades} totalComCidade={perfilPacientes.totalComCidade} />
                </div>

                <div className="rounded-[18px] border border-slate-200 p-4">
                  <DashboardAgeDistribution
                    percentages={faixasEtarias.percentages}
                    hasData={faixasEtarias.totalComIdade > 0}
                  />
                </div>

                <DashboardWeightEvolution
                  pacientes={pacientes}
                  ownPatientIds={idsPacientes}
                  filtroDose={filtroDose}
                  filtroFaixaEtaria={filtroFaixaPeso}
                  filtroSexo={filtroSexoPeso}
                  onDoseChange={setFiltroDose}
                  onFaixaChange={setFiltroFaixaPeso}
                  onSexoChange={setFiltroSexoPeso}
                />

                <DashboardAbandonmentReasons pacientes={pacientes} ownPatientIds={idsPacientes} />

                {medico ? (
                  <PublicDoctorDepoimentos
                    medicoId={medico.id}
                    accentColor={perfil?.accentColor || '#30f278'}
                    pageBg={perfil?.pageBg || '#0A1F44'}
                    variant="headerButton"
                  />
                ) : null}
              </div>
            ) : null}

            {aba === 'financeiro' ? (
              <div className="space-y-4 p-3 sm:p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[18px] border border-slate-200 p-3 sm:p-4">
                    <p className="text-[13px] font-medium text-slate-500">Vendas</p>
                    <p className="mt-1 text-[26px] font-extrabold leading-none text-slate-900">{financeiro.totalVendas}</p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 p-3 sm:p-4">
                    <p className="text-[13px] font-medium text-slate-500">Faturado</p>
                    <p className="mt-1 text-[22px] font-extrabold leading-none text-slate-900">{formatBrl(financeiro.valorTotal)}</p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 p-3 sm:p-4">
                    <p className="text-[13px] font-medium text-slate-500">Recebido</p>
                    <p className="mt-1 text-[22px] font-extrabold leading-none text-emerald-700">{formatBrl(financeiro.valorPago)}</p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 p-3 sm:p-4">
                    <p className="text-[13px] font-medium text-slate-500">Em aberto</p>
                    <p className="mt-1 text-[22px] font-extrabold leading-none text-amber-700">{formatBrl(financeiro.valorPendente)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Evolução mensal</h3>
                  {graficoMensal.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">Nenhuma venda para montar o gráfico.</p>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graficoMensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            width={56}
                            tickFormatter={(value: number) =>
                              value >= 1000 ? `${Math.round(value / 1000)} mil` : String(value)
                            }
                          />
                          <Tooltip
                            formatter={(value) => formatBrl(Number(value ?? 0))}
                            contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="Faturado" fill="#0f172a" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Recebido" fill="#059669" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Em aberto" fill="#d97706" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <GraficoFinanceiroDemo titulo="Pagamento por sexo" dados={financeiroDemo.porSexo} />
                <GraficoFinanceiroDemo titulo="Pagamento por cidade" dados={financeiroDemo.porCidade} />
                <GraficoFinanceiroDemo titulo="Pagamento por região" dados={financeiroDemo.porRegiao} />
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
