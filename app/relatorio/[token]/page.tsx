'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { Sex } from '@/types/labRanges';
import { getLabRange, isInRange, type LabLimitOverrides } from '@/utils/labRangesFromJson';
import { EXAME_LABORATORIAL_KEY_TO_FIELD } from '@/lib/metaadmin/exameLaboratorialFormFields';
import {
  buildRelatorioLabRowsFromOrder,
  groupOrderFromRelatorioRows,
} from '@/lib/labExames/buildRelatorioLabRowsFromOrder';
import { getExameCampoNumerico } from '@/lib/labExames/exameCampoNumerico';
import { getDefaultLabOrderBySection } from '@/lib/labExames/validateLabOrderBySection';
import { LabRangeBar } from '@/components/LabRangeBar';
import TrendLine from '@/components/TrendLine';

type MedicoPerfil = {
  nome?: string;
  genero?: string;
  crm?: { estado?: string; numero?: string };
  telefone?: string;
};

type PacienteSerialized = {
  id?: string;
  dadosIdentificacao?: {
    nomeCompleto?: string;
    email?: string;
    telefone?: string;
    cpf?: string;
    dataNascimento?: string;
    sexoBiologico?: 'M' | 'F' | 'Outro';
    endereco?: { cidade?: string; estado?: string };
  };
  dadosClinicos?: { medidasIniciais?: { peso?: number; altura?: number } };
  evolucaoSeguimento?: Array<{
    weekIndex?: number;
    numeroSemana?: number;
    peso?: number;
    dataRegistro?: string;
    doseAplicada?: { quantidade?: number };
  }>;
  examesLaboratoriais?: Array<Record<string, unknown> & { dataColeta?: string }>;
  statusTratamento?: string;
  nome?: string;
  email?: string;
};

type ExameItem = {
  label: string;
  value: string;
  unit: string;
  inRange: boolean | null;
  field: string;
  labKey: string;
};

function getStatusLabel(s?: string): string {
  switch (s) {
    case 'em_tratamento': return 'Em tratamento';
    case 'concluido': return 'Concluído';
    case 'abandono': return 'Abandono';
    default: return 'Pendente';
  }
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

function buildExamesPorGrupoFromExame(
  exameRaw: Record<string, unknown>,
  p: PacienteSerialized,
  limitOverrides: LabLimitOverrides | null | undefined,
  labOrderBySection: Record<string, string[]>
): Record<string, ExameItem[]> {
  const pacienteSex = p.dadosIdentificacao?.sexoBiologico as Sex | undefined;
  const dataNasc = p.dadosIdentificacao?.dataNascimento;
  const rows = buildRelatorioLabRowsFromOrder(labOrderBySection, EXAME_LABORATORIAL_KEY_TO_FIELD);
  const examesPorGrupo: Record<string, ExameItem[]> = {};

  for (const row of rows) {
    const numVal = getExameCampoNumerico(exameRaw, row.field);
    if (numVal == null) continue;
    const range = getLabRange(row.labKey, pacienteSex ?? null, dataNasc, limitOverrides ?? null);
    const label = range?.label ?? row.labKey;
    const unit = range?.unit ?? '';
    const inRange = isInRange(numVal, range);
    if (!examesPorGrupo[row.group]) examesPorGrupo[row.group] = [];
    examesPorGrupo[row.group].push({
      label,
      value: String(numVal),
      unit,
      inRange,
      field: row.field,
      labKey: row.labKey,
    });
  }

  return examesPorGrupo;
}

function gruposOrdenadosParaExames(
  examesPorGrupo: Record<string, ExameItem[]>,
  labOrderBySection: Record<string, string[]>
): string[] {
  const rows = buildRelatorioLabRowsFromOrder(labOrderBySection, EXAME_LABORATORIAL_KEY_TO_FIELD);
  const groupOrder = groupOrderFromRelatorioRows(rows);
  const grupos = Object.keys(examesPorGrupo);
  return [
    ...groupOrder.filter((g) => (examesPorGrupo[g]?.length ?? 0) > 0),
    ...grupos.filter((g) => !groupOrder.includes(g)),
  ];
}

function buildExamesPorGrupo(
  p: PacienteSerialized,
  limitOverrides: LabLimitOverrides | null | undefined,
  labOrderBySection: Record<string, string[]>
): Record<string, ExameItem[]> | null {
  const exames = p.examesLaboratoriais || [];
  const ordenados = exames.slice().sort((a, b) => {
    const da = a.dataColeta ? new Date(a.dataColeta).getTime() : 0;
    const db = b.dataColeta ? new Date(b.dataColeta).getTime() : 0;
    return da - db;
  });
  if (ordenados.length === 0) return null;
  const ultimoExame = ordenados[ordenados.length - 1] as Record<string, unknown>;
  const examesPorGrupo = buildExamesPorGrupoFromExame(ultimoExame, p, limitOverrides, labOrderBySection);
  return Object.keys(examesPorGrupo).length > 0 ? examesPorGrupo : null;
}

function calcPerdaPesoEMg(p: PacienteSerialized): { perdaPesoTotal: number | null; totalMg: number } {
  const medidasIniciais = p.dadosClinicos?.medidasIniciais;
  const evolucao = p.evolucaoSeguimento || [];
  const primeiroRegistro = evolucao.find(e => (e.weekIndex || e.numeroSemana) === 1);
  const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
  let ultimoPeso: number | null = null;
  if (evolucao.length > 0) {
    const ordenada = [...evolucao].sort((a, b) => {
      const da = a.dataRegistro ? new Date(a.dataRegistro).getTime() : 0;
      const db = b.dataRegistro ? new Date(b.dataRegistro).getTime() : 0;
      return db - da;
    });
    const ultimoComPeso = ordenada.find(s => s.peso && s.peso > 0);
    ultimoPeso = ultimoComPeso?.peso ?? null;
  }
  const perdaPesoTotal = ultimoPeso != null && baselineWeight > 0 ? baselineWeight - ultimoPeso : null;
  const totalMg = (p.evolucaoSeguimento || []).reduce((sum, r) => sum + (r.doseAplicada?.quantidade || 0), 0);
  return { perdaPesoTotal, totalMg };
}

function safeDateToString(date: unknown): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date instanceof Date ? date : (date as { toDate?: () => Date }).toDate?.() ? (date as { toDate: () => Date }).toDate() : new Date(String(date));
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function RelatorioPacientePage() {
  const params = useParams();
  const token = params?.token as string | undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ paciente: PacienteSerialized; medicoPerfil: MedicoPerfil | null } | null>(null);
  const [labLimitOverrides, setLabLimitOverrides] = useState<LabLimitOverrides>({});
  const [labOrderBySection, setLabOrderBySection] = useState<Record<string, string[]>>(() =>
    getDefaultLabOrderBySection()
  );
  const [exameDataSelecionada, setExameDataSelecionada] = useState<string>('');
  const [openExameGrupos, setOpenExameGrupos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/relatorio-paciente/${token}/dados`).then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Link não encontrado ou expirado.' : 'Erro ao carregar relatório.');
        return res.json();
      }),
      fetch('/api/lab-exames-config', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ])
      .then(([body, cfg]) => {
        setData({ paciente: body.paciente, medicoPerfil: body.medicoPerfil });
        const c = cfg as { labLimitOverrides?: unknown; labOrderBySection?: unknown };
        const o = c?.labLimitOverrides;
        setLabLimitOverrides(
          o && typeof o === 'object' && !Array.isArray(o) ? (o as LabLimitOverrides) : {}
        );
        const ord = c?.labOrderBySection;
        setLabOrderBySection(
          ord && typeof ord === 'object' && !Array.isArray(ord)
            ? (ord as Record<string, string[]>)
            : getDefaultLabOrderBySection()
        );
      })
      .catch((err) => setError(err.message || 'Erro ao carregar.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
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
  const crm = medico?.crm?.estado && medico?.crm?.numero ? `CRM-${medico.crm.estado} ${medico.crm.numero}` : '';
  const { perdaPesoTotal, totalMg } = calcPerdaPesoEMg(p);
  const nome = (p.dadosIdentificacao?.nomeCompleto || p.nome || '').trim();
  const email = (p.dadosIdentificacao?.email || p.email || '').trim();
  const tel = (p.dadosIdentificacao?.telefone || '').trim();
  const cpf = (p.dadosIdentificacao?.cpf || '').trim();
  const sexo = getSexoLabel(p.dadosIdentificacao?.sexoBiologico);
  const cidade = (p.dadosIdentificacao?.endereco?.cidade || '').trim();
  const estado = (p.dadosIdentificacao?.endereco?.estado || '').trim();
  const cidadeEstado = [cidade, estado].filter(Boolean).join(' / ') || '-';
  const status = getStatusLabel(p.statusTratamento);
  const dataNascStr = formatData(p.dadosIdentificacao?.dataNascimento);
  const perdaStr = perdaPesoTotal != null ? `${perdaPesoTotal.toFixed(1)} kg` : '-';
  const mgStr = totalMg > 0 ? `${totalMg} mg` : '-';

  const evolucao = (p.evolucaoSeguimento || []).slice().sort((a, b) => {
    const da = a.dataRegistro ? new Date(a.dataRegistro).getTime() : 0;
    const db = b.dataRegistro ? new Date(b.dataRegistro).getTime() : 0;
    return da - db;
  });
  const pesoChartData = evolucao
    .filter(e => e.peso != null && e.peso > 0)
    .map((e) => ({
      data: formatData(e.dataRegistro) !== '-' ? formatData(e.dataRegistro) : `Sem. ${e.weekIndex ?? e.numeroSemana ?? ''}`,
      dataRaw: e.dataRegistro,
      peso: e.peso ?? 0,
      semana: e.weekIndex ?? e.numeroSemana
    }));

  const exames = p.examesLaboratoriais || [];
  const examesOrdenados = [...exames].sort((a, b) => {
    const dA = safeDateToString(a.dataColeta);
    const dB = safeDateToString(b.dataColeta);
    return dB.localeCompare(dA);
  }).filter(e => safeDateToString(e.dataColeta));
  const dataInicialExame = examesOrdenados[0] ? safeDateToString(examesOrdenados[0].dataColeta) : '';
  const dataSelecionadaExame = exameDataSelecionada || dataInicialExame;
  const exameRawSelecionado = exames.find((e) => safeDateToString(e.dataColeta) === dataSelecionadaExame) || examesOrdenados[0] || {};
  const getHemogramaVal = (ex: Record<string, unknown>, f: string) => (ex?.hemogramaCompleto as Record<string, unknown>)?.[f] ?? ex?.[f];
  const exameSelecionado = {
    ...exameRawSelecionado,
    hemoglobina: getHemogramaVal(exameRawSelecionado as Record<string, unknown>, 'hemoglobina'),
    plaquetas: getHemogramaVal(exameRawSelecionado as Record<string, unknown>, 'plaquetas'),
    leucocitos: getHemogramaVal(exameRawSelecionado as Record<string, unknown>, 'leucocitos')
  } as Record<string, unknown>;
  const examesPorGrupoSelecionado = buildExamesPorGrupoFromExame(
    exameRawSelecionado as Record<string, unknown>,
    p,
    labLimitOverrides,
    labOrderBySection
  );
  const gruposOrdenadosSelecionado = gruposOrdenadosParaExames(examesPorGrupoSelecionado, labOrderBySection);
  const relatorioRows = buildRelatorioLabRowsFromOrder(labOrderBySection, EXAME_LABORATORIAL_KEY_TO_FIELD);
  const dadosGraficoExames = examesOrdenados.map((ex) => {
    const base: Record<string, unknown> = { data: safeDateToString(ex.dataColeta) };
    const er = ex as Record<string, unknown>;
    for (const row of relatorioRows) {
      base[row.field] = getExameCampoNumerico(er, row.field);
    }
    return base;
  }).reverse();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-slate-50 border-b border-slate-200 px-4 py-3 animate-fade-in">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-slate-800 text-lg">{tituloMedico} {medicoNome}</h1>
            <p className="text-sm text-slate-500">{[crm, medico?.telefone].filter(Boolean).join('  •  ')}</p>
          </div>
          <div className="flex items-center">
            <Image src="/icones/oftware.png" alt="Oftware" width={32} height={32} className="object-contain" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Dados do paciente */}
        <section className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 shadow-sm animate-fade-in" style={{ animationDelay: '0.05s', animationFillMode: 'both' } as React.CSSProperties}>
          <h2 className="font-bold text-slate-800 text-base mb-3">{nome || 'Paciente'}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div><dt className="text-slate-500 inline">E-mail:</dt><dd className="inline ml-1">{email || '-'}</dd></div>
            <div><dt className="text-slate-500 inline">Tel:</dt><dd className="inline ml-1">{tel || '-'}</dd></div>
            <div><dt className="text-slate-500 inline">CPF:</dt><dd className="inline ml-1">{cpf || '-'}</dd></div>
            <div><dt className="text-slate-500 inline">Nasc.:</dt><dd className="inline ml-1">{dataNascStr}</dd></div>
            <div><dt className="text-slate-500 inline">Sexo:</dt><dd className="inline ml-1">{sexo}</dd></div>
            <div><dt className="text-slate-500 inline">Cid./UF:</dt><dd className="inline ml-1">{cidadeEstado}</dd></div>
            <div><dt className="text-slate-500 inline">Status:</dt><dd className="inline ml-1">{status}</dd></div>
            <div><dt className="text-slate-500 inline">Perda kg:</dt><dd className="inline ml-1">{perdaStr}</dd></div>
            <div><dt className="text-slate-500 inline">Mg:</dt><dd className="inline ml-1">{mgStr}</dd></div>
          </dl>
        </section>

        {/* Evolução peso — gráfico + tabela */}
        {evolucao.filter(e => e.peso != null && e.peso > 0).length > 0 && (
          <section className="border border-slate-200 rounded-xl p-5 shadow-sm animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' } as React.CSSProperties}>
            <h3 className="font-semibold text-slate-800 mb-4">Evolução do peso</h3>
            {pesoChartData.length > 0 && (
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pesoChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey="data" tick={{ fontSize: 11 }} className="text-slate-500" />
                    <YAxis tick={{ fontSize: 11 }} unit=" kg" width={40} className="text-slate-500" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Peso']}
                      labelFormatter={(label) => (typeof label === 'string' && label.match(/^\d{2}\/\d{2}\/\d{4}$/) ? label : label)}
                    />
                    <Area type="monotone" dataKey="peso" name="Peso" stroke="#0d9488" fill="url(#pesoGrad)" strokeWidth={2} dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left bg-slate-50/80">
                    <th className="py-2.5 pr-4 pl-2">Semana</th>
                    <th className="py-2.5 pr-4">Peso (kg)</th>
                    <th className="py-2.5">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucao
                    .filter(e => e.peso != null && e.peso > 0)
                    .map((e, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 pr-4 pl-2">{e.weekIndex ?? e.numeroSemana ?? '-'}</td>
                        <td className="py-2 pr-4 font-medium">{e.peso?.toFixed(1)}</td>
                        <td className="py-2">{formatData(e.dataRegistro)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Exames laboratoriais — estilo “Exames do paciente” */}
        {exames.length > 0 && (
          <section className="border border-slate-200 rounded-xl p-5 shadow-sm animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' } as React.CSSProperties}>
            <h3 className="font-semibold text-slate-800 mb-4">Exames laboratoriais</h3>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">Data da coleta</label>
                <select
                  value={dataSelecionadaExame}
                  onChange={(e) => setExameDataSelecionada(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {examesOrdenados.map((ex, idx) => {
                    const dt = safeDateToString(ex.dataColeta);
                    let label = dt;
                    try {
                      const d = new Date(dt);
                      if (!isNaN(d.getTime())) label = d.toLocaleDateString('pt-BR');
                    } catch {}
                    return <option key={idx} value={dt}>{label}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {gruposOrdenadosSelecionado.map((grupo) => {
                const itens = examesPorGrupoSelecionado[grupo];
                if (!itens?.length) return null;
                const isOpen = openExameGrupos[grupo] ?? false;
                const toggle = () => setOpenExameGrupos((prev) => ({ ...prev, [grupo]: !prev[grupo] }));
                return (
                  <div key={grupo} className="border border-slate-200 rounded-lg bg-slate-50/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={toggle}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-100/50 transition-colors"
                    >
                      <span className="text-slate-700 font-medium text-sm">{grupo}</span>
                      <span className="text-slate-500 shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-200/80 space-y-4">
                      {itens.map((item, idx) => {
                        const range = getLabRange(
                          item.labKey,
                          p.dadosIdentificacao?.sexoBiologico ?? null,
                          p.dadosIdentificacao?.dataNascimento,
                          labLimitOverrides
                        );
                        const numVal =
                          exameSelecionado[item.field] != null && typeof exameSelecionado[item.field] === 'number'
                            ? (exameSelecionado[item.field] as number)
                            : null;
                        const temEvolucao = dadosGraficoExames.some((d) => d[item.field] != null);
                        return (
                          <div key={`${item.labKey}-${item.field}-${idx}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-slate-700 mb-1">{item.label}</p>
                              <p className={`text-sm font-medium ${item.inRange === true ? 'text-green-600' : item.inRange === false ? 'text-red-600' : 'text-slate-800'}`}>
                                {item.unit ? `${item.value} ${item.unit}` : item.value}
                              </p>
                              {range && <LabRangeBar range={range} value={numVal} width={280} height={18} />}
                            </div>
                            {temEvolucao && range && range.min != null && range.max != null && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-2">Evolução</p>
                                <TrendLine
                                  data={dadosGraficoExames}
                                  dataKeys={[{ key: item.field, name: item.label, stroke: '#0d9488', dot: true }]}
                                  xKey="data"
                                  height={140}
                                  xAxisLabel="Data"
                                  yAxisLabel={range.unit || ''}
                                  formatter={(v) => (v != null ? `${Number(v).toFixed(1)}` : 'N/A')}
                                  referenceLines={[
                                    { value: range.min, label: 'Min', stroke: '#ef4444', strokeDasharray: '5 5' },
                                    { value: range.max, label: 'Max', stroke: '#ef4444', strokeDasharray: '5 5' }
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Botão Download PDF */}
        <div className="pt-4 border-t border-slate-200 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' } as React.CSSProperties}>
          <a
            href={token ? `/api/relatorio-paciente/${token}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Baixar relatório em PDF
          </a>
          <p className="text-slate-500 text-sm mt-2">O PDF abrirá em nova aba; você pode salvar ou imprimir.</p>
        </div>
      </main>
    </div>
  );
}
