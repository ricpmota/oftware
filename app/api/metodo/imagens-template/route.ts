import { NextResponse } from 'next/server';
import { getOrSyncMetodoImagensTemplate } from '@/lib/metodo/metodoImagensService.server';

/** Template público (somente URLs de imagem) para aplicar o padrão Método no cliente. */
export async function GET() {
  try {
    const template = await getOrSyncMetodoImagensTemplate();
    if (!template) {
      return NextResponse.json({ template: null });
    }
    return NextResponse.json(
      { template },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (e) {
    console.error('[metodo/imagens-template GET]', e);
    return NextResponse.json({ template: null }, { status: 500 });
  }
}
