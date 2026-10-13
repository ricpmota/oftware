import { describe, expect, it } from 'vitest';
import {
  buildContatoChatVcard,
  CONTATO_CHAT_VCARD_NOTE,
  contatoChatVcardFilename,
} from './contatoChatVcard';

describe('contatoChatVcard', () => {
  it('gera vCard 3.0 com nome, telefone e organização dinâmicos', () => {
    const vcf = buildContatoChatVcard({
      contactName: 'Notificações Dr. Ricardo',
      organizationName: 'Oftware',
      phoneDigits: '5583988192848',
      websiteUrl: 'https://www.oftware.com.br',
      note: CONTATO_CHAT_VCARD_NOTE,
    });
    expect(vcf).toContain('BEGIN:VCARD');
    expect(vcf).toContain('VERSION:3.0');
    expect(vcf).toContain('FN:Notificações Dr. Ricardo');
    expect(vcf).toContain('ORG:Oftware');
    expect(vcf).toContain('TEL;TYPE=CELL:+5583988192848');
    expect(vcf).toContain('URL:https://www.oftware.com.br');
    expect(vcf).toContain('NOTE:Canal de notificações');
    expect(vcf).toContain('END:VCARD');
    expect(vcf).not.toContain('5583XXXXXXXXX');
  });

  it('inclui foto por URI quando disponível', () => {
    const vcf = buildContatoChatVcard({
      contactName: 'Notificações Dra. Mariana',
      organizationName: 'Oftware',
      phoneDigits: '5583999999999',
      websiteUrl: 'https://www.oftware.com.br',
      note: CONTATO_CHAT_VCARD_NOTE,
      photoUrl: 'https://cdn.example.com/foto.jpg',
    });
    expect(vcf).toContain('PHOTO;VALUE=URI:https://cdn.example.com/foto.jpg');
  });

  it('gera filename seguro', () => {
    expect(contatoChatVcardFilename('Notificações Dr. Ricardo')).toBe('notificacoes-dr-ricardo.vcf');
  });
});
