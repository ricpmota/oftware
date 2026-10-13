import { describe, expect, it } from 'vitest';
import {
  canAccessMentorCenter,
  canManageMentorContent,
  isMentorAdminEmail,
} from './permissions';

describe('mentorados permissions', () => {
  it('não trata ausência de isVerificado como true', () => {
    expect(canAccessMentorCenter({ email: 'medico@example.com' })).toBe(false);
    expect(canAccessMentorCenter({ email: 'medico@example.com', isVerificado: false })).toBe(false);
  });

  it('libera acesso para médico verificado', () => {
    expect(canAccessMentorCenter({ email: 'medico@example.com', isVerificado: true })).toBe(true);
  });

  it('não trata ausência de uploadMentor como true', () => {
    expect(canManageMentorContent({ email: 'medico@example.com', isVerificado: true })).toBe(false);
    expect(
      canManageMentorContent({
        email: 'medico@example.com',
        isVerificado: true,
        uploadMentor: false,
      })
    ).toBe(false);
  });

  it('libera gestão quando uploadMentor === true', () => {
    expect(
      canManageMentorContent({
        email: 'medico@example.com',
        uploadMentor: true,
      })
    ).toBe(true);
  });

  it('libera administradores principais mesmo sem os campos salvos', () => {
    expect(isMentorAdminEmail('Ricpmota.med@gmail.com')).toBe(true);
    expect(canAccessMentorCenter({ email: 'pedrok.carneiro1@gmail.com' })).toBe(true);
    expect(canManageMentorContent({ email: 'ricpmota.med@gmail.com' })).toBe(true);
  });
});
