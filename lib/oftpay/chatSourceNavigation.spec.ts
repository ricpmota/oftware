import { describe, expect, it } from 'vitest';
import { evidenceDedupeKey, parseCitedSourceIds, partitionResponseSources, resolveApostilaForSource } from './chatSourceNavigation';

const apostilas = [
  { id: '1', name: 'Córnea, Esclera e Conjuntiva.pdf', subject: 'Córnea', url: 'https://example.com/cornea.pdf', storagePath: 'OFTREVIEW 2023/APOSTILAS/Córnea, Esclera e Conjuntiva.pdf' },
  { id: '2', name: 'Emergência Oftalmológica.pdf', subject: 'Emergência', url: 'https://example.com/emergencia.pdf' },
  { id: '3', name: 'Córnea básica.pdf', subject: 'Córnea', url: 'https://example.com/cornea-basica.pdf' },
];

describe('navegação por fontes estruturadas', () => {
  it('lê os ids citados na ordem em que aparecem', () => {
    expect(parseCitedSourceIds('Bullet [2, 3]\nOutro [1]')).toEqual([2, 3, 1]);
  });

  it('separa citadas e demais sem descartar nenhuma', () => {
    const sources = [
      { id: 1, title: 'A' },
      { id: 2, title: 'B' },
      { id: 3, title: 'C' },
    ];
    const parts = partitionResponseSources(sources, 'Texto [2]');
    expect(parts.cited.map((source) => source.id)).toEqual([2]);
    expect(parts.others.map((source) => source.id)).toEqual([1, 3]);
  });

  it('resolve pelo nome exato do PDF', () => {
    const found = resolveApostilaForSource({ title: 'Emergência Oftalmológica.pdf' }, apostilas);
    expect(found?.id).toBe('2');
  });

  it('resolve pela URI real quando o título não basta', () => {
    const found = resolveApostilaForSource(
      {
        title: 'Trecho indexado',
        uri: 'gs://bucket/OFTREVIEW 2023/APOSTILAS/Emergência Oftalmológica.pdf',
      },
      apostilas
    );
    expect(found?.id).toBe('2');
  });

  it('não escolhe apostila quando o título casa com mais de um arquivo', () => {
    const found = resolveApostilaForSource({ title: 'Córnea' }, apostilas);
    expect(found).toBeNull();
  });
});

describe('deduplicação das fontes', () => {
  it('junta a mesma página e preserva trechos sem página', () => {
    const pageKey = evidenceDedupeKey({
      title: 'Córnea.pdf',
      snippet: 'primeiro trecho',
      page: 124,
      uri: 'gs://bucket/cornea.pdf',
    });
    const samePage = evidenceDedupeKey({
      title: 'Córnea.pdf',
      snippet: 'outro trecho da mesma página',
      page: 124,
      uri: 'gs://bucket/cornea.pdf',
    });
    const noPageA = evidenceDedupeKey({ title: 'Córnea.pdf', snippet: 'trecho a' });
    const noPageB = evidenceDedupeKey({ title: 'Córnea.pdf', snippet: 'trecho b' });
    expect(pageKey).toBe(samePage);
    expect(noPageA).not.toBe(noPageB);
  });
});
