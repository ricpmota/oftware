import type { Medico } from '@/types/medico';
import { loadImageForJsPdf } from '@/utils/loadImageForJsPdf';
import type { MetodoImagensTemplate } from '@/lib/metodo/metodoImagens';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';
import { isMetodoOrganizationMember } from '@/lib/organization/isMetodoOrganizationMember';
import { mergeMedicoWhiteLabelSources } from '@/lib/whiteLabel/mergeMedicoWhiteLabelSources';

export const DEFAULT_MEDICO_PDF_LOGO_SRC = '/icones/logotipo-metodo-28.png';

const PDF_LOGO_MAX_W_MM = 52;
const PDF_LOGO_MAX_H_MM = 22;
const PDF_LOGO_Y_MM = 7;

export type JsPDFDoc = {
  addImage: (
    imageData: string | HTMLImageElement | HTMLCanvasElement,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  setFontSize: (size: number) => void;
  setFont: (fontName: string, fontStyle?: string) => void;
  text: (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }) => void;
};

function resolvePdfWhiteLabel(
  medico: Medico | null | undefined,
  metodoTemplate: MetodoImagensTemplate | null | undefined,
  organizationBranding: OrganizationBrandingStored | null | undefined,
) {
  return mergeMedicoWhiteLabelSources({
    whiteLabel: medico?.whiteLabel,
    metodoTemplate,
    metodoImagensAtivo: medico?.metodoImagensAtivo,
    organizationBranding: organizationBranding ?? null,
    applyOrganizationLayer:
      !!organizationBranding && isMetodoOrganizationMember(medico ?? {}),
  });
}

export function resolveMedicoPdfLogoUrl(
  medico: Medico | null | undefined,
  metodoTemplate?: MetodoImagensTemplate | null,
  organizationBranding?: OrganizationBrandingStored | null,
): string {
  const wl = resolvePdfWhiteLabel(medico, metodoTemplate, organizationBranding);
  const custom = wl?.pdfLogoUrl?.trim();
  return custom || DEFAULT_MEDICO_PDF_LOGO_SRC;
}

function pdfLogoLayoutFromDimensions(
  naturalWidth: number,
  naturalHeight: number,
): { x: number; y: number; w: number; h: number } {
  const maxW = PDF_LOGO_MAX_W_MM;
  const maxH = PDF_LOGO_MAX_H_MM;
  const nw = naturalWidth;
  const nh = naturalHeight;
  let w: number;
  let h: number;
  if (!nw || !nh || nw <= 0 || nh <= 0) {
    w = maxW;
    h = Math.min(maxH, maxW * (9 / 28));
  } else {
    const ratio = nh / nw;
    w = maxW;
    h = w * ratio;
    if (h > maxH) {
      h = maxH;
      w = h / ratio;
    }
  }
  return { x: 190 - w - 10, y: PDF_LOGO_Y_MM, w, h };
}

function drawPdfLogoFallback(doc: JsPDFDoc): void {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Oftware', 180, 15, { align: 'right' });
}

async function tryDrawLogoFromSrc(doc: JsPDFDoc, src: string): Promise<boolean> {
  const loaded = await loadImageForJsPdf(src);
  if (!loaded) return false;

  try {
    const { x, y, w, h } = pdfLogoLayoutFromDimensions(loaded.width, loaded.height);
    doc.addImage(loaded.dataUrl, loaded.format, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

/** Logo no canto superior direito de prescrições e requisições de exames (client-safe). */
export async function addMedicoPdfLogoToDocument(
  doc: JsPDFDoc,
  medico: Medico | null | undefined,
  metodoTemplate?: MetodoImagensTemplate | null,
  organizationBranding?: OrganizationBrandingStored | null,
): Promise<void> {
  const wl = resolvePdfWhiteLabel(medico, metodoTemplate, organizationBranding);
  const customSrc = wl?.pdfLogoUrl?.trim();
  const candidates = customSrc
    ? [customSrc, DEFAULT_MEDICO_PDF_LOGO_SRC]
    : [DEFAULT_MEDICO_PDF_LOGO_SRC];

  for (const src of candidates) {
    if (await tryDrawLogoFromSrc(doc, src)) return;
  }

  drawPdfLogoFallback(doc);
}
