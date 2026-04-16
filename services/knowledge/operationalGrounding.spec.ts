import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as operationalEmbeddings from './operationalEmbeddings';
import { findOperationalFlow, findOperationalFlowHeuristic } from './findOperationalFlow';
import { buildOperationalBlock } from './buildOperationalBlock';
import { formatOperationalFallback } from './formatOperationalFallback';
import { validateOperationalAnswer, OPERATIONAL_WEAK_ANSWER_PATTERNS } from './validateOperationalAnswer';
import { buildChatNutriSystemInstruction } from '@/services/chatNutriGeminiService';
import type { OperationalFlowMatch } from './operationalFlowTypes';

/** Vetor determinístico por chave (L2-normalizado). Chaves `__*` têm baixa correlação com ids de fluxo. */
function vecFromKey(key: string, dim = 48): number[] {
  if (key.startsWith('__')) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    const v = new Array(dim).fill(0).map((_, i) => Math.sin((h >>> 0) + i * 1.7) * 0.707);
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / n);
  }
  const v = new Array(dim).fill(0);
  for (let i = 0; i < key.length; i++) v[i % dim] += key.charCodeAt(i) * 0.01;
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

function mapQueryToFlowKey(text: string): string {
  const t = text.toLowerCase();
  if (/temperatura|ebulição|nível do mar/.test(t)) return '__noise__';
  if (/lanço|lançar|lanco|lanca/.test(t) && /tratamento/.test(t)) return 'metaadmin_plano_terapeutico';
  if (/encontrar|buscar/.test(t) && /médico|medico/.test(t)) return 'meta_buscar_medico';
  if (/mex|alterar|mudar/.test(t) && /dose/.test(t)) return '__dose_ambiguous__';
  return 'generic_query';
}

describe('findOperationalFlowHeuristic (regressão v1)', () => {
  it('casa "como faço pra cadastrar o tratamento?" (médico / plano)', () => {
    const m = findOperationalFlowHeuristic('como faço pra cadastrar o tratamento?', {
      surface: 'chatnutri',
      profileHint: 'medico',
    });
    expect(m.matched).toBe(true);
    expect(m.surface).toBe('/metaadmin');
    expect(m.profile).toBe('medico');
    expect(m.steps.join(' ')).toContain('Pasta 5');
    expect(m.flowId).toBe('metaadmin_plano_terapeutico');
  });

  it('casa "como configurar o plano terapêutico do paciente?"', () => {
    const m = findOperationalFlowHeuristic('como configurar o plano terapêutico do paciente?', {
      surface: 'chatnutri',
    });
    expect(m.matched).toBe(true);
    expect(m.steps.some((s) => /plano terapêutico/i.test(s))).toBe(true);
  });

  it('casa "onde vejo meus tratamentos?" (paciente)', () => {
    const m = findOperationalFlowHeuristic('onde vejo meus tratamentos?', {
      surface: 'chatnutri',
      profileHint: 'paciente',
    });
    expect(m.matched).toBe(true);
    expect(m.surface).toBe('/meta');
    expect(m.profile).toBe('paciente');
  });

  it('casa "como encontrar um médico?" (paciente)', () => {
    const m = findOperationalFlowHeuristic('como encontrar um médico?', { surface: 'chatnutri' });
    expect(m.matched).toBe(true);
    expect(m.profile).toBe('paciente');
    expect(m.steps.join(' ')).toMatch(/solicita/i);
  });

  it('não casa pergunta irrelevante (sem match forte)', () => {
    const m = findOperationalFlowHeuristic('qual a temperatura de ebulição da água ao nível do mar?', {
      surface: 'chatnutri',
    });
    expect(m.matched).toBe(false);
  });
});

describe('findOperationalFlow (híbrido, embeddings mockados)', () => {
  beforeEach(() => {
    vi.spyOn(operationalEmbeddings, 'generateEmbedding').mockImplementation(async (text) =>
      vecFromKey(mapQueryToFlowKey(text))
    );
    vi.spyOn(operationalEmbeddings, 'getEmbeddingForFlow').mockImplementation(async (flow) => vecFromKey(flow.id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    operationalEmbeddings.clearOperationalEmbeddingCache();
  });

  it('casa frase sinônima "como lanço o tratamento do paciente?" via semântico', async () => {
    const m = await findOperationalFlow('como lanço o tratamento do paciente?', { profileHint: 'medico' });
    expect(m.matched).toBe(true);
    expect(m.flowId).toBe('metaadmin_plano_terapeutico');
    expect(m.confidence).toBeGreaterThanOrEqual(0.55);
    expect(m.resolution?.strategy).toMatch(/hybrid_|semantic_/);
  });

  it('frase ambígua "onde mexo na dose?" — vetor de teste não força match perfeito', async () => {
    const m = await findOperationalFlow('onde mexo na dose?', { surface: 'chatnutri' });
    expect(m.flowId === 'meta_meus_tratamentos' || m.flowId === 'metaadmin_plano_terapeutico' || !m.matched).toBe(true);
  });

  it('fora de escopo permanece sem match útil', async () => {
    const m = await findOperationalFlow('qual a temperatura de ebulição da água ao nível do mar?', {
      surface: 'chatnutri',
    });
    expect(m.matched).toBe(false);
  });

  it('semântico vs heurístico: sinônimo depende de strategy híbrida ou semântica', async () => {
    const m = await findOperationalFlow('como lanço o tratamento do paciente?', { profileHint: 'medico' });
    expect(m.flowId).toBe('metaadmin_plano_terapeutico');
    expect(m.resolution?.strategy).toBeTruthy();
  });
});

describe('buildOperationalBlock', () => {
  it('inclui cabeçalho e passos oficiais', () => {
    const m = findOperationalFlowHeuristic('cadastrar tratamento do paciente', { profileHint: 'medico' });
    const b = buildOperationalBlock(m);
    expect(b.startsWith('FLUXO_OPERACIONAL_PRIORITARIO')).toBe(true);
    expect(b).toContain('PASSOS OFICIAIS:');
    expect(b).toContain('REGRAS:');
    expect(b).toContain('/metaadmin');
  });

  it('inclui aviso para confiança moderada', () => {
    const m: OperationalFlowMatch = {
      matched: true,
      confidence: 0.62,
      confidenceBand: 'moderate',
      title: 't',
      instructions: '1. passo',
      steps: ['passo'],
      surface: '/meta',
      profile: 'paciente',
      flowId: 'x',
    };
    const b = buildOperationalBlock(m);
    expect(b).toContain('AVISO_CONFIANCA_MODERADA');
  });
});

describe('formatOperationalFallback', () => {
  it('monta resposta numerada a partir do match', () => {
    const m = findOperationalFlowHeuristic('como faço pra cadastrar o tratamento?', { profileHint: 'medico' });
    const f = formatOperationalFallback(m);
    expect(f).toMatch(/^Para /);
    expect(f).toMatch(/^\d+\./m);
    expect(f).toContain('metaadmin');
  });
});

describe('validateOperationalAnswer', () => {
  it('barra linguagem genérica quando há bloco operacional', () => {
    expect(validateOperationalAnswer('Procure por uma seção chamada Tratamento.', true)).toBe(false);
    expect(validateOperationalAnswer('A plataforma pode variar.', true)).toBe(false);
    expect(validateOperationalAnswer('Geralmente você encontra no menu.', true)).toBe(false);
  });

  it('aceita negação explícita de conhecimento', () => {
    expect(
      validateOperationalAnswer('Não encontrei no conhecimento carregado o caminho exato para ela.', true)
    ).toBe(true);
  });

  it('com hasOperationalBlock false não restringe', () => {
    expect(validateOperationalAnswer('Procure por qualquer coisa.', false)).toBe(true);
  });
});

describe('buildChatNutriSystemInstruction', () => {
  it('coloca FLUXO_OPERACIONAL_PRIORITARIO antes de CONHECIMENTO_BASE', async () => {
    const r = await buildChatNutriSystemInstruction({
      userText: 'como configurar o plano terapêutico?',
      knowledgeText: 'CONHECIMENTO_BASE\n\n[FONTE: x]\ncorpo',
      dynamicBlock: '',
    });
    expect(r.hasOperationalBlock).toBe(true);
    const t = r.systemInstructionText;
    const iFluxo = t.indexOf('FLUXO_OPERACIONAL_PRIORITARIO');
    const iKbSegment = t.indexOf('[FONTE: x]');
    expect(iFluxo).toBeGreaterThan(-1);
    expect(iKbSegment).toBeGreaterThan(-1);
    expect(iFluxo).toBeLessThan(iKbSegment);
    expect(r.sectionOrder.indexOf('FLUXO_OPERACIONAL_PRIORITARIO')).toBeLessThan(
      r.sectionOrder.indexOf('CONHECIMENTO_BASE')
    );
  });
});

describe('OPERATIONAL_WEAK_ANSWER_PATTERNS', () => {
  it('cobre expressões proibidas do enunciado', () => {
    const samples = ['procure por x', 'algo similar', 'pode variar', 'geralmente', 'normalmente', 'seção chamada'];
    for (const s of samples) {
      expect(OPERATIONAL_WEAK_ANSWER_PATTERNS.some((re) => re.test(s))).toBe(true);
    }
  });
});
