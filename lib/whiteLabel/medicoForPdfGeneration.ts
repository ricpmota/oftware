import type { Medico } from '@/types/medico';
import { applyMetodoImagensToWhiteLabel, type MetodoImagensTemplate } from '@/lib/metodo/metodoImagens';

type WhiteLabelFormFields = {
  pdfLogoUrl?: string | null;
};

/** Garante logo PDF do formulário (incl. não salvo) e padrão Método no objeto usado na impressão. */
export function medicoForPdfGeneration(
  medico: Medico | null | undefined,
  form?: WhiteLabelFormFields | null,
  metodoTemplate?: MetodoImagensTemplate | null
): Medico | null {
  if (!medico) return null;

  const formPdfLogo = form?.pdfLogoUrl?.trim();
  let result: Medico = medico;

  if (formPdfLogo) {
    const savedPdfLogo = medico.whiteLabel?.pdfLogoUrl?.trim();
    if (savedPdfLogo !== formPdfLogo) {
      result = {
        ...medico,
        whiteLabel: {
          ...medico.whiteLabel,
          pdfLogoUrl: formPdfLogo,
        },
      };
    }
  }

  if (result.metodoImagensAtivo === true && metodoTemplate) {
    result = {
      ...result,
      whiteLabel: applyMetodoImagensToWhiteLabel(result.whiteLabel, metodoTemplate, true),
    };
  }

  return result;
}
