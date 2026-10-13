import { describe, expect, it } from 'vitest';
import { matchMonitorStage } from '@/lib/match/matchMonitorStage';

describe('estágio de monitoramento do Match', () => {
  it('quem só entrou na página ainda não tem perfil', () => {
    expect(matchMonitorStage(null)).toBe('visit');
  });

  it('perfil incompleto fica em onboarding', () => {
    expect(matchMonitorStage({ status: 'draft', onboardingCompleted: false })).toBe('onboarding');
  });

  it('onboarding concluído entra no ar', () => {
    expect(matchMonitorStage({ status: 'active', onboardingCompleted: true })).toBe('active');
  });

  it('opt-out pausa mesmo com onboarding feito', () => {
    expect(matchMonitorStage({ status: 'active', onboardingCompleted: true, discoverable: false })).toBe('paused');
  });
});
