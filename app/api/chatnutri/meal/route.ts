/**
 * POST /api/chatnutri/meal
 * ETAPA 2: upload real de imagem para GCS + Gemini Vision
 * Entrada: multipart/form-data (patientId, dateKey, file)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiMealSuccessResponse, ApiErrorResponse, ChatNutriTotals, ChatNutriDayTotals, ChatNutriMealType } from '@/lib/chatnutri/types';
import {
  getPatientStatusTratamento,
  getChatNutriDailyImageCount,
  incrementChatNutriDailyImageCount,
  saveChatNutriMessage,
  upsertChatNutriDayTotals,
  addDateToChatNutriDatasComFotos,
  getChatNutriDayTotals,
} from '@/services/chatNutriServerService';
import { uploadChatNutriImage } from '@/services/chatNutriStorageService';
import { analyzeMealFromImage } from '@/services/chatNutriGeminiService';
import { formatMealAnalysisReply } from '@/utils/formatMealAnalysisReply';

const DAILY_IMAGE_LIMIT = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const patientId = formData.get('patientId') as string | null;
    const dateKey = formData.get('dateKey') as string | null;
    const file = formData.get('file') as File | null;
    const mealTypeRaw = (formData.get('mealType') as string | null)?.trim()?.toLowerCase() || '';
    const VALID_MEAL_TYPES: ChatNutriMealType[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
    const LABEL_TO_KEY: Record<string, ChatNutriMealType> = {
      'cafe': 'cafe', 'café': 'cafe', 'café da manhã': 'cafe', 'cafe da manha': 'cafe',
      'lanche1': 'lanche1', 'lanche da manhã': 'lanche1', 'lanche da manha': 'lanche1',
      'almoco': 'almoco', 'almoço': 'almoco',
      'lanche2': 'lanche2', 'lanche da tarde': 'lanche2',
      'jantar': 'jantar',
    };
    const mealType: ChatNutriMealType = VALID_MEAL_TYPES.includes(mealTypeRaw as ChatNutriMealType)
      ? (mealTypeRaw as ChatNutriMealType)
      : (LABEL_TO_KEY[mealTypeRaw] ?? 'almoco');

    if (!patientId?.trim() || !dateKey?.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'patientId e dateKey obrigatórios.' } } as ApiErrorResponse,
        { status: 400 }
      );
    }

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

    const statusTratamento = await getPatientStatusTratamento(patientId);
    if (statusTratamento !== 'em_tratamento') {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_IN_TREATMENT', message: 'Disponível apenas para pacientes em Tratamento.' } } as ApiErrorResponse,
        { status: 403 }
      );
    }

    const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateKeyRegex.test(dateKey)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_DATE_KEY', message: 'dateKey deve ser YYYY-MM-DD.' } } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const currentCount = await getChatNutriDailyImageCount(patientId, dateKey);
    if (currentCount >= DAILY_IMAGE_LIMIT) {
      return NextResponse.json(
        { ok: false, error: { code: 'DAILY_IMAGE_LIMIT', message: 'Você atingiu o limite diário de 20 fotos.' } } as ApiErrorResponse,
        { status: 429 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { gcsPath, gsUri, signedUrl } = await uploadChatNutriImage({
      patientId,
      dateKey,
      fileBuffer,
      contentType,
    });

    let visionResult;
    try {
      visionResult = await analyzeMealFromImage({ gsUri, mealType });
    } catch (e) {
      console.error('[chatnutri/meal] Gemini Vision error:', e);
      visionResult = {
        items: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        confidence: 'low' as const,
        notes: 'Não foi possível analisar a imagem. Tente novamente.',
      };
    }

    const totals: ChatNutriTotals = visionResult.totals;
    const existingDayTotals = await getChatNutriDayTotals(patientId, dateKey);
    const dayTotals: ChatNutriDayTotals = {
      calories: (existingDayTotals?.calories ?? 0) + totals.calories,
      protein: (existingDayTotals?.protein ?? 0) + totals.protein,
      carbs: (existingDayTotals?.carbs ?? 0) + totals.carbs,
      fat: (existingDayTotals?.fat ?? 0) + totals.fat,
    };

    const mealTypeLabels: Record<ChatNutriMealType, string> = {
      cafe: 'Café da Manhã',
      lanche1: 'Lanche da Manhã',
      almoco: 'Almoço',
      lanche2: 'Lanche da Tarde',
      jantar: 'Jantar',
    };
    const mealLabel = mealTypeLabels[mealType];
    const text = formatMealAnalysisReply(visionResult, mealLabel);

    const userCreatedAt = new Date(Date.now() - 1000).toISOString();
    const assistantCreatedAt = new Date().toISOString();

    await incrementChatNutriDailyImageCount(patientId, dateKey);
    await addDateToChatNutriDatasComFotos(patientId, dateKey);

    const userMsgId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const assistantMsgId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await saveChatNutriMessage(patientId, dateKey, {
      id: userMsgId,
      role: 'user',
      type: 'meal',
      text: `[${mealLabel} de hoje]`,
      createdAt: userCreatedAt,
      imageUrl: signedUrl,
      gcsPath,
      relatedMessageId: assistantMsgId,
    });

    const assistantMsg: ApiMealSuccessResponse['message'] = {
      id: assistantMsgId,
      role: 'assistant',
      type: 'meal',
      text,
      createdAt: assistantCreatedAt,
      imageUrl: signedUrl,
      gcsPath,
      totals,
      confidence: visionResult.confidence,
      relatedMessageId: userMsgId,
    };
    await saveChatNutriMessage(patientId, dateKey, { ...assistantMsg, createdAt: assistantCreatedAt });
    await upsertChatNutriDayTotals(patientId, dateKey, dayTotals);

    const response: ApiMealSuccessResponse = {
      ok: true,
      message: assistantMsg,
      dayTotals,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[chatnutri/meal] Erro:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
