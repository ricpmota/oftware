import { describe, expect, it } from 'vitest';
import { applyMedicoResponsavelIdForFirestoreUpdate, pickNonEmptyMedicoResponsavelId } from './medicoResponsavelIdOnUpdate';

describe('applyMedicoResponsavelIdForFirestoreUpdate', () => {
  it('mantém string não vazia', () => {
    expect(
      applyMedicoResponsavelIdForFirestoreUpdate({ nome: 'A', medicoResponsavelId: '  med-1  ' })
    ).toEqual({ nome: 'A', medicoResponsavelId: 'med-1' });
  });

  it('omite null, undefined e string vazia para não apagar o vínculo no Firestore', () => {
    expect(applyMedicoResponsavelIdForFirestoreUpdate({ medicoResponsavelId: null })).toEqual({});
    expect(applyMedicoResponsavelIdForFirestoreUpdate({ medicoResponsavelId: undefined })).toEqual({});
    expect(applyMedicoResponsavelIdForFirestoreUpdate({ medicoResponsavelId: '  ' })).toEqual({});
    expect(
      applyMedicoResponsavelIdForFirestoreUpdate({ medicoRecomendadoId: 'med-1', medicoResponsavelId: null })
    ).toEqual({ medicoRecomendadoId: 'med-1' });
  });
});

describe('pickNonEmptyMedicoResponsavelId', () => {
  it('escolhe o primeiro id não vazio', () => {
    expect(pickNonEmptyMedicoResponsavelId(null, '  ', 'med-1', 'med-2')).toBe('med-1');
    expect(pickNonEmptyMedicoResponsavelId(null, undefined, '')).toBeNull();
  });
});
