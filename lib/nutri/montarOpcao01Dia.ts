/**
 * Montagem da Opção 01 no nível do dia:
 * 1) distribui grupos proteicos
 * 2) monta cada refeição com o grupo atribuído
 * 3) reotimiza até 2 passagens se ovos ≥ 3
 */

import { REFEICOES_NUTRI_ORDEM, type RefeicaoNutriKey } from '@/lib/nutri/distribuicaoMetasRefeicoes';
import {
  distribuirProteinasAoLongoDoDia,
  validarVariedadeProteicaDia,
  type DistribuicaoProteinasDia,
} from '@/lib/nutri/distribuicaoProteinasDia';
import {
  grupoProteicoDeItemId,
  type GrupoProteinaPaciente,
} from '@/lib/nutri/gruposProteicos';
import {
  montarPratoPadraoRefeicaoV2,
  type ContextoMontagemPratoV2,
  type ItemCatalogoMontagem,
  type ResultadoMontagemPratoAutomatico,
} from '@/lib/nutri/montagemPratoPadrao';

export interface ContextoMontagemDiaOpcao01 {
  estilo: string;
  sintomasGI: string;
  restricoes: string[];
  preferenciasProteina: string[];
  metasPorRefeicao: Record<
    RefeicaoNutriKey,
    { proteinaAlvoG: number; caloriasAlvoKcal: number; origemMetas: 'distribuicao_nova' | 'legado' }
  >;
  itensPorRefeicao: Record<RefeicaoNutriKey, ItemCatalogoMontagem[]>;
  ajustesDistribuicao?: string[];
  cafeReduzido?: boolean;
}

export interface ResultadoMontagemDiaOpcao01 {
  distribuicao: DistribuicaoProteinasDia;
  porRefeicao: Record<RefeicaoNutriKey, ResultadoMontagemPratoAutomatico>;
  gruposPrincipaisFinais: Record<RefeicaoNutriKey, GrupoProteinaPaciente | null>;
  validacao: ReturnType<typeof validarVariedadeProteicaDia>;
}

function montarComGrupo(
  ctx: ContextoMontagemDiaOpcao01,
  refeicao: RefeicaoNutriKey,
  dist: DistribuicaoProteinasDia,
  contagem: Partial<Record<GrupoProteinaPaciente, number>>,
  anterior: GrupoProteinaPaciente | null,
  forcarGrupo?: GrupoProteinaPaciente | null
): ResultadoMontagemPratoAutomatico {
  const meta = ctx.metasPorRefeicao[refeicao];
  const grupo =
    forcarGrupo !== undefined ? forcarGrupo : dist.grupoPrincipalPorRefeicao[refeicao];
  const montagemCtx: ContextoMontagemPratoV2 = {
    refeicao,
    metaProteinaG: meta.proteinaAlvoG,
    metaCaloriasKcal: meta.caloriasAlvoKcal,
    origemMetas: meta.origemMetas,
    estilo: ctx.estilo,
    sintomasGI: ctx.sintomasGI,
    restricoes: ctx.restricoes,
    preferenciasProteina: ctx.preferenciasProteina,
    itensDisponiveis: ctx.itensPorRefeicao[refeicao],
    ajustesDistribuicao: ctx.ajustesDistribuicao,
    cafeReduzido: ctx.cafeReduzido && refeicao === 'cafe',
    slotId: `slot_${refeicao}_1`,
    distribuicaoProteicaDia: dist,
    contextoProteico: {
      grupoPrincipalDesejado: grupo,
      gruposAlternativos: dist.gruposAlternativosPorRefeicao[refeicao] || [],
      contagemGruposNoDia: { ...contagem },
      grupoUsadoNaRefeicaoAnterior: anterior,
      restringirAoUniversoPreferencial: dist.preferenciasNormalizadas.length > 0,
    },
  };
  return montarPratoPadraoRefeicaoV2(montagemCtx);
}

export function montarOpcao01DiaCompleto(
  ctx: ContextoMontagemDiaOpcao01
): ResultadoMontagemDiaOpcao01 {
  const dist = distribuirProteinasAoLongoDoDia({
    preferenciasProteina: ctx.preferenciasProteina,
    restricoes: ctx.restricoes,
    estilo: ctx.estilo,
    metasProteinaPorRefeicao: Object.fromEntries(
      REFEICOES_NUTRI_ORDEM.map((r) => [r, ctx.metasPorRefeicao[r].proteinaAlvoG])
    ) as Record<RefeicaoNutriKey, number>,
  });

  const porRefeicao = {} as Record<RefeicaoNutriKey, ResultadoMontagemPratoAutomatico>;
  const gruposFinais = {
    cafe: null,
    lanche1: null,
    almoco: null,
    lanche2: null,
    jantar: null,
  } as Record<RefeicaoNutriKey, GrupoProteinaPaciente | null>;
  const contagem: Partial<Record<GrupoProteinaPaciente, number>> = {};
  let anterior: GrupoProteinaPaciente | null = null;

  for (const refeicao of REFEICOES_NUTRI_ORDEM) {
    const r = montarComGrupo(ctx, refeicao, dist, contagem, anterior);
    porRefeicao[refeicao] = r;
    const g =
      r.grupoProteicoPrincipal ||
      (r.opcao?.itensSelecionados
        ?.map((id) => grupoProteicoDeItemId(id))
        .find(Boolean) as GrupoProteinaPaciente | undefined) ||
      null;
    gruposFinais[refeicao] = g;
    if (g) {
      contagem[g] = (contagem[g] || 0) + 1;
      anterior = g;
    }
  }

  // Reotimização: se ovos ≥ 3, tentar trocar refeições (máx. 2 passagens)
  // Prioridade: almoço/jantar, depois lanches.
  let passagens = 0;
  while (passagens < 2 && (contagem.ovos || 0) >= 3) {
    passagens += 1;
    const alvo = (['almoco', 'jantar', 'lanche2', 'lanche1'] as RefeicaoNutriKey[]).find(
      (r) => gruposFinais[r] === 'ovos'
    );
    if (!alvo) break;
    const alternativa =
      dist.gruposAlternativosPorRefeicao[alvo].find((g) => g !== 'ovos') ||
      dist.gruposPermitidos.find((g) => {
        if (g === 'ovos') return false;
        if (alvo === 'almoco' || alvo === 'jantar') {
          return (
            g === 'frango' ||
            g === 'peixe' ||
            g === 'carne' ||
            g === 'tofu' ||
            g === 'leguminosas'
          );
        }
        return g === 'whey' || g === 'laticinios' || g === 'proteina_vegetal';
      });
    if (!alternativa) break;

    const contagemSem = { ...contagem };
    contagemSem.ovos = Math.max(0, (contagemSem.ovos || 1) - 1);
    const idx = REFEICOES_NUTRI_ORDEM.indexOf(alvo);
    const ant = idx > 0 ? gruposFinais[REFEICOES_NUTRI_ORDEM[idx - 1]] : null;
    const novo = montarComGrupo(ctx, alvo, dist, contagemSem, ant, alternativa);
    if (novo.opcao && novo.grupoProteicoPrincipal && novo.grupoProteicoPrincipal !== 'ovos') {
      porRefeicao[alvo] = novo;
      gruposFinais[alvo] = novo.grupoProteicoPrincipal;
      contagem.ovos = contagemSem.ovos;
      contagem[novo.grupoProteicoPrincipal] =
        (contagem[novo.grupoProteicoPrincipal] || 0) + 1;
    } else {
      break;
    }
  }

  const validacao = validarVariedadeProteicaDia(
    gruposFinais,
    dist.preferenciasNormalizadas,
    ctx.restricoes
  );

  // Anexa distribuição validada em cada slot
  for (const refeicao of REFEICOES_NUTRI_ORDEM) {
    const op = porRefeicao[refeicao].opcao;
    if (op?.geracaoAutomatica) {
      op.geracaoAutomatica.distribuicaoProteicaDia = {
        versao: 1,
        preferenciasNormalizadas: dist.preferenciasNormalizadas,
        grupoPrincipalPorRefeicao: { ...gruposFinais },
        gruposDistintosUsados: validacao.gruposPrincipaisUsados,
        alertas: [...new Set([...dist.alertas, ...validacao.alertas])],
      };
      op.geracaoAutomatica.grupoProteicoPrincipal = gruposFinais[refeicao];
    }
  }

  return {
    distribuicao: dist,
    porRefeicao,
    gruposPrincipaisFinais: gruposFinais,
    validacao,
  };
}
