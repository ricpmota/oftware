import { agruparParcelasPorVenda } from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';
import { obterFaixaEtaria } from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, VendaAvulsa } from '@/types/pagamento';

export type RelatorioMedicoStatusCounts = {
  total: number;
  pendente: number;
  emTratamento: number;
  concluido: number;
  abandono: number;
};

export type RelatorioMedicoVendaStatus = 'pago' | 'iniciou_pagamento' | 'em_aberto';

export type RelatorioMedicoVendaLinha = {
  id: string;
  origem: 'paciente' | 'avulsa';
  pacienteId?: string;
  nome: string;
  vendaLabel: string;
  data: Date;
  dataLabel: string;
  mesKey: string;
  mesLabel: string;
  status: RelatorioMedicoVendaStatus;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
};

export type RelatorioMedicoMes = {
  mesKey: string;
  mesLabel: string;
  vendas: number;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
};

export type RelatorioMedicoFinanceiro = {
  linhas: RelatorioMedicoVendaLinha[];
  meses: RelatorioMedicoMes[];
  totalVendas: number;
  vendasPagas: number;
  vendasParciais: number;
  vendasAbertas: number;
  vendasPaciente: number;
  vendasAvulsas: number;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
};

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const withToDate = (value as { toDate?: () => Date })?.toDate?.();
  if (withToDate instanceof Date && !Number.isNaN(withToDate.getTime())) return withToDate;
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function fmtData(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mesKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function mesLabelFromKey(mesKey: string): string {
  const [y, m] = mesKey.split('-').map(Number);
  const nome = MESES[(m || 1) - 1] || mesKey;
  return `${nome} ${y || ''}`.trim();
}

function nomePaciente(paciente: PacienteCompleto | undefined, pacienteId: string): string {
  if (!paciente) return `Paciente ${pacienteId.slice(0, 8)}`;
  return (
    paciente.dadosIdentificacao?.nomeCompleto ||
    paciente.nome ||
    `Paciente ${pacienteId.slice(0, 8)}`
  );
}

function statusFromValores(
  valorTotal: number,
  valorPago: number,
  valorPendente: number,
): RelatorioMedicoVendaStatus {
  if (valorPendente <= 0.009 && valorTotal > 0) return 'pago';
  if (valorPago > 0.009) return 'iniciou_pagamento';
  return 'em_aberto';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type RelatorioMedicoCidade = {
  label: string;
  quantidade: number;
};

export type RelatorioMedicoPerfilPacientes = {
  feminino: number;
  masculino: number;
  outro: number;
  semSexo: number;
  cidades: RelatorioMedicoCidade[];
  totalComCidade: number;
};

function tituloCidade(cidade: string, estado: string): string {
  const nome = cidade
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palavra) => (palavra ? palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
  const uf = estado.trim().toUpperCase();
  return uf ? `${nome}, ${uf}` : nome;
}

/** Sexo e cidades dos pacientes do médico. */
export function buildRelatorioMedicoPerfil(
  pacientes: Pick<PacienteCompleto, 'dadosIdentificacao'>[],
): RelatorioMedicoPerfilPacientes {
  let feminino = 0;
  let masculino = 0;
  let outro = 0;
  const cidadesCount = new Map<string, number>();

  for (const paciente of pacientes) {
    const sexo = paciente.dadosIdentificacao?.sexoBiologico;
    if (sexo === 'F') feminino += 1;
    else if (sexo === 'M') masculino += 1;
    else if (sexo === 'Outro') outro += 1;

    const cidade = paciente.dadosIdentificacao?.endereco?.cidade;
    const estado = paciente.dadosIdentificacao?.endereco?.estado;
    if (!cidade?.trim()) continue;
    const label = tituloCidade(cidade, estado || '');
    cidadesCount.set(label, (cidadesCount.get(label) || 0) + 1);
  }

  const cidades = Array.from(cidadesCount.entries())
    .map(([label, quantidade]) => ({ label, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.label.localeCompare(b.label, 'pt-BR'))
    .slice(0, 5);

  return {
    feminino,
    masculino,
    outro,
    semSexo: Math.max(0, pacientes.length - feminino - masculino - outro),
    cidades,
    totalComCidade: Array.from(cidadesCount.values()).reduce((sum, n) => sum + n, 0),
  };
}

/** Contagem de pacientes do médico por status de tratamento. */
export function contarStatusPacientes(
  pacientes: Pick<PacienteCompleto, 'statusTratamento'>[],
): RelatorioMedicoStatusCounts {
  const counts: RelatorioMedicoStatusCounts = {
    total: 0,
    pendente: 0,
    emTratamento: 0,
    concluido: 0,
    abandono: 0,
  };

  for (const paciente of pacientes) {
    counts.total += 1;
    const status = paciente.statusTratamento || 'pendente';
    if (status === 'em_tratamento') counts.emTratamento += 1;
    else if (status === 'concluido') counts.concluido += 1;
    else if (status === 'abandono') counts.abandono += 1;
    else counts.pendente += 1;
  }

  return counts;
}

/**
 * Evolução financeira do médico: cada venda de paciente e cada venda avulsa,
 * com totais, o que está pago e o que segue em aberto.
 */
export function buildRelatorioMedicoFinanceiro(input: {
  pacientes: PacienteCompleto[];
  pagamentosPacientes: Record<string, PagamentoPaciente>;
  vendasAvulsas: VendaAvulsa[];
}): RelatorioMedicoFinanceiro {
  const linhas: RelatorioMedicoVendaLinha[] = [];
  const pacientesById = new Map(input.pacientes.map((paciente) => [paciente.id, paciente]));

  for (const [pacienteId, pagamento] of Object.entries(input.pagamentosPacientes || {})) {
    if (!pagamento) continue;
    const paciente = pacientesById.get(pacienteId);
    const nome = nomePaciente(paciente, pacienteId);
    const fallback =
      (paciente
        ? toDate(paciente.dadosIdentificacao?.dataCadastro) || toDate(paciente.dataCadastro)
        : null) ||
      toDate(pagamento.dataVenda) ||
      toDate(pagamento.dataUltimaAtualizacao) ||
      new Date();

    const vendas = agruparParcelasPorVenda(pagamento.parcelas || [], fallback).filter(
      (venda) => venda.valorTotal > 0,
    );

    if (vendas.length === 0) {
      const valorTotal = pagamento.valorTotal || 0;
      if (valorTotal <= 0) continue;
      const valorPago = pagamento.valorPago || 0;
      const valorPendente = pagamento.valorPendente ?? valorTotal - valorPago;
      const data = fallback;
      linhas.push({
        id: `pac-${pacienteId}-unica`,
        origem: 'paciente',
        pacienteId,
        nome,
        vendaLabel: 'Venda',
        data,
        dataLabel: fmtData(data),
        mesKey: mesKeyFromDate(data),
        mesLabel: mesLabelFromKey(mesKeyFromDate(data)),
        status: statusFromValores(valorTotal, valorPago, valorPendente),
        valorTotal: roundMoney(valorTotal),
        valorPago: roundMoney(valorPago),
        valorPendente: roundMoney(valorPendente),
      });
      continue;
    }

    vendas.forEach((venda, index) => {
      const data = venda.data;
      const mesKey = mesKeyFromDate(data);
      linhas.push({
        id: `pac-${pacienteId}-${index}`,
        origem: 'paciente',
        pacienteId,
        nome,
        vendaLabel: venda.label,
        data,
        dataLabel: fmtData(data),
        mesKey,
        mesLabel: mesLabelFromKey(mesKey),
        status: statusFromValores(venda.valorTotal, venda.valorPago, venda.valorPendente),
        valorTotal: roundMoney(venda.valorTotal),
        valorPago: roundMoney(venda.valorPago),
        valorPendente: roundMoney(venda.valorPendente),
      });
    });
  }

  for (const venda of input.vendasAvulsas || []) {
    const valorParcelas = (venda.parcelas || []).reduce((sum, parcela) => sum + (parcela.valor || 0), 0);
    const valorTotal = venda.valorTotal || valorParcelas;
    if (valorTotal <= 0) continue;
    const valorPago = venda.valorPago || 0;
    const valorPendente = venda.valorPendente ?? valorTotal - valorPago;
    const data =
      toDate(venda.dataVenda) ||
      toDate(venda.parcelas?.find((parcela) => parcela.dataVencimento)?.dataVencimento) ||
      toDate(venda.dataUltimaAtualizacao) ||
      new Date();
    const mesKey = mesKeyFromDate(data);
    const statusPagamento = venda.statusPagamento;
    const status: RelatorioMedicoVendaStatus =
      statusPagamento === 'pago'
        ? 'pago'
        : statusPagamento === 'iniciou_pagamento'
          ? 'iniciou_pagamento'
          : statusFromValores(valorTotal, valorPago, valorPendente);

    linhas.push({
      id: `avulsa-${venda.id}`,
      origem: 'avulsa',
      nome: venda.cliente?.trim() || venda.descricao?.trim() || 'Venda avulsa',
      vendaLabel: venda.descricao?.trim() || 'Venda avulsa',
      data,
      dataLabel: fmtData(data),
      mesKey,
      mesLabel: mesLabelFromKey(mesKey),
      status,
      valorTotal: roundMoney(valorTotal),
      valorPago: roundMoney(valorPago),
      valorPendente: roundMoney(Math.max(0, valorPendente)),
    });
  }

  linhas.sort((a, b) => b.data.getTime() - a.data.getTime());

  const mesesMap = new Map<string, RelatorioMedicoMes>();
  for (const linha of linhas) {
    const atual = mesesMap.get(linha.mesKey) || {
      mesKey: linha.mesKey,
      mesLabel: linha.mesLabel,
      vendas: 0,
      valorTotal: 0,
      valorPago: 0,
      valorPendente: 0,
    };
    atual.vendas += 1;
    atual.valorTotal = roundMoney(atual.valorTotal + linha.valorTotal);
    atual.valorPago = roundMoney(atual.valorPago + linha.valorPago);
    atual.valorPendente = roundMoney(atual.valorPendente + linha.valorPendente);
    mesesMap.set(linha.mesKey, atual);
  }

  const meses = Array.from(mesesMap.values()).sort((a, b) => a.mesKey.localeCompare(b.mesKey));

  return {
    linhas,
    meses,
    totalVendas: linhas.length,
    vendasPagas: linhas.filter((linha) => linha.status === 'pago').length,
    vendasParciais: linhas.filter((linha) => linha.status === 'iniciou_pagamento').length,
    vendasAbertas: linhas.filter((linha) => linha.status !== 'pago').length,
    vendasPaciente: linhas.filter((linha) => linha.origem === 'paciente').length,
    vendasAvulsas: linhas.filter((linha) => linha.origem === 'avulsa').length,
    valorTotal: roundMoney(linhas.reduce((sum, linha) => sum + linha.valorTotal, 0)),
    valorPago: roundMoney(linhas.reduce((sum, linha) => sum + linha.valorPago, 0)),
    valorPendente: roundMoney(linhas.reduce((sum, linha) => sum + linha.valorPendente, 0)),
  };
}

export type FaixaEtariaRelatorio = '18-24' | '25-40' | '41-65' | '65+';

export type DistribuicaoFaixaEtaria = {
  percentages: Record<FaixaEtariaRelatorio, number>;
  totalComIdade: number;
};

const FAIXAS: FaixaEtariaRelatorio[] = ['18-24', '25-40', '41-65', '65+'];

function idadeEmAnos(dataNascimento: unknown): number | null {
  const data = toDate(dataNascimento);
  if (!data) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - data.getFullYear();
  if (
    hoje.getMonth() < data.getMonth() ||
    (hoje.getMonth() === data.getMonth() && hoje.getDate() < data.getDate())
  ) {
    idade -= 1;
  }
  return idade > 0 ? idade : null;
}

/** Percentual de pacientes em cada faixa etária, no mesmo recorte do MetaAdmin. */
export function distribuicaoFaixaEtaria(
  pacientes: Pick<PacienteCompleto, 'dadosIdentificacao'>[],
): DistribuicaoFaixaEtaria {
  const counts: Record<FaixaEtariaRelatorio, number> = {
    '18-24': 0,
    '25-40': 0,
    '41-65': 0,
    '65+': 0,
  };

  for (const paciente of pacientes) {
    const faixa = obterFaixaEtaria(idadeEmAnos(paciente.dadosIdentificacao?.dataNascimento));
    if (faixa === '18-24' || faixa === '25-40' || faixa === '41-65' || faixa === '65+') {
      counts[faixa] += 1;
    }
  }

  const totalComIdade = FAIXAS.reduce((sum, faixa) => sum + counts[faixa], 0);
  const percentages = Object.fromEntries(
    FAIXAS.map((faixa) => [faixa, totalComIdade > 0 ? (counts[faixa] / totalComIdade) * 100 : 0]),
  ) as Record<FaixaEtariaRelatorio, number>;

  return { percentages, totalComIdade };
}

export type FinanceiroDemoBarra = {
  nome: string;
  vendido: number;
  recebido: number;
  aberto: number;
};

function chaveDemo(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function somarDemo(
  map: Map<string, FinanceiroDemoBarra>,
  key: string,
  nome: string,
  vendido: number,
  recebido: number,
  aberto: number,
) {
  const atual = map.get(key);
  if (atual) {
    atual.vendido = roundMoney(atual.vendido + vendido);
    atual.recebido = roundMoney(atual.recebido + recebido);
    atual.aberto = roundMoney(atual.aberto + aberto);
    return;
  }
  map.set(key, {
    nome,
    vendido: roundMoney(vendido),
    recebido: roundMoney(recebido),
    aberto: roundMoney(aberto),
  });
}

function ordenarDemo(map: Map<string, FinanceiroDemoBarra>): FinanceiroDemoBarra[] {
  return Array.from(map.values()).sort(
    (a, b) => b.vendido + b.recebido - (a.vendido + a.recebido) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

/** Pagamentos de pacientes agrupados por sexo, cidade e estado (região), como no MetaAdmin. */
export function buildFinanceiroDemografico(
  linhas: RelatorioMedicoVendaLinha[],
  pacientes: Pick<PacienteCompleto, 'id' | 'dadosIdentificacao'>[],
): { porSexo: FinanceiroDemoBarra[]; porCidade: FinanceiroDemoBarra[]; porRegiao: FinanceiroDemoBarra[] } {
  const porId = new Map(pacientes.map((paciente) => [paciente.id, paciente]));
  const sexo = new Map<string, FinanceiroDemoBarra>();
  const cidade = new Map<string, FinanceiroDemoBarra>();
  const regiao = new Map<string, FinanceiroDemoBarra>();

  for (const linha of linhas) {
    if (linha.origem !== 'paciente' || !linha.pacienteId) continue;
    const paciente = porId.get(linha.pacienteId);
    const sexoBio = paciente?.dadosIdentificacao?.sexoBiologico;
    const cidadeRaw = paciente?.dadosIdentificacao?.endereco?.cidade?.trim() || '';
    const estadoRaw = paciente?.dadosIdentificacao?.endereco?.estado?.trim() || '';

    const nomeSexo = sexoBio === 'M' ? 'Masculino' : sexoBio === 'F' ? 'Feminino' : sexoBio ? 'Outro' : 'Não informado';
    const keySexo = sexoBio === 'M' ? 'M' : sexoBio === 'F' ? 'F' : sexoBio ? 'outro' : 'nao_informado';
    const nomeCidade = cidadeRaw && estadoRaw ? `${cidadeRaw} - ${estadoRaw}` : cidadeRaw || 'Não informado';
    const keyCidade = cidadeRaw ? `${chaveDemo(cidadeRaw)}|${chaveDemo(estadoRaw)}` : 'nao_informado';
    const nomeRegiao = estadoRaw || 'Não informado';
    const keyRegiao = estadoRaw ? chaveDemo(estadoRaw) : 'nao_informado';

    somarDemo(sexo, keySexo, nomeSexo, linha.valorTotal, linha.valorPago, linha.valorPendente);
    somarDemo(cidade, keyCidade, nomeCidade, linha.valorTotal, linha.valorPago, linha.valorPendente);
    somarDemo(regiao, keyRegiao, nomeRegiao, linha.valorTotal, linha.valorPago, linha.valorPendente);
  }

  return {
    porSexo: ordenarDemo(sexo),
    porCidade: ordenarDemo(cidade),
    porRegiao: ordenarDemo(regiao),
  };
}
