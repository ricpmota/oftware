import type { PrescricaoCatalogoAba } from '@/types/prescricaoPasta';

export const PRESCRICAO_RECIBO_PASTA_NOME = 'Recibo Médico';

/** Subpastas da aba Protocolo no catálogo SISTEMA (metaadmingeral). */
export const PASTAS_PADRAO_PROTOCOLO: { nome: string; ordem: number }[] = [
  { nome: 'Protocolo Mestre', ordem: 10 },
  { nome: 'Resistência Insulínica', ordem: 20 },
  { nome: 'Inflamação', ordem: 30 },
  { nome: 'Energia Mitocondrial', ordem: 40 },
  { nome: 'Composição Corporal', ordem: 50 },
  { nome: 'Saúde Intestinal', ordem: 60 },
  { nome: 'Implantes', ordem: 65 },
  { nome: 'Anabolismo', ordem: 66 },
  { nome: 'Hormônios', ordem: 70 },
  { nome: 'Neurotransmissores', ordem: 71 },
];

export const PASTAS_PADRAO_PRESCRICAO: { nome: string; ordem: number; recibo?: boolean }[] = [
  { nome: PRESCRICAO_RECIBO_PASTA_NOME, ordem: 0, recibo: true },
  { nome: 'Base do Tratamento', ordem: 10 },
  { nome: 'Gastrointestinal', ordem: 20 },
  { nome: 'Massa Magra & Performance', ordem: 30 },
  { nome: 'Metabólico / Glicêmico', ordem: 40 },
  { nome: 'Micronutrientes', ordem: 50 },
  { nome: 'Sono & Comportamento', ordem: 60 },
  { nome: 'Hepático / Cardiometabólico', ordem: 70 },
  { nome: 'Outros', ordem: 80 },
];

export function tituloExibicaoPrescricao(nome: string): string {
  const n = (nome || '').trim();
  if (n.includes(' — ')) return n.split(' — ')[1]?.trim() || n;
  return n;
}

export function nomeComPasta(pastaNome: string, titulo: string): string {
  const t = titulo.trim();
  if (!t) return pastaNome;
  if (t.startsWith(`${pastaNome} —`)) return t;
  return `${pastaNome} — ${t}`;
}

export function inferirPastaNomeLegado(nome: string, tipoDocumento?: string): string {
  if (tipoDocumento === 'recibo_medico') return PRESCRICAO_RECIBO_PASTA_NOME;
  const raw = (nome || '').trim();
  if (raw.includes(' — ')) {
    const prefix = raw.split(' — ')[0].trim();
    const match = PASTAS_PADRAO_PRESCRICAO.find((p) => p.nome === prefix);
    if (match) return match.nome;
  }
  return 'Outros';
}

export function catalogoAbaLabel(aba: PrescricaoCatalogoAba): string {
  return aba === 'prescricao' ? 'Prescrições' : 'Protocolo';
}
