import { describe, expect, it } from 'vitest';
import { resolveRelatorioPacientePublicToken } from './resolveRelatorioPacientePublicToken';

describe('resolveRelatorioPacientePublicToken', () => {
  it('escolhe o token curto quando há hex legado e código novo', () => {
    const hex = '5a5cf958fe94e6bae897f97c33c313edc2f87592f8b990e92293abe81c28feb8';
    expect(resolveRelatorioPacientePublicToken([hex, 'X23KMD7P'])).toEqual({
      shortToken: 'X23KMD7P',
    });
  });

  it('normaliza o token curto para maiúsculas', () => {
    expect(resolveRelatorioPacientePublicToken(['x23kmd7p'])).toEqual({
      shortToken: 'X23KMD7P',
    });
  });

  it('sinaliza ausência de curto quando só há hex legado', () => {
    const hex = '5a5cf958fe94e6bae897f97c33c313edc2f87592f8b990e92293abe81c28feb8';
    expect(resolveRelatorioPacientePublicToken([hex])).toEqual({ shortToken: null });
  });
});
