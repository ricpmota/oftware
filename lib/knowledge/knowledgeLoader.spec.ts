import { readFile } from 'fs/promises';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadKnowledge } from './knowledgeLoader';
import type { KnowledgeManifestEntry } from './knowledgeManifest';
import { buildKnowledgeBlock } from './buildKnowledgeBlock';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

const readFileMock = vi.mocked(readFile);

describe('loadKnowledge', () => {
  beforeEach(() => {
    readFileMock.mockReset();
  });

  it('respeita surface', async () => {
    const manifest: KnowledgeManifestEntry[] = [
      { path: 'docs/a.md', surface: 'chatnutri', priority: 1 },
      { path: 'docs/b.md', surface: 'oftreview', priority: 2 },
      { path: 'docs/c.md', surface: 'all', priority: 3 },
    ];
    readFileMock.mockImplementation(async (p) => {
      const s = String(p);
      if (s.includes('a.md')) return 'A';
      if (s.includes('b.md')) return 'B';
      if (s.includes('c.md')) return 'C';
      throw new Error(`unexpected read: ${s}`);
    });

    const r = await loadKnowledge({ surface: 'chatnutri', manifest, rootDir: 'C:\\repo' });
    expect(r.segments.map((x) => x.path)).toEqual(['docs/a.md', 'docs/c.md']);
    expect(readFileMock.mock.calls.every((c) => !String(c[0]).includes('b.md'))).toBe(true);
  });

  it('respeita prioridade', async () => {
    const manifest: KnowledgeManifestEntry[] = [
      { path: 'docs/second.md', surface: 'all', priority: 2 },
      { path: 'docs/first.md', surface: 'all', priority: 1 },
    ];
    readFileMock.mockResolvedValue('x');
    const r = await loadKnowledge({
      surface: 'oftreview',
      manifest,
      rootDir: '/r',
      maxTotalChars: 10_000,
    });
    expect(r.segments.map((x) => x.path)).toEqual(['docs/first.md', 'docs/second.md']);
  });

  it('respeita limite de tamanho', async () => {
    const manifest: KnowledgeManifestEntry[] = [{ path: 'docs/big.md', surface: 'all', priority: 1 }];
    readFileMock.mockResolvedValue('abcdefghij');
    const r = await loadKnowledge({ surface: 'all', manifest, rootDir: '/r', maxTotalChars: 4 });
    expect([...r.segments[0].content].length).toBe(4);
    expect(r.segments[0].content).toBe('abcd');
  });

  it('não inclui arquivos fora do manifest', async () => {
    const manifest: KnowledgeManifestEntry[] = [{ path: 'docs/in.md', surface: 'all', priority: 1 }];
    readFileMock.mockImplementation(async (p) => {
      if (String(p).replace(/\\/g, '/').endsWith('docs/in.md')) return 'ok';
      throw new Error('should not read');
    });
    await loadKnowledge({ surface: 'all', manifest, rootDir: '/repo' });
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });
});

describe('buildKnowledgeBlock', () => {
  it('formata segmentos', () => {
    const block = buildKnowledgeBlock({
      text: 'corpo',
      sources: [{ path: 'docs/t.md', hash: 'a', priority: 1 }],
      segments: [{ path: 'docs/t.md', content: 'corpo', hash: 'a', priority: 1 }],
    });
    expect(block.startsWith('CONHECIMENTO_BASE')).toBe(true);
    expect(block).toContain('[FONTE: docs/t.md]');
    expect(block).toContain('corpo');
  });
});
