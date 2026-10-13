import { describe, expect, it } from 'vitest';
import { buildContatoChatWhatsAppUrl, formatContatoChatPhoneDisplay } from './contatoChatPhone';

describe('contatoChatPhone', () => {
  it('formata DDI + DDD + celular', () => {
    expect(formatContatoChatPhoneDisplay('5583988192848')).toBe('+55 (83) 98819-2848');
  });

  it('monta wa.me com mensagem curta', () => {
    const url = buildContatoChatWhatsAppUrl('5583988192848');
    expect(url.startsWith('https://wa.me/5583988192848?text=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Salvei este contato');
  });
});
