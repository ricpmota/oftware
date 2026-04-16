import { NextRequest, NextResponse } from 'next/server';

const TACO_JSON_URL = 'https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/tabela_alimentos.json';
const MAX_RESULTS = 25;

type TacoItem = {
  id?: number;
  description?: string;
  category?: string;
  energy_kcal?: number | string;
  protein_g?: number | string;
  lipid_g?: number | string;
  carbohydrate_g?: number | string;
};

let cachedData: TacoItem[] | null = null;

function parseNumber(value: number | string | undefined): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value * 10) / 10;
  if (value === 'NA' || value === 'Tr') return 0;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? 0 : Math.round(n * 10) / 10;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  if (q.length === 0) {
    return NextResponse.json({ alimentos: [] });
  }

  try {
    if (!cachedData) {
      const res = await fetch(TACO_JSON_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 86400 }
      });
      if (!res.ok) throw new Error('Falha ao carregar tabela TACO');
      cachedData = (await res.json()) as TacoItem[];
    }

    const filtered = cachedData.filter(
      (item) => item.description && item.description.toLowerCase().includes(q)
    );

    // TACO traz valores por 100g; retornamos por_100g: true e quantidade padrão 100
    const alimentos = filtered.slice(0, MAX_RESULTS).map((item) => ({
      id: item.id,
      nome: item.description || '',
      categoria: item.category || '',
      calorias: parseNumber(item.energy_kcal),
      proteinas: parseNumber(item.protein_g),
      carboidratos: parseNumber(item.carbohydrate_g),
      gorduras: parseNumber(item.lipid_g),
      por_100g: true
    }));

    return NextResponse.json({ alimentos });
  } catch (error) {
    console.error('[taco-buscar]', error);
    return NextResponse.json(
      { error: 'Erro ao buscar alimentos.', alimentos: [] },
      { status: 500 }
    );
  }
}
