import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  appendPrescriptionDigitalSignatureVisualFooter,
  computePrescriptionFooterLayoutPt,
  PRESCRIPTION_FOOTER_BAND_HEIGHT_PT,
  PRESCRIPTION_FOOTER_BOTTOM_MARGIN_PT,
  PRESCRIPTION_FOOTER_STACK_GAP_PT,
} from '@/lib/signature/prescriptionSignedPdfVisualFooter';
import {
  appendContratoTratamentoPatientDigitalSignatureVisualFooter,
  buildContratoTratamentoPatientSignatureFooterCenterLines,
  contratoPatientFooterBottomOffsetPt,
  PATIENT_SIGNATURE_ABOVE_BAND_GAP_PT,
  PATIENT_SIGNATURE_ABOVE_BAND_HEIGHT_PT,
} from '@/lib/signature/contratoTratamentoPatientSignedPdfVisualFooter';
import { computeContratoPatientEasySignSignaturePositionMm } from '@/lib/signature/bryEasySign/contratoEasySignSignaturePosition';
import { estimatePatientRubricaPositionOnLastPageMm } from '@/lib/documentos/contrato-tratamento/contratoTratamentoSignaturePageLayout';

const PATIENT_EVIDENCE_FOOTER_BAND_HEIGHT_PT = 132;

async function minimalPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Contrato teste', { x: 72, y: 700, size: 12, font });
  return doc.save();
}

describe('contratoTratamentoPatientSignedPdfVisualFooter', () => {
  it('buildContratoTratamentoPatientSignatureFooterCenterLines — EasySign e URL fixa', () => {
    const lines = buildContratoTratamentoPatientSignatureFooterCenterLines({
      patientName: 'Maria Silva',
      signedAt: new Date('2026-05-22T14:30:00'),
    });
    expect(lines[0]).toMatch(
      /Contrato de Tratamento assinado eletronicamente por Maria Silva em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}:\d{2}/
    );
    expect(lines.some((l) => l.includes('BRy EasySign'))).toBe(true);
    expect(lines.some((l) => l === 'https://www.oftware.com.br/contratos/documento')).toBe(true);
  });

  it('contratoPatientFooterBottomOffsetPt empilha acima do rodapé médico', () => {
    expect(contratoPatientFooterBottomOffsetPt()).toBe(
      PRESCRIPTION_FOOTER_BOTTOM_MARGIN_PT +
        PRESCRIPTION_FOOTER_BAND_HEIGHT_PT +
        PRESCRIPTION_FOOTER_STACK_GAP_PT
    );
  });

  it('rubrica EasySign fica em faixa acima das evidências (não sobrepõe texto)', () => {
    const layout = computePrescriptionFooterLayoutPt({
      footerBottomOffsetPt: contratoPatientFooterBottomOffsetPt(),
      footerBandHeightPt: PATIENT_EVIDENCE_FOOTER_BAND_HEIGHT_PT,
      leadImageAboveEvidenceBand: true,
      leadImageAboveBandHeightPt: PATIENT_SIGNATURE_ABOVE_BAND_HEIGHT_PT,
      leadImageAboveBandGapPt: PATIENT_SIGNATURE_ABOVE_BAND_GAP_PT,
    });

    expect(layout.signatureBandBottom).toBeGreaterThan(layout.footerTop);
    expect(layout.textRowTopY).toBeLessThan(layout.footerTop);
    expect(layout.signatureBandBottom).toBeGreaterThan(layout.textRowTopY);
  });

  it('appendContratoTratamentoPatientDigitalSignatureVisualFooter aumenta PDF', async () => {
    const original = await minimalPdfBytes();
    const withPatient = await appendContratoTratamentoPatientDigitalSignatureVisualFooter(original, {
      patientName: 'Maria Silva',
      signedAt: new Date('2026-06-01T12:00:00'),
      validationCode: 'OFTW-CT-ABCD1234',
      publicValidationUrl:
        'https://www.oftware.com.br/contratos/documento?codigo=OFTW-CT-ABCD1234',
      publicPdfUrl:
        'https://www.oftware.com.br/contratos/documento?_format=application/pdf&codigo=OFTW-CT-ABCD1234',
    });

    expect(withPatient.byteLength).toBeGreaterThan(original.byteLength);
  });
});

describe('contratoEasySignSignaturePosition', () => {
  it('computeContratoPatientEasySignSignaturePositionMm retorna última página', async () => {
    const pdf = await minimalPdfBytes();
    const position = await computeContratoPatientEasySignSignaturePositionMm(pdf);
    const estimate = estimatePatientRubricaPositionOnLastPageMm();

    expect(position.page).toBe(1);
    expect(position.x).toBe(estimate.x);
    expect(position.y).toBe(estimate.y);
    expect(position.width).toBe(estimate.width);
    expect(position.height).toBe(estimate.height);
  });
});
