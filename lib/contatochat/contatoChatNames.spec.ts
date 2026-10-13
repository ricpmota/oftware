import { describe, expect, it } from 'vitest';
import {
  contatoChatContactName,
  contatoChatDisplayName,
  contatoChatFirstName,
  contatoChatSpokenName,
} from './contatoChatNames';

describe('contatoChatNames', () => {
  it('usa Dr./Dra. só quando o gênero está no cadastro', () => {
    expect(contatoChatDisplayName('Ricardo Mota', 'M')).toBe('Dr. Ricardo Mota');
    expect(contatoChatDisplayName('Mariana Alves', 'F')).toBe('Dra. Mariana Alves');
    expect(contatoChatDisplayName('Ricardo Mota', undefined)).toBe('Ricardo Mota');
    expect(contatoChatDisplayName('Ricardo Mota', '')).toBe('Ricardo Mota');
  });

  it('monta o nome do contato com primeiro nome', () => {
    expect(contatoChatFirstName('Ricardo Mota')).toBe('Ricardo');
    expect(contatoChatContactName('Ricardo Mota', 'M')).toBe('Notificações Dr. Ricardo');
    expect(contatoChatContactName('Mariana Alves', 'F')).toBe('Notificações Dra. Mariana');
    expect(contatoChatContactName('Ricardo Mota')).toBe('Notificações Ricardo Mota');
  });

  it('reusa o nome profissional no aviso de contato direto', () => {
    expect(contatoChatSpokenName('Ricardo Mota', 'M')).toBe('Dr. Ricardo Mota');
    expect(contatoChatSpokenName('Equipe Clínica', null)).toBe('Equipe Clínica');
  });
});
