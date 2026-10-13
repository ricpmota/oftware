import { readFile } from 'fs/promises';
import path from 'path';

/** Worker do pdfjs-dist já instalado. Mesma origem, para o viewer no navegador. */
export async function GET() {
  const file = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
  const body = await readFile(file);
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
