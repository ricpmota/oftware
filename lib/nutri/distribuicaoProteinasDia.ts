/**
 * Distribuição de grupos proteicos ao longo do dia (Opção 01).
 * Planeja o dia antes de montar cada refeição isoladamente.
 */

import type { RefeicaoNutriKey } from '@/lib/nutri/distribuicaoMetasRefeicoes';
import { REFEICOES_NUTRI_ORDEM } from '@/lib/nutri/distribuicaoMetasRefeicoes';
import {
  GRUPOS_PADRAO_SEM_PREFERENCIA,
  filtrarGruposPorRestricoes,
  grupoProteicoPermitidoPorRestricoes,
  normalizarPreferenciasProteina,
  type GrupoProteinaPaciente,
} from '@/lib/nutri/gruposProteicos';

export type AlertaDistribuicaoProteicaDia =
  | 'PREFERENCIAS_PROTEICAS_AUSENTES'
  | 'PREFERENCIA_PROTEICA_DESCONHECIDA'
  | 'BAIXA_VARIEDADE_PROTEICA_DECLARADA'
  | 'CATALOGO_INSUFICIENTE_PARA_VARIAR_PROTEINAS'
  | 'REPETICAO_PROTEICA_ACIMA_DO_DESEJADO'
  | 'PROTEINA_FORA_DA_PREFERENCIA_UTILIZADA';

export type AjusteDistribuicaoProteicaDia =
  | 'USOU_PADRAO_SEM_PREFERENCIA'
  | 'EXPANDIU_COM_PRATICOS_LANCHE'
  | 'FORCOU_PRINCIPAL_ALMOCO_JANTAR'
  | 'LIMITOU_OVOS'
  | 'EVITOU_REPETICAO_CONSECUTIVA';

export const LIMITES_REPETICAO_PROTEICA_DIA_V1 = {
  mesmoGrupoMaximoDia: 2,
  mesmoGrupoMaximoConsecutivo: 1,
  ovosComoPrincipalMaximoDia: 2,
  wheyComoPrincipalMaximoDia: 2,
  laticiniosComoPrincipalMaximoDia: 2,
} as const;

export const REGRAS_OVOS_OPCAO01_V1 = {
  maximoRefeicoesComoPrincipal: 2,
  maximoRefeicoesConsecutivas: 1,
  prioridadeCafe: true,
  prioridadeLanches: true,
  prioridadeAlmocoQuandoHaOutrasProteinas: false,
  prioridadeJantarQuandoHaOutrasProteinas: false,
} as const;

export const ADEQUACAO_GRUPO_PROTEICO_REFEICAO_V1: Record<
  RefeicaoNutriKey,
  Partial<Record<GrupoProteinaPaciente, number>>
> = {
  cafe: {
    ovos: 5,
    laticinios: 5,
    whey: 5,
    proteina_vegetal: 5,
    tofu: 2,
    frango: 0,
    peixe: 0,
    carne: 0,
    leguminosas: 0,
    peru: 1,
  },
  lanche1: {
    ovos: 4,
    laticinios: 5,
    whey: 5,
    proteina_vegetal: 5,
    tofu: 2,
    frango: 0,
    peixe: 0,
    carne: 0,
    leguminosas: 0,
    peru: 2,
  },
  almoco: {
    ovos: 3,
    laticinios: 1,
    whey: 0,
    proteina_vegetal: 1,
    tofu: 5,
    frango: 5,
    peixe: 5,
    carne: 5,
    leguminosas: 5,
    peru: 1,
  },
  lanche2: {
    ovos: 4,
    laticinios: 5,
    whey: 5,
    proteina_vegetal: 5,
    tofu: 2,
    frango: 0,
    peixe: 0,
    carne: 0,
    leguminosas: 0,
    peru: 2,
  },
  jantar: {
    ovos: 4,
    laticinios: 1,
    whey: 0,
    proteina_vegetal: 1,
    tofu: 5,
    frango: 5,
    peixe: 5,
    carne: 4,
    leguminosas: 5,
    peru: 1,
  },
};

const GRUPOS_PRATICOS_LANCHE: GrupoProteinaPaciente[] = [
  'whey',
  'laticinios',
  'proteina_vegetal',
  'ovos',
];

const GRUPOS_PRINCIPAIS_REFEICAO: GrupoProteinaPaciente[] = [
  'frango',
  'peixe',
  'carne',
  'tofu',
  'leguminosas',
];

export interface ContextoDistribuicaoProteinasDia {
  preferenciasProteina: string[];
  restricoes: string[];
  estilo: string;
  refeicoes?: RefeicaoNutriKey[];
  metasProteinaPorRefeicao?: Partial<Record<RefeicaoNutriKey, number>>;
}

export interface DistribuicaoProteinasDia {
  versao: 1;
  grupoPrincipalPorRefeicao: Record<RefeicaoNutriKey, GrupoProteinaPaciente | null>;
  gruposAlternativosPorRefeicao: Record<RefeicaoNutriKey, GrupoProteinaPaciente[]>;
  gruposPermitidos: GrupoProteinaPaciente[];
  gruposSelecionados: GrupoProteinaPaciente[];
  preferenciasNormalizadas: GrupoProteinaPaciente[];
  ajustes: AjusteDistribuicaoProteicaDia[];
  alertas: AlertaDistribuicaoProteicaDia[];
}

function adeq(grupo: GrupoProteinaPaciente, refeicao: RefeicaoNutriKey): number {
  return ADEQUACAO_GRUPO_PROTEICO_REFEICAO_V1[refeicao]?.[grupo] ?? 0;
}

function maxDiaParaGrupo(grupo: GrupoProteinaPaciente): number {
  if (grupo === 'ovos') return LIMITES_REPETICAO_PROTEICA_DIA_V1.ovosComoPrincipalMaximoDia;
  if (grupo === 'whey') return LIMITES_REPETICAO_PROTEICA_DIA_V1.wheyComoPrincipalMaximoDia;
  if (grupo === 'laticinios') {
    return LIMITES_REPETICAO_PROTEICA_DIA_V1.laticiniosComoPrincipalMaximoDia;
  }
  return LIMITES_REPETICAO_PROTEICA_DIA_V1.mesmoGrupoMaximoDia;
}

function podeUsar(
  grupo: GrupoProteinaPaciente,
  refeicao: RefeicaoNutriKey,
  contagem: Partial<Record<GrupoProteinaPaciente, number>>,
  anterior: GrupoProteinaPaciente | null,
  somentePreferidos: boolean,
  preferidos: GrupoProteinaPaciente[]
): boolean {
  if (adeq(grupo, refeicao) < 3) return false;
  if (somentePreferidos && !preferidos.includes(grupo)) return false;
  const usado = contagem[grupo] || 0;
  if (usado >= maxDiaParaGrupo(grupo)) return false;
  if (
    anterior === grupo &&
    usado >= LIMITES_REPETICAO_PROTEICA_DIA_V1.mesmoGrupoMaximoConsecutivo
  ) {
    return false;
  }
  return true;
}

function ordenarCandidatos(
  candidatos: GrupoProteinaPaciente[],
  refeicao: RefeicaoNutriKey,
  contagem: Partial<Record<GrupoProteinaPaciente, number>>,
  preferidos: GrupoProteinaPaciente[],
  estilo: string
): GrupoProteinaPaciente[] {
  return [...candidatos].sort((a, b) => {
    const prefA = preferidos.includes(a) ? 0 : 1;
    const prefB = preferidos.includes(b) ? 0 : 1;
    if (prefA !== prefB) return prefA - prefB;

    const novoA = (contagem[a] || 0) === 0 ? 0 : 1;
    const novoB = (contagem[b] || 0) === 0 ? 0 : 1;
    if (novoA !== novoB) return novoA - novoB;

    // Almoço/jantar: priorizar grupos principais
    if (refeicao === 'almoco' || refeicao === 'jantar') {
      const mainA = GRUPOS_PRINCIPAIS_REFEICAO.includes(a) ? 0 : 1;
      const mainB = GRUPOS_PRINCIPAIS_REFEICAO.includes(b) ? 0 : 1;
      if (mainA !== mainB) return mainA - mainB;
      if (refeicao === 'jantar') {
        if (a === 'peixe' && b !== 'peixe') return -1;
        if (b === 'peixe' && a !== 'peixe') return 1;
      }
      if (refeicao === 'almoco') {
        if (a === 'frango' && b !== 'frango') return -1;
        if (b === 'frango' && a !== 'frango') return 1;
      }
    }
    // Café/lanches: ovos/práticos — mas se ovos já usados, priorizar whey/laticínios
    if (refeicao === 'cafe' || refeicao === 'lanche1' || refeicao === 'lanche2') {
      const pratA = GRUPOS_PRATICOS_LANCHE.includes(a) ? 0 : 1;
      const pratB = GRUPOS_PRATICOS_LANCHE.includes(b) ? 0 : 1;
      if (pratA !== pratB) return pratA - pratB;
      const ovosUsados = contagem['ovos'] || 0;
      if (ovosUsados >= 1) {
        const avoidOvos = (g: GrupoProteinaPaciente) => (g === 'ovos' ? 1 : 0);
        const dO = avoidOvos(a) - avoidOvos(b);
        if (dO !== 0) return dO;
      }
      if (refeicao === 'cafe' && ovosUsados === 0 && a === 'ovos' && b !== 'ovos') return -1;
      if (refeicao === 'cafe' && ovosUsados === 0 && b === 'ovos' && a !== 'ovos') return 1;
    }

    if (estilo === 'plant_based') {
      const plant = (g: GrupoProteinaPaciente) =>
        g === 'tofu' || g === 'leguminosas' || g === 'proteina_vegetal' ? 0 : 1;
      const d = plant(a) - plant(b);
      if (d !== 0) return d;
    }

    return adeq(b, refeicao) - adeq(a, refeicao);
  });
}

/**
 * Atribui um grupo principal a cada refeição respeitando preferências,
 * restrições, adequação e limites de repetição.
 */
export function distribuirProteinasAoLongoDoDia(
  contexto: ContextoDistribuicaoProteinasDia
): DistribuicaoProteinasDia {
  const ajustes: AjusteDistribuicaoProteicaDia[] = [];
  const alertas: AlertaDistribuicaoProteicaDia[] = [];
  const norm = normalizarPreferenciasProteina(contexto.preferenciasProteina);
  alertas.push(...norm.alertas);

  let preferidos = filtrarGruposPorRestricoes(norm.grupos, contexto.restricoes);
  let somentePreferidos = preferidos.length > 0;

  if (preferidos.length === 0) {
    preferidos = filtrarGruposPorRestricoes(
      GRUPOS_PADRAO_SEM_PREFERENCIA,
      contexto.restricoes
    );
    somentePreferidos = false;
    ajustes.push('USOU_PADRAO_SEM_PREFERENCIA');
    if (!alertas.includes('PREFERENCIAS_PROTEICAS_AUSENTES')) {
      alertas.push('PREFERENCIAS_PROTEICAS_AUSENTES');
    }
  }

  // Lanches precisam de opções práticas além de ovos (whey/laticínios),
  // mesmo quando o paciente já marcou ovos + carnes.
  const temPraticoDiversificado = preferidos.some(
    (g) => g === 'whey' || g === 'laticinios' || g === 'proteina_vegetal'
  );
  if (!temPraticoDiversificado) {
    const extras = filtrarGruposPorRestricoes(
      ['whey', 'laticinios', 'proteina_vegetal'],
      contexto.restricoes
    );
    for (const e of extras) {
      if (!preferidos.includes(e)) preferidos.push(e);
    }
    if (extras.length) ajustes.push('EXPANDIU_COM_PRATICOS_LANCHE');
  }

  if (preferidos.length <= 1) {
    alertas.push('BAIXA_VARIEDADE_PROTEICA_DECLARADA');
  }

  const refeicoes = contexto.refeicoes || [...REFEICOES_NUTRI_ORDEM];
  const grupoPrincipalPorRefeicao = {
    cafe: null,
    lanche1: null,
    almoco: null,
    lanche2: null,
    jantar: null,
  } as Record<RefeicaoNutriKey, GrupoProteinaPaciente | null>;
  const gruposAlternativosPorRefeicao = {
    cafe: [] as GrupoProteinaPaciente[],
    lanche1: [] as GrupoProteinaPaciente[],
    almoco: [] as GrupoProteinaPaciente[],
    lanche2: [] as GrupoProteinaPaciente[],
    jantar: [] as GrupoProteinaPaciente[],
  } as Record<RefeicaoNutriKey, GrupoProteinaPaciente[]>;

  const contagem: Partial<Record<GrupoProteinaPaciente, number>> = {};
  let anterior: GrupoProteinaPaciente | null = null;

  // Ordem: almoço e jantar primeiro (proteínas principais), depois café/lanches
  const ordemPlanejamento: RefeicaoNutriKey[] = [
    'almoco',
    'jantar',
    'cafe',
    'lanche1',
    'lanche2',
  ].filter((r) => refeicoes.includes(r));

  const temPrincipalEscolhido = preferidos.some((g) =>
    GRUPOS_PRINCIPAIS_REFEICAO.includes(g)
  );

  for (const refeicao of ordemPlanejamento) {
    let pool = preferidos.filter((g) =>
      grupoProteicoPermitidoPorRestricoes(g, contexto.restricoes)
    );

    // Almoço/jantar: se há frango/peixe/carne/tofu/leguminosas, ovos não são primeira escolha
    if (
      (refeicao === 'almoco' || refeicao === 'jantar') &&
      temPrincipalEscolhido
    ) {
      const principais = pool.filter((g) => GRUPOS_PRINCIPAIS_REFEICAO.includes(g));
      if (principais.length > 0) {
        pool = principais;
        ajustes.push('FORCOU_PRINCIPAL_ALMOCO_JANTAR');
      }
    }

    const candidatos = ordenarCandidatos(
      pool.filter((g) =>
        podeUsar(g, refeicao, contagem, anterior, false, preferidos)
      ),
      refeicao,
      contagem,
      preferidos,
      contexto.estilo
    );

    // Fallback: relaxar consecutivo
    let escolhido: GrupoProteinaPaciente | null = candidatos[0] || null;
    if (!escolhido) {
      const relax = ordenarCandidatos(
        pool.filter((g) => adeq(g, refeicao) >= 3 && (contagem[g] || 0) < maxDiaParaGrupo(g)),
        refeicao,
        contagem,
        preferidos,
        contexto.estilo
      );
      escolhido = relax[0] || null;
      if (escolhido) alertas.push('REPETICAO_PROTEICA_ACIMA_DO_DESEJADO');
    }

    // Último recurso: qualquer grupo permitido por restrição com adeq >= 3
    if (!escolhido && !somentePreferidos) {
      const todos = filtrarGruposPorRestricoes(
        GRUPOS_PADRAO_SEM_PREFERENCIA,
        contexto.restricoes
      ).filter((g) => adeq(g, refeicao) >= 3);
      escolhido = ordenarCandidatos(todos, refeicao, contagem, preferidos, contexto.estilo)[0] || null;
      if (escolhido && !preferidos.includes(escolhido)) {
        alertas.push('PROTEINA_FORA_DA_PREFERENCIA_UTILIZADA');
      }
    }

    if (
      escolhido &&
      somentePreferidos &&
      !norm.grupos.includes(escolhido) &&
      !GRUPOS_PRATICOS_LANCHE.includes(escolhido)
    ) {
      // práticos de lanche foram expandidos intencionalmente
    }

    grupoPrincipalPorRefeicao[refeicao] = escolhido;
    if (escolhido) {
      contagem[escolhido] = (contagem[escolhido] || 0) + 1;
      if (anterior === escolhido) ajustes.push('EVITOU_REPETICAO_CONSECUTIVA');
      anterior = escolhido;
    }

    gruposAlternativosPorRefeicao[refeicao] = ordenarCandidatos(
      pool.filter((g) => g !== escolhido && adeq(g, refeicao) >= 3),
      refeicao,
      contagem,
      preferidos,
      contexto.estilo
    ).slice(0, 3);
  }

  // Reordenar anterior chronologically for consecutive tracking was planning order;
  // rebuild consecutive check in chronological order and soft-fix if needed
  const chrono = REFEICOES_NUTRI_ORDEM.filter((r) => refeicoes.includes(r));
  for (let i = 1; i < chrono.length; i++) {
    const prev = grupoPrincipalPorRefeicao[chrono[i - 1]];
    const cur = grupoPrincipalPorRefeicao[chrono[i]];
    if (prev && cur && prev === cur) {
      const alts = gruposAlternativosPorRefeicao[chrono[i]].filter(
        (g) => g !== prev && (contagem[g] || 0) < maxDiaParaGrupo(g)
      );
      if (alts[0]) {
        contagem[cur] = Math.max(0, (contagem[cur] || 1) - 1);
        grupoPrincipalPorRefeicao[chrono[i]] = alts[0];
        contagem[alts[0]] = (contagem[alts[0]] || 0) + 1;
        ajustes.push('EVITOU_REPETICAO_CONSECUTIVA');
        if (cur === 'ovos') ajustes.push('LIMITOU_OVOS');
      } else {
        alertas.push('REPETICAO_PROTEICA_ACIMA_DO_DESEJADO');
      }
    }
  }

  const gruposSelecionados = [
    ...new Set(
      Object.values(grupoPrincipalPorRefeicao).filter(Boolean) as GrupoProteinaPaciente[]
    ),
  ];

  if (
    norm.grupos.length >= 3 &&
    gruposSelecionados.length < 3 &&
    !alertas.includes('CATALOGO_INSUFICIENTE_PARA_VARIAR_PROTEINAS')
  ) {
    alertas.push('CATALOGO_INSUFICIENTE_PARA_VARIAR_PROTEINAS');
  }

  return {
    versao: 1,
    grupoPrincipalPorRefeicao,
    gruposAlternativosPorRefeicao,
    gruposPermitidos: preferidos,
    gruposSelecionados,
    preferenciasNormalizadas: norm.grupos,
    ajustes: [...new Set(ajustes)],
    alertas: [...new Set(alertas)],
  };
}

export interface ValidacaoVariedadeProteicaDia {
  valida: boolean;
  gruposPrincipaisUsados: GrupoProteinaPaciente[];
  quantidadeGruposDistintos: number;
  repeticoesPorGrupo: Partial<Record<GrupoProteinaPaciente, number>>;
  repeticoesConsecutivas: {
    grupo: GrupoProteinaPaciente;
    refeicoes: RefeicaoNutriKey[];
  }[];
  alertas: AlertaDistribuicaoProteicaDia[];
}

export function validarVariedadeProteicaDia(
  gruposPorRefeicao: Partial<Record<RefeicaoNutriKey, GrupoProteinaPaciente | null>>,
  preferencias: GrupoProteinaPaciente[],
  restricoes: string[]
): ValidacaoVariedadeProteicaDia {
  void restricoes;
  const alertas: AlertaDistribuicaoProteicaDia[] = [];
  const repeticoesPorGrupo: Partial<Record<GrupoProteinaPaciente, number>> = {};
  const usados: GrupoProteinaPaciente[] = [];
  const consecutivas: ValidacaoVariedadeProteicaDia['repeticoesConsecutivas'] = [];

  let prev: GrupoProteinaPaciente | null = null;
  for (const r of REFEICOES_NUTRI_ORDEM) {
    const g = gruposPorRefeicao[r] ?? null;
    if (!g) continue;
    if (!usados.includes(g)) usados.push(g);
    repeticoesPorGrupo[g] = (repeticoesPorGrupo[g] || 0) + 1;
    if (prev === g) {
      consecutivas.push({ grupo: g, refeicoes: [REFEICOES_NUTRI_ORDEM[REFEICOES_NUTRI_ORDEM.indexOf(r) - 1], r] });
    }
    prev = g;
  }

  for (const [g, n] of Object.entries(repeticoesPorGrupo)) {
    if ((n || 0) > maxDiaParaGrupo(g as GrupoProteinaPaciente)) {
      alertas.push('REPETICAO_PROTEICA_ACIMA_DO_DESEJADO');
    }
  }
  if ((repeticoesPorGrupo.ovos || 0) >= 3) {
    alertas.push('REPETICAO_PROTEICA_ACIMA_DO_DESEJADO');
  }
  if (preferencias.length >= 3 && usados.length < 3) {
    alertas.push('CATALOGO_INSUFICIENTE_PARA_VARIAR_PROTEINAS');
  }
  if (preferencias.length <= 1) {
    alertas.push('BAIXA_VARIEDADE_PROTEICA_DECLARADA');
  }

  const valida =
    (repeticoesPorGrupo.ovos || 0) <= 2 &&
    consecutivas.length === 0 &&
    (preferencias.length < 3 || usados.length >= Math.min(3, preferencias.length));

  return {
    valida,
    gruposPrincipaisUsados: usados,
    quantidadeGruposDistintos: usados.length,
    repeticoesPorGrupo,
    repeticoesConsecutivas: consecutivas,
    alertas: [...new Set(alertas)],
  };
}
