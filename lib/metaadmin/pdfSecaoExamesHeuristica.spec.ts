import { describe, expect, it } from 'vitest';
import { avaliarPdfProvavelSecaoExames } from './pdfSecaoExamesHeuristica';

function pdfFile(body: string) {
  return new File([body], 'teste.pdf', { type: 'application/pdf' });
}

describe('avaliarPdfProvavelSecaoExames', () => {
  it('detecta laboratorial por termos típicos', async () => {
    const f = pdfFile(
      'Hemograma completo. Glicose 99 mg/dl. Creatinina valores de referência material recebido.'
    );
    expect(await avaliarPdfProvavelSecaoExames(f)).toBe('laboratorial');
  });

  it('detecta imagem por termos típicos', async () => {
    const f = pdfFile(
      'Laudo radiológico. Tomografia computadorizada abdome. Contraste iodado. USG hepático.'
    );
    expect(await avaliarPdfProvavelSecaoExames(f)).toBe('imagem');
  });

  it('retorna indefinido quando não há pistas claras', async () => {
    const f = pdfFile('Documento genérico sem termos médicos relevantes.');
    expect(await avaliarPdfProvavelSecaoExames(f)).toBe('indefinido');
  });

  it('retorna indefinido para não-PDF', async () => {
    const f = new File(['hemograma glicose'], 'x.txt', { type: 'text/plain' });
    expect(await avaliarPdfProvavelSecaoExames(f)).toBe('indefinido');
  });
});
