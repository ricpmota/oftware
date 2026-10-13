import { describe, expect, it } from 'vitest';
import { isAllowedRemotePhotoUrl, sniffImageContentType, storageObjectPath } from './relatorioFotoUrl';

const BUCKET = 'oftware-9201e.appspot.com';

describe('storageObjectPath', () => {
  it('lê objeto público do bucket do projeto', () => {
    expect(
      storageObjectPath(
        `https://storage.googleapis.com/${BUCKET}/medico-perfil-fotos/1_a.png`,
        BUCKET
      )
    ).toBe('medico-perfil-fotos/1_a.png');
  });

  it('lê URL do Firebase Storage', () => {
    const encoded = encodeURIComponent('medico-perfil-fotos/1_a.png');
    expect(
      storageObjectPath(
        `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encoded}?alt=media`,
        BUCKET
      )
    ).toBe('medico-perfil-fotos/1_a.png');
  });

  it('recusa bucket de outro projeto', () => {
    expect(
      storageObjectPath('https://storage.googleapis.com/outro-bucket/medico-perfil-fotos/a.png', BUCKET)
    ).toBeNull();
  });
});

describe('isAllowedRemotePhotoUrl', () => {
  it('aceita foto do Google', () => {
    expect(isAllowedRemotePhotoUrl('https://lh3.googleusercontent.com/a/foto')).toBe(true);
  });

  it('recusa endereço genérico', () => {
    expect(isAllowedRemotePhotoUrl('https://example.com/foto.jpg')).toBe(false);
    expect(isAllowedRemotePhotoUrl('http://lh3.googleusercontent.com/a/foto')).toBe(false);
  });
});

describe('sniffImageContentType', () => {
  it('reconhece jpeg e png', () => {
    expect(sniffImageContentType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(sniffImageContentType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe('image/png');
  });
});
