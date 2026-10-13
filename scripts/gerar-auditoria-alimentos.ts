import { writeFileSync, mkdirSync } from 'fs';
import {
  seedAlimentosDoCatalogoBase,
  ROTULO_GRUPO_ALIMENTO,
  CATEGORIAS_ALIMENTO,
} from '../lib/nutri/alimentosNutricionista';

const lista = seedAlimentosDoCatalogoBase();
const catLabel = Object.fromEntries(CATEGORIAS_ALIMENTO.map((c) => [c.id, c.label]));

const byCat = new Map<string, typeof lista>();
for (const a of lista) {
  const k = a.categoria;
  if (!byCat.has(k)) byCat.set(k, []);
  byCat.get(k)!.push(a);
}

const lines: string[] = [];
lines.push('# Auditoria — Lista de Alimentos (MetaNutri)');
lines.push('');
lines.push(
  'Documento gerado a partir do **mesmo seed** usado na página **Alimentos** (`/metanutri` → Alimentos).'
);
lines.push('');
lines.push(
  'Fonte: `CATALOGO_ALIMENTOS_METANUTRI` → `seedAlimentosDoCatalogoBase()` (porção unitária: 1 ovo, 1 colher, 100g…).'
);
lines.push('');
lines.push(
  'Use esta lista para revisar e corrigir: nome, categoria, peso, proteína, kcal e grupos.'
);
lines.push('');
lines.push('| Campo | Significado |');
lines.push('| --- | --- |');
lines.push('| **Nome** | Nome limpo (sem `(100g)` no texto) |');
lines.push('| **Categoria** | Proteína / Carboidrato / Gordura / etc. |');
lines.push('| **Peso** | Gramas da porção de referência |');
lines.push('| **Proteína** | Gramas de proteína nessa porção |');
lines.push('| **Kcal** | Calorias nessa porção |');
lines.push('| **Grupos** | Onde o item pode aparecer nos Planos (após favoritar) |');
lines.push('');
lines.push('## Resumo');
lines.push('');
lines.push(`- **Total de alimentos:** ${lista.length}`);
for (const c of CATEGORIAS_ALIMENTO) {
  const n = (byCat.get(c.id) || []).length;
  if (n) lines.push(`- **${c.label}:** ${n}`);
}
lines.push('');

for (const c of CATEGORIAS_ALIMENTO) {
  const items = byCat.get(c.id) || [];
  if (!items.length) continue;
  lines.push(`## ${c.label} (${items.length})`);
  lines.push('');
  lines.push('| # | ID | Nome | Categoria | Peso (g) | Proteína (g) | Kcal | Grupos |');
  lines.push('| ---: | --- | --- | --- | ---: | ---: | ---: | --- |');
  items.forEach((a, i) => {
    const grupos = a.grupos.map((g) => ROTULO_GRUPO_ALIMENTO[g]).join(', ');
    const peso = a.peso_g != null ? String(a.peso_g) : '—';
    lines.push(
      `| ${i + 1} | \`${a.id}\` | ${a.nome.replace(/\|/g, '/')} | ${
        catLabel[a.categoria] || a.categoria
      } | ${peso} | ${a.proteina_g} | ${a.calorias_kcal} | ${grupos} |`
    );
  });
  lines.push('');
}

lines.push('## Como usar na correção');
lines.push('');
lines.push('1. Revise cada linha (nome, macros e grupos).');
lines.push('2. Anote o que deve mudar (ex.: peso errado, grupo a mais/menos, duplicata).');
lines.push(
  '3. Depois aplicamos as correções no seed/catálogo e/ou na base de cada nutricionista.'
);
lines.push('');
lines.push('---');
lines.push('');
lines.push(`_Gerado em ${new Date().toISOString().slice(0, 10)}_`);

mkdirSync('artifacts/nutri', { recursive: true });
writeFileSync('artifacts/nutri/auditoria-alimentos-metanutri.md', lines.join('\n'), 'utf8');
console.log(`OK ${lista.length} itens`);
