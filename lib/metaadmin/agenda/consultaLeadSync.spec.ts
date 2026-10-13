import { describe, expect, it } from 'vitest';
import { shouldAdvanceMedicoLeadToConsultasAgendadas } from '@/lib/metaadmin/agenda/consultaLeadSync';

describe('shouldAdvanceMedicoLeadToConsultasAgendadas', () => {
  it('só tira o lead de Não Qualificado', () => {
    expect(shouldAdvanceMedicoLeadToConsultasAgendadas('nao_qualificado')).toBe(true);
    expect(shouldAdvanceMedicoLeadToConsultasAgendadas('')).toBe(true);
    expect(shouldAdvanceMedicoLeadToConsultasAgendadas(undefined)).toBe(true);
    expect(shouldAdvanceMedicoLeadToConsultasAgendadas('enviado_contato')).toBe(false);
    expect(shouldAdvanceMedicoLeadToConsultasAgendadas('em_tratamento')).toBe(false);
    expect(shouldAdvanceMedicoLeadToConsultasAgendadas('nao_qualificado', 'custom_xyz')).toBe(false);
  });
});
