import { describe, expect, it } from 'vitest';
import {
  normalizeAuthPhotoUrl,
  resolvePacienteAuthUidForPhoto,
} from './resolvePacienteAuthUidForPhoto';

const AUTH_UID = 'xY7kL2mN9pQ4rS8tU1vW3zA5';
const OTHER_UID = 'aB1cD2eF3gH4iJ5kL6mN7oP8';

describe('resolvePacienteAuthUidForPhoto', () => {
  it('usa o userId quando é UID real do Auth', () => {
    expect(resolvePacienteAuthUidForPhoto({ id: 'doc1', userId: AUTH_UID })).toBe(AUTH_UID);
  });

  it('não usa o prefixo do cadastro temporário do médico', () => {
    expect(
      resolvePacienteAuthUidForPhoto({
        id: 'doc1',
        userId: `${AUTH_UID}_1734123456789`,
      })
    ).toBeNull();
  });

  it('não reaproveita o UID de outro paciente pelo prefixo', () => {
    expect(
      resolvePacienteAuthUidForPhoto({
        id: 'doc2',
        userId: `${OTHER_UID}_1768852689049`,
      })
    ).toBeNull();
  });

  it('não usa o id do documento Firestore como se fosse Auth', () => {
    expect(resolvePacienteAuthUidForPhoto({ id: AUTH_UID, userId: '' })).toBeNull();
  });

  it('rejeita e-mail_timestamp', () => {
    expect(
      resolvePacienteAuthUidForPhoto({
        userId: 'tadrio1988@gmail.com_1768852689049',
      })
    ).toBeNull();
  });
});

describe('normalizeAuthPhotoUrl', () => {
  it('força https e tamanho estável em fotos do Google', () => {
    expect(
      normalizeAuthPhotoUrl('http://lh3.googleusercontent.com/a/ACg8ocFoto=s96-c')
    ).toBe('https://lh3.googleusercontent.com/a/ACg8ocFoto=s128-c');
  });

  it('devolve null para vazio', () => {
    expect(normalizeAuthPhotoUrl('  ')).toBeNull();
  });
});
