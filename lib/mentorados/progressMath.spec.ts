import { describe, expect, it } from 'vitest';
import {
  accumulateWatchDelta,
  mergeWatchedSeconds,
  resumePositionSeconds,
  shouldAutoComplete,
  trailProgressPercent,
  watchedPercentageFromSeconds,
} from './progressMath';

describe('mentorados progress math', () => {
  it('recua 5 segundos no resume sem valor negativo', () => {
    expect(resumePositionSeconds(261)).toBe(256);
    expect(resumePositionSeconds(3)).toBe(0);
    expect(resumePositionSeconds(0)).toBe(0);
  });

  it('calcula percentual a partir de watchedSeconds, não da posição', () => {
    expect(watchedPercentageFromSeconds(90, 100)).toBe(90);
    expect(watchedPercentageFromSeconds(10, 100)).toBe(10);
  });

  it('ignora seek grande no acumulado', () => {
    expect(accumulateWatchDelta(10, 12)).toBe(2);
    expect(accumulateWatchDelta(10, 80)).toBe(0);
  });

  it('mantém o maior watchedSeconds e conclui em 90%', () => {
    expect(mergeWatchedSeconds(40, 25, 100)).toBe(40);
    expect(shouldAutoComplete(90)).toBe(true);
    expect(shouldAutoComplete(89)).toBe(false);
  });

  it('calcula progresso da trilha só com aulas publicadas', () => {
    expect(trailProgressPercent(18, 25)).toBe(72);
    expect(trailProgressPercent(0, 0)).toBe(0);
  });
});
