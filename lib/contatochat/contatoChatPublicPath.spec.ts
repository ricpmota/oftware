import { describe, expect, it } from 'vitest';
import {
  buildContatoChatPublicPath,
  buildContatoChatVcardPath,
} from './contatoChatPublicPath';

describe('contatoChatPublicPath', () => {
  it('prefere slug no mesmo padrão do Meu Link', () => {
    expect(buildContatoChatPublicPath({ slug: 'ricardo-mota', medicoId: 'abc' })).toBe(
      '/contatochat/ricardo-mota',
    );
  });

  it('usa ?m= quando não há slug', () => {
    expect(buildContatoChatPublicPath({ medicoId: 'med123' })).toBe('/contatochat?m=med123');
  });

  it('aponta o vCard para a rota da API com o identificador', () => {
    expect(buildContatoChatVcardPath({ medicoId: 'med123' })).toBe('/api/contatochat/vcard?m=med123');
    expect(buildContatoChatVcardPath({ slug: 'ricardo-mota' })).toBe(
      '/api/contatochat/vcard?slug=ricardo-mota',
    );
  });
});
