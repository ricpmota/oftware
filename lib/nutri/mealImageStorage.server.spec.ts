import { describe, expect, it } from 'vitest';
import { buildMealImageGcsPath, isMealImageGcsPathForPatient } from '@/lib/nutri/mealImageStorage.server';

describe('buildMealImageGcsPath', () => {
  it('usa path versionado por generationId', () => {
    expect(
      buildMealImageGcsPath({
        patientId: 'abc123',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        sourceHash: '82f813aabbccddee',
        mimeType: 'image/webp',
        generationId: '20260904T120000Z-a1b2c3d4e5',
      })
    ).toBe(
      'cardapio/abc123/almoco/slot_almoco_1/82f813aabbccddee/20260904T120000Z-a1b2c3d4e5.webp'
    );
  });

  it('13–14. mesmo sourceHash com generationId diferente → gcsPath diferente', () => {
    const base = {
      patientId: 'abc123',
      refeicaoKey: 'almoco' as const,
      slotId: 'slot_almoco_1',
      sourceHash: '82f813aabbccddee',
      mimeType: 'image/webp',
    };
    const a = buildMealImageGcsPath({ ...base, generationId: 'gen-aaa' });
    const b = buildMealImageGcsPath({ ...base, generationId: 'gen-bbb' });
    expect(a).not.toBe(b);
    expect(a).toContain('82f813aabbccddee');
    expect(b).toContain('82f813aabbccddee');
  });

  it('21. path legado continua reconhecido para o paciente', () => {
    expect(
      isMealImageGcsPathForPatient('cardapio/abc/almoco/slot_almoco_1/h.webp', 'abc')
    ).toBe(true);
    expect(
      isMealImageGcsPathForPatient(
        'cardapio/abc/almoco/slot_almoco_1/h/20260904T120000Z-abcd.webp',
        'abc'
      )
    ).toBe(true);
  });

  it('não usa o prefixo chatnutri/', () => {
    const path = buildMealImageGcsPath({
      patientId: 'p1',
      refeicaoKey: 'cafe',
      slotId: 'slot_cafe_1',
      sourceHash: 'hashhashhashhash',
      mimeType: 'image/png',
      generationId: 'gen1',
    });
    expect(path.startsWith('cardapio/')).toBe(true);
    expect(path).not.toContain('chatnutri/');
  });

  it('signed URL só para prefixo cardapio/{patientId}/', () => {
    expect(isMealImageGcsPathForPatient('cardapio/abc/almoco/slot_almoco_1/h.webp', 'abc')).toBe(true);
    expect(isMealImageGcsPathForPatient('chatnutri/abc/foto.jpg', 'abc')).toBe(false);
    expect(isMealImageGcsPathForPatient('cardapio/outro/almoco/x.webp', 'abc')).toBe(false);
  });

  it('recusa path traversal e generationId inválido', () => {
    expect(isMealImageGcsPathForPatient('cardapio/abc/../secret.webp', 'abc')).toBe(false);
    expect(isMealImageGcsPathForPatient('cardapio/abc/almoco/../../etc/passwd', 'abc')).toBe(false);
    expect(() =>
      buildMealImageGcsPath({
        patientId: '../hack',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        sourceHash: 'hashhashhashhash',
        mimeType: 'image/webp',
        generationId: 'gen1',
      })
    ).toThrow(/inválido/i);
    expect(() =>
      buildMealImageGcsPath({
        patientId: 'abc',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        sourceHash: 'hashhashhashhash',
        mimeType: 'image/webp',
        generationId: 'gen/../x',
      })
    ).toThrow(/inválido/i);
  });
});
