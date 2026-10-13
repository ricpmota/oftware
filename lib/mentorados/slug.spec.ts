import { describe, expect, it } from 'vitest';
import { nextUniqueMentorSlug, slugifyMentorTitle } from './slug';

describe('mentorados slug', () => {
  it('gera slug a partir do título', () => {
    expect(slugifyMentorTitle('Como Armazenar a Medicação')).toBe('como-armazenar-a-medicacao');
  });

  it('garante unicidade com sufixo numérico', () => {
    const existing = new Set(['como-armazenar-a-medicacao']);
    expect(nextUniqueMentorSlug('Como Armazenar a Medicação', existing)).toBe(
      'como-armazenar-a-medicacao-2'
    );
  });
});
