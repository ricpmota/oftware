import { readFile } from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  appendPrescriptionDigitalSignatureVisualFooter,
  buildPrescriptionSignatureFooterCenterLines,
  formatPhysicianDisplayNameForFooter,
} from '@/lib/signature/prescriptionSignedPdfVisualFooter';

async function minimalPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Prescrição teste', { x: 72, y: 700, size: 12, font });
  return doc.save();
}

describe('prescriptionSignedPdfVisualFooter', () => {
  it('formatPhysicianDisplayNameForFooter preserva nome', () => {
    expect(formatPhysicianDisplayNameForFooter('Ana Silva')).toBe('Ana Silva');
  });

  it('buildPrescriptionSignatureFooterCenterLines — endereços fixos, sem query string', () => {
    const signedAt = new Date('2026-05-22T14:30:00');
    const lines = buildPrescriptionSignatureFooterCenterLines({
      physicianName: 'Ana Silva',
      signedAt,
    });
    expect(lines[0]).toMatch(/Receituário assinado digitalmente por Ana Silva em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\./);
    expect(lines.some((l) => l.includes('MP nº 2.200-2/2001'))).toBe(true);
    expect(lines.some((l) => l === 'https://validar.iti.gov.br')).toBe(true);
    expect(lines.some((l) => l === 'https://www.oftware.com.br/prescricao/documento')).toBe(true);
    expect(lines.some((l) => l === 'Consulte este documento:')).toBe(true);
    expect(lines.some((l) => l.includes('Consulte a autenticidade'))).toBe(false);

    const joined = lines.join(' ');
    expect(joined).not.toMatch(/codigo=/i);
    expect(joined).not.toMatch(/_format=/i);
    expect(joined).not.toMatch(/vercel\.app/i);
    expect(joined).not.toMatch(/cfm\.org/i);
    expect(joined).not.toMatch(/Acesse o PDF original/i);
  });

  it('appendPrescriptionDigitalSignatureVisualFooter altera última página', async () => {
    const icpPath = path.join(process.cwd(), 'public', 'icp.jpg');
    let icpExists = false;
    try {
      await readFile(icpPath);
      icpExists = true;
    } catch {
      icpExists = false;
    }

    const original = await minimalPdfBytes();
    const withFooter = await appendPrescriptionDigitalSignatureVisualFooter(original, {
      physicianName: 'Dr. Teste',
      signedAt: new Date('2026-01-15T10:00:00'),
      validationCode: 'OFTW-RE-4HEWEVWW',
      publicValidationUrl: 'https://www.oftware.com.br/prescricao/documento?codigo=OFTW-RE-4HEWEVWW',
      publicPdfUrl:
        'https://www.oftware.com.br/prescricao/documento?_format=application/pdf&codigo=OFTW-RE-4HEWEVWW',
      icpImagePath: icpExists ? icpPath : undefined,
    });

    expect(withFooter.byteLength).toBeGreaterThan(original.byteLength);
    const reloaded = await PDFDocument.load(withFooter);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
