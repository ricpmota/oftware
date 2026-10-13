import { readFile } from 'fs/promises';
import path from 'path';

const ROOT = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'cmaps');

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> }
) {
  const { file } = await context.params;
  if (!/^[A-Za-z0-9._+-]+$/.test(file)) {
    return new Response('Not found', { status: 404 });
  }
  const full = path.resolve(ROOT, file);
  const relative = path.relative(ROOT, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const body = await readFile(full);
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
