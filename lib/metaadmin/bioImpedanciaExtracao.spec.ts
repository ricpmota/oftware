import { describe, expect, it } from 'vitest';
import {
  aplicarExtracaoBioAoFormulario,
  listarCamposExtracaoIA,
  normalizarRespostaBioImpedanciaIA,
  sincronizarBioRegistroParaPersistencia,
} from './bioImpedanciaExtracao';
import { getBioAvailableSections, getBioMainMetrics } from '@/utils/bioImpedanciaMetrics';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';

/** Mock de resposta Gemini para app de balança genérica */
const GENERICO_APP_RAW = {
  origemExame: 'generico',
  peso: 69.85,
  imc: 21.8,
  percentualGordura: 17.9,
  massaGorduraKg: 12.5,
  massaMuscularEsqueleticaKg: 29.6,
  massaMuscularKg: 53.7,
  aguaPercentual: 55.6,
  aguaKg: 38.9,
  gorduraVisceral: 8.5,
  metabolismoBasalKcal: 1563.1,
  alturaCm: 179,
  idadeCorporal: 41,
  avisos: [] as string[],
};

describe('normalizarRespostaBioImpedanciaIA — bio genérica', () => {
  it('normaliza campos do dashboard premium e legados', () => {
    const ext = normalizarRespostaBioImpedanciaIA(GENERICO_APP_RAW);

    expect(ext.origemExame).toBe('generica');
    expect(ext.peso).toBe(69.85);
    expect(ext.imc).toBe(21.8);
    expect(ext.percentualGordura).toBe(17.9);
    expect(ext.massaGorduraKg).toBe(12.5);
    expect(ext.massaMuscularKg).toBe(53.7);
    expect(ext.massaMuscularEsqueleticaKg).toBe(29.6);
    expect(ext.gorduraVisceral).toBe(8.5);
    expect(ext.aguaKg).toBe(38.9);
    expect(ext.aguaPercentual).toBe(55.6);
    expect(ext.metabolismoBasalKcal).toBe(1563.1);
    expect(ext.analiseObesidade?.percentualGordura).toBe(17.9);
    expect(ext.composicaoCorporal?.massaGorduraKg).toBe(12.5);
    expect(ext.composicaoCorporal?.aguaTotalLitros).toBe(38.9);
    expect(ext.analiseMusculoGordura?.massaMuscularKg).toBe(53.7);
    expect(ext.massaMagraSegmentar).toBeNull();
  });

  it('listarCamposExtracaoIA mostra campos principais encontrados', () => {
    const ext = normalizarRespostaBioImpedanciaIA(GENERICO_APP_RAW);
    const { encontrados, origemLabel } = listarCamposExtracaoIA(ext);

    expect(origemLabel).toBe('Genérica');
    expect(encontrados).toContain('Peso');
    expect(encontrados).toContain('IMC');
    expect(encontrados).toContain('Gordura %');
    expect(encontrados).toContain('Massa de gordura');
    expect(encontrados).toContain('Massa muscular');
    expect(encontrados).toContain('Gordura visceral');
    expect(encontrados).toContain('Água corporal');
    expect(encontrados).toContain('Metabolismo basal');
    expect(encontrados).not.toContain('Segmentares');
  });
});

describe('aplicarExtracaoBioAoFormulario — bio genérica', () => {
  it('preenche formulário e métricas do dashboard sem sobrescrever com zero', () => {
    const ext = normalizarRespostaBioImpedanciaIA(GENERICO_APP_RAW);
    const prev: Partial<BioImpedanciaRegistro> = {
      peso: 70,
      composicaoCorporal: { aguaTotalLitros: 0, proteinasKg: 0, mineraisKg: 0, massaGorduraKg: 0 },
      analiseMusculoGordura: { massaMuscularKg: 0, massaGorduraKg: 0 },
      analiseObesidade: { percentualGordura: 0 },
    };

    const form = aplicarExtracaoBioAoFormulario(prev, ext, { aplicarData: false });

    expect(form.peso).toBe(69.85);
    expect(form.gorduraVisceral).toBe(8.5);
    expect(form.metabolismoBasalKcal).toBe(1563.1);
    expect(form.origemExame).toBe('generica');
    expect(form.analiseObesidade?.percentualGordura).toBe(17.9);

    const registro = {
      dataRegistro: new Date(),
      peso: form.peso!,
      composicaoCorporal: form.composicaoCorporal!,
      analiseMusculoGordura: form.analiseMusculoGordura!,
      analiseObesidade: form.analiseObesidade!,
      massaMagraSegmentar: form.massaMagraSegmentar!,
      gorduraVisceral: form.gorduraVisceral,
      metabolismoBasalKcal: form.metabolismoBasalKcal,
      massaMuscularKg: form.massaMuscularKg,
      percentualGordura: form.percentualGordura,
      aguaKg: form.aguaKg,
    } as BioImpedanciaRegistro;

    const m = getBioMainMetrics(registro);
    expect(m.peso).toBe(69.85);
    expect(m.percentualGordura).toBe(17.9);
    expect(m.massaMuscularKg).toBe(53.7);
    expect(m.gorduraVisceral).toBe(8.5);
    expect(m.aguaKg).toBe(38.9);
    expect(m.metabolismoBasalKcal).toBe(1563.1);

    const sections = getBioAvailableSections(registro);
    expect(sections.resumo).toBe(true);
    expect(sections.composicao).toBe(true);
    expect(sections.segmentar).toBe(false);
  });
});

describe('sincronizarBioRegistroParaPersistencia', () => {
  it('replica campos estendidos nos objetos legados ao salvar', () => {
    const synced = sincronizarBioRegistroParaPersistencia({
      peso: 70,
      percentualGordura: 18,
      massaMuscularKg: 32,
      massaGorduraKg: 12,
      aguaKg: 40,
      gorduraVisceral: 9,
      composicaoCorporal: { aguaTotalLitros: 0, proteinasKg: 0, mineraisKg: 0, massaGorduraKg: 0 },
      analiseMusculoGordura: { massaMuscularKg: 0, massaGorduraKg: 0 },
      analiseObesidade: { percentualGordura: 0 },
    });

    expect(synced.analiseObesidade?.percentualGordura).toBe(18);
    expect(synced.analiseMusculoGordura?.massaMuscularKg).toBe(32);
    expect(synced.composicaoCorporal?.massaGorduraKg).toBe(12);
    expect(synced.composicaoCorporal?.aguaTotalLitros).toBe(40);
  });
});

describe('normalizarRespostaBioImpedanciaIA — InBody mínimo', () => {
  it('mantém segmentar e composição InBody', () => {
    const ext = normalizarRespostaBioImpedanciaIA({
      origemExame: 'inbody',
      peso: 72,
      composicaoCorporal: {
        aguaTotalLitros: 38,
        proteinasKg: 9.5,
        mineraisKg: 3.2,
        massaGorduraKg: 14,
      },
      analiseMusculoGordura: { massaMuscularKg: 28, massaGorduraKg: 14 },
      analiseObesidade: { percentualGordura: 19.4 },
      massaMagraSegmentar: {
        arm_r: { kg: 2.5, percentual: 105 },
        trunk: { kg: 22, percentual: 98 },
      },
      avisos: [],
    });

    expect(ext.origemExame).toBe('inbody');
    expect(ext.composicaoCorporal?.proteinasKg).toBe(9.5);
    expect(ext.massaMagraSegmentar?.arm_r?.kg).toBe(2.5);
  });
});
