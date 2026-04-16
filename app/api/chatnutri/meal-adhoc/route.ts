/**
 * POST /api/chatnutri/meal-adhoc
 * Análise de foto de refeição sem paciente — só retorno texto + URL da imagem (ex.: chat do médico, modo avulso).
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiErrorResponse, ChatNutriMealType } from '@/lib/chatnutri/types';
import { uploadChatNutriAdhocImage } from '@/services/chatNutriStorageService';
import { analyzeMealFromImage } from '@/services/chatNutriGeminiService';
import { formatMealAnalysisReply } from '@/utils/formatMealAnalysisReply';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mealTypeRaw = (formData.get('mealType') as string | null)?.trim()?.toLowerCase() || '';
    const VALID_MEAL_TYPES: ChatNutriMealType[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
    const LABEL_TO_KEY: Record<string, ChatNutriMealType> = {
      cafe: 'cafe',
      café: 'cafe',
      'café da manhã': 'cafe',
      'cafe da manha': 'cafe',
      lanche1: 'lanche1',
      'lanche da manhã': 'lanche1',
      'lanche da manha': 'lanche1',
      almoco: 'almoco',
      almoço: 'almoco',
      lanche2: 'lanche2',
      'lanche da tarde': 'lanche2',
      jantar: 'jantar',
    };
    const mealType: ChatNutriMealType = VALID_MEAL_TYPES.includes(mealTypeRaw as ChatNutriMealType)
      ? (mealTypeRaw as ChatNutriMealType)
      : (LABEL_TO_KEY[mealTypeRaw] ?? 'almoco');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Arquivo de imagem obrigatório.' } } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const contentType = file.type || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Arquivo deve ser uma imagem (image/*).' } } as ApiErrorResponse,
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: { code: 'FILE_TOO_LARGE', message: 'Arquivo muito grande. Tamanho máximo: 5MB.' } } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { gcsPath, gsUri, signedUrl } = await uploadChatNutriAdhocImage({
      fileBuffer,
      contentType,
    });

    let visionResult;
    try {
      visionResult = await analyzeMealFromImage({ gsUri, mealType });
    } catch (e) {
      console.error('[chatnutri/meal-adhoc] Gemini Vision error:', e);
      visionResult = {
        items: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        confidence: 'low' as const,
        notes: 'Não foi possível analisar a imagem. Tente novamente.',
      };
    }

    const mealTypeLabels: Record<ChatNutriMealType, string> = {
      cafe: 'Café da Manhã',
      lanche1: 'Lanche da Manhã',
      almoco: 'Almoço',
      lanche2: 'Lanche da Tarde',
      jantar: 'Jantar',
    };
    const mealLabel = mealTypeLabels[mealType];
    const text = formatMealAnalysisReply(visionResult, mealLabel, { avulsaNoChat: true });

    return NextResponse.json({
      ok: true,
      text,
      imageUrl: signedUrl,
      gcsPath,
      confidence: visionResult.confidence,
    });
  } catch (error) {
    console.error('[chatnutri/meal-adhoc] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
