import { describe, expect, it } from 'vitest';
import {
  KAMILLA_NEUTRAL_THEME,
  parseKamillaInstitutionalBranding,
} from './institutionalContent';

const LIVE_SHAPE = {
  publicName: 'Kamila Montenegro',
  legalName: null,
  slogan: null,
  defaultDescription: 'Saúde feita com presença e propósito.',
  logoMainUrl: 'https://storage.example/kamila/logo-main.png',
  logoDarkUrl: 'https://storage.example/kamila/logo-dark.png',
  iconUrl: 'https://storage.example/kamila/icon.png',
  faviconUrl: 'https://storage.example/kamila/favicon.png',
  primaryColor: '#444E35',
  secondaryColor: '#94A173',
  accentColor: '#EBE3D6',
  backgroundColor: '#111827',
  surfaceColor: '#F9FAFB',
  textColor: '#E8EDED',
  mutedTextColor: '#374151',
  borderColor: '#E5E7EB',
  instagramUrl: null,
  showPoweredByOftware: false,
};

describe('parseKamillaInstitutionalBranding', () => {
  it('usa a paleta clara cadastrada e deixa o fundo escuro de fora', () => {
    const content = parseKamillaInstitutionalBranding(LIVE_SHAPE);
    expect(content?.themeSource).toBe('firestore');
    expect(content?.theme).toEqual({
      canvas: '#F9FAFB',
      paper: '#EBE3D6',
      heading: '#444E35',
      sage: '#94A173',
      ink: '#374151',
      line: '#E5E7EB',
      onHeading: '#EBE3D6',
    });
    expect(JSON.stringify(content?.theme)).not.toMatch(/#4CCB7A|#0A1F44|#30F278|#111827/i);
  });

  it('prefere a logo escura no fundo claro e não abre agendamento sem canal', () => {
    const content = parseKamillaInstitutionalBranding({
      ...LIVE_SHAPE,
      instagramUrl: 'https://instagram.com/exemplo',
    });
    expect(content?.logoUrl).toBe('https://storage.example/kamila/logo-dark.png');
    expect(content?.faviconUrl).toBe('https://storage.example/kamila/favicon.png');
    expect(content?.instagramUrl).toBe('https://instagram.com/exemplo');
    expect(content?.scheduleHref).toBeNull();
    expect(content?.description).toBe('Saúde feita com presença e propósito.');
  });

  it('recusa arquivo e cor do Método e cai na apresentação neutra', () => {
    const content = parseKamillaInstitutionalBranding({
      ...LIVE_SHAPE,
      logoDarkUrl: '/metodo-simbolo-18.png',
      logoMainUrl: null,
      iconUrl: null,
      faviconUrl: '/og-metodo-logotipo-6.jpg',
      primaryColor: '#4CCB7A',
      secondaryColor: '#0A1F44',
    });
    expect(content?.logoUrl).toBeNull();
    expect(content?.faviconUrl).toBeNull();
    expect(content?.themeSource).toBe('neutral');
    expect(content?.theme).toEqual(KAMILLA_NEUTRAL_THEME);
  });

  it('não publica a descrição genérica de seed', () => {
    const content = parseKamillaInstitutionalBranding({
      ...LIVE_SHAPE,
      defaultDescription: 'Acompanhamento médico personalizado com equipe multidisciplinar integrada.',
    });
    expect(content?.description).toBeNull();
  });
});
