/**
 * Script de desenvolvimento — auditoria de cobertura do catálogo.
 * Uso: npx vite-node --config vitest.config.ts scripts/auditar-catalogo-nutri.ts
 * Flags: --amostra · --v1 · --v2 (padrão)
 * Não sobrescreve V1 ao gerar V2. Não grava Firestore.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contarCenariosMatriz,
  executarAuditoriaCoberturaCatalogo,
  gerarMarkdownRelatorioAuditoria,
} from '../lib/nutri/auditoriaCoberturaCatalogo';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const modo = (process.argv.includes('--amostra') ? 'amostra' : 'completo') as
    | 'completo'
    | 'amostra';
  const versaoCatalogo: 1 | 2 = process.argv.includes('--v1') ? 1 : 2;
  const label = `v${versaoCatalogo}`;

  console.log(
    `[auditoria] modo=${modo} catalogo=${label} cenários esperados=${contarCenariosMatriz(modo)}`
  );
  const started = Date.now();
  const relatorio = executarAuditoriaCoberturaCatalogo({ modo, versaoCatalogo });
  const elapsed = Date.now() - started;
  console.log(
    `[auditoria] concluído em ${elapsed}ms · atendimento=${(
      relatorio.resumo.percentualAtendimento * 100
    ).toFixed(1)}% · classe=${relatorio.resumo.classificacao}`
  );

  const jsonPath = join(root, 'artifacts', 'nutri', `auditoria-catalogo-${label}.json`);
  const mdPath = join(root, 'docs', 'nutri', `AUDITORIA_COBERTURA_CATALOGO_${label.toUpperCase()}.md`);

  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(mdPath), { recursive: true });

  const jsonOut = {
    geradoEm: new Date().toISOString(),
    elapsedMs: elapsed,
    versaoCatalogo,
    resumo: relatorio.resumo,
    lacunasPorcao: relatorio.lacunasPorcao,
    sugestoesExpansao: relatorio.sugestoesExpansao,
    sugestoesRejeitadas: relatorio.sugestoesRejeitadas,
    notasCusto: relatorio.notasCusto,
    cenariosNaoAtendidosAmostra: relatorio.cenarios
      .filter((c) => c.status === 'nao_atendido')
      .slice(0, 200),
    totalCenariosCompletos: relatorio.cenarios.length,
  };

  writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2), 'utf8');
  writeFileSync(
    mdPath,
    gerarMarkdownRelatorioAuditoria(relatorio).replace(
      '# Auditoria de cobertura do catálogo — V1',
      `# Auditoria de cobertura do catálogo — ${label.toUpperCase()}`
    ),
    'utf8'
  );

  console.log(`[auditoria] JSON → ${jsonPath}`);
  console.log(`[auditoria] MD   → ${mdPath}`);
}

main();
