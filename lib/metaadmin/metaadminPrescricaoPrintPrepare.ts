import type { PacienteCompleto } from '@/types/obesidade';
import type { Prescricao, PrescricaoItem } from '@/types/prescricao';
import {
  aplicarTemplatePrescricaoParaPeso,
  conteudoParaFormulario,
} from '@/lib/prescricao/prescricaoConteudoUnificado';

export type PrescricaoFormSnapshot = {
  nome: string;
  descricao: string;
  itens: PrescricaoItem[];
  observacoes: string;
  valorConsulta: string;
  dataRecibo: string;
  reciboDocumentoProfissional: 'omitir' | 'cpf' | 'cnpj';
};

export type PrepararPrescricaoImpressaoResult =
  | {
      ok: true;
      prescricaoParaPdf: Prescricao;
      novaPrescricaoParaPdf: PrescricaoFormSnapshot;
      pacienteNome: string;
      pacienteCpf?: string;
      isRecibo: boolean;
      pesoRealPaciente?: number;
    }
  | { ok: false; message: string };

export function isReciboMedicoPrescricao(p: { tipoDocumento?: Prescricao['tipoDocumento'] } | null | undefined): boolean {
  return p?.tipoDocumento === 'recibo_medico';
}

export function isDataReciboISOValid(iso: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return false;
  const [y, m, d] = iso.trim().split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseValorConsultaBRLInput(raw: string): number | null {
  const t = (raw || '').trim().replace(/\s/g, '');
  if (!t) return null;
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(norm);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function prescricaoFormFromEntity(p: Prescricao): PrescricaoFormSnapshot {
  const isRecibo = isReciboMedicoPrescricao(p);
  return {
    nome: p.nome || '',
    descricao: conteudoParaFormulario(p),
    itens: isRecibo ? [...(p.itens || [])] : [],
    observacoes: p.observacoes || '',
    valorConsulta: p.valorConsulta != null ? String(p.valorConsulta) : '',
    dataRecibo: p.dataRecibo || '',
    reciboDocumentoProfissional:
      p.reciboDocumentoProfissional === 'cpf' || p.reciboDocumentoProfissional === 'cnpj'
        ? p.reciboDocumentoProfissional
        : 'omitir',
  };
}

export function prescricaoFormsIguais(a: PrescricaoFormSnapshot, b: PrescricaoFormSnapshot): boolean {
  return (
    a.nome === b.nome &&
    a.descricao === b.descricao &&
    a.observacoes === b.observacoes &&
    a.valorConsulta === b.valorConsulta &&
    a.dataRecibo === b.dataRecibo &&
    a.reciboDocumentoProfissional === b.reciboDocumentoProfissional &&
    JSON.stringify(a.itens) === JSON.stringify(b.itens)
  );
}

export function applyTemplateItensParaPeso(
  itens: PrescricaoItem[],
  pesoRealPaciente: number,
  isTemplate: boolean
): PrescricaoItem[] {
  if (!isTemplate) return itens;
  return itens.map((item) => {
    if (item.medicamento === 'Whey Protein') {
      const wheyDosagemTotal = (pesoRealPaciente * 1.6).toFixed(1);
      const wheyPorRefeicao = (pesoRealPaciente * 1.6 / 3).toFixed(1);
      return {
        ...item,
        dosagem: `${wheyDosagemTotal}g por dia (1,6g por kg de peso corporal)`,
        instrucoes: `Tomar aproximadamente ${wheyPorRefeicao}g de whey protein 3 vezes ao dia (totalizando ${wheyDosagemTotal}g/dia). Preferencialmente após as refeições principais ou após exercícios físicos. A dosagem de 1,6g/kg/dia é recomendada para preservação de massa muscular durante processo de perda de peso.`,
        quantidade: `${wheyDosagemTotal}g/dia`,
      };
    }
    if (item.medicamento === 'Creatina MAX' || item.medicamento.includes('Creatina')) {
      return {
        ...item,
        dosagem: '3,5g por dia',
        instrucoes:
          'Tomar 3,5g por dia, diluído em 200ml de água. Preferencialmente após o treino ou junto com uma refeição. A creatina auxilia na preservação de força e massa muscular durante o processo de perda de peso.',
        quantidade: '3,5g/dia',
      };
    }
    return item;
  });
}

export async function prepararPrescricaoParaImpressao(args: {
  paciente: PacienteCompleto;
  prescricaoSelecionada: Prescricao;
  prescricaoEditando: Prescricao | null;
  novaPrescricao: PrescricaoFormSnapshot;
  salvar: () => Promise<{ ok: boolean; prescricaoSalva?: Prescricao | null }>;
}): Promise<PrepararPrescricaoImpressaoResult> {
  let prescricaoSelecionadaParaPdf = args.prescricaoSelecionada;
  let novaPrescricaoParaPdf: PrescricaoFormSnapshot = {
    ...args.novaPrescricao,
    itens: [...(args.novaPrescricao.itens || [])],
  };

  const isTemporariaSel = args.prescricaoSelecionada.id === 'temp-new';
  const salvaNoPaciente = !!(
    args.prescricaoEditando &&
    !args.prescricaoEditando.isTemplate &&
    !isTemporariaSel &&
    args.prescricaoEditando.pacienteId === args.paciente.id
  );

  if (salvaNoPaciente && args.prescricaoEditando) {
    const baseline = prescricaoFormFromEntity(args.prescricaoEditando);
    if (!prescricaoFormsIguais(novaPrescricaoParaPdf, baseline)) {
      return { ok: false, message: 'Salve as alterações antes de imprimir.' };
    }
  } else {
    const r = await args.salvar();
    if (!r.ok) return { ok: false, message: '' };
    if (!r.prescricaoSalva) {
      return {
        ok: false,
        message:
          'Não foi possível confirmar a prescrição gravada. Verifique a conexão e tente Salvar antes de imprimir.',
      };
    }
    prescricaoSelecionadaParaPdf = r.prescricaoSalva;
    novaPrescricaoParaPdf = prescricaoFormFromEntity(r.prescricaoSalva);
  }

  const isRecibo = isReciboMedicoPrescricao(prescricaoSelecionadaParaPdf);

  if (isRecibo) {
    const valorNum = parseValorConsultaBRLInput(novaPrescricaoParaPdf.valorConsulta);
    if (valorNum === null) {
      return { ok: false, message: 'Informe um valor válido no recibo antes de imprimir.' };
    }
    const dataIsoPrint = (novaPrescricaoParaPdf.dataRecibo || '').trim();
    if (!isDataReciboISOValid(dataIsoPrint)) {
      return { ok: false, message: 'Informe a data do recibo para imprimir.' };
    }
    const pacienteNome = args.paciente.dadosIdentificacao?.nomeCompleto || args.paciente.nome || 'Paciente';
    const pacienteCpf = args.paciente.dadosIdentificacao?.cpf;
    const prescricaoParaPdf: Prescricao = {
      ...prescricaoSelecionadaParaPdf,
      nome: novaPrescricaoParaPdf.nome,
      descricao: novaPrescricaoParaPdf.descricao,
      itens: [],
      observacoes: novaPrescricaoParaPdf.observacoes,
      valorConsulta: valorNum,
      dataRecibo: dataIsoPrint,
      reciboDocumentoProfissional: novaPrescricaoParaPdf.reciboDocumentoProfissional,
      tipoDocumento: 'recibo_medico',
    };
    return {
      ok: true,
      prescricaoParaPdf,
      novaPrescricaoParaPdf,
      pacienteNome,
      pacienteCpf,
      isRecibo: true,
    };
  }

  const pesoRealPaciente =
    args.paciente.dadosClinicos?.medidasIniciais?.peso ||
    args.paciente.evolucaoSeguimento?.[args.paciente.evolucaoSeguimento.length - 1]?.peso;

  if (!pesoRealPaciente) {
    return {
      ok: false,
      message:
        'Peso do paciente não encontrado. Por favor, cadastre o peso nas Medidas Iniciais (Aba 2 - Dados Clínicos).',
    };
  }

  let prescricaoParaPdf: Prescricao = {
    ...prescricaoSelecionadaParaPdf,
    nome: novaPrescricaoParaPdf.nome,
    descricao: novaPrescricaoParaPdf.descricao,
    itens: [],
    observacoes: novaPrescricaoParaPdf.observacoes,
    pesoPaciente: pesoRealPaciente,
  };

  if (prescricaoSelecionadaParaPdf.isTemplate) {
    prescricaoParaPdf = aplicarTemplatePrescricaoParaPeso(prescricaoParaPdf, pesoRealPaciente);
    novaPrescricaoParaPdf = prescricaoFormFromEntity(prescricaoParaPdf);
  }

  const pacienteNome = args.paciente.dadosIdentificacao?.nomeCompleto || args.paciente.nome || 'Paciente';
  const pacienteCpf = args.paciente.dadosIdentificacao?.cpf;

  return {
    ok: true,
    prescricaoParaPdf,
    novaPrescricaoParaPdf,
    pacienteNome,
    pacienteCpf,
    isRecibo: false,
    pesoRealPaciente,
  };
}
