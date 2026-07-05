/**
 * Divide PDFs grandes em partes ≤ limite para envio ao Gemini (Vertex),
 * mesmo critério usado em exames laboratoriais no MetaAdmin.
 * Executar apenas no cliente (usa pdf-lib).
 */

import { PDFDocument } from 'pdf-lib';

const MAX_IA_UPLOAD_BYTES = Math.floor(4.2 * 1024 * 1024);
const TARGET_PDF_CHUNK_BYTES = Math.floor(3.8 * 1024 * 1024);

export type PrepararPdfsParaIaGeminiResult = {
  arquivos: File[];
  avisos: string[];
  erros: string[];
};

/**
 * @param entrada — normalmente um único PDF por chamada
 */
export async function prepararPdfsParaIaGemini(entrada: File[]): Promise<PrepararPdfsParaIaGeminiResult> {
  const avisos: string[] = [];
  const erros: string[] = [];
  const saida: File[] = [];

  for (const file of entrada) {
    const isPdf =
      (file.type || '').toLowerCase().includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf || file.size <= MAX_IA_UPLOAD_BYTES) {
      saida.push(file);
      continue;
    }

    try {
      const srcBytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();
      if (totalPages <= 1) {
        erros.push(`"${file.name}" excede 4,2 MB e não pôde ser dividido automaticamente.`);
        continue;
      }

      const baseName = file.name.replace(/\.pdf$/i, '');
      let cursor = 0;
      let partIndex = 1;
      const partes: File[] = [];

      while (cursor < totalPages) {
        let bestBytes: Uint8Array | null = null;
        let bestEndExclusive = cursor;

        for (let endExclusive = cursor + 1; endExclusive <= totalPages; endExclusive++) {
          const outDoc = await PDFDocument.create();
          const indices = Array.from({ length: endExclusive - cursor }, (_, i) => cursor + i);
          const copiedPages = await outDoc.copyPages(srcDoc, indices);
          copiedPages.forEach((p) => outDoc.addPage(p));
          const outBytes = await outDoc.save();

          if (outBytes.length <= MAX_IA_UPLOAD_BYTES) {
            bestBytes = outBytes;
            bestEndExclusive = endExclusive;
            if (outBytes.length >= TARGET_PDF_CHUNK_BYTES) break;
            continue;
          }
          break;
        }

        if (!bestBytes || bestEndExclusive <= cursor) {
          erros.push(`"${file.name}" tem página muito pesada e não pôde ser dividida abaixo de 4,2 MB.`);
          break;
        }

        partes.push(
          new File([bestBytes], `${baseName} (parte ${partIndex}).pdf`, { type: 'application/pdf' })
        );
        partIndex += 1;
        cursor = bestEndExclusive;
      }

      if (partes.length > 0) {
        saida.push(...partes);
        avisos.push(`"${file.name}" foi dividido em ${partes.length} parte(s) para leitura pela IA.`);
      }
    } catch {
      erros.push(`Falha ao preparar "${file.name}" para leitura pela IA.`);
    }
  }

  for (const f of saida) {
    if (f.size > MAX_IA_UPLOAD_BYTES) {
      erros.push(`"${f.name}" excede 4,2 MB. Envie um arquivo menor.`);
    }
  }

  const arquivosPreparados = saida.filter((f) => f.size <= MAX_IA_UPLOAD_BYTES);
  return { arquivos: arquivosPreparados, avisos, erros };
}
