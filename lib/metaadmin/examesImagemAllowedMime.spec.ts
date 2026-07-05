import { describe, expect, it } from 'vitest';
import {
  exameImagemExibeComoImagem,
  isMimeExameImagemAceito,
  mimeNormalizadoExameImagem,
} from './examesImagemAllowedMime';

describe('mimeNormalizadoExameImagem', () => {
  it('infere JPEG pela extensão quando type vazio', () => {
    expect(mimeNormalizadoExameImagem({ type: '', name: 'laudo.JPG' })).toBe('image/jpeg');
  });

  it('mantém type explícito', () => {
    expect(mimeNormalizadoExameImagem({ type: 'image/png', name: 'x' })).toBe('image/png');
  });
});

describe('isMimeExameImagemAceito', () => {
  it('aceita PDF e imagens comuns', () => {
    expect(isMimeExameImagemAceito('application/pdf')).toBe(true);
    expect(isMimeExameImagemAceito('image/webp')).toBe(true);
    expect(isMimeExameImagemAceito('image/tiff')).toBe(false);
  });
});

describe('exameImagemExibeComoImagem', () => {
  it('usa mime quando presente', () => {
    expect(exameImagemExibeComoImagem('image/jpeg', 'x.pdf')).toBe(true);
    expect(exameImagemExibeComoImagem('application/pdf', 'x.jpg')).toBe(false);
  });

  it('infere por nome quando mime ausente', () => {
    expect(exameImagemExibeComoImagem(undefined, 'foto.PNG')).toBe(true);
    expect(exameImagemExibeComoImagem(undefined, 'laudo.pdf')).toBe(false);
  });
});
