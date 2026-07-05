export type SimpleChecklistSnapshot = {
  filled: number;
  total: number;
  status?: 'good' | 'partial' | 'weak' | null;
};

export function buildPostReextractMessage(params: {
  fileName: string;
  examTypeLabel: string;
  previousChecklist: SimpleChecklistSnapshot | null;
  currentChecklist: SimpleChecklistSnapshot;
  reviewStatus?: 'ok' | 'attention' | 'review' | null;
}): string {
  const { fileName, examTypeLabel, previousChecklist, currentChecklist, reviewStatus } = params;
  const base = `Arquivo "${fileName}" reprocessado com sucesso para ${examTypeLabel}.`;
  const coverageNow = `Campos-chave: ${currentChecklist.filled}/${currentChecklist.total}.`;
  const parts: string[] = [base, coverageNow];

  if (previousChecklist && previousChecklist.total > 0 && currentChecklist.total > 0) {
    const beforeRatio = previousChecklist.filled / previousChecklist.total;
    const afterRatio = currentChecklist.filled / currentChecklist.total;
    if (afterRatio > beforeRatio) {
      parts.push(
        `Cobertura melhorou (${previousChecklist.filled}/${previousChecklist.total} -> ${currentChecklist.filled}/${currentChecklist.total}).`
      );
    } else if (afterRatio < beforeRatio) {
      parts.push(
        `Cobertura reduziu (${previousChecklist.filled}/${previousChecklist.total} -> ${currentChecklist.filled}/${currentChecklist.total}).`
      );
    } else if (
      previousChecklist.filled !== currentChecklist.filled ||
      previousChecklist.total !== currentChecklist.total
    ) {
      parts.push(
        `Cobertura atual: ${currentChecklist.filled}/${currentChecklist.total} (antes ${previousChecklist.filled}/${previousChecklist.total}).`
      );
    }
  }

  if (reviewStatus === 'review') {
    parts.push('Revisão manual ainda recomendada.');
  } else if (reviewStatus === 'attention') {
    parts.push('Persistem pontos de atenção para revisão médica.');
  }

  return parts.join(' ');
}
