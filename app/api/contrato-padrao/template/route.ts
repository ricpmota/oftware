import { NextResponse } from 'next/server';
import { getContratoPadraoTemplateTextFromFirestore } from '@/lib/contratos/contratoPadraoService.server';

export const dynamic = 'force-dynamic';

/**
 * Leitura pública do texto do contrato padrão (sem auth).
 * Usada ao gerar contratos no metaadmin e no portal do paciente.
 */
export async function GET() {
  try {
    const template = await getContratoPadraoTemplateTextFromFirestore();
    return NextResponse.json({ template, source: 'firestore' });
  } catch (e) {
    console.error('[contrato-padrao/template GET]', e);
    return NextResponse.json(
      { error: 'Falha ao carregar contrato padrão.' },
      { status: 500 }
    );
  }
}
