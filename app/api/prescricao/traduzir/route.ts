import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import type { PrescricaoItem } from '@/types/prescricao';
import {
  TraducaoPrescricaoError,
  validarEntradaTraducaoPrescricao,
  type PrescricaoTextoTraduzivel,
} from '@/lib/prescricao/traduzirPrescricaoIngles';
import { traduzirPrescricaoParaIngles } from '@/lib/prescricao/traduzirPrescricaoIngles.server';

export const runtime = 'nodejs';

type Body = {
  patientId?: string;
  nome?: unknown;
  descricao?: unknown;
  observacoes?: unknown;
  itens?: unknown;
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readItens(value: unknown): PrescricaoItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      medicamento: readString(row.medicamento),
      dosagem: readString(row.dosagem),
      frequencia: readString(row.frequencia),
      instrucoes: readString(row.instrucoes),
      quantidade: readString(row.quantidade),
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
    if (!patientId) {
      return NextResponse.json({ ok: false, error: 'Informe o paciente.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, patientId);
    if (!gate.ok) return gate.res;

    const texto: PrescricaoTextoTraduzivel = {
      nome: readString(body.nome),
      descricao: readString(body.descricao),
      observacoes: readString(body.observacoes),
      itens: readItens(body.itens),
    };

    try {
      validarEntradaTraducaoPrescricao(texto);
    } catch (error) {
      const message = error instanceof TraducaoPrescricaoError ? error.message : 'Receita inválida para tradução.';
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const traduzido = await traduzirPrescricaoParaIngles(texto);
    return NextResponse.json({ ok: true, ...traduzido });
  } catch (error) {
    const message =
      error instanceof TraducaoPrescricaoError
        ? error.message
        : 'Não foi possível traduzir a receita para inglês. Tente novamente.';
    console.error('[prescricao/traduzir]', error instanceof Error ? error.message : 'erro');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
