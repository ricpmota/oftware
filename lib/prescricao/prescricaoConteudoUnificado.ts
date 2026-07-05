import type { Prescricao, PrescricaoItem } from '@/types/prescricao';

/** Indica se há dados reais nos campos estruturados de itens. */
export function itensTemConteudoUtil(itens: PrescricaoItem[] | undefined): boolean {
  return (itens || []).some(
    (item) =>
      (item.medicamento || '').trim() ||
      (item.dosagem || '').trim() ||
      (item.frequencia || '').trim() ||
      (item.instrucoes || '').trim() ||
      (item.quantidade || '').trim()
  );
}

/** Converte itens legados (medicamento/dosagem/frequência/instruções) em texto único. */
export function converterItensParaTextoUnico(itens: PrescricaoItem[]): string {
  return (itens || [])
    .map((item, idx) => {
      const partes = [
        (item.medicamento || '').trim(),
        (item.dosagem || '').trim() ? `Dosagem: ${(item.dosagem || '').trim()}` : '',
        (item.frequencia || '').trim() ? `Frequência: ${(item.frequencia || '').trim()}` : '',
        (item.quantidade || '').trim() ? `Quantidade: ${(item.quantidade || '').trim()}` : '',
        (item.instrucoes || '').trim() ? `Instruções: ${(item.instrucoes || '').trim()}` : '',
      ].filter(Boolean);
      return partes.length > 0 ? `${idx + 1}. ${partes.join(' | ')}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Unifica descrição + itens legados em um único texto (nunca descarta itens se existirem).
 * Corrige perda quando `descricao` tinha valor e os itens eram ignorados.
 */
export function unificarConteudoTextoLivre(p: {
  descricao?: string;
  itens?: PrescricaoItem[];
}): string {
  const desc = (p.descricao || '').trim();
  const itensTexto = itensTemConteudoUtil(p.itens) ? converterItensParaTextoUnico(p.itens || []) : '';

  if (desc && itensTexto) {
    return `${desc}\n\n${itensTexto}`.trim();
  }
  return desc || itensTexto;
}

export function isReciboMedicoPrescricao(p: {
  tipoDocumento?: Prescricao['tipoDocumento'];
} | null | undefined): boolean {
  return !!p && p.tipoDocumento === 'recibo_medico';
}

/** Prescrição/protocolo em campo único (não recibo). */
export function isConteudoTextoLivrePrescricao(p: {
  tipoDocumento?: Prescricao['tipoDocumento'];
  catalogoAba?: Prescricao['catalogoAba'];
} | null | undefined): boolean {
  if (!p || isReciboMedicoPrescricao(p)) return false;
  return true;
}

/** Texto para exibição/edição no formulário. */
export function conteudoParaFormulario(p: Prescricao): string {
  if (isReciboMedicoPrescricao(p)) return (p.descricao || '').trim();
  return unificarConteudoTextoLivre(p);
}

/** Documento SISTEMA com itens legados ainda não migrados no Firestore. */
export function precisaMigrarConteudoUnificadoFirestore(p: {
  tipoDocumento?: Prescricao['tipoDocumento'];
  descricao?: string;
  itens?: PrescricaoItem[];
}): boolean {
  if (isReciboMedicoPrescricao(p)) return false;
  if (!itensTemConteudoUtil(p.itens)) return false;
  const unificado = unificarConteudoTextoLivre(p);
  const desc = (p.descricao || '').trim();
  return unificado !== desc;
}

function recalcularItemSuplementoPorPeso(item: PrescricaoItem, pesoKg: number): PrescricaoItem {
  if (item.medicamento === 'Whey Protein') {
    const wheyDosagemTotal = (pesoKg * 1.6).toFixed(1);
    const wheyPorRefeicao = (pesoKg * 1.6 / 3).toFixed(1);
    return {
      ...item,
      dosagem: `${wheyDosagemTotal}g por dia (1,6g por kg de peso corporal)`,
      instrucoes: `Tomar aproximadamente ${wheyPorRefeicao}g de whey protein 3 vezes ao dia (totalizando ${wheyDosagemTotal}g/dia). Preferencialmente após as refeições principais ou após exercícios físicos. A dosagem de 1,6g/kg/dia é recomendada para preservação de massa muscular durante processo de perda de peso.`,
      quantidade: `${wheyDosagemTotal}g/dia`,
    };
  }
  if (item.medicamento === 'Creatina MAX' || (item.medicamento || '').includes('Creatina')) {
    return {
      ...item,
      dosagem: '3,5g por dia',
      instrucoes:
        'Tomar 3,5g por dia, diluído em 200ml de água. Preferencialmente após o treino ou junto com uma refeição. A creatina auxilia na preservação de força e massa muscular durante o processo de perda de peso.',
      quantidade: '3,5g/dia',
    };
  }
  return item;
}

function recalcularLinhaSuplementoNoTexto(linha: string, pesoKg: number): string {
  const trimmed = linha.trim();
  if (!trimmed) return linha;
  if (!/whey/i.test(trimmed) && !/creatina/i.test(trimmed)) return linha;

  const numMatch = trimmed.match(/^(\d+)\.\s*/);
  const prefix = numMatch ? `${numMatch[1]}. ` : '';

  if (/whey/i.test(trimmed)) {
    const wheyDosagemTotal = (pesoKg * 1.6).toFixed(1);
    const wheyPorRefeicao = (pesoKg * 1.6 / 3).toFixed(1);
    const partes = [
      'Whey Protein',
      `Dosagem: ${wheyDosagemTotal}g por dia (1,6g por kg de peso corporal)`,
      `Instruções: Tomar aproximadamente ${wheyPorRefeicao}g de whey protein 3 vezes ao dia (totalizando ${wheyDosagemTotal}g/dia). Preferencialmente após as refeições principais ou após exercícios físicos. A dosagem de 1,6g/kg/dia é recomendada para preservação de massa muscular durante processo de perda de peso.`,
      `Quantidade: ${wheyDosagemTotal}g/dia`,
    ];
    return `${prefix}${partes.join(' | ')}`;
  }

  const medMatch = trimmed.match(/^\d+\.\s*([^|]+)/);
  const medicamento = medMatch ? medMatch[1].trim() : 'Creatina MAX';
  const partesCreatina = [
    medicamento,
    'Dosagem: 3,5g por dia',
    'Instruções: Tomar 3,5g por dia, diluído em 200ml de água. Preferencialmente após o treino ou junto com uma refeição. A creatina auxilia na preservação de força e massa muscular durante o processo de perda de peso.',
    'Quantidade: 3,5g/dia',
  ];
  return `${prefix}${partesCreatina.join(' | ')}`;
}

/** Indica se o modelo usa whey/creatina com dosagem por peso. */
export function prescricaoTemSuplementoPorPeso(p: {
  nome?: string;
  descricao?: string;
  itens?: PrescricaoItem[];
}): boolean {
  const texto = `${p.nome || ''} ${p.descricao || ''} ${(p.itens || []).map((i) => i.medicamento || '').join(' ')}`.toLowerCase();
  return /whey|creatina/.test(texto);
}

/** Recalcula whey/creatina no texto unificado ou em itens legados (templates). */
export function aplicarTemplatePrescricaoParaPeso(p: Prescricao, pesoKg: number): Prescricao {
  if (!p.isTemplate || isReciboMedicoPrescricao(p)) return p;
  if (!prescricaoTemSuplementoPorPeso(p)) return { ...p, pesoPaciente: pesoKg };

  if (itensTemConteudoUtil(p.itens)) {
    const itensRecalculados = (p.itens || []).map((item) => recalcularItemSuplementoPorPeso(item, pesoKg));
    return {
      ...p,
      itens: [],
      descricao: unificarConteudoTextoLivre({ descricao: p.descricao, itens: itensRecalculados }),
      pesoPaciente: pesoKg,
    };
  }

  const texto = conteudoParaFormulario(p);
  const linhas = texto.split('\n').map((l) => recalcularLinhaSuplementoNoTexto(l, pesoKg));
  return { ...p, itens: [], descricao: linhas.join('\n'), pesoPaciente: pesoKg };
}
