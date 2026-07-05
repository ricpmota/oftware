import { describe, expect, it } from 'vitest';
import { storagePathFromGcsPublicUrl } from './examesImagemStoragePath';

describe('storagePathFromGcsPublicUrl', () => {
  it('extrai caminho do objeto após o nome do bucket', () => {
    const url =
      'https://storage.googleapis.com/meu-bucket/pacientes-exames-imagem/pid123/arquivo.pdf';
    expect(storagePathFromGcsPublicUrl(url)).toBe('pacientes-exames-imagem/pid123/arquivo.pdf');
  });

  it('retorna null para URL inválida ou outro host', () => {
    expect(storagePathFromGcsPublicUrl(null)).toBe(null);
    expect(storagePathFromGcsPublicUrl('https://example.com/x')).toBe(null);
  });
});
