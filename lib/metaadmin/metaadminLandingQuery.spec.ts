import { describe, expect, it } from 'vitest';
import { parseMetaadminLandingMenu } from '@/lib/metaadmin/metaadminLandingQuery';

describe('parseMetaadminLandingMenu', () => {
  it('abre pacientes a partir do link do aviso', () => {
    expect(parseMetaadminLandingMenu('?menu=pacientes')).toBe('pacientes');
    expect(parseMetaadminLandingMenu('menu=pacientes&x=1')).toBe('pacientes');
  });

  it('ignora menus desconhecidos', () => {
    expect(parseMetaadminLandingMenu('?menu=financeiro')).toBeNull();
    expect(parseMetaadminLandingMenu('')).toBeNull();
  });
});
