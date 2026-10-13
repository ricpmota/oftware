/**
 * Auditoria de naturalidade da Opção 01 (ETAPA 10.5).
 * Preserva relatórios V1/V2 de cobertura; gera artefato próprio.
 *
 * Uso: npx vite-node --config vitest.config.ts scripts/auditar-naturalidade-opcao01.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  avaliarNaturalidadeCombinacao,
  executarAuditoriaCoberturaCatalogo,
} from '../lib/nutri/auditoriaCoberturaCatalogo';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const modo = process.argv.includes('--amostra') ? 'amostra' : 'completo';
  console.log(`[naturalidade] modo=${modo}`);
  const started = Date.now();
  const relatorio = executarAuditoriaCoberturaCatalogo({ modo, versaoCatalogo: 2 });
  const elapsed = Date.now() - started;

  let arrozCafe = 0;
  let arrozLanche = 0;
  let wheyAlmocoJantar = 0;
  let protAlmocoNoCafe = 0;
  let semNatural = 0;
  let ovoArrozCafe = 0;
  const templates: Record<string, number> = {};
  const questionaveis: Record<string, number> = {};

  for (const c of relatorio.cenarios) {
    const ids = c.itensSelecionados || [];
    const join = ids.join(' ').toLowerCase();
    const tpl = c.alertas?.includes('SEM_COMBINACAO_NATURAL_VALIDA' as never)
      ? null
      : undefined;

    // Template via descrição/itens — usar alertas e status
    if (c.status === 'nao_atendido' && c.alertas?.some((a) => String(a).includes('NATURAL'))) {
      semNatural += 1;
    }
    if (c.alertas?.includes('SEM_COMBINACAO_NATURAL_VALIDA')) semNatural += 1;

    if (c.refeicao === 'cafe' && join.includes('arroz')) arrozCafe += 1;
    if (
      (c.refeicao === 'lanche1' || c.refeicao === 'lanche2') &&
      join.includes('arroz')
    ) {
      arrozLanche += 1;
    }
    if (
      (c.refeicao === 'almoco' || c.refeicao === 'jantar') &&
      join.includes('whey')
    ) {
      wheyAlmocoJantar += 1;
    }
    if (
      c.refeicao === 'cafe' &&
      (join.includes('frango') || join.includes('carne') || join.includes('peixe'))
    ) {
      protAlmocoNoCafe += 1;
    }
    if (
      c.refeicao === 'cafe' &&
      (join.includes('ovos') || join.includes('ovo')) &&
      join.includes('arroz')
    ) {
      ovoArrozCafe += 1;
    }

    const nat = avaliarNaturalidadeCombinacao(c.refeicao, ids);
    for (const m of nat.motivos) {
      questionaveis[m] = (questionaveis[m] || 0) + 1;
    }

    // Frequência de template não está no resultado do cenário da auditoria V10;
    // inferir por padrão de itens quando disponível
    void tpl;
    const keyPadrao =
      c.refeicao +
      ':' +
      (join.includes('whey')
        ? 'whey'
        : join.includes('iogurte')
          ? 'iogurte'
          : join.includes('ovos')
            ? 'ovos'
            : join.includes('frango')
              ? 'frango'
              : join.includes('peixe')
                ? 'peixe'
                : join.includes('tofu')
                  ? 'tofu'
                  : 'outro');
    templates[keyPadrao] = (templates[keyPadrao] || 0) + 1;
  }

  const cobertura = relatorio.resumo.percentualAtendimento;
  const md = `# Auditoria de naturalidade da Opção 01 — V1 (ETAPA 10.5)

Gerado em ${new Date().toISOString()} · modo **${modo}** · ${elapsed} ms · catálogo V2.

## Objetivo

Medir o impacto do motor de contexto alimentar sem expandir o catálogo.

## Cobertura nutricional (mesmo motor)

| Métrica | Valor |
|--------:|------:|
| Cenários | ${relatorio.resumo.totalCenarios} |
| Atendimento | ${(cobertura * 100).toFixed(1)}% |
| Classificação | ${relatorio.resumo.classificacao} |

## Violações contextuais (devem tender a zero)

| Violação | Ocorrências |
|----------|------------:|
| Arroz no café | ${arrozCafe} |
| Ovo + arroz no café | ${ovoArrozCafe} |
| Arroz em lanches | ${arrozLanche} |
| Whey em almoço/jantar | ${wheyAlmocoJantar} |
| Proteína de almoço no café | ${protAlmocoNoCafe} |
| SEM_COMBINACAO_NATURAL_VALIDA | ${semNatural} |

## Combinações questionáveis restantes

${
  Object.entries(questionaveis)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([m, n]) => `- \`${m}\`: ${n}`)
    .join('\n') || '- Nenhuma'
}

## Padrões frequentes por refeição (aproximação)

${Object.entries(templates)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([k, n]) => `- ${k}: ${n}`)
  .join('\n')}

## Conclusão

- Arroz no café: **${arrozCafe === 0 ? 'eliminado' : 'AINDA PRESENTE'}**
- Ovo + arroz no café: **${ovoArrozCafe === 0 ? 'eliminado' : 'AINDA PRESENTE'}**
- Motor usa templates + adequação ≥3 + afinidade eliminatória antes do score.

## Limitações

- Catálogo não expandido nesta etapa.
- Cobertura nutricional pode cair frente à V2 pré-contexto (trade-off intencional).
- Templates de café reduzido / digestivo priorizados por estilo e ajustes.

Arquivos de cobertura V1/V2 da ETAPA 10/11 **não** foram sobrescritos.
`;

  const outDir = join(root, 'docs', 'nutri');
  const artDir = join(root, 'artifacts', 'nutri');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(artDir, { recursive: true });

  const jsonPath = join(artDir, 'auditoria-naturalidade-opcao01-v1.json');
  const mdPath = join(outDir, 'AUDITORIA_NATURALIDADE_OPCAO01_V1.md');

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        elapsedMs: elapsed,
        modo,
        cobertura,
        arrozCafe,
        ovoArrozCafe,
        arrozLanche,
        wheyAlmocoJantar,
        protAlmocoNoCafe,
        semNatural,
        questionaveis,
        templates,
      },
      null,
      2
    ),
    'utf8'
  );
  writeFileSync(mdPath, md, 'utf8');
  console.log(`[naturalidade] MD → ${mdPath}`);
  console.log(`[naturalidade] JSON → ${jsonPath}`);
  console.log(
    `[naturalidade] arrozCafe=${arrozCafe} ovoArroz=${ovoArrozCafe} arrozLanche=${arrozLanche}`
  );
}

main();
