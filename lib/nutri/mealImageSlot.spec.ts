import { describe, expect, it } from 'vitest';
import {
  MEAL_IMAGE_PENDING_TIMEOUT_MS,
  findSlotInList,
  isMealImagePendingFresh,
  isMealImageReadyAndCurrent,
  resolveRequestedSlotId,
  slotIdFor,
} from '@/lib/nutri/mealImageSlot';

describe('mealImageSlot', () => {
  it('prefere slotId a slotIndex', () => {
    expect(
      resolveRequestedSlotId({ refeicaoKey: 'almoco', slotId: 'slot_almoco_3', slotIndex: 1 })
    ).toBe('slot_almoco_3');
    expect(resolveRequestedSlotId({ refeicaoKey: 'almoco', slotIndex: 2 })).toBe('slot_almoco_2');
    expect(slotIdFor('cafe', 1)).toBe('slot_cafe_1');
  });

  it('recusa slotId de outra refeição', () => {
    expect(
      resolveRequestedSlotId({ refeicaoKey: 'almoco', slotId: 'slot_jantar_1' })
    ).toBeNull();
    expect(
      resolveRequestedSlotId({ refeicaoKey: 'almoco', slotId: 'slot_almoco_1/../slot_jantar_1' })
    ).toBeNull();
  });

  it('localiza o slot em mapa numerado (formato Firestore legado)', () => {
    const slots = {
      0: { id: 'slot_almoco_1', descricao: 'A' },
      1: { id: 'slot_almoco_2', descricao: 'B' },
    };
    const found = findSlotInList(slots, 'almoco', 'slot_almoco_1');
    expect(found?.index).toBe(0);
    expect(found?.slot.descricao).toBe('A');
  });

  it('localiza o slot pelo id mesmo fora da posição canônica', () => {
    const slots = [
      { id: 'slot_almoco_2', descricao: 'B' },
      { id: 'slot_almoco_1', descricao: 'A' },
    ];
    const found = findSlotInList(slots, 'almoco', 'slot_almoco_1');
    expect(found?.index).toBe(1);
    expect(found?.slot.descricao).toBe('A');
  });

  it('ready + hash atual vs pending abandonado', () => {
    const hash = 'abc';
    expect(
      isMealImageReadyAndCurrent({ status: 'ready', gcsPath: 'cardapio/x.webp', sourceHash: hash }, hash)
    ).toBe(true);
    expect(
      isMealImageReadyAndCurrent({ status: 'ready', gcsPath: 'cardapio/x.webp', sourceHash: 'old' }, hash)
    ).toBe(false);

    const now = Date.parse('2026-09-04T12:00:00.000Z');
    expect(
      isMealImagePendingFresh(
        {
          status: 'pending',
          sourceHash: hash,
          generationStartedAt: '2026-09-04T11:55:00.000Z',
        },
        hash,
        now
      )
    ).toBe(true);
    expect(
      isMealImagePendingFresh(
        {
          status: 'pending',
          sourceHash: hash,
          generationStartedAt: new Date(now - MEAL_IMAGE_PENDING_TIMEOUT_MS - 1).toISOString(),
        },
        hash,
        now
      )
    ).toBe(false);
  });
});
