import type {
  AnamneseHighlightSeveridadeV3,
  AnamneseHighlightTipoV3,
  AnamneseHighlightV3,
  AnamneseInteligenteV3,
  AnamneseNivelConfiancaV3,
} from '@/types/obesidade';

const TIPOS: AnamneseHighlightTipoV3[] = [
  'sono',
  'alimentacao',
  'atividade',
  'energia',
  'historico',
  'medicamentos',
  'barreiras',
  'expectativa',
  'risco',
];

const SEVERIDADES: AnamneseHighlightSeveridadeV3[] = ['baixa', 'moderada', 'alta'];
const CONFIANCA: AnamneseNivelConfiancaV3[] = ['baixo', 'moderado', 'alto'];

function asString(v: unknown, max = 2000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function asStringArray(v: unknown, maxItems = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normTipo(v: unknown): AnamneseHighlightTipoV3 {
  const s = String(v || '').toLowerCase();
  if (TIPOS.includes(s as AnamneseHighlightTipoV3)) return s as AnamneseHighlightTipoV3;
  if (s.includes('sono')) return 'sono';
  if (s.includes('aliment')) return 'alimentacao';
  if (s.includes('ativ')) return 'atividade';
  if (s.includes('energ')) return 'energia';
  if (s.includes('hist')) return 'historico';
  if (s.includes('medic')) return 'medicamentos';
  if (s.includes('barreir')) return 'barreiras';
  if (s.includes('expect')) return 'expectativa';
  return 'risco';
}

function normSeveridade(v: unknown): AnamneseHighlightSeveridadeV3 {
  const s = String(v || '').toLowerCase();
  if (SEVERIDADES.includes(s as AnamneseHighlightSeveridadeV3)) return s as AnamneseHighlightSeveridadeV3;
  if (s.includes('alt')) return 'alta';
  if (s.includes('mod')) return 'moderada';
  return 'baixa';
}

function normConfianca(v: unknown): AnamneseNivelConfiancaV3 {
  const s = String(v || '').toLowerCase();
  if (CONFIANCA.includes(s as AnamneseNivelConfiancaV3)) return s as AnamneseNivelConfiancaV3;
  if (s.includes('alt')) return 'alto';
  if (s.includes('mod')) return 'moderado';
  return 'baixo';
}

function normHighlight(raw: unknown): AnamneseHighlightV3 | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const titulo = asString(o.titulo, 120);
  const descricao = asString(o.descricao, 500);
  if (!titulo && !descricao) return null;
  return {
    tipo: normTipo(o.tipo),
    titulo: titulo || 'Destaque',
    descricao: descricao || titulo,
    severidade: normSeveridade(o.severidade),
  };
}

export function normalizarAnamneseInteligencia(raw: unknown): AnamneseInteligenteV3 {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const highlights: AnamneseHighlightV3[] = [];
  if (Array.isArray(o.highlights)) {
    for (const h of o.highlights) {
      const n = normHighlight(h);
      if (n) highlights.push(n);
    }
  }

  return {
    resumoMedico: asString(o.resumoMedico, 1500) || 'Resumo não disponível.',
    highlights: highlights.slice(0, 12),
    barreirasAdesao: asStringArray(o.barreirasAdesao),
    pontosMedicoInvestigar: asStringArray(o.pontosMedicoInvestigar),
    perfilComportamental: asString(o.perfilComportamental, 800) || 'Perfil comportamental não inferido com dados atuais.',
    nivelConfianca: normConfianca(o.nivelConfianca),
  };
}
