import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * GET /api/proposta-template
 * Serves the PDF template from data/proposta.pdf for client-side overlay.
 */
export async function GET() {
  try {
    const templatePath = path.join(process.cwd(), 'data', 'proposta.pdf');
    const buffer = await readFile(templatePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Erro ao ler template proposta.pdf:', error);
    return NextResponse.json(
      { error: 'Template de proposta não encontrado' },
      { status: 404 }
    );
  }
}
