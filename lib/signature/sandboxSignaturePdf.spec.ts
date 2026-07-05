import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  appendSandboxSimulationPage,
  pdfHasSandboxSimulationNotice,
  sha256Base64,
  sha256Hex,
} from '@/lib/signature/sandboxSignaturePdf';

async function createMinimalPdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Documento de teste', { x: 40, y: 100, size: 12, font });
  return Buffer.from(await doc.save());
}

describe('sandboxSignaturePdf', () => {
  it('calcula SHA-256 estável', () => {
    const h = sha256Hex(Buffer.from('pdf-test'));
    expect(h).toHaveLength(64);
    expect(h).toBe(sha256Hex(Buffer.from('pdf-test')));
  });

  it('SHA-256 Base64 tem 44 caracteres (digest de 32 bytes)', () => {
    const data = Buffer.from('pdf-test');
    expect(sha256Base64(data)).toHaveLength(44);
    expect(sha256Base64(data)).not.toBe(sha256Hex(data));
  });

  it('PDF simulado contém aviso de ambiente de teste', async () => {
    const original = await createMinimalPdfBuffer();
    const originalHash = sha256Hex(original);
    const signed = await appendSandboxSimulationPage(original, {
      simulatedAt: new Date('2026-05-22T15:00:00-03:00'),
      originalHash,
      providerId: 'sandbox_mock',
    });
    expect(await pdfHasSandboxSimulationNotice(original, signed)).toBe(true);
    expect(sha256Hex(Buffer.from(signed))).not.toBe(originalHash);
  });
});
