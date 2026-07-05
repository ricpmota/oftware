import { describe, expect, it } from 'vitest';
import {
  buildFqdn,
  generateDomainSuggestions,
  mapRegistroBrStatusCode,
  mapRdapAvailability,
} from '@/lib/whiteLabel/cadastroMedicoDomainCheck';
import { formatDomainPreview } from '@/lib/whiteLabel/cadastroMedicoConstants';

describe('cadastroMedicoDomainCheck', () => {
  it('buildFqdn', () => {
    expect(buildFqdn('joaosilva', '.com.br')).toBe('joaosilva.com.br');
  });

  it('formatDomainPreview includes www', () => {
    expect(formatDomainPreview('joaosilva', '.com.br')).toBe('www.joaosilva.com.br');
  });

  it('mapRegistroBrStatusCode', () => {
    expect(mapRegistroBrStatusCode(0)).toBe('disponivel');
    expect(mapRegistroBrStatusCode(2)).toBe('indisponivel');
    expect(mapRegistroBrStatusCode(5)).toBe('em_analise');
  });

  it('mapRdapAvailability', () => {
    expect(mapRdapAvailability(false)).toBe('disponivel');
    expect(mapRdapAvailability(true)).toBe('indisponivel');
  });

  it('generateDomainSuggestions excludes current fqdn', () => {
    const suggestions = generateDomainSuggestions({
      nome: 'João',
      sobrenome: 'Silva',
      nomeMarca: 'Instituto João Silva',
      extensaoDominio: '.com.br',
      excludeFqdn: 'joaosilva.com.br',
    });
    expect(suggestions.some((s) => s === 'www.joaosilva.com.br')).toBe(false);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]?.startsWith('www.')).toBe(true);
  });
});
