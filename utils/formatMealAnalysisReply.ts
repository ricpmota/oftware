import type { VisionParseResult } from '@/lib/chatnutri/safeParseGeminiJson';

const CONF_EXPLICACAO: Record<'low' | 'medium' | 'high', string> = {
  high:
    'Alta — alimentos e porções bem definidos na foto; a estimativa tende a refletir bem o que aparece no prato.',
  medium:
    'Média — alguma parte da porção ou do preparo ficou ambígua; os números podem variar um pouco na prática.',
  low: 'Baixa — imagem escura, cortada ou com itens difíceis de ver; trate os valores como **ordem de grandeza**.',
};

function round1(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return (Math.round(x * 10) / 10).toString();
}

/**
 * Texto exibido ao paciente após análise da foto (ChatNutri / ChatIA com meal).
 * Usa **negrito** compatível com `renderInlineBold` nos clientes.
 */
export function formatMealAnalysisReply(
  result: VisionParseResult,
  mealLabel: string,
  opts?: { avulsaNoChat?: boolean }
): string {
  const { items, totals, confidence, notes } = result;
  const confKey = confidence === 'medium' || confidence === 'high' ? confidence : 'low';
  const confText = CONF_EXPLICACAO[confKey];

  const lines: string[] = [];

  if (opts?.avulsaNoChat) {
    lines.push(
      '**Análise só neste chat** — exibida aqui para referência rápida; **não** foi salva no histórico ChatNutri de nenhum paciente.'
    );
    lines.push('');
  }

  lines.push(`**Análise da refeição — ${mealLabel}**`);
  lines.push('');

  lines.push('**O que aparece no prato**');
  if (items.length === 0) {
    lines.push(
      '- Não foi possível listar itens separados; os **totais abaixo** refletem uma estimativa única da refeição.'
    );
  } else {
    for (const it of items) {
      const name = (it.name || 'Alimento').trim() || 'Alimento';
      const portion = (it.portionDescription || '').trim();
      const partLine = portion ? ` (${portion})` : '';
      const hasNums =
        (it.calories ?? 0) > 0 || (it.protein ?? 0) > 0 || (it.carbs ?? 0) > 0 || (it.fat ?? 0) > 0;
      const nums = hasNums
        ? ` → ~${Math.round(Number(it.calories) || 0)} kcal; proteína ${round1(it.protein)} g; carboidrato ${round1(it.carbs)} g; gordura ${round1(it.fat)} g`
        : '';
      lines.push(`- **${name}**${partLine}${nums}`);
    }
  }

  lines.push('');
  lines.push('**Estimativa total da refeição**');
  lines.push(`- **Calorias (energia):** ~${Math.round(Number(totals.calories) || 0)} **kcal** — soma aproximada do que essa refeição pode fornecer em termos de energia.`);
  lines.push(
    `- **Proteínas:** **${round1(totals.protein)} g** — nutrientes formados principalmente por **aminocácidos**; costumam ajudar na **saciedade** e no **apoio à massa magra** (músculos, enzimas etc.), conforme sua dieta habitual.`
  );
  lines.push(
    `- **Carboidratos:** **${round1(totals.carbs)} g** — nutriente cujo papel principal costuma ser **fornecer energia** (amido, fibras e açúcares dos alimentos, como arroz, pão, frutas, doces).`
  );
  lines.push(
    `- **Gorduras:** **${round1(totals.fat)} g** — **lipídios** da refeição (óleos, manteiga, carnes mais gordas, abacate, castanhas etc.); participam do **sabor**, da **saciedade** e da **absorção** de algumas vitaminas.`
  );

  lines.push('');
  lines.push(`**Confiabilidade da leitura da foto:** ${confText}`);

  const obs = (notes || '').trim();
  if (obs) {
    lines.push('');
    lines.push(`**Comentário da análise:** ${obs}`);
  }

  lines.push('');
  lines.push(
    '_Valores obtidos por estimativa automática a partir da imagem; variam conforme receita, marca e tamanho real da porção. Não substituem orientação individual do seu nutricionista ou médico._'
  );

  return lines.join('\n');
}
