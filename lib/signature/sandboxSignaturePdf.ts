import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const SANDBOX_SIMULATION_DISCLAIMER_TITLE =
  'ASSINATURA DIGITAL SIMULADA - AMBIENTE DE TESTE';

export const SANDBOX_SIMULATION_DISCLAIMER_LINES = [
  SANDBOX_SIMULATION_DISCLAIMER_TITLE,
  'Este documento não possui validade jurídica.',
] as const;

/** Marcador ASCII para testes automatizados (presente só no PDF simulado). */
export const SANDBOX_SIMULATION_PAGE_MARKER = '[SANDBOX-OFTWARE-TEST-NOTICE]';

export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** SHA-256 em Base64 — usado no CMS HUB quando `formatoDadosEntrada` é `Base64`. */
export function sha256Base64(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('base64');
}

function formatSimulationDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export type SandboxSimulationPageMeta = {
  simulatedAt: Date;
  originalHash: string;
  providerId: string;
};

/** Anexa página final com aviso de simulação (sem menção a ICP-Brasil / PAdES). */
export async function appendSandboxSimulationPage(
  originalPdfBytes: Buffer | Uint8Array,
  meta: SandboxSimulationPageMeta
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
  pdfDoc.setTitle('OFTWARE_SANDBOX_SIMULATION');
  pdfDoc.setSubject(SANDBOX_SIMULATION_PAGE_MARKER);
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const bodyLines = [
    ...SANDBOX_SIMULATION_DISCLAIMER_LINES,
    `Provider: ${meta.providerId}`,
    `Data/hora da simulação: ${formatSimulationDateTime(meta.simulatedAt)}`,
    `Hash original: ${meta.originalHash}`,
    SANDBOX_SIMULATION_PAGE_MARKER,
  ];

  let y = height - 72;
  const marginX = 48;
  const lineHeight = 16;
  const titleSize = 12;
  const bodySize = 10;

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i]!;
    const isTitle = i === 0;
    page.drawText(line, {
      x: marginX,
      y,
      size: isTitle ? titleSize : bodySize,
      font: isTitle ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight + (isTitle ? 4 : 0);
  }

  return pdfDoc.save();
}

/** Verifica PDF simulado: metadados + página extra com aviso (testes). */
export async function pdfHasSandboxSimulationNotice(
  originalPdfBytes: Buffer | Uint8Array,
  signedPdfBytes: Buffer | Uint8Array
): Promise<boolean> {
  const original = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
  const signed = await PDFDocument.load(signedPdfBytes, { ignoreEncryption: true });

  if (signed.getPageCount() !== original.getPageCount() + 1) return false;
  if (signed.getTitle() !== 'OFTWARE_SANDBOX_SIMULATION') return false;
  if (signed.getSubject() !== SANDBOX_SIMULATION_PAGE_MARKER) return false;

  return true;
}
