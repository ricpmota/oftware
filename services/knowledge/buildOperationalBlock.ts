import type { OperationalFlowMatch } from './operationalFlowTypes';

/**
 * Bloco curto e prioritário para injeção no systemInstruction (texto puro).
 */
export function buildOperationalBlock(match: OperationalFlowMatch): string {
  if (!match.matched || !match.steps.length) return '';

  const profileLine = match.profile ? `PERFIL: ${match.profile}` : '';
  const surfaceLine = match.surface ? `SUPERFÍCIE: ${match.surface}` : '';
  const objectiveLine = match.objective ? `OBJETIVO: ${match.objective}` : '';
  const sourceLine = match.sourcePath ? `FONTE_OPERACIONAL: ${match.sourcePath}` : '';

  const headerBits = [profileLine, surfaceLine, objectiveLine, sourceLine].filter(Boolean);

  const stepsBlock = match.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const moderateNote =
    match.confidenceBand === 'moderate'
      ? [
          'AVISO_CONFIANCA_MODERADA',
          'Este fluxo foi identificado com confiança moderada — confirme se é isso que deseja.',
          '',
        ]
      : [];

  const lines: string[] = [
    'FLUXO_OPERACIONAL_PRIORITARIO',
    '',
    ...headerBits,
    '',
    ...moderateNote,
    'PASSOS OFICIAIS:',
    stepsBlock,
    '',
    'REGRAS:',
    '- Usar este fluxo exato ao responder; não substituir por instruções genéricas.',
    '- Não inventar nomes alternativos de telas, abas, botões ou campos.',
    '- Se o usuário perguntar por campos específicos não descritos neste fluxo, diga que dependem do formulário exibido na pasta indicada (sem inventar rótulos).',
  ];

  return lines.join('\n').trim();
}
