import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateRelatorioFinanceiroUrl } from '@/services/relatorioFinanceiroLinkService';

/**
 * GET /api/relatorio-financeiro/link?pacienteId=xxx
 * Retorna a URL pública do relatório financeiro do paciente.
 * Reutiliza link existente quando já houver um para o paciente.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');

    if (!pacienteId || pacienteId.trim() === '') {
      return NextResponse.json({ error: 'pacienteId é obrigatório' }, { status: 400 });
    }

    const url = await getOrCreateRelatorioFinanceiroUrl(pacienteId.trim());
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Erro ao obter link do relatório financeiro:', error);
    return NextResponse.json(
      { error: 'Erro ao obter link do relatório financeiro' },
      { status: 500 }
    );
  }
}
